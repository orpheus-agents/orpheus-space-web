import type MarkdownIt from 'markdown-it'
let renderer: Promise<(source: string) => string> | undefined
export async function renderMarkdown(source: string) {
  renderer ??= buildRenderer()
  return (await renderer)(source)
}
/** Connectors prefix messages with YAML front matter; it is shown apart from the body. */
export function splitFrontMatter(source: string): { yaml: string; body: string } | null {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  if (lines[0]?.trim() !== '---') return null
  const end = lines.findIndex((line, index) => index > 0 && line.trim() === '---')
  return end < 0 ? null : { yaml: lines.slice(1, end).join('\n').trimEnd(), body: lines.slice(end + 1).join('\n') }
}
/** Highlighted code as sanitized HTML: front matter as yaml, commands as bash. */
export async function renderCode(source: string, language: 'yaml' | 'bash' | 'json') {
  return renderMarkdown('```' + language + '\n' + source.replace(/```/g, '` ` `') + '\n```')
}
async function buildRenderer() {
  const [
    { default: Markdown },
    { default: DOMPurify },
    { default: hljs },
    { default: json },
    { default: bash },
    { default: diff },
    { default: yaml },
  ] = await Promise.all([
    import('markdown-it'),
    import('dompurify'),
    import('highlight.js/lib/core'),
    import('highlight.js/lib/languages/json'),
    import('highlight.js/lib/languages/bash'),
    import('highlight.js/lib/languages/diff'),
    import('highlight.js/lib/languages/yaml'),
  ])
  hljs.registerLanguage('json', json)
  hljs.registerLanguage('bash', bash)
  hljs.registerLanguage('diff', diff)
  hljs.registerLanguage('yaml', yaml)
  const md: MarkdownIt = new Markdown({
    html: false,
    breaks: true,
    linkify: true,
    highlight(code, language) {
      return language && hljs.getLanguage(language) ? hljs.highlight(code, { language }).value : md.utils.escapeHtml(code)
    },
  })
  // Remote images are links: viewing a transcript must not make third-party requests.
  md.renderer.rules.image = (tokens, index) => {
    const token = tokens[index]
    const url = token.attrGet('src') ?? ''
    return md.validateLink(url)
      ? `<a href="${md.utils.escapeHtml(url)}" rel="noreferrer">${md.utils.escapeHtml(token.content || url)}</a>`
      : md.utils.escapeHtml(token.content)
  }
  return (source: string) => DOMPurify.sanitize(md.render(source))
}
