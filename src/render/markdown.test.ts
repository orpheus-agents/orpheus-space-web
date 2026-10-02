import { expect, it } from 'vitest'
import { renderCode, renderMarkdown, splitFrontMatter } from './markdown'
it('renders markdown while removing executable HTML and external image requests', async () => {
  const html = await renderMarkdown(
    '**hello**\n\n<script>alert(1)</script>\n\n[x](javascript:alert(1))\n\n![preview](https://example.test/image.png)',
  )
  expect(html).toContain('<strong>hello</strong>')
  expect(html).not.toContain('<script>')
  expect(html).not.toContain('href="javascript:')
  expect(html).not.toContain('<img')
  expect(html).toContain('href="https://example.test/image.png"')
})
it('splits YAML front matter from the body and highlights code blocks', async () => {
  expect(splitFrontMatter('---\nchannel: dev\nuser: ilyas\n---\n\nHello **there**')).toEqual({
    yaml: 'channel: dev\nuser: ilyas',
    body: '\nHello **there**',
  })
  expect(splitFrontMatter('---\nunterminated: yes\nHello')).toBeNull()
  expect(splitFrontMatter('Hello\n---\nnot: front matter\n---')).toBeNull()
  const yaml = await renderCode('channel: dev', 'yaml')
  expect(yaml).toContain('class="hljs-attr">channel')
  const bash = await renderCode('npm test && echo "```"', 'bash')
  expect(bash).toContain('<code class="language-bash">')
  expect(bash).not.toContain('```')
})
