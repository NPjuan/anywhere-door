import type { CityOption } from '@/lib/stores/searchStore'

/* ============================================================
   城市 + 机场数据 / City + Airport data
   ============================================================ */

/** 城市主要机场映射 */
const CITY_PRIMARY: Record<string, string> = {
  '北京':    'PEK',
  '上海':    'PVG',
  '广州':    'CAN',
  '深圳':    'SZX',
  '成都':    'CTU',
  '重庆':    'CKG',
  '杭州':    'HGH',
  '西安':    'XIY',
  '南京':    'NKG',
  '武汉':    'WUH',
  '长沙':    'CSX',
  '昆明':    'KMG',
  '天津':    'TSN',
  '青岛':    'TAO',
  '厦门':    'XMN',
  '郑州':    'CGO',
  '沈阳':    'SHE',
  '哈尔滨':  'HRB',
  '大连':    'DLC',
  '福州':    'FOC',
  '南宁':    'NNG',
  '贵阳':    'GYN',
  '海口':    'HAK',
  '三亚':    'SYX',
  '乌鲁木齐': 'URC',
  '拉萨':    'LXA',
  '兰州':    'LHW',
  '太原':    'TYN',
  '南昌':    'KHN',
  '合肥':    'HFE',
  '石家庄':  'SJW',
  '济南':    'TNA',
  '温州':    'WNZ',
  '宁波':    'NGB',
  '无锡':    'WUX',
  '烟台':    'YNT',
  '珠海':    'ZUH',
  '桂林':    'KWL',
  '丽江':    'LJG',
  '张家界':  'DYG',
  '黄山':    'TXN',
  '九寨沟':  'JZH',
  '西双版纳': 'JHG',
  '神农架':  'HPG',
  '长春':    'CGQ',
  '呼和浩特': 'HET',
  '银川':    'INC',
  '西宁':    'XNN',
  '喀什':    'KHG',
  '敦煌':    'DNH',
}

export const POPULAR_CITIES: CityOption[] = [
  // ── 北京 ──
  { code: 'PEK', name: '北京',    nameEn: 'Beijing',     airport: '首都国际机场',       country: '中国' },
  { code: 'PKX', name: '北京',    nameEn: 'Beijing',     airport: '大兴国际机场',       country: '中国' },
  // ── 上海 ──
  { code: 'PVG', name: '上海',    nameEn: 'Shanghai',    airport: '浦东国际机场',       country: '中国' },
  { code: 'SHA', name: '上海',    nameEn: 'Shanghai',    airport: '虹桥国际机场',       country: '中国' },
  // ── 广州 ──
  { code: 'CAN', name: '广州',    nameEn: 'Guangzhou',   airport: '白云国际机场',       country: '中国' },
  // ── 深圳 ──
  { code: 'SZX', name: '深圳',    nameEn: 'Shenzhen',    airport: '宝安国际机场',       country: '中国' },
  // ── 成都 ──
  { code: 'CTU', name: '成都',    nameEn: 'Chengdu',     airport: '天府国际机场',       country: '中国' },
  { code: 'TFU', name: '成都',    nameEn: 'Chengdu',     airport: '双流国际机场',       country: '中国' },
  // ── 重庆 ──
  { code: 'CKG', name: '重庆',    nameEn: 'Chongqing',   airport: '江北国际机场',       country: '中国' },
  // ── 杭州 ──
  { code: 'HGH', name: '杭州',    nameEn: 'Hangzhou',    airport: '萧山国际机场',       country: '中国' },
  // ── 西安 ──
  { code: 'XIY', name: '西安',    nameEn: "Xi'an",       airport: '咸阳国际机场',       country: '中国' },
  // ── 南京 ──
  { code: 'NKG', name: '南京',    nameEn: 'Nanjing',     airport: '禄口国际机场',       country: '中国' },
  // ── 武汉 ──
  { code: 'WUH', name: '武汉',    nameEn: 'Wuhan',       airport: '天河国际机场',       country: '中国' },
  // ── 长沙 ──
  { code: 'CSX', name: '长沙',    nameEn: 'Changsha',    airport: '黄花国际机场',       country: '中国' },
  // ── 昆明 ──
  { code: 'KMG', name: '昆明',    nameEn: 'Kunming',     airport: '长水国际机场',       country: '中国' },
  // ── 天津 ──
  { code: 'TSN', name: '天津',    nameEn: 'Tianjin',     airport: '滨海国际机场',       country: '中国' },
  // ── 青岛 ──
  { code: 'TAO', name: '青岛',    nameEn: 'Qingdao',     airport: '胶东国际机场',       country: '中国' },
  // ── 厦门 ──
  { code: 'XMN', name: '厦门',    nameEn: 'Xiamen',      airport: '高崎国际机场',       country: '中国' },
  // ── 郑州 ──
  { code: 'CGO', name: '郑州',    nameEn: 'Zhengzhou',   airport: '新郑国际机场',       country: '中国' },
  // ── 沈阳 ──
  { code: 'SHE', name: '沈阳',    nameEn: 'Shenyang',    airport: '桃仙国际机场',       country: '中国' },
  // ── 哈尔滨 ──
  { code: 'HRB', name: '哈尔滨',  nameEn: 'Harbin',      airport: '太平国际机场',       country: '中国' },
  // ── 大连 ──
  { code: 'DLC', name: '大连',    nameEn: 'Dalian',      airport: '周水子国际机场',     country: '中国' },
  // ── 福州 ──
  { code: 'FOC', name: '福州',    nameEn: 'Fuzhou',      airport: '长乐国际机场',       country: '中国' },
  // ── 南宁 ──
  { code: 'NNG', name: '南宁',    nameEn: 'Nanning',     airport: '吴圩国际机场',       country: '中国' },
  // ── 贵阳 ──
  { code: 'KWE', name: '贵阳',    nameEn: 'Guiyang',     airport: '龙洞堡国际机场',     country: '中国' },
  // ── 海口 ──
  { code: 'HAK', name: '海口',    nameEn: 'Haikou',      airport: '美兰国际机场',       country: '中国' },
  // ── 三亚 ──
  { code: 'SYX', name: '三亚',    nameEn: 'Sanya',       airport: '凤凰国际机场',       country: '中国' },
  // ── 乌鲁木齐 ──
  { code: 'URC', name: '乌鲁木齐', nameEn: 'Urumqi',     airport: '地窝堡国际机场',     country: '中国' },
  // ── 拉萨 ──
  { code: 'LXA', name: '拉萨',    nameEn: 'Lhasa',       airport: '贡嘎机场',           country: '中国' },
  // ── 兰州 ──
  { code: 'LHW', name: '兰州',    nameEn: 'Lanzhou',     airport: '中川国际机场',       country: '中国' },
  // ── 太原 ──
  { code: 'TYN', name: '太原',    nameEn: 'Taiyuan',     airport: '武宿国际机场',       country: '中国' },
  // ── 南昌 ──
  { code: 'KHN', name: '南昌',    nameEn: 'Nanchang',    airport: '昌北国际机场',       country: '中国' },
  // ── 合肥 ──
  { code: 'HFE', name: '合肥',    nameEn: 'Hefei',       airport: '新桥国际机场',       country: '中国' },
  // ── 石家庄 ──
  { code: 'SJW', name: '石家庄',  nameEn: 'Shijiazhuang', airport: '正定国际机场',      country: '中国' },
  // ── 济南 ──
  { code: 'TNA', name: '济南',    nameEn: 'Jinan',       airport: '遥墙国际机场',       country: '中国' },
  // ── 温州 ──
  { code: 'WNZ', name: '温州',    nameEn: 'Wenzhou',     airport: '龙湾国际机场',       country: '中国' },
  // ── 宁波 ──
  { code: 'NGB', name: '宁波',    nameEn: 'Ningbo',      airport: '栎社国际机场',       country: '中国' },
  // ── 无锡 ──
  { code: 'WUX', name: '无锡',    nameEn: 'Wuxi',        airport: '硕放国际机场',       country: '中国' },
  // ── 烟台 ──
  { code: 'YNT', name: '烟台',    nameEn: 'Yantai',      airport: '蓬莱国际机场',       country: '中国' },
  // ── 珠海 ──
  { code: 'ZUH', name: '珠海',    nameEn: 'Zhuhai',      airport: '金湾机场',           country: '中国' },
  // ── 桂林 ──
  { code: 'KWL', name: '桂林',    nameEn: 'Guilin',      airport: '两江国际机场',       country: '中国' },
  // ── 丽江 ──
  { code: 'LJG', name: '丽江',    nameEn: 'Lijiang',     airport: '三义国际机场',       country: '中国' },
  // ── 张家界 ──
  { code: 'DYG', name: '张家界',  nameEn: 'Zhangjiajie', airport: '荷花国际机场',       country: '中国' },
  // ── 黄山 ──
  { code: 'TXN', name: '黄山',    nameEn: 'Huangshan',   airport: '屯溪国际机场',       country: '中国' },
  // ── 九寨沟 ──
  { code: 'JZH', name: '九寨沟',  nameEn: 'Jiuzhaigou',  airport: '黄龙机场',           country: '中国' },
  // ── 西双版纳 ──
  { code: 'JHG', name: '西双版纳', nameEn: 'Xishuangbanna', airport: '嘎洒国际机场',    country: '中国' },
  // ── 长春 ──
  { code: 'CGQ', name: '长春',    nameEn: 'Changchun',   airport: '龙嘉国际机场',       country: '中国' },
  // ── 呼和浩特 ──
  { code: 'HET', name: '呼和浩特', nameEn: 'Hohhot',     airport: '白塔国际机场',       country: '中国' },
  // ── 银川 ──
  { code: 'INC', name: '银川',    nameEn: 'Yinchuan',    airport: '河东国际机场',       country: '中国' },
  // ── 西宁 ──
  { code: 'XNN', name: '西宁',    nameEn: "Xi'ning",     airport: '曹家堡国际机场',     country: '中国' },
  // ── 喀什 ──
  { code: 'KHG', name: '喀什',    nameEn: 'Kashgar',     airport: '喀什机场',           country: '中国' },
  // ── 敦煌 ──
  { code: 'DNH', name: '敦煌',    nameEn: 'Dunhuang',    airport: '敦煌机场',           country: '中国' },
  // ── 神农架 ──
  { code: 'HPG', name: '神农架',  nameEn: 'Shennongjia', airport: '神农架机场',         country: '中国' },
  // ── 珠海/澳门 ──
  { code: 'MFM', name: '澳门',    nameEn: 'Macau',       airport: '澳门国际机场',       country: '中国' },
  // ── 香港 ──
  { code: 'HKG', name: '香港',    nameEn: 'Hong Kong',   airport: '赤鱲角国际机场',     country: '中国' },
  // ── 台北 ──
  { code: 'TPE', name: '台北',    nameEn: 'Taipei',      airport: '桃园国际机场',       country: '中国' },
  { code: 'TSA', name: '台北',    nameEn: 'Taipei',      airport: '松山机场',           country: '中国' },
]

export function findCityByCode(code: string): CityOption | undefined {
  return POPULAR_CITIES.find((c) => c.code === code)
}

export interface SearchResult {
  type:  'city' | 'airport'
  city:  CityOption
  label: string
  sub:   string
}

export function searchCities(query: string): SearchResult[] {
  const q = query.toLowerCase().trim()

  if (!q) {
    const seen = new Set<string>()
    const results: SearchResult[] = []
    for (const c of POPULAR_CITIES) {
      if (seen.has(c.name)) continue
      seen.add(c.name)
      const primaryCode = CITY_PRIMARY[c.name] ?? c.code
      const primaryCity = POPULAR_CITIES.find((p) => p.code === primaryCode) ?? c
      results.push({ type: 'city', city: primaryCity, label: c.name, sub: '城市' })
    }
    return results  // 返回全部，让 AutoComplete 展示完整列表
  }

  const cityMatches = new Set<string>()
  const results: SearchResult[] = []

  for (const c of POPULAR_CITIES) {
    if (c.name.includes(q) || c.nameEn.toLowerCase().includes(q)) {
      if (!cityMatches.has(c.name)) {
        cityMatches.add(c.name)
        const primaryCode = CITY_PRIMARY[c.name] ?? c.code
        const primaryCity = POPULAR_CITIES.find((p) => p.code === primaryCode) ?? c
        results.push({ type: 'city', city: primaryCity, label: c.name, sub: '城市' })
      }
    }
  }

  for (const c of POPULAR_CITIES) {
    if (
      c.code.toLowerCase().includes(q) ||
      c.airport.includes(q) ||
      c.name.includes(q) ||
      c.nameEn.toLowerCase().includes(q)
    ) {
      results.push({ type: 'airport', city: c, label: c.name, sub: c.airport })
    }
  }

  const seen = new Set<string>()
  return results.filter((r) => {
    const key = `${r.type}-${r.city.code}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, 20)
}

export function getAirportsByCity(cityName: string): CityOption[] {
  return POPULAR_CITIES.filter((c) => c.name === cityName)
}
