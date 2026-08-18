import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const calendarState = sqliteTable("calendar_state", {
  id: text("id").primaryKey(),
  document: text("document").notNull(),
  revision: integer("revision").notNull().default(0),
  initialized: integer("initialized").notNull().default(0),
  updatedAt: text("updated_at").notNull(),
});
