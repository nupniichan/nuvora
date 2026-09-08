import { getDatabase } from './database';

const pendingWrites = new WeakMap<object, Promise<void>>();

/** Serialize goal spending and undo, including their fresh balance reads. */
export function runGoalWrite(task: () => Promise<void>): Promise<void> {
  const db = getDatabase();
  const previous = pendingWrites.get(db) ?? Promise.resolve();
  const operation = previous.then(task);
  const settled = operation.catch(() => undefined);
  pendingWrites.set(db, settled);
  void settled.then(() => {
    if (pendingWrites.get(db) === settled) pendingWrites.delete(db);
  });
  return operation;
}
