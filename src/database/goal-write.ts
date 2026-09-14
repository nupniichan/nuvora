import { getDatabase } from './database';

const pendingWrites = new WeakMap<object, Promise<void>>();

export function runGoalWrite<T>(task: () => Promise<T>): Promise<T> {
  const db = getDatabase();
  const previous = pendingWrites.get(db) ?? Promise.resolve();
  const operation = previous.then(task);
  const settled = operation.then(() => undefined, () => undefined);
  pendingWrites.set(db, settled);
  void settled.then(() => {
    if (pendingWrites.get(db) === settled) pendingWrites.delete(db);
  });
  return operation;
}
