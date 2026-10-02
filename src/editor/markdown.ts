import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { markdownLanguage } from '@codemirror/lang-markdown'
import { yamlFrontmatter } from '@codemirror/lang-yaml'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { drawSelection, EditorView, keymap } from '@codemirror/view'
import { tags } from '@lezer/highlight'

export const markdownHighlight = HighlightStyle.define([
  { tag: tags.heading, class: 'md-heading' },
  { tag: tags.strong, class: 'md-strong' },
  { tag: tags.emphasis, class: 'md-emphasis' },
  { tag: tags.strikethrough, class: 'md-strike' },
  { tag: [tags.link, tags.url], class: 'md-link' },
  { tag: [tags.processingInstruction, tags.meta, tags.punctuation], class: 'md-marker' },
  { tag: [tags.monospace, tags.string], class: 'md-code' },
  { tag: tags.propertyName, class: 'md-property' },
  { tag: [tags.number, tags.bool, tags.null], class: 'md-literal' },
  { tag: tags.comment, class: 'md-comment' },
])

export function markdownExtensions() {
  return [
    yamlFrontmatter({ content: markdownLanguage }),
    syntaxHighlighting(markdownHighlight),
    history(),
    drawSelection(),
    // Leave Tab unbound so keyboard users can move to the next form field.
    keymap.of([...defaultKeymap, ...historyKeymap]),
    EditorView.lineWrapping,
  ]
}
