import type { Readable } from 'node:stream';

export interface BlobStorage {
  readBytes(key: string, start: number, length: number): Promise<Buffer>;
  createReadStream(key: string): Promise<Readable>;
  writeStream(key: string, stream: Readable): Promise<void>;
  getIndexKey(key: string): string;
}
