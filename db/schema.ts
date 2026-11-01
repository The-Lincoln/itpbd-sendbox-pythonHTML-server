import { pgTable, serial, text, timestamp, integer, numeric, index } from "drizzle-orm/pg-core";

// Leads, prospects and clients tracked through the sales pipeline
export const contacts = pgTable(
  "contacts",
  {
    id: serial().primaryKey(),
    company: text().notNull(),
    contactName: text("contact_name").notNull().default(""),
    email: text().notNull().default(""),
    phone: text().notNull().default(""),
    country: text().notNull().default(""),
    sector: text().notNull().default(""),
    service: text().notNull().default(""),
    stage: text().notNull().default("lead"),
    source: text().notNull().default(""),
    dealValue: numeric("deal_value", { precision: 12, scale: 2 }).notNull().default("0"),
    currency: text().notNull().default("USD"),
    isRetainer: integer("is_retainer").notNull().default(0),
    nps: integer(),
    notes: text().notNull().default(""),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("contacts_stage_idx").on(t.stage)],
);

// Timeline of calls, emails, meetings and notes per contact
export const activities = pgTable(
  "activities",
  {
    id: serial().primaryKey(),
    contactId: integer("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    kind: text().notNull().default("note"),
    body: text().notNull(),
    author: text().notNull().default(""),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("activities_contact_idx").on(t.contactId)],
);

// CEO task assignments to growth divisions
export const tasks = pgTable("tasks", {
  id: serial().primaryKey(),
  code: text().unique(),
  title: text().notNull(),
  description: text().notNull().default(""),
  division: text().notNull(),
  priority: text().notNull().default("high"),
  status: text().notNull().default("todo"),
  owner: text().notNull().default(""),
  kpi: text().notNull().default(""),
  cadence: text().notNull().default(""),
  dueDate: text("due_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Company KPI scorecard
export const kpis = pgTable("kpis", {
  id: serial().primaryKey(),
  key: text().notNull().unique(),
  label: text().notNull(),
  unit: text().notNull().default(""),
  current: numeric({ precision: 14, scale: 2 }).notNull().default("0"),
  target6m: numeric("target_6m", { precision: 14, scale: 2 }).notNull().default("0"),
  target12m: numeric("target_12m", { precision: 14, scale: 2 }).notNull().default("0"),
  sortOrder: integer("sort_order").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// AI CEO agent conversation history
export const agentMessages = pgTable(
  "agent_messages",
  {
    id: serial().primaryKey(),
    threadId: text("thread_id").notNull(),
    role: text().notNull(),
    content: text().notNull(),
    author: text().notNull().default(""),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("agent_messages_thread_idx").on(t.threadId)],
);
