import { describe, expect, it } from 'vitest'
import { renderMarkdown } from './ai-markdown'

describe('renderMarkdown', () => {
  it('escapes script tags', () => {
    const html = renderMarkdown('hello <script>alert(1)</script>')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('renders fenced code without executing html', () => {
    const html = renderMarkdown('```html\n<img src=x onerror=alert(1)>\n```')
    expect(html).toContain('ai-code__copy')
    expect(html).toContain('<pre><code')
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img')
  })

  it('only allows http(s) links', () => {
    const html = renderMarkdown('[x](javascript:alert(1))')
    expect(html).not.toContain('href=')
    expect(html).not.toContain('<a ')
  })

  it('escapes img onerror', () => {
    const html = renderMarkdown('<img src=x onerror=alert(1)>')
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img')
  })
})
