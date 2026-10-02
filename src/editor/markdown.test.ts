import { expect, it } from 'vitest'
import { EditorState } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'
import { highlightTree } from '@lezer/highlight'
import { markdownExtensions, markdownHighlight } from './markdown'

it('highlights Markdown and YAML front matter without changing the source', () => {
  const source = '---\nchannel: "dev-errors"\n---\n# Heading\n\n**Strong** and *emphasis* with [link](https://example.test)\n\n`code`'
  const state = EditorState.create({ doc: source, extensions: markdownExtensions() })
  const ranges: { text: string; classes: string }[] = []
  highlightTree(syntaxTree(state), markdownHighlight, (from, to, classes) => ranges.push({ text: source.slice(from, to), classes }))
  for (const [text, style] of [['channel', 'md-property'], ['Heading', 'md-heading'], ['Strong', 'md-strong'], ['emphasis', 'md-emphasis'], ['https://example.test', 'md-link'], ['code', 'md-code']]) {
    expect(ranges.some((range) => range.text.includes(text!) && range.classes.includes(style!))).toBe(true)
  }
  expect(state.doc.toString()).toBe(source)
})
