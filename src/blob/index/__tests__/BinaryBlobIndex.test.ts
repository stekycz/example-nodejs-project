import { promises } from 'node:fs';
import path from 'node:path';
import { faker } from '@faker-js/faker';
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { FileSystemBlobStorage } from '../../storage/FileSystemBlobStorage.js';
import { BinaryBlobIndex } from '../BinaryBlobIndex.js';
import { IndexNotFoundError, LineIndexOutOfBoundError } from '../errors.js';

const TEMP_DIRECTORY_PATH: string = path.normalize(
  path.join(process.cwd(), 'temp'),
);

const INDEX_FILE_SYSTEM_DIRECTORY_PATH: string = path.normalize(
  path.join(TEMP_DIRECTORY_PATH, 'indices'),
);

describe('BinaryBlobIndex', () => {
  let testFilePath: string;
  let lines: string[];
  let storage: FileSystemBlobStorage;
  let index: BinaryBlobIndex;

  beforeEach(() => {
    testFilePath = path.join(TEMP_DIRECTORY_PATH, faker.system.fileName());
    lines = [];

    storage = new FileSystemBlobStorage(INDEX_FILE_SYSTEM_DIRECTORY_PATH);
    index = new BinaryBlobIndex(storage, storage, Buffer.from('\n'));
  });

  afterEach(async () => {
    await promises.rm(
      path.join(
        INDEX_FILE_SYSTEM_DIRECTORY_PATH,
        `${path.basename(testFilePath)}.idx`,
      ),
      { force: true },
    );
    await promises.rm(testFilePath, { force: true });
  });

  describe('createIndex', () => {
    it('creates index with the expected content when there is NOT an empty line at the end', async () => {
      for (let i = 0; i < 10; i++) {
        lines.push(faker.lorem.sentence());
      }
      // Lines are joined by the line delimiter in between but the last one is missing using `join`
      await promises.writeFile(testFilePath, lines.join('\n'));

      await index.createIndex(testFilePath);

      const indexKey: string = storage.getIndexKey(testFilePath);
      const indexContent: Buffer = await promises.readFile(indexKey);

      let expectedIndexCounter = 0;
      const expectedIndex: number[] = [];
      for (const line of lines) {
        expectedIndex.push(expectedIndexCounter);
        // The line delimiter length is added to the expected index counter for the next item in the index
        expectedIndexCounter += Buffer.from(line).length + 1;
      }
      // Adding last item to be able to read next position for the last line
      expectedIndex.push(expectedIndexCounter);

      const actualIndex: number[] = [];
      // There needs to be 11 items in the index as there are 10 lines and the last line delimiter is missing (but the value needs to be there)
      for (let i = 0; i < 11; i++) {
        actualIndex.push(Number(indexContent.readBigUInt64BE(i * 8)));
      }

      expect(actualIndex).toStrictEqual(expectedIndex);
    });

    it('creates index with the expected content when there is an empty line at the end', async () => {
      for (let i = 0; i < 10; i++) {
        lines.push(faker.lorem.sentence());
      }
      // Lines are joined by the line delimiter in between but the last one is missing using `join` so we add one at the end
      await promises.writeFile(testFilePath, `${lines.join('\n')}\n`);

      await index.createIndex(testFilePath);

      const indexKey: string = storage.getIndexKey(testFilePath);
      const indexContent: Buffer = await promises.readFile(indexKey);

      let expectedIndexCounter = 0;
      const expectedIndex: number[] = [];
      for (const line of lines) {
        expectedIndex.push(expectedIndexCounter);
        // The line delimiter length is added to the expected index counter for the next item in the index
        expectedIndexCounter += Buffer.from(line).length + 1;
      }
      // Adding last item to be able to read next position for the last line
      expectedIndex.push(expectedIndexCounter);

      const actualIndex: number[] = [];
      // There needs to be 11 items in the index as there are 10 lines and the last line delimiter is present
      for (let i = 0; i < 11; i++) {
        actualIndex.push(Number(indexContent.readBigUInt64BE(i * 8)));
      }

      expect(actualIndex).toStrictEqual(expectedIndex);
    });
  });

  describe('getLineIndexInfo', () => {
    beforeEach(async () => {
      for (let i = 0; i < 10; i++) {
        lines.push(faker.lorem.sentence());
      }
      await promises.writeFile(testFilePath, lines.join('\n'));
    });

    it('returns the expected line index info', async () => {
      await index.createIndex(testFilePath);

      // First line
      await expect(
        index.getLineIndexInfo(testFilePath, 0),
      ).resolves.toStrictEqual({
        position: 0,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- The line is always present in this test
        length: Buffer.from(lines[0]!).length,
      });

      // Middle line
      const middleLineIndex = 4;

      await expect(
        index.getLineIndexInfo(testFilePath, middleLineIndex),
      ).resolves.toStrictEqual({
        position: lines.reduce(
          (sum, line, index) =>
            sum + (index < middleLineIndex ? Buffer.from(line).length + 1 : 0),
          0,
        ),
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- The line is always present in this test
        length: Buffer.from(lines[middleLineIndex]!).length,
      });

      // Last line
      const lastLineIndex = lines.length - 1;

      await expect(
        index.getLineIndexInfo(testFilePath, lastLineIndex),
      ).resolves.toStrictEqual({
        position: lines.reduce(
          (sum, line, index) =>
            sum + (index < lastLineIndex ? Buffer.from(line).length + 1 : 0),
          0,
        ),
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- The line is always present in this test
        length: Buffer.from(lines[lastLineIndex]!).length,
      });
    });

    it('fails when the line index is negative', async () => {
      const promise = index.getLineIndexInfo(testFilePath, -1);

      await expect(promise).rejects.toThrow(Error);
      await expect(promise).rejects.toThrow(
        `Line index has to be a non-negative safe integer, "${(-1).toString()}" given.`,
      );
    });

    it('fails with "IndexNotFoundError" for missing index', async () => {
      const promise = index.getLineIndexInfo(testFilePath, 10);

      await expect(promise).rejects.toThrow(IndexNotFoundError);
      await expect(promise).rejects.toThrow(
        `Index for the key "${testFilePath}" not found.`,
      );
    });

    it('fails when the line index is greater than the number of lines within the file', async () => {
      await index.createIndex(testFilePath);

      const promise = index.getLineIndexInfo(testFilePath, 20);

      await expect(promise).rejects.toThrow(LineIndexOutOfBoundError);
      await expect(promise).rejects.toThrow(
        `The line index "20" is out of bound of the source blob.`,
      );
    });

    it('fails when the position is not a safe integer', async () => {
      const buffer = Buffer.alloc(16);
      buffer.writeBigUInt64BE(BigInt(Number.MAX_SAFE_INTEGER + 1));
      buffer.writeBigUInt64BE(10n, 8);
      jest.spyOn(storage, 'readBytes').mockResolvedValueOnce(buffer);

      const promise = index.getLineIndexInfo(testFilePath, 20);

      await expect(promise).rejects.toThrow(Error);
      await expect(promise).rejects.toThrow(
        `The position must be a safe integer.`,
      );
    });

    it('fails when the next position is not a safe integer', async () => {
      const buffer = Buffer.alloc(16);
      buffer.writeBigUInt64BE(10n);
      buffer.writeBigUInt64BE(BigInt(Number.MAX_SAFE_INTEGER + 1), 8);
      jest.spyOn(storage, 'readBytes').mockResolvedValueOnce(buffer);

      const promise = index.getLineIndexInfo(testFilePath, 20);

      await expect(promise).rejects.toThrow(Error);
      await expect(promise).rejects.toThrow(
        `The next position must be a safe integer.`,
      );
    });
  });
});
