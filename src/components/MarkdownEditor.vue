<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Compartment, EditorState, Transaction } from '@codemirror/state'
import { EditorView, placeholder as editorPlaceholder } from '@codemirror/view'
import { markdownExtensions } from '../editor/markdown'

const props = defineProps<{ modelValue: string; label: string; placeholder: string; error?: string; errorId: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const host = ref<HTMLDivElement>()
const attributes = new Compartment()
const hint = new Compartment()
let view: EditorView | undefined
function accessibility() {
  return EditorView.contentAttributes.of({
    'aria-label': props.label,
    'aria-required': 'true',
    'aria-invalid': String(!!props.error),
    'aria-describedby': props.error ? props.errorId : '',
  })
}
onMounted(() => {
  view = new EditorView({
    parent: host.value,
    state: EditorState.create({
      doc: props.modelValue,
      extensions: [
        ...markdownExtensions(),
        attributes.of(accessibility()),
        hint.of(editorPlaceholder(props.placeholder)),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) emit('update:modelValue', update.state.doc.toString())
        }),
      ],
    }),
  })
})
watch(() => props.modelValue, (text) => {
  if (view && text !== view.state.doc.toString()) {
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text }, annotations: Transaction.addToHistory.of(false) })
  }
})
watch(() => [props.label, props.placeholder, props.error], () => {
  view?.dispatch({ effects: [attributes.reconfigure(accessibility()), hint.reconfigure(editorPlaceholder(props.placeholder))] })
})
watch(() => props.error, (error) => { if (error) view?.focus() })
onBeforeUnmount(() => view?.destroy())
</script>
<template>
  <div ref="host" class="markdown-editor min-w-0" />
</template>
