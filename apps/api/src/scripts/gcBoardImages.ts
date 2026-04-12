import "dotenv/config";

import { boardSnapshots } from "../db/schema";
import { db, pool } from "../db/client";
import r2StorageService from "../modules/boards/r2StorageService";
import * as Y from "yjs";

function collectUsedImageKeysFromSnapshot(state: Buffer): Set<string> {
  const used = new Set<string>();
  if (!state || state.length === 0) {
    return used;
  }

  const doc = new Y.Doc();
  try {
    Y.applyUpdate(doc, new Uint8Array(state));
    const elements = doc.getArray<Y.Map<unknown>>("elements");
    for (const item of elements) {
      if (item.get("type") !== "image") {
        continue;
      }
      const key = item.get("imageFile");
      if (typeof key === "string" && key.trim()) {
        used.add(key.trim());
      }
    }
    return used;
  } finally {
    doc.destroy();
  }
}

async function run() {
  const dryRun = process.env.DRY_RUN === "1";
  console.log(`[gc:board-images] started (dryRun=${dryRun})`);

  const snapshots = await db
    .select({ boardId: boardSnapshots.boardId, state: boardSnapshots.state })
    .from(boardSnapshots);

  const usedKeys = new Set<string>();
  for (const row of snapshots) {
    const keys = collectUsedImageKeysFromSnapshot(row.state);
    for (const key of keys) {
      usedKeys.add(key);
    }
  }

  const allR2Keys = await r2StorageService.listObjectKeys("boards/");
  const orphanKeys = allR2Keys.filter((key) => !usedKeys.has(key));

  console.log(
    `[gc:board-images] snapshots=${snapshots.length} used=${usedKeys.size} inR2=${allR2Keys.length} orphan=${orphanKeys.length}`,
  );

  if (!dryRun) {
    let deleted = 0;
    for (const key of orphanKeys) {
      await r2StorageService.deleteObjectFromR2(key);
      deleted += 1;
      if (deleted % 50 === 0) {
        console.log(`[gc:board-images] deleted=${deleted}`);
      }
    }
    console.log(`[gc:board-images] deletedTotal=${deleted}`);
  } else {
    for (const key of orphanKeys.slice(0, 20)) {
      console.log(`[gc:board-images] orphan ${key}`);
    }
    if (orphanKeys.length > 20) {
      console.log(
        `[gc:board-images] ... and ${orphanKeys.length - 20} more orphan objects`,
      );
    }
  }
}

run()
  .catch((e) => {
    console.error("[gc:board-images] failed", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
