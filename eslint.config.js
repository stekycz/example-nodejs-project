import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';
import jsEslint from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import arrayFuncPlugin from 'eslint-plugin-array-func';
import importPlugin from 'eslint-plugin-import';
import jestPlugin from 'eslint-plugin-jest';
import nodePlugin from 'eslint-plugin-n';
import promisePlugin from 'eslint-plugin-promise';
import globals from 'globals';
import {
  config as tsEslintConfig,
  configs as tsEslintConfigs,
} from 'typescript-eslint';

const __dirname = dirname(fileURLToPath(import.meta.url));

// NOTE: This provides compatibility bridge between non-migrated ESLint RC format of the config and new ESLint Flat Config.
// This is a temporary solution until all the configs (especially configs from 3rd party plugins) are migrated to the new format.
//
// @see https://eslint.org/docs/latest/use/configure/migration-guide#using-eslintrc-configs-in-flat-config
const flatCompat = new FlatCompat({
  baseDirectory: __dirname,
});

const config = tsEslintConfig(
  // Global list of ignored files
  {
    ignores: ['dist/**', 'node_modules/**'],
  },

  // Using standard configurations and plugins
  jsEslint.configs.recommended,
  ...tsEslintConfigs.strictTypeChecked,
  ...tsEslintConfigs.stylisticTypeChecked,
  arrayFuncPlugin.configs.all,
  nodePlugin.configs['flat/recommended'],
  importPlugin.flatConfigs.recommended,
  importPlugin.flatConfigs.typescript,
  promisePlugin.configs['flat/recommended'],
  ...flatCompat.extends('plugin:eslint-comments/recommended'),

  // Common language and linter setup
  {
    languageOptions: {
      // "ecmaVersion": Must be same (or lower) than tsconfig "target" option.
      // "globals.es*": Must be same (or lower) than "ecmaVersion" here
      ecmaVersion: 2023,
      globals: {
        ...globals.es2021,
        ...globals.node,
      },
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    settings: {
      // https://github.com/import-js/eslint-plugin-import?tab=readme-ov-file#importextensions
      'import/extensions': [
        '.ts',
        '.mts',
        '.cts',
        '.js',
        '.mjs',
        '.cjs',
        '.json',
        '.node',
      ],
      'import/parsers': {
        '@typescript-eslint/parser': [
          '.ts',
          '.mts',
          '.cts',
          '.js',
          '.mjs',
          '.cjs',
        ],
      },
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
        },
        node: {
          extensions: [
            '.ts',
            '.mts',
            '.cts',
            '.js',
            '.mjs',
            '.cjs',
            '.json',
            '.node',
          ],
        },
      },
    },
  },

  // Jest configuration
  {
    files: ['**/__tests__/*.test.{ts,mts,cts,js,mjs,cjs}'],
    extends: [
      jestPlugin.configs['flat/recommended'],
      jestPlugin.configs['flat/style'],
      {
        rules: {
          'jest/no-confusing-set-timeout': 'error',
          'jest/no-test-return-statement': 'error',
          'jest/padding-around-all': 'error',
          'jest/prefer-each': 'error',
          'jest/prefer-equality-matcher': 'error',
          'jest/prefer-mock-promise-shorthand': 'error',
          'jest/prefer-spy-on': 'error',
          'jest/prefer-strict-equal': 'error',
        },
      },
    ],
  },

  // Custom configuration of rules
  {
    rules: {
      // Plain ESLint
      'array-callback-return': [
        'error',
        {
          checkForEach: true,
        },
      ],
      'block-scoped-var': 'error',
      // See https://github.com/prettier/eslint-config-prettier#curly
      curly: ['error', 'all'],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'object-shorthand': 'error',
      'no-confusing-arrow': [
        'error',
        {
          // See https://github.com/prettier/eslint-config-prettier#no-confusing-arrow
          allowParens: false,
        },
      ],
      'no-constant-binary-expression': 'error',
      'no-constant-condition': ['error', { checkLoops: false }],
      'no-duplicate-imports': [
        'error',
        {
          includeExports: true,
        },
      ],
      'no-else-return': 'error',
      'no-labels': 'error',
      'no-promise-executor-return': 'error',

      'no-restricted-syntax': [
        'error',
        // See https://github.com/prettier/eslint-config-prettier#no-sequences
        {
          selector: 'SequenceExpression',
          message:
            'The comma operator is confusing and a common mistake. Don’t use it!',
        },
      ],

      'no-self-compare': 'error',
      'no-throw-literal': 'error',
      'no-unreachable-loop': 'error',
      'no-unused-private-class-members': 'error',
      'no-useless-call': 'error',
      'no-useless-concat': 'error',
      'no-useless-rename': 'error',
      'no-var': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-const': 'error',
      'prefer-object-has-own': 'error',
      'prefer-promise-reject-errors': 'error',
      'prefer-rest-params': 'error',
      'prefer-spread': 'error',
      'prefer-template': 'error',
      radix: 'error',

      // array-func plugin
      'array-func/prefer-array-from': 'off',

      // comments plugin
      'eslint-comments/no-unused-disable': 'error',
      'eslint-comments/no-use': [
        'error',
        {
          allow: [
            'eslint-disable',
            'eslint-enable',
            'eslint-disable-next-line',
          ],
        },
      ],
      'eslint-comments/require-description': 'error',

      // import plugin
      'import/first': 'error',
      'import/newline-after-import': [
        'error',
        {
          count: 1,
          considerComments: true,
        },
      ],
      'import/no-absolute-path': 'error',
      'import/no-cycle': [
        'error',
        {
          ignoreExternal: true,
        },
      ],
      'import/no-deprecated': 'error',
      'import/no-duplicates': [
        'error',
        {
          'prefer-inline': true,
        },
      ],
      'import/no-dynamic-require': 'error',
      'import/no-empty-named-blocks': 'error',
      'import/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: [
            // Paths to Jest config files
            '**/jest.config.{ts,mts,cts,js,mjs,cjs}',
            // Paths to ESLint config files
            '**/eslint.config.{ts,mts,cts,js,mjs,cjs}',
            // The path where testing modules are placed according to best practices.
            '**/__tests__/**/*',
          ],
          optionalDependencies: false,
          bundledDependencies: true,
          peerDependencies: true,
        },
      ],
      'import/no-mutable-exports': 'error',
      'import/no-relative-packages': 'error',
      'import/no-self-import': 'error',
      'import/no-useless-path-segments': [
        'error',
        {
          noUselessIndex: true,
          commonjs: true,
        },
      ],
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
            'type',
          ],
          'newlines-between': 'ignore',
          alphabetize: {
            order: 'asc',
            orderImportKind: 'asc',
            caseInsensitive: false,
          },
        },
      ],

      // Turn off rules that are already validated by TypeScript compiler itself.
      // https://typescript-eslint.io/troubleshooting/performance-troubleshooting#eslint-plugin-import
      'import/named': 'off',
      'import/namespace': 'off',
      'import/default': 'off',
      'import/no-named-as-default-member': 'off',
      'import/no-missing-require': 'off',

      // n plugin - disabled after inclusion of "recommended" kit
      'n/no-deprecated-api': 'off',
      'n/no-process-exit': 'off',
      'n/no-missing-import': 'off',
      'n/no-missing-require': 'off',
      'n/shebang': 'off',
      'n/hashbang': 'off',

      // promise plugin
      'promise/always-return': 'off',
      'promise/no-multiple-resolved': 'error',
      'promise/no-return-in-finally': 'error',

      // typescript-eslint plugin
      '@typescript-eslint/consistent-type-definitions': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          fixStyle: 'inline-type-imports',
        },
      ],
      '@typescript-eslint/no-confusing-non-null-assertion': 'error',
      '@typescript-eslint/no-confusing-void-expression': 'error',
      '@typescript-eslint/no-duplicate-enum-values': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-invalid-void-type': 'error',
      '@typescript-eslint/no-meaningless-void-operator': 'error',
      '@typescript-eslint/no-mixed-enums': 'error',
      '@typescript-eslint/no-non-null-asserted-nullish-coalescing': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-redundant-type-constituents': 'error',
      '@typescript-eslint/no-require-imports': 'error',
      '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'error',
      '@typescript-eslint/no-unsafe-declaration-merging': 'error',
      '@typescript-eslint/no-useless-empty-export': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          // See https://typescript-eslint.io/rules/no-unused-vars/#benefits-over-typescript
          args: 'after-used',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/prefer-enum-initializers': 'error',
      '@typescript-eslint/prefer-for-of': 'error',
      '@typescript-eslint/prefer-includes': 'error',
      '@typescript-eslint/prefer-literal-enum-member': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': [
        'error',
        {
          ignoreConditionalTests: false,
          ignoreTernaryTests: false,
          ignoreMixedLogicalExpressions: false,
        },
      ],
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/prefer-readonly': 'error',
      '@typescript-eslint/prefer-regexp-exec': 'error',
      '@typescript-eslint/prefer-return-this-type': 'error',
      '@typescript-eslint/prefer-string-starts-ends-with': 'error',
      '@typescript-eslint/prefer-ts-expect-error': 'error',
      '@typescript-eslint/promise-function-async': 'error',
      '@typescript-eslint/require-array-sort-compare': [
        'error',
        {
          ignoreStringArrays: true,
        },
      ],
      '@typescript-eslint/strict-boolean-expressions': [
        'error',
        {
          allowString: false,
          allowNumber: false,
          allowNullableObject: false,
        },
      ],
      '@typescript-eslint/switch-exhaustiveness-check': [
        'error',
        {
          allowDefaultCaseForExhaustiveSwitch: true,
          considerDefaultExhaustiveForUnions: true,
          requireDefaultForNonUnion: false,
        },
      ],
      '@typescript-eslint/unified-signatures': [
        'error',
        {
          ignoreDifferentlyNamedParameters: true,
        },
      ],
    },
  },

  // Plain JavaScript specific overrides
  {
    files: ['**/*.{js,mjs,cjs}'],
    // Turn off rules that require type information.
    extends: [tsEslintConfigs.disableTypeChecked],
    rules: {
      // Turn off selected TypeScript rules that do not make sense in Plain JS files.
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      // Turn on rules that do not need to be used for TypeScript code, but we want to validate them in Plain JS files.
      'import/extensions': [
        'error',
        'never',
        {
          json: 'always',
        },
      ],
      // https://typescript-eslint.io/troubleshooting/performance-troubleshooting#eslint-plugin-import
      'import/named': 'error',
      'import/namespace': 'error',
      'import/default': 'error',
      'import/no-named-as-default-member': 'error',
    },
  },

  // ESM specific overrides
  {
    files: ['**/*.mjs'],
    rules: {
      'import/extensions': ['error', 'always'],
      'import/no-useless-path-segments': [
        'error',
        {
          noUselessIndex: false,
          commonjs: false,
        },
      ],
    },
  },

  // Keep Prettier last to make sure it turns off all possibly conflicting rules
  prettierConfig,
);

export default config;
