<script setup lang="ts">
import { ref, watch } from 'vue'
import { renderCode, renderMarkdown, splitFrontMatter } from '../render/markdown'
const props = defineProps<{ text: string }>()
const frontMatter = ref('')
const html = ref('')
watch(
  () => props.text,
  async (text, _previous, cleanup) => {
    let valid = true
    cleanup(() => {
      valid = false
    })
    const parts = splitFrontMatter(text)
    const [meta, body] = await Promise.all([parts ? renderCode(parts.yaml, 'yaml') : '', renderMarkdown(parts ? parts.body : text)])
    if (valid) {
      frontMatter.value = meta
      html.value = body
    }
  },
  { immediate: true },
)
</script>
<template>
  <!-- HTML is sanitized by DOMPurify in render/markdown.ts. -->
  <div v-if="frontMatter" class="frontmatter mb-3" v-html="frontMatter" />
  <div class="prose-output" v-html="html" />
</template>
