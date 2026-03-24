import type * as Y from "yjs";

import { LOCAL_HISTORY_ORIGIN } from "./historyOrigins";
import { pushPendingHistoryAction } from "./localActionQueue";

export function runTrackedAction({
  ydoc,
  labelKey,
  labelValues,
  actor,
  fn,
}: {
  ydoc: Y.Doc;
  labelKey: string;
  labelValues?: Record<string, string | number>;
  actor: string;
  fn: () => void;
}) {
  pushPendingHistoryAction({
    labelKey,
    labelValues,
    actor: actor.trim() || "Unknown user",
  });
  ydoc.transact(fn, LOCAL_HISTORY_ORIGIN);
}
