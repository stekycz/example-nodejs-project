import { promises, ReadStream } from 'node:fs';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import { faker } from '@faker-js/faker';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { FileSystemBlobStorage } from '../FileSystemBlobStorage.js';
import {
  BlobNotFoundError,
  InvalidKeyError,
  MissMatchedReadingError,
} from '../errors.js';

const TEMP_DIRECTORY_PATH: string = path.normalize(
  path.join(process.cwd(), 'temp'),
);

const INDEX_FILE_SYSTEM_DIRECTORY_PATH: string = path.normalize(
  path.join(TEMP_DIRECTORY_PATH, 'indices'),
);

describe('FileSystemBlobStorage', () => {
  let testFilePath: string;
  let storage: FileSystemBlobStorage;

  beforeEach(() => {
    testFilePath = path.join(TEMP_DIRECTORY_PATH, faker.system.fileName());

    storage = new FileSystemBlobStorage(INDEX_FILE_SYSTEM_DIRECTORY_PATH);
  });

  afterEach(async () => {
    await promises.rm(testFilePath, { force: true });
  });

  describe('readBytes', () => {
    it('returns the bytes read', async () => {
      const randomString = faker.string.alphanumeric(30);
      await promises.writeFile(testFilePath, randomString);

      const buffer = await storage.readBytes(testFilePath, 10, 20);

      expect(buffer.toString()).toBe(randomString.slice(10, 30));
    });

    it('fails if key is not absolute path', async () => {
      const promise = storage.readBytes('path/to/file.txt', 0, 10);

      await expect(promise).rejects.toThrow(InvalidKeyError);
      await expect(promise).rejects.toThrow(
        'The key "path/to/file.txt" must be an absolute path.',
      );
    });

    it('fails if start is negative', async () => {
      const promise = storage.readBytes('/path/to/file.txt', -1, 10);

      await expect(promise).rejects.toThrow(Error);
      await expect(promise).rejects.toThrow(
        `The start parameter must be a non-negative safe integer, "${(-1).toString()}" given.`,
      );
    });

    it('fails if start is not a safe integer', async () => {
      const promise = storage.readBytes(
        '/path/to/file.txt',
        Number.MAX_SAFE_INTEGER + 1,
        10,
      );

      await expect(promise).rejects.toThrow(Error);
      await expect(promise).rejects.toThrow(
        `The start parameter must be a non-negative safe integer, "${(Number.MAX_SAFE_INTEGER + 1).toString()}" given.`,
      );
    });

    it('fails if length is negative', async () => {
      const promise = storage.readBytes('/path/to/file.txt', 0, -1);

      await expect(promise).rejects.toThrow(Error);
      await expect(promise).rejects.toThrow(
        `The length parameter must be a non-negative safe integer, "${(-1).toString()}" given.`,
      );
    });

    it('fails if length is not a safe integer', async () => {
      const promise = storage.readBytes(
        '/path/to/file.txt',
        0,
        Number.MAX_SAFE_INTEGER + 1,
      );

      await expect(promise).rejects.toThrow(Error);
      await expect(promise).rejects.toThrow(
        `The length parameter must be a non-negative safe integer, "${(Number.MAX_SAFE_INTEGER + 1).toString()}" given.`,
      );
    });

    it('fails with "BlobNotFoundError" when the file does not exist', async () => {
      const promise = storage.readBytes('/unknown/path/to/file.txt', 0, 10);

      await expect(promise).rejects.toThrow(BlobNotFoundError);
      await expect(promise).rejects.toThrow(
        'The blob with the key "/unknown/path/to/file.txt" was not found.',
      );
    });

    it('fails with "MissMatchedReadingError" when bytes red do not match the bytes expected', async () => {
      jest.spyOn(promises, 'open').mockResolvedValueOnce({
        read: jest.fn<promises.FileHandle['read']>().mockResolvedValueOnce({
          bytesRead: 0,
          buffer: Buffer.alloc(0),
        }),
        close: jest.fn<promises.FileHandle['close']>(),
      } as unknown as promises.FileHandle);

      const promise = storage.readBytes('/unknown/path/to/file.txt', 0, 10);

      await expect(promise).rejects.toThrow(MissMatchedReadingError);
      await expect(promise).rejects.toThrow(
        `Different amount of bytes red from the file. Expected ${(10).toString()} but red ${(0).toString()}.`,
      );
    });

    it('fails when there is other error than file not found', async () => {
      jest
        .spyOn(promises, 'open')
        .mockRejectedValueOnce(new Error('TEST ERROR'));

      const promise = storage.readBytes('/unknown/path/to/file.txt', 0, 10);

      await expect(promise).rejects.toThrow(Error);
      await expect(promise).rejects.toThrow('TEST ERROR');
    });
  });

  describe('createReadStream', () => {
    it('returns a readable stream', async () => {
      await promises.writeFile(testFilePath, faker.lorem.paragraphs(10));

      const stream = await storage.createReadStream(testFilePath);

      try {
        expect(stream).toBeInstanceOf(ReadStream);
      } finally {
        stream.destroy();
      }
    });

    it('fails if key is not absolute path', async () => {
      const promise = storage.createReadStream('path/to/file.txt');

      await expect(promise).rejects.toThrow(InvalidKeyError);
      await expect(promise).rejects.toThrow(
        'The key "path/to/file.txt" must be an absolute path.',
      );
    });
  });

  describe('writeStream', () => {
    let stream: PassThrough;

    beforeEach(() => {
      stream = new PassThrough();
    });

    it('writes everything within the stream into the destination', async () => {
      const testData = faker.lorem.paragraphs(10);
      stream.write(testData, 'utf-8');
      setImmediate(() => stream.end());

      await storage.writeStream(testFilePath, stream);

      const content = await promises.readFile(testFilePath, 'utf-8');

      expect(content).toBe(testData);
    });

    it('fails if key is not absolute path', async () => {
      const promise = storage.writeStream('path/to/file.txt', stream);

      await expect(promise).rejects.toThrow(InvalidKeyError);
      await expect(promise).rejects.toThrow(
        'The key "path/to/file.txt" must be an absolute path.',
      );
    });
  });

  describe('getIndexKey', () => {
    it('returns the index key', () => {
      const indexKey = storage.getIndexKey('/path/to/file.txt');

      expect(indexKey).toBe(`${INDEX_FILE_SYSTEM_DIRECTORY_PATH}/file.txt.idx`);
    });

    it('fails if key is not absolute path', () => {
      const testFunction = () => {
        storage.getIndexKey('path/to/file.txt');
      };

      expect(testFunction).toThrow(InvalidKeyError);
      expect(testFunction).toThrow(
        'The key "path/to/file.txt" must be an absolute path.',
      );
    });
  });
});
