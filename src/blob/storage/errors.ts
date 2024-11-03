export class BlobNotFoundError extends Error {
  public constructor(
    public readonly key: string,
    options?: ErrorOptions,
  ) {
    super(`The blob with the key "${key}" was not found.`, options);
    this.name = this.constructor.name;
  }
}

export class InvalidKeyError extends Error {
  public constructor(
    public readonly key: string,
    options?: ErrorOptions,
  ) {
    super(`The key "${key}" must be an absolute path.`, options);
    this.name = this.constructor.name;
  }
}

export class MissMatchedReadingError extends Error {
  public constructor(
    public readonly expected: number,
    public readonly actual: number,
    options?: ErrorOptions,
  ) {
    super(
      `Different amount of bytes red from the file. Expected ${expected.toString()} but red ${actual.toString()}.`,
      options,
    );
    this.name = this.constructor.name;
  }
}
