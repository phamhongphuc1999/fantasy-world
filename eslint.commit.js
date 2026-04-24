import baseConfig from './eslint.config.js';

const eslintConfig = [
  ...baseConfig,
  {
    rules: {
      'no-console': ['error', { allow: ['debug', 'warn', 'error'] }],
      'no-debugger': 'error',
    },
  },
];

export default eslintConfig;
