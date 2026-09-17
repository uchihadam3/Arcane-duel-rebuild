import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

/** Bibliotecas de apresentação que as camadas puras nunca podem importar. */
const BIBLIOTECAS_VISUAIS = [
  'react',
  'react-dom',
  'react/*',
  'react-dom/*',
  'three',
  '@react-three/*',
  '@arcane-duel/ui',
  '@arcane-duel/vfx',
  '@arcane-duel/audio',
];

/** Pacotes puros: sem DOM, sem framework visual, sem acesso a rede. */
const PACOTES_PUROS = [
  'packages/shared-types/**/*.ts',
  'packages/rules-engine/**/*.ts',
  'packages/card-data/**/*.ts',
  'packages/gameplay/**/*.ts',
  'packages/ai/**/*.ts',
];

export default defineConfig([
  globalIgnores([
    '**/dist/**',
    '**/node_modules/**',
    '**/coverage/**',
    'apps/web/public/**',
    'apps/web/dev-dist/**',
    'assets/**',
  ]),
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { fixStyle: 'separate-type-imports' },
      ],
      '@typescript-eslint/no-unnecessary-condition': 'off',
      'no-console': ['error', { allow: ['warn', 'error', 'info'] }],
      eqeqeq: ['error', 'always'],
    },
  },
  {
    // O motor de regras, os tipos, os dados e a IA não conhecem interface.
    files: PACOTES_PUROS,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: BIBLIOTECAS_VISUAIS,
              message:
                'Camadas puras (regras, tipos, dados, IA) não podem depender de bibliotecas visuais.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'Camada pura não pode acessar o DOM.' },
        { name: 'document', message: 'Camada pura não pode acessar o DOM.' },
        { name: 'fetch', message: 'Camada pura não pode fazer requisições de rede.' },
      ],
    },
  },
  {
    files: ['packages/ui/**/*.{ts,tsx}', 'apps/web/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    files: ['**/*.test.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
    rules: {
      'no-console': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },
  {
    files: ['eslint.config.js'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },
]);
