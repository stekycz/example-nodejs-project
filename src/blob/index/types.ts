export interface LineIndexInfo {
  readonly position: number;
  readonly length: number;
}

export interface BlobIndexCreator {
  createIndex(sourceKey: string): Promise<void>;
}

export interface BlobIndexReader {
  getLineIndexInfo(
    sourceKey: string,
    lineIndex: number,
  ): Promise<LineIndexInfo>;
}

export interface BlobIndex extends BlobIndexCreator, BlobIndexReader {}
