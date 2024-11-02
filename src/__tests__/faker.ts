import { createHash } from 'node:crypto';
import { EOL } from 'node:os';
import { faker } from '@faker-js/faker';
import { expect, jest } from '@jest/globals';

const IDE_DETECTION_SUBSTRINGS: readonly string[] = ['jetbrains', 'intellij'];

// JetBrains sets NODE_OPTIONS or adjusts process.argv to make sure that their own file is required before Jest is started
const IDE_DETECTION_VALUES: readonly string[] = [
  process.env['NODE_OPTIONS'] ?? '',
  process.argv.join(' '),
];

const isRunningInsideIde = (): boolean => {
  return IDE_DETECTION_VALUES.some((value) =>
    IDE_DETECTION_SUBSTRINGS.some((substring) =>
      value.toLowerCase().includes(substring),
    ),
  );
};

const rootDirectory = process.cwd();

const testPath = expect.getState().testPath;
if (testPath == null) {
  throw new Error('Unexpected state, testPath must be present.');
}
// Try to get same results everywhere, regardless of the starting path
const relativeTestPath = testPath.startsWith(rootDirectory)
  ? testPath.substring(rootDirectory.length)
  : testPath;

// Keep number relatively small
// https://github.com/jestjs/jest/blob/299ab5c725575a302f0817806d31897cf793ac4d/packages/jest-config/src/normalize.ts#LL1049C42-L1049C48
const relativeTestPathHash = createHash('sha256')
  .update(relativeTestPath)
  .digest('hex')
  .substring(0, 6);
const relativeTestPathChecksum = Number.parseInt(relativeTestPathHash, 16);

const fakerSeed = jest.getSeed() ^ relativeTestPathChecksum;
faker.seed(fakerSeed);

if (isRunningInsideIde()) {
  // Dump the seed, as JetBrains IDE does not show the seed in the IDE
  process.stdout.write(`Using Jest --seed=${jest.getSeed().toString()}${EOL}`);
}
