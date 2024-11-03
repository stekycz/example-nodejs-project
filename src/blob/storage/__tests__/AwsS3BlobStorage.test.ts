import { S3Client } from '@aws-sdk/client-s3';
import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, it } from '@jest/globals';
import { AwsS3BlobStorage } from '../AwsS3BlobStorage.js';
import { InvalidKeyError } from '../errors.js';

const INDICES_PREFIX = 'indices';

describe('AwsS3BlobStorage', () => {
  let storage: AwsS3BlobStorage;

  beforeEach(() => {
    const s3Client = new S3Client();
    const bucketName = faker.internet.domainWord();
    storage = new AwsS3BlobStorage(s3Client, bucketName, INDICES_PREFIX);
  });

  describe('getIndexKey', () => {
    it('returns the index key', () => {
      const indexKey = storage.getIndexKey('/path/to/file.txt');

      expect(indexKey).toBe(`${INDICES_PREFIX}/path/to/file.txt.idx`);
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
