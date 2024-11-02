const EXTENSIONS = ['ts', 'mts', 'cts', 'js', 'mjs', 'cjs'];

const DEFAULT_TS_JEST_OPTIONS = {
  // As we have `isolatedModules: true` check enabled in our TSConfig, we can afford to skip expensive checks here.
  // https://kulshekhar.github.io/ts-jest/docs/getting-started/options/isolatedModules/
  isolatedModules: true,
  // After upgrade to ts-jest 29.2.1+, the bug https://github.com/kulshekhar/ts-jest/issues/4198 was solved,
  // and we should be able to inherit values from default tsconfig.
  tsconfig: {
    module: 'es2022',
    moduleResolution: 'Node',
  },
};

/**
 * @see https://docs.github.com/en/actions/learn-github-actions/environment-variables#default-environment-variables
 */
const isRunningInGitHubActions = process.env['GITHUB_ACTIONS'] === 'true';

/** @type {import('jest').Config} */
const config = {
  // https://jestjs.io/docs/configuration#testmatch-arraystring
  testMatch: [`<rootDir>/src/**/__tests__/*.test.(${EXTENSIONS.join('|')})`],

  // https://jestjs.io/docs/configuration#verbose-boolean
  verbose: true,
  // https://jestjs.io/docs/configuration#errorondeprecated-boolean
  errorOnDeprecated: true,

  // https://jestjs.io/docs/configuration#reporters-arraymodulename--modulename-options
  reporters: isRunningInGitHubActions
    ? [
        ['github-actions', { silent: false }],
        ['summary', { summaryThreshold: 0 }],
      ]
    : [['default', { summaryThreshold: 0 }]],

  // https://jestjs.io/docs/configuration#clearmocks-boolean
  clearMocks: true,
  // https://jestjs.io/docs/configuration#resetmocks-boolean
  resetMocks: true,
  // https://jestjs.io/docs/configuration#restoremocks-boolean
  restoreMocks: true,

  // https://jestjs.io/docs/configuration#modulefileextensions-arraystring
  moduleFileExtensions: [...EXTENSIONS, 'json', 'node'],

  ...(isRunningInGitHubActions ? { ci: true } : {}),

  // https://jestjs.io/docs/configuration#setupfilesafterenv-array
  setupFilesAfterEnv: ['./src/__tests__/faker.ts'],
  // Seed is used to init faker. Show it in case Faker is being used.
  // https://jestjs.io/docs/cli#--showseed
  showSeed: true,

  // https://jestjs.io/docs/configuration#testenvironment-string
  testEnvironment: 'node',

  // https://kulshekhar.github.io/ts-jest/docs/guides/esm-support/
  // https://jestjs.io/docs/configuration#extensionstotreatasesm-arraystring
  extensionsToTreatAsEsm: ['.ts', '.mts'],

  // https://kulshekhar.github.io/ts-jest/docs/guides/esm-support/
  // https://jestjs.io/docs/configuration#modulenamemapper-objectstring-string--arraystring
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.[cm]?js$': '$1',
  },

  // https://jestjs.io/docs/configuration#transform-objectstring-pathtotransformer--pathtotransformer-object
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        ...DEFAULT_TS_JEST_OPTIONS,
        // https://kulshekhar.github.io/ts-jest/docs/guides/esm-support/
        useESM: true,
      },
    ],
    '^.+\\.mts$': [
      'ts-jest',
      {
        ...DEFAULT_TS_JEST_OPTIONS,
        // https://kulshekhar.github.io/ts-jest/docs/guides/esm-support/
        useESM: true,
      },
    ],
    '^.+\\.cts$': [
      'ts-jest',
      {
        ...DEFAULT_TS_JEST_OPTIONS,
        // https://kulshekhar.github.io/ts-jest/docs/guides/esm-support/
        useESM: false,
      },
    ],
  },
};

export default config;
