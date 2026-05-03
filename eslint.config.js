const tseslint = require('typescript-eslint')

module.exports = tseslint.config(
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    rules: {
      // Turn off some rules that might be too strict for our use case
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn'
      // Note: import/no-namespace rule not yet enabled – eslint-plugin-import
      // requires ESLint v9 currently; revisit when plugin supports ESLint v10+
    }
  }
)
