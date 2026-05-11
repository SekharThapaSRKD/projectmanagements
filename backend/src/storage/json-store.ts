import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export interface JsonStoreOptions<T extends object> {
  onWrite?: (state: T) => void | Promise<void>;
}

export class JsonStore<T extends object> {
  private readonly filePath: string;
  private readonly defaultFactory: () => Promise<T> | T;
  private readonly onWrite: ((state: T) => void | Promise<void>) | undefined;
  private queue: Promise<unknown> = Promise.resolve();
  private cache: T | null = null;

  constructor(filePath: string, defaultFactory: () => Promise<T> | T, options: JsonStoreOptions<T> = {}) {
    this.filePath = filePath;
    this.defaultFactory = defaultFactory;
    this.onWrite = options.onWrite;
  }

  async read(): Promise<T> {
    if (this.cache) {
      return clone(this.cache);
    }

    try {
      const raw = await readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as T;
      this.cache = parsed;
      return clone(parsed);
    } catch {
      const defaults = await this.defaultFactory();
      await this.write(defaults);
      return clone(defaults);
    }
  }

  async update(updater: (state: T) => Promise<T> | T): Promise<T> {
    this.queue = this.queue.then(async () => {
      const current = await this.read();
      const next = await updater(current);
      await this.write(next);
      return next;
    });

    return this.queue as Promise<T>;
  }

  private async write(state: T): Promise<void> {
    const directory = path.dirname(this.filePath);
    await mkdir(directory, { recursive: true });

    const tempFilePath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    const serialized = `${JSON.stringify(state, null, 2)}\n`;

    await writeFile(tempFilePath, serialized, 'utf8');
    await rename(tempFilePath, this.filePath);
    this.cache = clone(state);

    if (this.onWrite) {
      await this.onWrite(clone(state));
    }
  }
}

export const createStore = <T extends object>(filePath: string, defaultFactory: () => Promise<T> | T, options?: JsonStoreOptions<T>) =>
  new JsonStore(filePath, defaultFactory, options);
