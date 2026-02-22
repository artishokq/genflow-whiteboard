import {
  index,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { boards } from "./boards";
import { users } from "./users";

export const boardCollaboratorRoleEnum = pgEnum("board_collaborator_role", [
  "viewer",
  "editor",
]);

export const boardShareLinks = pgTable(
  "board_share_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    boardId: uuid("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    role: boardCollaboratorRoleEnum("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("board_share_links_token_hash_uidx").on(table.tokenHash),
    index("board_share_links_board_id_idx").on(table.boardId),
  ],
);

export const boardMembers = pgTable(
  "board_members",
  {
    boardId: uuid("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: boardCollaboratorRoleEnum("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.boardId, table.userId] }),
    index("board_members_user_id_idx").on(table.userId),
  ],
);
