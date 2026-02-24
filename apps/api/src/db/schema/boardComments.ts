import {
  doublePrecision,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { boards } from "./boards";
import { users } from "./users";

export const boardCommentThreadStatusEnum = pgEnum("board_comment_thread_status", [
  "open",
  "resolved",
]);

export const boardCommentThreads = pgTable(
  "board_comment_threads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    boardId: uuid("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    anchorX: doublePrecision("anchor_x").notNull(),
    anchorY: doublePrecision("anchor_y").notNull(),
    status: boardCommentThreadStatusEnum("status").notNull().default("open"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("board_comment_threads_board_id_idx").on(table.boardId),
    index("board_comment_threads_created_by_idx").on(table.createdBy),
    index("board_comment_threads_status_idx").on(table.status),
  ],
);

export const boardCommentMessages = pgTable(
  "board_comment_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => boardCommentThreads.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("board_comment_messages_thread_id_idx").on(table.threadId),
    index("board_comment_messages_author_id_idx").on(table.authorId),
  ],
);
