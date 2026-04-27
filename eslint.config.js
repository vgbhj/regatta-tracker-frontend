import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import importPlugin from 'eslint-plugin-import'
import prettierConfig from 'eslint-config-prettier'
import { defineConfig, globalIgnores } from 'eslint/config'

const FSD_LAYERS = ['app', 'pages', 'widgets', 'features', 'entities', 'shared']

const fsdLayerZones = FSD_LAYERS.flatMap((lower, i) =>
  FSD_LAYERS.slice(0, i).map((higher) => ({
    target: `./src/${lower}`,
    from: `./src/${higher}`,
    message: `FSD: '${lower}' must not import from '${higher}' (dependencies flow downward only).`,
  })),
)

export default defineConfig([
  globalIgnores(['dist', 'node_modules', 'coverage', 'build']),

  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      react.configs.flat.recommended,
      react.configs.flat['jsx-runtime'],
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      importPlugin.flatConfigs.recommended,
      importPlugin.flatConfigs.typescript,
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.es2023 },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      // Hardcoded — `detect` calls a context API removed in ESLint 10.
      react: { version: '19.2' },
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: ['./tsconfig.app.json', './tsconfig.node.json'],
        },
        node: true,
      },
    },
    rules: {
      // `import/order` and `import/newline-after-import` are intentionally
      // disabled: their fixers in eslint-plugin-import@2 call SourceCode APIs
      // that ESLint 10 removed, which crashes the linter. Re-enable once
      // upstream supports ESLint 10 (or migrate to eslint-plugin-import-x).
      'import/order': 'off',
      'import/newline-after-import': 'off',
      'import/no-duplicates': 'error',

      'import/no-restricted-paths': ['error', { zones: fsdLayerZones }],

      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  {
    files: ['src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*', '@/features/*/**'],
              message: 'FSD: a feature MUST NOT import another feature. Use entities or shared.',
            },
          ],
        },
      ],
    },
  },

  prettierConfig,
])
