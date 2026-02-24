import { boolean, index, pgTable, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core";

import { boards } from "./boards";
import { users } from "./users";

export const boardUserPrefs = pgTable(
  "board_user_prefs",
  {
    boardId: uuid("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    isStarred: boolean("is_starred").notNull().default(false),
    lastViewedAt: timestamp("last_viewed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.boardId, table.userId] }),
    index("board_user_prefs_user_id_is_starred_idx").on(table.userId, table.isStarred),
    index("board_user_prefs_user_id_last_viewed_at_idx").on(
      table.userId,
      table.lastViewedAt,
    ),
  ],
);
