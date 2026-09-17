import { openDB, type IDBPDatabase } from "idb";

export interface IndexedDbStoreConfig<T> {
  databaseName: string;
  version: number;
  storeName: string;
  keyPath: keyof T & string;
  indexes?: Array<{
    name: keyof T & string;
    unique?: boolean;
  }>;
}

export class IndexedDbRepository<T extends object> {
  private readonly config: IndexedDbStoreConfig<T>;
  private readonly databasePromise: Promise<IDBPDatabase>;

  constructor(config: IndexedDbStoreConfig<T>) {
    this.config = config;

    this.databasePromise = openDB(
      config.databaseName,
      config.version,
      {
        upgrade: (
          database,
          _oldVersion,
          _newVersion,
          transaction
        ) => {
          const store = database.objectStoreNames.contains(
            config.storeName
          )
            ? transaction.objectStore(config.storeName)
            : database.createObjectStore(config.storeName, {
                keyPath: config.keyPath,
              });

          for (const index of config.indexes ?? []) {
            if (!store.indexNames.contains(index.name)) {
              store.createIndex(index.name, index.name, {
                unique: index.unique ?? false,
              });
            }
          }
        },
      }
    );
  }

  async getByKey(key: T[keyof T]): Promise<T | undefined> {
    const database = await this.databasePromise;

    return database.get(
      this.config.storeName,
      key as IDBValidKey
    ) as Promise<T | undefined>;
  }

  async getSingle<K extends keyof T>(
    column: K,
    key: T[K]
  ): Promise<T | undefined> {
    const database = await this.databasePromise;

    return database.getFromIndex(
      this.config.storeName,
      column as string,
      key as IDBValidKey
    ) as Promise<T | undefined>;
  }

  async getAll(): Promise<T[]> {
    const database = await this.databasePromise;

    return database.getAll(this.config.storeName) as Promise<T[]>;
  }

  async put(entry: T): Promise<IDBValidKey> {
    const database = await this.databasePromise;

    return database.put(
      this.config.storeName,
      entry
    ) as Promise<IDBValidKey>;
  }

  async deleteByKey(key: T[keyof T]): Promise<void> {
    const database = await this.databasePromise;

    await database.delete(
      this.config.storeName,
      key as IDBValidKey,
    );
  }

  async addMany(entries: T[]): Promise<void> {
    const database = await this.databasePromise;

    const transaction = database.transaction(
      this.config.storeName,
      "readwrite"
    );

    for (const entry of entries) {
      transaction.store.put(entry);
    }

    await transaction.done;
  }
}
