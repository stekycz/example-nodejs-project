# Example Project

This project is an example of a simple Node.js application.

The application reads a file from a storage (local file system or AWS S3 bucket) and prints the selected line from the source file to the output. The file and the line is selected on the CLI (or programmatically) by the user. Lines are indexed by their position in the file starting from 0.

## Possible improvements

- Create a single module to reuse the definition of tests directories and file paths
- Add integration tests for AWS S3 storage using [LocalStack](https://github.com/localstack/localstack)
- Add tests for the `getLine` entrypoint executing a subprocess
- Consider adding more custom errors for specific cases that currently throw generic `Error`
- Consider adding more `BlobLineReader` implementations for different algorithms
- Support index on AWS S3 bigger than 5 GB by using multipart uploads
- Fine-tune stream options for the best performance possible
- Re-evaluate abstraction levels and refactor the code to make it more readable and maintainable
