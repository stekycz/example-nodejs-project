export class IndexNotFoundError extends Error {
  public constructor(
    public readonly key: string,
    options?: ErrorOptions,
  ) {
    super(`Index for the key "${key}" not found.`, options);
    this.name = this.constructor.name;
  }
}

export class LineIndexOutOfBoundError extends Error {
  public constructor(
    public readonly lineIndex: number,
    options?: ErrorOptions,
  ) {
    super(
      `The line index "${lineIndex.toString()}" is out of bound of the source blob.`,
      options,
    );
    this.name = this.constructor.name;
  }
}
