export type LocalFileRecord = {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  storedAt: string;
};

const DB_NAME = "cby-local-files";
const STORE_NAME = "files";
const DB_VERSION = 1;

const hasIndexedDb = typeof indexedDB !== "undefined";

function openLocalFilesDb(): Promise<IDBDatabase> {
  if (!hasIndexedDb) {
    return Promise.reject(new Error("IndexedDB is not available in this environment."));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to open the local files database."));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  operation: (
    store: IDBObjectStore,
    resolve: (value: T) => void,
    reject: (reason?: unknown) => void,
  ) => void,
): Promise<T> {
  const db = await openLocalFilesDb();

  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const store = tx.objectStore(STORE_NAME);

      tx.onerror = () => {
        reject(tx.error ?? new Error("Local file transaction failed."));
      };

      operation(store, resolve, reject);
    });
  } finally {
    db.close();
  }
}

export function saveLocalFile(record: LocalFileRecord): Promise<void> {
  return withStore<void>("readwrite", (store, resolve, reject) => {
    const request = store.put(record);
    request.onerror = () => {
      reject(request.error ?? new Error(`Failed to store file "${record.name}" locally.`));
    };
    request.onsuccess = () => resolve();
  });
}

export function getLocalFile(id: string): Promise<LocalFileRecord | null> {
  return withStore<LocalFileRecord | null>("readonly", (store, resolve, reject) => {
    const request = store.get(id);
    request.onerror = () => {
      reject(request.error ?? new Error(`Failed to load local file "${id}".`));
    };
    request.onsuccess = () => {
      resolve((request.result as LocalFileRecord | undefined) ?? null);
    };
  });
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error(`Failed to read file "${file.name}".`));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
}
