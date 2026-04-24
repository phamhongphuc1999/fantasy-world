import js from '@eslint/js';
import eslintPluginImport from 'eslint-plugin-import';
import prettierPlugin from 'eslint-plugin-prettier';
import eslintPluginReact from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: ['dist', '.next', 'coverage', 'public/**', 'next-env.d.ts'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintPluginReact.configs.flat.recommended,
  reactHooks.configs['recommended-latest'],
  reactRefresh.configs.vite,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      import: eslintPluginImport,
      prettier: prettierPlugin,
      react: eslintPluginReact,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    settings: {
      react: {
        version: 'detect',
      },
      'import/resolver': {
        typescript: {
          project: './tsconfig.json',
        },
      },
    },
    rules: {
      'react-refresh/only-export-components': 'off',
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
      quotes: ['error', 'single'],
      semi: ['warn', 'always'],
      'no-use-before-define': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { vars: 'all', varsIgnorePattern: '^_', argsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      'import/first': 'error',
      'import/newline-after-import': 'error',
      'import/no-duplicates': 'error',
      'import/no-named-as-default': 'error',
      'import/no-unresolved': 'warn',
      'no-console': ['warn', { allow: ['debug', 'warn', 'error'] }],
      'no-debugger': 'warn',

      'react/jsx-key': 'error',
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/jsx-no-undef': 'error',
      'react/no-unknown-property': 'error',
      'react/jsx-no-duplicate-props': 'error',
      'react/jsx-pascal-case': 'warn',
      'react/no-direct-mutation-state': 'error',
    },
  },
];
