import { promises, createWriteStream } from 'node:fs';
import path from 'node:path';
import { finished } from 'node:stream/promises';
import { faker } from '@faker-js/faker';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  IndexedBlobLineReader,
  type BlobLineReader,
} from '../BlobLineReader.js';
import { BinaryBlobIndex } from '../blob/index/BinaryBlobIndex.js';
import { GracefulBlobIndexReader } from '../blob/index/GracefulBlobIndexReader.js';
import { FileSystemBlobStorage } from '../blob/storage/FileSystemBlobStorage.js';

const TEMP_DIRECTORY_PATH: string = path.normalize(
  path.join(process.cwd(), 'temp'),
);

const INDEX_FILE_SYSTEM_DIRECTORY_PATH: string = path.normalize(
  path.join(TEMP_DIRECTORY_PATH, 'indices'),
);

describe('BlobLineReader', () => {
  const lineCount = 1_000_000;
  let testFilePath: string;
  let firstLine: string;
  let middleLine: string;
  let lastLine: string;
  let blobLineReader: BlobLineReader;

  beforeAll(async () => {
    testFilePath = path.join(TEMP_DIRECTORY_PATH, faker.system.fileName());

    // This is a simple version to generate high-volume testing data. We should take care of handling writable stream
    // events to prevent possible unexpected results caused by full stream (i.e. reaching high watermark).
    // It is good enough for those tests though.
    const writableStream = createWriteStream(testFilePath);
    for (let i = 0; i < lineCount; i++) {
      const line = faker.lorem.sentence();
      if (i === 0) {
        firstLine = line;
      }
      if (i === Math.floor(lineCount / 2)) {
        middleLine = line;
      }
      if (i === lineCount - 1) {
        lastLine = line;
      }
      writableStream.write(`${line}\n`);
    }
    writableStream.end();
    await finished(writableStream);

    const storage = new FileSystemBlobStorage(INDEX_FILE_SYSTEM_DIRECTORY_PATH);
    const index = new BinaryBlobIndex(storage, storage, Buffer.from('\n'));
    const indexReader = new GracefulBlobIndexReader(index);
    blobLineReader = new IndexedBlobLineReader(storage, indexReader);
  }, 20_000);

  afterAll(async () => {
    await promises.rm(
      path.join(
        INDEX_FILE_SYSTEM_DIRECTORY_PATH,
        `${path.basename(testFilePath)}.idx`,
      ),
      { force: true },
    );
    await promises.rm(testFilePath, { force: true });
  });

  describe('getLine', () => {
    it('returns the expected first line', async () => {
      await expect(blobLineReader.getLine(testFilePath, 0)).resolves.toBe(
        firstLine,
      );
    });

    it('returns the expected middle line', async () => {
      await expect(
        blobLineReader.getLine(testFilePath, Math.floor(lineCount / 2)),
      ).resolves.toBe(middleLine);
    });

    it('returns the expected last line', async () => {
      await expect(
        blobLineReader.getLine(testFilePath, lineCount - 1),
      ).resolves.toBe(lastLine);
    });
  });
});
