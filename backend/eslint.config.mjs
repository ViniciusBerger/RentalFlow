import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Project lint gate. Type correctness is enforced separately by `npm run typecheck`.
// Legacy `any` types are tracked for incremental cleanup; avoid suppressing other rules.
export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'eslint.config.mjs'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts', 'test/**/*.ts'],
    languageOptions: { globals: { ...globals.node, ...globals.jest } },
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
);
