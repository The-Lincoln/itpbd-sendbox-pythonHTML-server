const canvas = document.getElementById('stage')
const ctx = canvas.getContext('2d')
const monitor = document.getElementById('monitor')
const slate = document.getElementById('slate')
const statusEl = document.getElementById('status')
const scriptCard = document.getElementById('scriptCard')
const scriptTitle = document.getElementById('scriptTitle')
const scriptBody = document.getElementById('scriptBody')
const scriptMood = document.getElementById('scriptMood')
const beatsEl = document.getElementById('beats')
const voiceSelect = document.getElementById('voice')
const speakBtn = document.getElementById('speakBtn')
const recordBtn = document.getElementById('recordBtn')
const stopBtn = document.getElementById('stopBtn')
const downloadLink = document.getElementById('downloadLink')
const recPip = document.getElementById('recPip')
const takesEl = document.getElementById('takes')
const form = document.getElementById('brief')

const portrait = new Image()
portrait.src = '/assets/lin.png'

const state = {
  lookX: 0,
  lookY: 0,
  mouth: 0,
  blink: 0,
  smile: 0,
  nod: 0,
  mood: 'warm',
  speaking: false,
  targetLookX: 0,
  targetLookY: -0.08,
}

let voices = []
let recorder = null
let chunks = []
let takeCount = Number(sessionStorage.getItem('lincoln-takes') || 0)
let mouthTimer = 0

function setStatus(text, isError) {
  statusEl.textContent = text
  statusEl.classList.toggle('error', Boolean(isError))
}

function pickVoices() {
  voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : []
  const english = voices.filter((voice) => /^en/i.test(voice.lang))
  const list = english.length ? english : voices
  const previous = voiceSelect.value
  voiceSelect.innerHTML = ''
  if (!list.length) {
    const option = document.createElement('option')
    option.textContent = 'Browser default'
    voiceSelect.appendChild(option)
    return
  }
  list.slice(0, 10).forEach((voice) => {
    const option = document.createElement('option')
    option.value = voice.name
    option.textContent = `${voice.name.replace(/Microsoft |Google /g, '')} · ${voice.lang}`
    voiceSelect.appendChild(option)
  })
  const preferred = list.find((voice) => voice.name === previous)
    || list.find((voice) => /natural|neural|daniel|aaron|guy/i.test(voice.name))
    || list[0]
  voiceSelect.value = preferred.name
}

if (window.speechSynthesis) {
  pickVoices()
  window.speechSynthesis.addEventListener('voiceschanged', pickVoices)
}

function applyScene(scene) {
  scriptTitle.textContent = scene.title
  scriptBody.textContent = scene.script
  scriptMood.textContent = scene.mood || 'warm'
  state.mood = scene.mood || 'warm'
  beatsEl.replaceChildren()
  ;(scene.beats || []).forEach((beat) => {
    const item = document.createElement('li')
    item.textContent = beat
    beatsEl.appendChild(item)
  })
}

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  const data = new FormData(form)
  scriptCard.classList.add('loading')
  setStatus('Writing the line…')
  try {
    const response = await fetch('/api/script', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scene: data.get('scene'),
        topic: data.get('topic'),
      }),
    })
    if (!response.ok) throw new Error('script failed')
    const payload = await response.json()
    applyScene(payload.scene)
    setStatus(payload.source === 'model'
      ? 'Fresh line, ready for the mic.'
      : 'House line loaded. The model was quiet, so the desk script stands in.')
  } catch {
    setStatus('Could not reach the writing desk. The line already on the card still plays.', true)
  } finally {
    scriptCard.classList.remove('loading')
  }
})

function chosenVoice() {
  return voices.find((voice) => voice.name === voiceSelect.value) || null
}

function playBeats(beats) {
  const looks = {
    'look camera': [0, -0.05],
    'look left': [-0.85, 0.02],
    'look right': [0.85, 0],
    'look down': [0.08, 0.7],
  }
  beats.forEach((beat, index) => {
    window.setTimeout(() => {
      const key = beat.toLowerCase()
      if (looks[key]) {
        state.targetLookX = looks[key][0]
        state.targetLookY = looks[key][1]
      }
      if (key === 'smile') state.smile = 1
      if (key === 'nod') state.nod = 1
      if (key === 'blink') state.blink = 1
    }, 500 + index * 1600)
  })
}

function stopSpeech() {
  window.clearInterval(mouthTimer)
  if (window.speechSynthesis) window.speechSynthesis.cancel()
  state.speaking = false
  monitor.classList.remove('speaking')
  if (!recorder || recorder.state !== 'recording') slate.textContent = 'standby'
}

function speak() {
  const text = scriptBody.textContent.trim()
  if (!text) {
    setStatus('There is no line on the card.', true)
    return
  }
  if (!window.speechSynthesis) {
    setStatus('This browser has no speech engine. The picture can still be recorded.', true)
    return
  }
  stopSpeech()
  const utterance = new SpeechSynthesisUtterance(text)
  const voice = chosenVoice()
  if (voice) {
    utterance.voice = voice
    utterance.lang = voice.lang
  }
  utterance.rate = state.mood === 'low' ? 0.9 : 0.98
  utterance.pitch = state.mood === 'quiet' ? 0.9 : 0.96
  utterance.onstart = () => {
    state.speaking = true
    monitor.classList.add('speaking')
    slate.textContent = 'on mic'
    playBeats([...beatsEl.querySelectorAll('li')].map((item) => item.textContent))
    setStatus('Lincoln is on mic.')
    mouthTimer = window.setInterval(() => {
      state.mouth = state.speaking ? 0.35 + Math.random() * 0.65 : 0
    }, 90)
  }
  utterance.onend = () => {
    stopSpeech()
    setStatus('Take spoken. Record it if you want the file.')
  }
  utterance.onerror = () => {
    stopSpeech()
    setStatus('The voice engine stopped. Try another voice in the list.', true)
  }
  window.speechSynthesis.speak(utterance)
}

speakBtn.addEventListener('click', speak)

function mimeType() {
  const types = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
  return types.find((type) => window.MediaRecorder && MediaRecorder.isTypeSupported(type)) || ''
}

function addTake(url) {
  takeCount += 1
  sessionStorage.setItem('lincoln-takes', String(takeCount))
  takesEl.querySelector('.empty')?.remove()
  const item = document.createElement('li')
  const label = document.createElement('span')
  label.textContent = `Take ${takeCount} · ${scriptTitle.textContent}`
  const link = document.createElement('a')
  link.href = url
  link.download = `lincoln-take-${takeCount}.webm`
  link.textContent = 'Download'
  item.append(label, link)
  takesEl.prepend(item)
  downloadLink.href = url
  downloadLink.hidden = false
}

async function startRecording() {
  if (!window.MediaRecorder) {
    setStatus('This browser cannot record canvas video. Speaking still works.', true)
    return
  }
  const type = mimeType()
  if (!type) {
    setStatus('No WebM recorder in this browser.', true)
    return
  }
  if (recorder && recorder.state === 'recording') return

  const stream = canvas.captureStream(30)
  let micOn = false
  try {
    const mic = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    mic.getAudioTracks().forEach((track) => stream.addTrack(track))
    micOn = true
  } catch {
    micOn = false
  }

  chunks = []
  recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 2_500_000 })
  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size) chunks.push(event.data)
  }
  recorder.onstop = () => {
    stream.getTracks().forEach((track) => track.stop())
    const blob = new Blob(chunks, { type: type.split(';')[0] })
    addTake(URL.createObjectURL(blob))
    recPip.hidden = true
    stopBtn.disabled = true
    recordBtn.disabled = false
    slate.textContent = 'standby'
    setStatus(micOn
      ? 'Take saved in this browser. Your mic is in the file; Lincoln’s voice plays live from the room.'
      : 'Picture saved. Mic permission was off, so this file is silent video.')
  }
  recorder.start(200)
  recPip.hidden = false
  stopBtn.disabled = false
  recordBtn.disabled = true
  slate.textContent = 'rolling'
  setStatus(micOn
    ? 'Rolling. Lincoln will speak. Stop when the line lands.'
    : 'Rolling picture only. Allow the mic next time if you want sound in the file.')
  window.setTimeout(speak, 350)
}

recordBtn.addEventListener('click', () => {
  startRecording().catch(() => setStatus('Recording could not start.', true))
})

stopBtn.addEventListener('click', () => {
  stopSpeech()
  if (recorder && recorder.state === 'recording') recorder.stop()
})

function draw(time) {
  const w = canvas.width
  const h = canvas.height
  state.lookX += (state.targetLookX - state.lookX) * 0.06
  state.lookY += (state.targetLookY - state.lookY) * 0.06
  state.smile *= 0.985
  state.nod *= 0.92
  if (!state.speaking) state.mouth *= 0.8
  if (Math.random() < 0.004 && state.blink < 0.2) state.blink = 1
  state.blink *= 0.72

  const night = state.mood === 'low'
  const quiet = state.mood === 'quiet'
  ctx.fillStyle = night ? '#1a140f' : '#c98452'
  ctx.fillRect(0, 0, w, h)

  const glow = ctx.createRadialGradient(w * 0.5, h * 0.28, 40, w * 0.5, h * 0.4, h * 0.62)
  glow.addColorStop(0, night ? 'rgba(214, 156, 96, 0.28)' : 'rgba(255, 226, 186, 0.55)')
  glow.addColorStop(1, 'rgba(28, 18, 12, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, w, h)

  if (portrait.complete && portrait.naturalWidth) {
    const bob = Math.sin(time / 1100) * 5 + state.nod * 14
    const shiftX = state.lookX * 18
    const shiftY = state.lookY * 16 + bob
    const tilt = state.lookX * 0.035 + Math.sin(time / 1600) * 0.008
    const focusY = portrait.naturalHeight * (0.34 + state.lookY * 0.03)
    const cropW = portrait.naturalWidth * 0.86
    const cropH = cropW * (h / w)
    const sx = Math.max(0, (portrait.naturalWidth - cropW) / 2 - state.lookX * 28)
    const sy = Math.max(0, Math.min(portrait.naturalHeight - cropH, focusY - cropH * 0.38))

    const jaw = state.mouth * 7
    ctx.save()
    ctx.translate(w / 2 + shiftX, h / 2 + shiftY + jaw)
    ctx.rotate(tilt)
    ctx.scale(1, 1 + state.mouth * 0.012)
    ctx.drawImage(portrait, sx, sy, cropW, cropH, -w / 2, -h / 2, w, h)
    ctx.restore()

    const lid = Math.min(1, state.blink)
    if (lid > 0.08) {
      ctx.fillStyle = `rgba(92, 62, 48, ${0.15 + lid * 0.55})`
      ctx.beginPath()
      ctx.ellipse(w * 0.43 + shiftX * 0.2, h * 0.4 + shiftY * 0.15, 34, 8 + lid * 10, -0.1, 0, Math.PI * 2)
      ctx.ellipse(w * 0.58 + shiftX * 0.2, h * 0.395 + shiftY * 0.15, 32, 8 + lid * 10, 0.08, 0, Math.PI * 2)
      ctx.fill()
    }
  } else {
    ctx.fillStyle = '#efe4d2'
    ctx.font = '500 28px Fraunces, serif'
    ctx.fillText('Loading portrait…', 48, h / 2)
  }

  if (night) {
    ctx.fillStyle = 'rgba(18, 12, 8, 0.28)'
    ctx.fillRect(0, 0, w, h)
  } else if (quiet) {
    ctx.fillStyle = 'rgba(62, 48, 32, 0.08)'
    ctx.fillRect(0, 0, w, h)
  }

  ctx.strokeStyle = 'rgba(246, 232, 210, 0.28)'
  ctx.lineWidth = 10
  ctx.strokeRect(14, 14, w - 28, h - 28)
  requestAnimationFrame(draw)
}

portrait.onload = () => setStatus('Portrait loaded. Write a line, then put him on mic.')
portrait.onerror = () => setStatus('Portrait file missing from /assets/lin.png.', true)
requestAnimationFrame(draw)
