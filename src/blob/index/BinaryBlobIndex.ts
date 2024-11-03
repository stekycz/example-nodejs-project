import { Transform, type TransformCallback } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import {
  BlobNotFoundError,
  MissMatchedReadingError,
} from '../storage/errors.js';
import { IndexNotFoundError, LineIndexOutOfBoundError } from './errors.js';
import type { BlobIndex, LineIndexInfo } from './types.js';
import type { BlobStorage } from '../storage/types.js';

const BIG_UINT_64_BYTES = 8;

export class BinaryBlobIndex implements BlobIndex {
  public constructor(
    private readonly sourceBlobStorage: BlobStorage,
    private readonly indexBlobStorage: BlobStorage,
    private readonly newLineDelimiter: Buffer,
  ) {}

  async createIndex(sourceKey: string): Promise<void> {
    const indexKey: string = this.indexBlobStorage.getIndexKey(sourceKey);

    // Use streams to prevent out of memory errors or too large memory consumption while leveraging the best throughput possible.
    const indexingTransformStream = createLinesIndexingTransformStream(
      this.newLineDelimiter,
    );
    const pipelinePromise = pipeline(
      await this.sourceBlobStorage.createReadStream(sourceKey),
      indexingTransformStream,
    );
    const writePromise = this.indexBlobStorage.writeStream(
      indexKey,
      indexingTransformStream,
    );

    // Wait for the pipeline to finish
    await pipelinePromise;
    await writePromise;
  }

  async getLineIndexInfo(
    sourceKey: string,
    lineIndex: number,
  ): Promise<LineIndexInfo> {
    if (lineIndex < 0 || !Number.isSafeInteger(lineIndex)) {
      throw new Error(
        `Line index has to be a non-negative safe integer, "${lineIndex.toString()}" given.`,
      );
    }

    const indexKey: string = this.indexBlobStorage.getIndexKey(sourceKey);

    try {
      // Read 2 offsets from index - start of the requested line and start of the next line (or the end of the file).
      // Input values are in bytes so we have to recalculate them by byte length for the values that were written to
      // the index.
      // This might fail requesting line index greater than index values. However, that should be distinguished from
      // failure by read and by missing data. It always fails for empty input file.
      const indexBuffer: Buffer = await this.indexBlobStorage.readBytes(
        indexKey,
        lineIndex * BIG_UINT_64_BYTES,
        2 * BIG_UINT_64_BYTES,
      );

      const position = Number(indexBuffer.readBigUInt64BE());
      const nextPosition = Number(
        indexBuffer.readBigUInt64BE(BIG_UINT_64_BYTES),
      );

      if (!Number.isSafeInteger(position)) {
        throw new Error(`The position must be a safe integer.`);
      }
      if (!Number.isSafeInteger(nextPosition)) {
        throw new Error(`The next position must be a safe integer.`);
      }

      // The line length is start of the next line minus start of the requested line minus the new line character.
      const length: number =
        nextPosition - position - this.newLineDelimiter.length;

      return {
        position,
        length,
      };
    } catch (error: unknown) {
      if (error instanceof BlobNotFoundError) {
        throw new IndexNotFoundError(sourceKey, { cause: error });
      }
      if (error instanceof MissMatchedReadingError) {
        throw new LineIndexOutOfBoundError(lineIndex, { cause: error });
      }

      throw error;
    }
  }
}

function createLinesIndexingTransformStream(
  newLineDelimiter: Buffer,
): Transform {
  // Linear increasing absolute offset of bytes in the original file starting at the beginning.
  let offsetCursor = 0;
  // Keep track of how many bytes have not been index in the last chunk.
  let lastOverflow = 0;

  return new Transform({
    transform: (
      chunk: unknown,
      encoding: BufferEncoding,
      callback: TransformCallback,
    ): void => {
      // This case should not happen, however, it is better to handle it anyway. It also adds type inference from
      // Typescript to `chunk` value.
      if (!Buffer.isBuffer(chunk)) {
        callback(
          new Error(
            `Unexpected chunk given. Buffer expected but "${typeof chunk}" given.`,
          ),
        );
        return;
      }

      const indexChunk: number[] = [];

      // We want to iterate the chunk by bytes so we cannot use `.toString().split('\n')` to prevent wrong results
      // possibly caused by UTF-8 multibyte characters (e.g. emoji).
      // Chunk position is the loop iteration variable to jump from one line end to another without need to iterate
      // over each byte manually (but leveraging the `indexOf` performance).
      let chunkPosition = 0;

      // Helper variable to check existence of a line end in the chunk.
      let lineDelimiterIndex = -1;

      offsetCursor += lastOverflow;

      // Start by looking for a line end in the given chunk. End the loop when not found in the remaining chunk bytes.
      // The remaining bytes are detected by `chunkPosition`.
      while (
        (lineDelimiterIndex = chunk.indexOf(
          newLineDelimiter,
          chunkPosition,
        )) !== -1
      ) {
        // Add current offset cursor to the index to have the line indexed under its (absolute) array index.
        // Sending each chunk index separately does not change the absolute line index in the resulting index file
        // because these data are saved in sequence.
        indexChunk.push(offsetCursor);

        // Move the chunk position to the byte after the line end.
        const newChunkPosition: number =
          lineDelimiterIndex + newLineDelimiter.length;

        // Increase offset cursor by line length.
        const lineLength: number = newChunkPosition - chunkPosition;
        offsetCursor = offsetCursor + lineLength;

        chunkPosition = newChunkPosition;
      }
      // Do not forget to remember remaining chunk bytes because they are part of the next line
      // that will end in one of the following chunks.
      lastOverflow = chunk.length - chunkPosition;

      // Send the index to be saved. If the chunk does not contain any line then the index is empty and nothing
      // will be saved. However, we could add a condition to check it for a possible micro-optimization.
      const buffer = Buffer.alloc(indexChunk.length * BIG_UINT_64_BYTES);
      let i = 0;
      for (const indexItem of indexChunk) {
        buffer.writeBigUInt64BE(BigInt(indexItem), i * BIG_UINT_64_BYTES);
        i++;
      }
      callback(null, buffer);
    },
    flush: (callback: TransformCallback): void => {
      // Add the last offset cursor to the index at the end to support known line length for the last line in the file.
      const buffer = Buffer.alloc(2 * BIG_UINT_64_BYTES);
      buffer.writeBigUInt64BE(BigInt(offsetCursor));
      buffer.writeBigUInt64BE(
        // We always need to add the line delimiter length to the last line length to have the correct index.
        BigInt(offsetCursor + lastOverflow + newLineDelimiter.length),
        BIG_UINT_64_BYTES,
      );
      callback(null, buffer);
    },
  });
}
