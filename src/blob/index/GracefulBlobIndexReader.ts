import { IndexNotFoundError } from './errors.js';
import type { BlobIndex, BlobIndexReader, LineIndexInfo } from './types.js';

export class GracefulBlobIndexReader implements BlobIndexReader {
  public constructor(private readonly blobIndex: BlobIndex) {}

  async getLineIndexInfo(
    sourceKey: string,
    lineIndex: number,
  ): Promise<LineIndexInfo> {
    try {
      return await this.blobIndex.getLineIndexInfo(sourceKey, lineIndex);
    } catch (error: unknown) {
      if (error instanceof IndexNotFoundError) {
        await this.blobIndex.createIndex(sourceKey);

        return this.blobIndex.getLineIndexInfo(sourceKey, lineIndex);
      }

      throw error;
    }
  }
}
