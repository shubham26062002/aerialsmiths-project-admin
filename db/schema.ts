import { createId } from "@paralleldrive/cuid2"
import { numeric, pgEnum, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core"

export const usersRoles = pgEnum("users_roles", ["default", "admin"])

export const users = pgTable("users", {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    role: usersRoles("role").notNull().default("default"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
    uniqueIndex("users_email_index").on(t.email),
])

export const sessions = pgTable("sessions", {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    userId: text("user_id").notNull().references(() => users.id, {
        onDelete: "cascade",
    }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
    uniqueIndex("sessions_token_hash_index").on(t.tokenHash),
])

export const clients = pgTable("clients", {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const timesheetEntriesStatus = pgEnum("timesheet_entries_status", ["pending", "approved", "rejected"])

export const timesheetEntries = pgTable("timesheet_entries", {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    userId: text("user_id").notNull().references(() => users.id, {
        onDelete: "cascade",
    }),
    clientId: text("client_id").notNull().references(() => clients.id, {
        onDelete: "cascade",
    }),
    date: timestamp("date").notNull(),
    startTime: timestamp("start_time").notNull(),
    endTime: timestamp("end_time").notNull(),
    remarks: text("remarks"),
    totalHrs: numeric("total_hrs", {
        precision: 4,
        scale: 2,
    }).notNull(),
    position: text("position").notNull(),
    siteAddress: text("site_address").notNull(),
    status: timesheetEntriesStatus("status").notNull().default("pending"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
})