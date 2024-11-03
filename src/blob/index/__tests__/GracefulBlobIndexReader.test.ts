import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GracefulBlobIndexReader } from '../GracefulBlobIndexReader.js';
import { IndexNotFoundError } from '../errors.js';
import type { BlobIndex } from '../types.js';

describe('GracefulBlobIndexReader', () => {
  let reader: GracefulBlobIndexReader;
  let createIndexMock: jest.Mocked<BlobIndex['createIndex']>;
  let getLineIndexInfoMock: jest.Mocked<BlobIndex['getLineIndexInfo']>;

  beforeEach(() => {
    createIndexMock = jest.fn();
    getLineIndexInfoMock = jest.fn();

    reader = new GracefulBlobIndexReader({
      createIndex: createIndexMock,
      getLineIndexInfo: getLineIndexInfoMock,
    });
  });

  describe('getLineIndexInfo', () => {
    it('returns the line index info', async () => {
      const sourceKey = 'sourceKey';
      const lineIndex = 42;
      const lineIndexInfo = { position: 12, length: 34 };

      getLineIndexInfoMock.mockResolvedValueOnce(lineIndexInfo);

      await expect(reader.getLineIndexInfo(sourceKey, lineIndex)).resolves.toBe(
        lineIndexInfo,
      );

      expect(getLineIndexInfoMock).toHaveBeenNthCalledWith(
        1,
        sourceKey,
        lineIndex,
      );
      expect(getLineIndexInfoMock).toHaveBeenCalledTimes(1);

      expect(createIndexMock).toHaveBeenCalledTimes(0);
    });

    it('returns the line index info after creating the index', async () => {
      const sourceKey = 'sourceKey';
      const lineIndex = 42;
      const lineIndexInfo = { position: 12, length: 34 };

      getLineIndexInfoMock
        .mockRejectedValueOnce(new IndexNotFoundError('TEST ERROR'))
        .mockResolvedValueOnce(lineIndexInfo);

      await expect(reader.getLineIndexInfo(sourceKey, lineIndex)).resolves.toBe(
        lineIndexInfo,
      );

      expect(getLineIndexInfoMock).toHaveBeenNthCalledWith(
        1,
        sourceKey,
        lineIndex,
      );
      expect(getLineIndexInfoMock).toHaveBeenNthCalledWith(
        2,
        sourceKey,
        lineIndex,
      );
      expect(getLineIndexInfoMock).toHaveBeenCalledTimes(2);

      expect(createIndexMock).toHaveBeenNthCalledWith(1, sourceKey);
      expect(createIndexMock).toHaveBeenCalledTimes(1);
    });

    it('fails on other than "IndexNotFoundError"', async () => {
      const sourceKey = 'sourceKey';
      const lineIndex = 42;

      getLineIndexInfoMock.mockRejectedValueOnce(new Error('TEST ERROR'));

      const promise = reader.getLineIndexInfo(sourceKey, lineIndex);

      await expect(promise).rejects.toThrow(Error);
      await expect(promise).rejects.toThrow('TEST ERROR');

      expect(getLineIndexInfoMock).toHaveBeenNthCalledWith(
        1,
        sourceKey,
        lineIndex,
      );
      expect(getLineIndexInfoMock).toHaveBeenCalledTimes(1);

      expect(createIndexMock).toHaveBeenCalledTimes(0);
    });

    it('fails even on "IndexNotFoundError" when the index is created but removed before being used', async () => {
      const sourceKey = 'sourceKey';
      const lineIndex = 42;

      getLineIndexInfoMock
        .mockRejectedValueOnce(new IndexNotFoundError('TEST ERROR'))
        .mockRejectedValueOnce(new IndexNotFoundError('TEST ERROR 2'));

      const promise = reader.getLineIndexInfo(sourceKey, lineIndex);

      await expect(promise).rejects.toThrow(IndexNotFoundError);
      await expect(promise).rejects.toThrow('TEST ERROR 2');

      expect(getLineIndexInfoMock).toHaveBeenNthCalledWith(
        1,
        sourceKey,
        lineIndex,
      );
      expect(getLineIndexInfoMock).toHaveBeenNthCalledWith(
        2,
        sourceKey,
        lineIndex,
      );
      expect(getLineIndexInfoMock).toHaveBeenCalledTimes(2);

      expect(createIndexMock).toHaveBeenNthCalledWith(1, sourceKey);
      expect(createIndexMock).toHaveBeenCalledTimes(1);
    });
  });
});
