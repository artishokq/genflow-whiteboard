import { customType, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

import { boards } from "./boards";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

export const boardSnapshots = pgTable("board_snapshots", {
  boardId: uuid("board_id")
    .primaryKey()
    .references(() => boards.id, { onDelete: "cascade" }),
  state: bytea("state").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
