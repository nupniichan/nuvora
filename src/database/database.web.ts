let dbInstance: any = null;

function createWebDbMock(): any {
  return {
    execAsync: async () => {},
    runAsync: async (sql: string, params: any[] = []) => {
      return { lastInsertRowId: 1, changes: 1 };
    },
    getAllAsync: async (sql: string, params: any[] = []) => {
      return [];
    },
    getFirstAsync: async (sql: string, params: any[] = []) => {
      return null;
    },
    withTransactionAsync: async (cb: () => Promise<void>) => {
      await cb();
    },
    closeAsync: async () => {},
  };
}

export async function initDatabase(dekKeyHex?: string): Promise<any> {
  if (!dbInstance) {
    dbInstance = createWebDbMock();
  }
  return dbInstance;
}

export function getDatabase(): any {
  if (!dbInstance) {
    dbInstance = createWebDbMock();
  }
  return dbInstance;
}

export async function closeDatabase(): Promise<void> {
  dbInstance = null;
}
