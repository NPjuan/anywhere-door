import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// mock fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// 导入模块（在 mock 之后）
const { fetchWeather } = await import('@/lib/weather')

const mockOpenMeteoResponse = {
  daily: {
    time:                ['2026-04-12', '2026-04-13', '2026-04-14'],
    weathercode:         [0, 61, 95],
    temperature_2m_max:  [22.5, 18.3, 15.1],
    temperature_2m_min:  [12.1, 10.5, 8.2],
  },
}

describe('fetchWeather', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('正确解析晴天天气', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockOpenMeteoResponse,
    })

    const result = await fetchWeather(39.9, 116.4, ['2026-04-12'])
    const day = result.get('2026-04-12')

    expect(day).toBeDefined()
    expect(day?.icon).toBe('☀️')
    expect(day?.label).toBe('晴')
    expect(day?.severe).toBe(false)
    expect(day?.tempMax).toBe(23) // Math.round(22.5)
    expect(day?.tempMin).toBe(12)
  })

  it('正确识别小雨天气', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockOpenMeteoResponse,
    })

    const result = await fetchWeather(39.9, 116.4, ['2026-04-13'])
    const day = result.get('2026-04-13')

    expect(day?.label).toBe('小雨')
    expect(day?.severe).toBe(false)
  })

  it('正确识别雷阵雨为恶劣天气', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockOpenMeteoResponse,
    })

    const result = await fetchWeather(39.9, 116.4, ['2026-04-14'])
    const day = result.get('2026-04-14')

    expect(day?.severe).toBe(true)
    expect(day?.severeMsg).toContain('雷阵雨')
  })

  it('只返回请求日期的数据', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockOpenMeteoResponse,
    })

    const result = await fetchWeather(39.9, 116.4, ['2026-04-12'])
    expect(result.size).toBe(1)
    expect(result.has('2026-04-12')).toBe(true)
    expect(result.has('2026-04-13')).toBe(false)
  })

  it('dates 为空时直接返回空 Map', async () => {
    const result = await fetchWeather(39.9, 116.4, [])
    expect(result.size).toBe(0)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('API 失败时抛出错误', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
    await expect(fetchWeather(39.9, 116.4, ['2026-04-12'])).rejects.toThrow('Open-Meteo error: 500')
  })

  it('构造正确的 API URL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        daily: { time: ['2026-04-12'], weathercode: [0], temperature_2m_max: [20], temperature_2m_min: [10] }
      }),
    })

    await fetchWeather(35.6762, 139.6503, ['2026-04-12'])
    const calledUrl = mockFetch.mock.calls[0][0] as string

    expect(calledUrl).toContain('latitude=35.6762')
    expect(calledUrl).toContain('longitude=139.6503')
    expect(calledUrl).toContain('start_date=2026-04-12')
    expect(calledUrl).toContain('end_date=2026-04-12')
  })

  it('多个日期时 URL 使用最早和最晚日期', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        daily: {
          time: ['2026-04-12', '2026-04-13', '2026-04-14'],
          weathercode: [0, 0, 0],
          temperature_2m_max: [20, 21, 22],
          temperature_2m_min: [10, 11, 12],
        }
      }),
    })

    await fetchWeather(35.6, 139.6, ['2026-04-14', '2026-04-12', '2026-04-13'])
    const calledUrl = mockFetch.mock.calls[0][0] as string

    expect(calledUrl).toContain('start_date=2026-04-12')
    expect(calledUrl).toContain('end_date=2026-04-14')
  })
})
