import path from 'node:path';
import { Readable } from 'node:stream';
import {
  GetObjectCommand,
  PutObjectCommand,
  type S3Client,
} from '@aws-sdk/client-s3';
import {
  BlobNotFoundError,
  InvalidKeyError,
  MissMatchedReadingError,
} from './errors.js';
import type { BlobStorage } from './types.js';

export class AwsS3BlobStorage implements BlobStorage {
  public constructor(
    private readonly s3Client: S3Client,
    private readonly bucketName: string,
    private readonly indicesPrefix: string,
  ) {}

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
      const response = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          // Subtract 1 from the end position because the range is inclusive.
          Range: `bytes=${start.toString()}-${(start + length - 1).toString()}`,
        }),
      );

      if (response.Body === undefined) {
        throw new BlobNotFoundError(key);
      }

      const bodyAsBytes = await response.Body.transformToByteArray();
      const buffer = Buffer.from(bodyAsBytes);

      if (buffer.length !== length) {
        throw new MissMatchedReadingError(length, buffer.length);
      }

      return buffer;
    } catch (error: unknown) {
      // The error can be safely recognized by the "name" property.
      if (
        typeof error === 'object' &&
        error !== null &&
        'name' in error &&
        error.name === 'NoSuchKey'
      ) {
        throw new BlobNotFoundError(key, { cause: error });
      }

      throw error;
    }
  }

  async createReadStream(key: string): Promise<Readable> {
    this.assertAbsoluteKey(key);

    const response = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }),
    );

    if (response.Body === undefined) {
      throw new BlobNotFoundError(key);
    }

    // eslint-disable-next-line n/no-unsupported-features/node-builtins -- Leverage Node.js built-in APIs even it is experimental.
    return Readable.fromWeb(response.Body.transformToWebStream());
  }

  async writeStream(key: string, stream: Readable): Promise<void> {
    this.assertAbsoluteKey(key);

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: stream,
      }),
    );
  }

  getIndexKey(key: string): string {
    this.assertAbsoluteKey(key);

    return path.join(this.indicesPrefix, `${key}.idx`);
  }

  private assertAbsoluteKey(key: string): void {
    if (!path.isAbsolute(key)) {
      throw new InvalidKeyError(`The key "${key}" must be an absolute path.`);
    }
  }
}
