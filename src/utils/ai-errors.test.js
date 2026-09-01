import { describe, expect, it } from 'vitest'
import { aiErrorText } from './ai-errors'

describe('aiErrorText', () => {
  it('maps rate limit and timeout', () => {
    expect(aiErrorText('AI_UPSTREAM_RATE_LIMIT')).toBe('模型服务繁忙，请稍后重试')
    expect(aiErrorText('AI_UPSTREAM_TIMEOUT')).toBe('模型响应超时，可点重新生成')
    expect(aiErrorText('AI_CONTENT_BLOCKED')).toBe('内容不合规，请调整后再试')
  })

  it('hides vendor english', () => {
    expect(aiErrorText('UNKNOWN', 'Rate limit exceeded')).toBe('模型服务异常，请稍后重试')
  })
})
