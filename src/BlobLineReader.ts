import type { BlobIndexReader, LineIndexInfo } from './blob/index/types.js';
import type { BlobStorage } from './blob/storage/types.js';

export interface BlobLineReader {
  getLine(filePath: string, lineIndex: number): Promise<string>;
}

export class IndexedBlobLineReader implements BlobLineReader {
  public constructor(
    private readonly sourceStorage: BlobStorage,
    private readonly blobIndexReader: BlobIndexReader,
  ) {}

  public async getLine(sourceKey: string, lineIndex: number): Promise<string> {
    const indexInfo: LineIndexInfo =
      await this.blobIndexReader.getLineIndexInfo(sourceKey, lineIndex);

    const lineBuffer: Buffer = await this.sourceStorage.readBytes(
      sourceKey,
      indexInfo.position,
      indexInfo.length,
    );

    return lineBuffer.toString();
  }
}
