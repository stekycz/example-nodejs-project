import path from 'node:path';
import { parseArgs } from 'node:util';
import {
  IndexedBlobLineReader,
  type BlobLineReader,
} from '../BlobLineReader.js';
import { BinaryBlobIndex } from '../blob/index/BinaryBlobIndex.js';
import { GracefulBlobIndexReader } from '../blob/index/GracefulBlobIndexReader.js';
import { FileSystemBlobStorage } from '../blob/storage/FileSystemBlobStorage.js';
import type { BlobIndexReader, BlobIndex } from '../blob/index/types.js';
import type { BlobStorage } from '../blob/storage/types.js';

const LINE_DELIMITER: Buffer = Buffer.from('\n');

const INDEX_FILE_SYSTEM_DIRECTORY_PATH: string = path.normalize(
  path.join(process.cwd(), 'temp/indices'),
);

const {
  values: { filePath, lineIndex },
} = parseArgs({
  options: {
    filePath: {
      type: 'string',
    },
    lineIndex: {
      type: 'string',
    },
  },
});

if (filePath === undefined || lineIndex === undefined) {
  throw new Error('Both file path and line index are required');
}

const normalizedFilePath: string = path.resolve(path.normalize(filePath));

const lineIndexParsed: number = Number.parseInt(lineIndex, 10);

if (
  Number.isNaN(lineIndexParsed) ||
  !Number.isSafeInteger(lineIndexParsed) ||
  lineIndexParsed < 0
) {
  throw new Error(
    `Line index must be a non-negative integer, "${lineIndex}" given.`,
  );
}

const blobStorage: BlobStorage = new FileSystemBlobStorage(
  INDEX_FILE_SYSTEM_DIRECTORY_PATH,
);

const blobIndex: BlobIndex = new BinaryBlobIndex(
  blobStorage,
  blobStorage,
  LINE_DELIMITER,
);

const blobIndexReader: BlobIndexReader = new GracefulBlobIndexReader(blobIndex);

const blobLineFinder: BlobLineReader = new IndexedBlobLineReader(
  blobStorage,
  blobIndexReader,
);

const line: string = await blobLineFinder.getLine(
  normalizedFilePath,
  lineIndexParsed,
);

console.log(line);
