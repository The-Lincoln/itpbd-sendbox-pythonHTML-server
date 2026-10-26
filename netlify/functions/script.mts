const MODEL = 'gemini-3.1-flash-lite'

type Config = {
  path?: string
  method?: string | string[]
}

type Scene = {
  id: string
  title: string
  script: string
  beats: string[]
  mood: string
}

const SCENES: Record<string, Scene> = {
  intro: {
    id: 'intro',
    title: 'Channel open',
    mood: 'warm',
    script:
      'Hey, I am Lincoln. I make short films about people who stay curious after the easy answers run out. If you are new here, pull up a chair. We talk like the camera is a friend, not a stage.',
    beats: ['look left', 'smile', 'look camera'],
  },
  desk: {
    id: 'desk',
    title: 'Desk note',
    mood: 'quiet',
    script:
      'Most of my best lines start as a scribble on the edge of a notebook. I write them down before they get polite. Today the note says: finish the sentence you are afraid to say out loud.',
    beats: ['look down', 'nod', 'look camera'],
  },
  night: {
    id: 'night',
    title: 'Night take',
    mood: 'low',
    script:
      'It is late, the room is quiet, and the take still is not right. That is fine. A good cut is just the moment you stop pretending the first try was enough.',
    beats: ['blink', 'look right', 'smile'],
  },
}

function fallback(sceneId: string, topic: string): Scene {
  const base = SCENES[sceneId] || SCENES.intro
  const cleaned = topic.replace(/\s+/g, ' ').trim().slice(0, 180)
  if (!cleaned) return base
  return {
    ...base,
    title: cleaned.length > 42 ? `${cleaned.slice(0, 40)}…` : cleaned,
    script: `Hey, I am Lincoln. ${cleaned.replace(/[.?!]$/, '')}. I will say it plain, then I will say why it matters, and I will leave you with one thing to try before the next take.`,
  }
}

function extractText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return ''
  const data = payload as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const parts = data.candidates?.[0]?.content?.parts || []
  return parts.map((part) => part.text || '').join('').trim()
}

function parseScene(raw: string, sceneId: string, topic: string): Scene {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1) return fallback(sceneId, topic)
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as Partial<Scene>
    const script = String(parsed.script || '').replace(/\s+/g, ' ').trim()
    if (script.length < 40 || script.length > 700) return fallback(sceneId, topic)
    const beats = Array.isArray(parsed.beats)
      ? parsed.beats.map((beat) => String(beat)).slice(0, 4)
      : fallback(sceneId, topic).beats
    return {
      id: sceneId,
      title: String(parsed.title || topic || 'Take').slice(0, 48),
      script,
      beats: beats.length ? beats : ['look camera', 'nod', 'smile'],
      mood: ['warm', 'quiet', 'low'].includes(String(parsed.mood))
        ? String(parsed.mood)
        : 'warm',
    }
  } catch {
    return fallback(sceneId, topic)
  }
}

type HandlerContext = { requestId?: string }

export default async (req: Request, context: HandlerContext) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Use POST.' }, { status: 405 })
  }

  let body: { scene?: string; topic?: string } = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const sceneId = SCENES[body.scene || ''] ? String(body.scene) : 'intro'
  const topic = String(body.topic || '').replace(/\s+/g, ' ').trim().slice(0, 180)
  const preset = SCENES[sceneId]

  const key = Netlify.env.get('GEMINI_API_KEY')
  const base = Netlify.env.get('GOOGLE_GEMINI_BASE_URL')
  if (!key || !base) {
    return Response.json({
      scene: fallback(sceneId, topic),
      source: 'preset',
      requestId: context.requestId,
    })
  }

  const prompt = [
    'Write a 20 to 35 second spoken script for a virtual content creator named Lincoln.',
    'He is a young man with short dark hair, a light beard, and a calm on-camera presence.',
    'Voice: conversational, specific, no hype words, no hashtags, no emoji.',
    `Scene mood: ${preset.mood}. Scene seed: ${preset.title}.`,
    topic ? `Topic the creator must cover: ${topic}` : `Use this seed script as tone only: ${preset.script}`,
    'Return only JSON with keys title, script, beats, mood.',
    'beats is an array of 3 short stage directions chosen from: look camera, look left, look right, look down, smile, nod, blink.',
    'mood must be one of warm, quiet, low.',
  ].join('\n')

  try {
    const response = await fetch(
      `${base.replace(/\/$/, '')}/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': key,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 400,
            responseMimeType: 'application/json',
          },
        }),
      },
    )

    if (!response.ok) {
      return Response.json({
        scene: fallback(sceneId, topic),
        source: 'preset',
        requestId: context.requestId,
      })
    }

    const payload = await response.json()
    return Response.json({
      scene: parseScene(extractText(payload), sceneId, topic),
      source: 'model',
      requestId: context.requestId,
    })
  } catch {
    return Response.json({
      scene: fallback(sceneId, topic),
      source: 'preset',
      requestId: context.requestId,
    })
  }
}

export const config: Config = {
  path: '/api/script',
  method: 'POST',
}
