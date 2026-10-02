import js from '@eslint/js'
import vue from 'eslint-plugin-vue'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default [
  { ignores: ['dist/**', 'node_modules/**', 'playwright-report/**', 'test-results/**', 'src/api/generated.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    files: ['**/*.{ts,vue,js,mjs}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node }, parserOptions: { parser: tseslint.parser } },
    rules: {
      'vue/max-attributes-per-line': 'off',
      'vue/multi-word-component-names': 'off',
      'vue/singleline-html-element-content-newline': 'off',
    },
  },
  {
    files: ['src/components/RichText.vue', 'src/components/CodeBlock.vue'],
    // Every HTML value is sanitized by DOMPurify in src/render/markdown.ts.
    rules: { 'vue/no-v-html': 'off' },
  },
  { files: ['**/*.test.ts'], rules: { 'vue/one-component-per-file': 'off' } },
]
