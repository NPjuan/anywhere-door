import { describe, it, expect } from 'vitest'
import { findCityByCode, searchCities, getAirportsByCity, POPULAR_CITIES } from '@/lib/cities'

describe('findCityByCode', () => {
  it('找到存在的城市', () => {
    const city = findCityByCode('PEK')
    expect(city).toBeDefined()
    expect(city?.name).toBe('北京')
    expect(city?.airport).toBe('首都国际机场')
  })

  it('找到日本城市', () => {
    const city = findCityByCode('NRT')
    expect(city).toBeDefined()
    expect(city?.name).toBe('东京')
    expect(city?.country).toBe('日本')
  })

  it('找到韩国城市', () => {
    const city = findCityByCode('ICN')
    expect(city).toBeDefined()
    expect(city?.name).toBe('首尔')
  })

  it('找到美国城市', () => {
    const city = findCityByCode('LAX')
    expect(city).toBeDefined()
    expect(city?.name).toBe('洛杉矶')
  })

  it('不存在的 code 返回 undefined', () => {
    expect(findCityByCode('XXX')).toBeUndefined()
    expect(findCityByCode('')).toBeUndefined()
  })

  it('贵阳机场代码应为 KWE', () => {
    const city = findCityByCode('KWE')
    expect(city?.name).toBe('贵阳')
  })
})

describe('searchCities', () => {
  it('空字符串返回全部城市（不重复）', () => {
    const results = searchCities('')
    expect(results.length).toBeGreaterThan(0)
    // 每个城市名只出现一次
    const names = results.map(r => r.label)
    const uniqueNames = new Set(names)
    expect(names.length).toBe(uniqueNames.size)
  })

  it('按中文名搜索', () => {
    const results = searchCities('北京')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].label).toBe('北京')
    expect(results[0].type).toBe('city')
  })

  it('按英文名搜索', () => {
    const results = searchCities('tokyo')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].label).toBe('东京')
  })

  it('搜索结果最多 20 条', () => {
    const results = searchCities('a')
    expect(results.length).toBeLessThanOrEqual(20)
  })

  it('青岛可以被搜索到（无重复 bug）', () => {
    const results = searchCities('青岛')
    expect(results.length).toBe(1)
    expect(results[0].city.code).toBe('TAO')
  })

  it('搜索不存在的城市返回空数组', () => {
    const results = searchCities('不存在的城市ZZZZZZ')
    expect(results).toEqual([])
  })

  it('大小写不敏感', () => {
    const lower = searchCities('beijing')
    const upper = searchCities('BEIJING')
    expect(lower.length).toBe(upper.length)
    expect(lower.length).toBeGreaterThan(0)
  })
})

describe('getAirportsByCity', () => {
  it('北京有多个机场', () => {
    const airports = getAirportsByCity('北京')
    expect(airports.length).toBeGreaterThanOrEqual(2)
    const codes = airports.map(a => a.code)
    expect(codes).toContain('PEK')
    expect(codes).toContain('PKX')
  })

  it('东京有多个机场', () => {
    const airports = getAirportsByCity('东京')
    const codes = airports.map(a => a.code)
    expect(codes).toContain('NRT')
    expect(codes).toContain('HND')
  })

  it('不存在的城市返回空数组', () => {
    expect(getAirportsByCity('不存在城市')).toEqual([])
  })
})

describe('POPULAR_CITIES 数据完整性', () => {
  it('每个城市都有必要字段', () => {
    for (const city of POPULAR_CITIES) {
      expect(city.code).toBeTruthy()
      expect(city.name).toBeTruthy()
      expect(city.nameEn).toBeTruthy()
      expect(city.airport).toBeTruthy()
    }
  })

  it('包含国内外城市', () => {
    const countries = new Set(POPULAR_CITIES.map(c => c.country))
    expect(countries.has('中国')).toBe(true)
    expect(countries.has('日本')).toBe(true)
    expect(countries.has('韩国')).toBe(true)
    expect(countries.has('美国')).toBe(true)
  })
})
