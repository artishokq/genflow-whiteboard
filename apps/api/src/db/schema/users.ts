import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  firstName: text("first_name").notNull().default(""),
  lastName: text("last_name").notNull().default(""),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  isEmailVerified: boolean("is_email_verified").notNull().default(false),
  role: text("role").notNull().default("user"), // user | admin
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
