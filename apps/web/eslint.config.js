import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['vite.config.*', 'postcss.config.*', 'tailwind.config.*', '*.config.*'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
  },
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^(motion|[A-Z_])' }],
    },
  },
  {
    files: ['src/pages/**/*.{js,jsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='style']",
          message:
            'Inline styles are forbidden in pages. Use shared components, tokens, or shared CSS classes.',
        },
        {
          selector: "JSXAttribute[name.name='className'] Literal[value=/\\[[^\\]]+\\]/]",
          message:
            'Tailwind arbitrary values (e.g. w-[...], text-[...], shadow-[...]) are forbidden in pages.',
        },
        {
          selector:
            "JSXAttribute[name.name='className'] JSXExpressionContainer TemplateLiteral TemplateElement[value.raw=/\\[[^\\]]+\\]/]",
          message:
            'Tailwind arbitrary values (e.g. w-[...], text-[...], shadow-[...]) are forbidden in pages.',
        },
      ],
    },
  },
])
