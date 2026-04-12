import { describe, it, expect } from 'vitest'
import { parseJSON, extractAllJSON, hasValidJSON, attemptJSONRepair } from '@/lib/utils/jsonParse'

describe('parseJSON', () => {
  it('解析标准 JSON 对象', () => {
    const result = parseJSON<{ name: string }>('{"name":"东京"}')
    expect(result).toEqual({ name: '东京' })
  })

  it('解析 markdown 代码块包裹的 JSON', () => {
    const result = parseJSON<{ title: string }>('```json\n{"title":"行程"}\n```')
    expect(result).toEqual({ title: '行程' })
  })

  it('解析无语言标识的代码块', () => {
    const result = parseJSON<{ days: number }>('```\n{"days":3}\n```')
    expect(result).toEqual({ days: 3 })
  })

  it('从文本中提取嵌入的 JSON', () => {
    const result = parseJSON<{ city: string }>('规划结果：{"city":"上海"} 希望您满意')
    expect(result).toEqual({ city: '上海' })
  })

  it('解析嵌套 JSON 对象', () => {
    const json = '{"budget":{"low":1000,"high":5000},"days":5}'
    const result = parseJSON<{ budget: { low: number; high: number }; days: number }>(json)
    expect(result?.budget.low).toBe(1000)
    expect(result?.days).toBe(5)
  })

  it('无效输入返回 null', () => {
    expect(parseJSON('这不是JSON')).toBeNull()
    expect(parseJSON('')).toBeNull()
    expect(parseJSON('null')).toBeNull()
  })

  it('解析数组嵌套', () => {
    const result = parseJSON<{ pois: string[] }>('{"pois":["故宫","颐和园"]}')
    expect(result?.pois).toHaveLength(2)
    expect(result?.pois[0]).toBe('故宫')
  })
})

describe('extractAllJSON', () => {
  it('提取多个 JSON 对象', () => {
    const text = '{"a":1} some text {"b":2}'
    const results = extractAllJSON(text)
    expect(results).toHaveLength(2)
    expect(results[0]).toEqual({ a: 1 })
    expect(results[1]).toEqual({ b: 2 })
  })

  it('无 JSON 时返回空数组', () => {
    expect(extractAllJSON('纯文本内容')).toEqual([])
  })

  it('正确处理嵌套对象', () => {
    const results = extractAllJSON('{"outer":{"inner":1}}')
    expect(results).toHaveLength(1)
    expect((results[0] as { outer: { inner: number } }).outer.inner).toBe(1)
  })
})

describe('hasValidJSON', () => {
  it('有效 JSON 返回 true', () => {
    expect(hasValidJSON('{"key":"value"}')).toBe(true)
    expect(hasValidJSON('```json\n{"a":1}\n```')).toBe(true)
  })

  it('无效 JSON 返回 false', () => {
    expect(hasValidJSON('普通文本')).toBe(false)
    expect(hasValidJSON('')).toBe(false)
  })
})

describe('attemptJSONRepair', () => {
  it('有效 JSON 原样返回', () => {
    const json = '{"title":"东京之旅"}'
    expect(attemptJSONRepair(json)).toBe(json)
  })

  it('补全缺失的闭合括号', () => {
    const broken = '{"title":"东京之旅"'
    const repaired = attemptJSONRepair(broken)
    expect(hasValidJSON(repaired)).toBe(true)
  })

  it('补全缺失的数组括号', () => {
    const broken = '{"days":["day1","day2"'
    const repaired = attemptJSONRepair(broken)
    expect(hasValidJSON(repaired)).toBe(true)
  })
})
