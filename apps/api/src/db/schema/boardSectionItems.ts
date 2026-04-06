import { index, integer, pgTable, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core";

import { boards } from "./boards";
import { boardSections } from "./boardSections";

export const boardSectionItems = pgTable(
  "board_section_items",
  {
    sectionId: uuid("section_id")
      .notNull()
      .references(() => boardSections.id, { onDelete: "cascade" }),
    boardId: uuid("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.sectionId, table.boardId] }),
    index("board_section_items_section_id_position_idx").on(table.sectionId, table.position),
    index("board_section_items_board_id_idx").on(table.boardId),
  ],
);
