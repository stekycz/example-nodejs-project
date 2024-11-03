import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import {
  BlobNotFoundError,
  InvalidKeyError,
  MissMatchedReadingError,
} from './errors.js';
import type { BlobStorage } from './types.js';
import type { Readable } from 'node:stream';

export class FileSystemBlobStorage implements BlobStorage {
  public constructor(private readonly indexDirectoryPath: string) {}

  async readBytes(key: string, start: number, length: number): Promise<Buffer> {
    this.assertAbsoluteKey(key);
    if (start < 0 || !Number.isSafeInteger(start)) {
      throw new Error(
        `The start parameter must be a non-negative safe integer, "${start.toString()}" given.`,
      );
    }
    if (length < 0 || !Number.isSafeInteger(length)) {
      throw new Error(
        `The length parameter must be a non-negative safe integer, "${length.toString()}" given.`,
      );
    }

    try {
      const fileHandle: fs.promises.FileHandle = await fs.promises.open(
        key,
        'r',
      );

      try {
        // Read only a chunk of data in the file specified by parameters. The result is written to the newly created
        // buffer and the new buffer is returned.
        const result: fs.promises.FileReadResult<Buffer> =
          await fileHandle.read(Buffer.alloc(length), null, length, start);

        if (result.bytesRead !== length) {
          throw new MissMatchedReadingError(length, result.bytesRead);
        }

        return result.buffer;
      } finally {
        // Do not ever forget about closing file handles to prevent memory leaks.
        await fileHandle.close();
      }
    } catch (error: unknown) {
      // The error is not an instance of "Error" class, so it is not possible to use "instanceof" operator.
      // The error is a plain object with a "code" property (and additional Error-like properties).
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        throw new BlobNotFoundError(key, { cause: error });
      }

      throw error;
    }
  }

  async createReadStream(key: string): Promise<Readable> {
    this.assertAbsoluteKey(key);

    return Promise.resolve(fs.createReadStream(key));
  }

  async writeStream(key: string, stream: Readable): Promise<void> {
    this.assertAbsoluteKey(key);

    await pipeline(stream, fs.createWriteStream(key));
  }

  getIndexKey(key: string): string {
    this.assertAbsoluteKey(key);

    return path.join(this.indexDirectoryPath, `${path.basename(key)}.idx`);
  }

  private assertAbsoluteKey(key: string): void {
    if (!path.isAbsolute(key)) {
      throw new InvalidKeyError(`The key "${key}" must be an absolute path.`);
    }
  }
}
