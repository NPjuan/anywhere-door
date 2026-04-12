import type { CityOption } from '@/lib/stores/searchStore'

/* ============================================================
   城市 + 机场数据 / City + Airport data
   ============================================================ */

/** 城市主要机场映射 */
const CITY_PRIMARY: Record<string, string> = {
  // 中国
  '北京': 'PEK', '上海': 'PVG', '广州': 'CAN', '深圳': 'SZX',
  '成都': 'CTU', '重庆': 'CKG', '杭州': 'HGH', '西安': 'XIY',
  '南京': 'NKG', '武汉': 'WUH', '长沙': 'CSX', '昆明': 'KMG',
  '天津': 'TSN', '青岛': 'TAO', '厦门': 'XMN', '郑州': 'CGO',
  '沈阳': 'SHE', '哈尔滨': 'HRB', '大连': 'DLC', '福州': 'FOC',
  '南宁': 'NNG', '贵阳': 'KWE', '海口': 'HAK', '三亚': 'SYX',
  '乌鲁木齐': 'URC', '拉萨': 'LXA', '兰州': 'LHW', '太原': 'TYN',
  '南昌': 'KHN', '合肥': 'HFE', '石家庄': 'SJW', '济南': 'TNA',
  '温州': 'WNZ', '宁波': 'NGB', '无锡': 'WUX', '烟台': 'YNT',
  '珠海': 'ZUH', '桂林': 'KWL', '丽江': 'LJG', '张家界': 'DYG',
  '黄山': 'TXN', '九寨沟': 'JZH', '西双版纳': 'JHG', '神农架': 'HPG',
  '长春': 'CGQ', '呼和浩特': 'HET', '银川': 'INC', '西宁': 'XNN',
  '喀什': 'KHG', '敦煌': 'DNH', '澳门': 'MFM', '香港': 'HKG',
  '台北': 'TPE', '高雄': 'KHH', '花莲': 'HUN', '台南': 'TNN',
  '稻城亚丁': 'YBP', '梅里雪山': 'DIG', '呼伦贝尔': 'HLD',
  '阿勒泰': 'AAT', '额济纳': 'EJN', '腾冲': 'TCZ', '芒市': 'LUM',
  '格尔木': 'GOQ', '玉树': 'YUS',
  // 日本
  '东京': 'NRT', '大阪': 'KIX', '札幌': 'CTS', '福冈': 'FUK',
  '名古屋': 'NGO', '冲绳': 'OKA', '广岛': 'HIJ', '仙台': 'SDJ',
  '鹿儿岛': 'KOJ', '金泽': 'KMQ', '松山': 'MYJ',
  // 韩国
  '首尔': 'ICN', '釜山': 'PUS', '济州': 'CJU',
  // 东南亚
  '新加坡': 'SIN', '曼谷': 'BKK', '普吉': 'HKT', '清迈': 'CNX',
  '芭提雅': 'UTP', '苏梅': 'USM', '吉隆坡': 'KUL', '槟城': 'PEN',
  '亚庇': 'BKI', '古晋': 'KCH', '巴厘岛': 'DPS', '雅加达': 'CGK',
  '泗水': 'SUB', '日惹': 'JOG', '马尼拉': 'MNL', '宿务': 'CEB',
  '长滩岛': 'MPH', '胡志明市': 'SGN', '河内': 'HAN', '岘港': 'DAD',
  '芽庄': 'CXR', '富国岛': 'PQC', '金边': 'PNH', '暹粒': 'REP',
  '仰光': 'RGN', '科伦坡': 'CMB', '马尔代夫': 'MLE',
  '缅甸蒲甘': 'NYU', '老挝万象': 'VTE', '龙坡邦': 'LPQ',
  // 中东
  '迪拜': 'DXB', '阿布扎比': 'AUH', '多哈': 'DOH', '伊斯坦布尔': 'IST',
  '特拉维夫': 'TLV', '利雅得': 'RUH',
  // 欧洲
  '巴黎': 'CDG', '伦敦': 'LHR', '罗马': 'FCO', '巴塞罗那': 'BCN',
  '马德里': 'MAD', '阿姆斯特丹': 'AMS', '法兰克福': 'FRA',
  '慕尼黑': 'MUC', '维也纳': 'VIE', '苏黎世': 'ZRH', '日内瓦': 'GVA',
  '布鲁塞尔': 'BRU', '哥本哈根': 'CPH', '斯德哥尔摩': 'ARN',
  '奥斯陆': 'OSL', '赫尔辛基': 'HEL', '布拉格': 'PRG',
  '布达佩斯': 'BUD', '华沙': 'WAW', '里斯本': 'LIS', '雅典': 'ATH',
  '米兰': 'MXP', '威尼斯': 'VCE', '佛罗伦萨': 'FLR', '那不勒斯': 'NAP',
  '苏格兰爱丁堡': 'EDI', '曼彻斯特': 'MAN', '都柏林': 'DUB',
  '赖克雅未克': 'KEF',
  // 大洋洲
  '悉尼': 'SYD', '墨尔本': 'MEL', '布里斯班': 'BNE', '珀斯': 'PER',
  '奥克兰': 'AKL', '皇后镇': 'ZQN', '基督城': 'CHC',
  // 美洲
  '纽约': 'JFK', '洛杉矶': 'LAX', '旧金山': 'SFO',
  '拉斯维加斯': 'LAS', '芝加哥': 'ORD', '迈阿密': 'MIA',
  '夏威夷': 'HNL', '西雅图': 'SEA', '波士顿': 'BOS',
  '华盛顿': 'IAD', '多伦多': 'YYZ', '温哥华': 'YVR',
  '墨西哥城': 'MEX', '坎昆': 'CUN', '圣保罗': 'GRU',
  '布宜诺斯艾利斯': 'EZE', '利马': 'LIM', '波哥大': 'BOG',
  // 南亚
  '新德里': 'DEL', '孟买': 'BOM', '斋普尔': 'JAI', '加尔各答': 'CCU',
  '班加罗尔': 'BLR', '果阿': 'GOI', '卡拉奇': 'KHI',
  // 非洲
  '开罗': 'CAI', '摩洛哥马拉喀什': 'RAK', '内罗毕': 'NBO',
  '约翰内斯堡': 'JNB', '开普敦': 'CPT',
  // 俄罗斯/中亚
  '莫斯科': 'SVO', '圣彼得堡': 'LED', '阿拉木图': 'ALA',
  '塔什干': 'TAS', '撒马尔罕': 'SKD',
}

export const POPULAR_CITIES: CityOption[] = [
  // ══ 中国内地 ══
  { code: 'PEK', name: '北京',      nameEn: 'Beijing',         airport: '首都国际机场',       country: '中国' },
  { code: 'PKX', name: '北京',      nameEn: 'Beijing',         airport: '大兴国际机场',       country: '中国' },
  { code: 'PVG', name: '上海',      nameEn: 'Shanghai',        airport: '浦东国际机场',       country: '中国' },
  { code: 'SHA', name: '上海',      nameEn: 'Shanghai',        airport: '虹桥国际机场',       country: '中国' },
  { code: 'CAN', name: '广州',      nameEn: 'Guangzhou',       airport: '白云国际机场',       country: '中国' },
  { code: 'SZX', name: '深圳',      nameEn: 'Shenzhen',        airport: '宝安国际机场',       country: '中国' },
  { code: 'CTU', name: '成都',      nameEn: 'Chengdu',         airport: '天府国际机场',       country: '中国' },
  { code: 'TFU', name: '成都',      nameEn: 'Chengdu',         airport: '双流国际机场',       country: '中国' },
  { code: 'CKG', name: '重庆',      nameEn: 'Chongqing',       airport: '江北国际机场',       country: '中国' },
  { code: 'HGH', name: '杭州',      nameEn: 'Hangzhou',        airport: '萧山国际机场',       country: '中国' },
  { code: 'XIY', name: '西安',      nameEn: "Xi'an",           airport: '咸阳国际机场',       country: '中国' },
  { code: 'NKG', name: '南京',      nameEn: 'Nanjing',         airport: '禄口国际机场',       country: '中国' },
  { code: 'WUH', name: '武汉',      nameEn: 'Wuhan',           airport: '天河国际机场',       country: '中国' },
  { code: 'CSX', name: '长沙',      nameEn: 'Changsha',        airport: '黄花国际机场',       country: '中国' },
  { code: 'KMG', name: '昆明',      nameEn: 'Kunming',         airport: '长水国际机场',       country: '中国' },
  { code: 'TSN', name: '天津',      nameEn: 'Tianjin',         airport: '滨海国际机场',       country: '中国' },
  { code: 'TAO', name: '青岛',      nameEn: 'Qingdao',         airport: '胶东国际机场',       country: '中国' },
  { code: 'XMN', name: '厦门',      nameEn: 'Xiamen',          airport: '高崎国际机场',       country: '中国' },
  { code: 'CGO', name: '郑州',      nameEn: 'Zhengzhou',       airport: '新郑国际机场',       country: '中国' },
  { code: 'SHE', name: '沈阳',      nameEn: 'Shenyang',        airport: '桃仙国际机场',       country: '中国' },
  { code: 'HRB', name: '哈尔滨',    nameEn: 'Harbin',          airport: '太平国际机场',       country: '中国' },
  { code: 'DLC', name: '大连',      nameEn: 'Dalian',          airport: '周水子国际机场',     country: '中国' },
  { code: 'FOC', name: '福州',      nameEn: 'Fuzhou',          airport: '长乐国际机场',       country: '中国' },
  { code: 'NNG', name: '南宁',      nameEn: 'Nanning',         airport: '吴圩国际机场',       country: '中国' },
  { code: 'KWE', name: '贵阳',      nameEn: 'Guiyang',         airport: '龙洞堡国际机场',     country: '中国' },
  { code: 'HAK', name: '海口',      nameEn: 'Haikou',          airport: '美兰国际机场',       country: '中国' },
  { code: 'SYX', name: '三亚',      nameEn: 'Sanya',           airport: '凤凰国际机场',       country: '中国' },
  { code: 'URC', name: '乌鲁木齐',  nameEn: 'Urumqi',          airport: '地窝堡国际机场',     country: '中国' },
  { code: 'LXA', name: '拉萨',      nameEn: 'Lhasa',           airport: '贡嘎机场',           country: '中国' },
  { code: 'LHW', name: '兰州',      nameEn: 'Lanzhou',         airport: '中川国际机场',       country: '中国' },
  { code: 'TYN', name: '太原',      nameEn: 'Taiyuan',         airport: '武宿国际机场',       country: '中国' },
  { code: 'KHN', name: '南昌',      nameEn: 'Nanchang',        airport: '昌北国际机场',       country: '中国' },
  { code: 'HFE', name: '合肥',      nameEn: 'Hefei',           airport: '新桥国际机场',       country: '中国' },
  { code: 'SJW', name: '石家庄',    nameEn: 'Shijiazhuang',    airport: '正定国际机场',       country: '中国' },
  { code: 'TNA', name: '济南',      nameEn: 'Jinan',           airport: '遥墙国际机场',       country: '中国' },
  { code: 'WNZ', name: '温州',      nameEn: 'Wenzhou',         airport: '龙湾国际机场',       country: '中国' },
  { code: 'NGB', name: '宁波',      nameEn: 'Ningbo',          airport: '栎社国际机场',       country: '中国' },
  { code: 'WUX', name: '无锡',      nameEn: 'Wuxi',            airport: '硕放国际机场',       country: '中国' },
  { code: 'YNT', name: '烟台',      nameEn: 'Yantai',          airport: '蓬莱国际机场',       country: '中国' },
  { code: 'ZUH', name: '珠海',      nameEn: 'Zhuhai',          airport: '金湾机场',           country: '中国' },
  { code: 'KWL', name: '桂林',      nameEn: 'Guilin',          airport: '两江国际机场',       country: '中国' },
  { code: 'LJG', name: '丽江',      nameEn: 'Lijiang',         airport: '三义国际机场',       country: '中国' },
  { code: 'DYG', name: '张家界',    nameEn: 'Zhangjiajie',     airport: '荷花国际机场',       country: '中国' },
  { code: 'TXN', name: '黄山',      nameEn: 'Huangshan',       airport: '屯溪国际机场',       country: '中国' },
  { code: 'JZH', name: '九寨沟',    nameEn: 'Jiuzhaigou',      airport: '黄龙机场',           country: '中国' },
  { code: 'JHG', name: '西双版纳',  nameEn: 'Xishuangbanna',   airport: '嘎洒国际机场',       country: '中国' },
  { code: 'HPG', name: '神农架',    nameEn: 'Shennongjia',     airport: '神农架机场',         country: '中国' },
  { code: 'CGQ', name: '长春',      nameEn: 'Changchun',       airport: '龙嘉国际机场',       country: '中国' },
  { code: 'HET', name: '呼和浩特',  nameEn: 'Hohhot',          airport: '白塔国际机场',       country: '中国' },
  { code: 'INC', name: '银川',      nameEn: 'Yinchuan',        airport: '河东国际机场',       country: '中国' },
  { code: 'XNN', name: '西宁',      nameEn: "Xining",          airport: '曹家堡国际机场',     country: '中国' },
  { code: 'KHG', name: '喀什',      nameEn: 'Kashgar',         airport: '喀什机场',           country: '中国' },
  { code: 'DNH', name: '敦煌',      nameEn: 'Dunhuang',        airport: '敦煌机场',           country: '中国' },
  { code: 'HLD', name: '呼伦贝尔',  nameEn: 'Hulunbuir',       airport: '海拉尔机场',         country: '中国' },
  { code: 'YBP', name: '稻城亚丁',  nameEn: 'Daocheng',        airport: '亚丁机场',           country: '中国' },
  { code: 'DIG', name: '迪庆',      nameEn: 'Diqing',          airport: '迪庆机场',           country: '中国' },
  { code: 'TCZ', name: '腾冲',      nameEn: 'Tengchong',       airport: '驼峰机场',           country: '中国' },
  { code: 'LUM', name: '芒市',      nameEn: 'Mangshi',         airport: '芒市机场',           country: '中国' },
  { code: 'AAT', name: '阿勒泰',    nameEn: 'Altay',           airport: '阿勒泰机场',         country: '中国' },
  { code: 'GOQ', name: '格尔木',    nameEn: "Golmud",          airport: '格尔木机场',         country: '中国' },
  { code: 'YUS', name: '玉树',      nameEn: 'Yushu',           airport: '巴塘机场',           country: '中国' },
  { code: 'EJN', name: '额济纳',    nameEn: 'Ejin',            airport: '居延机场',           country: '中国' },
  { code: 'MFM', name: '澳门',      nameEn: 'Macau',           airport: '澳门国际机场',       country: '中国' },

  // ══ 香港 / 台湾 ══
  { code: 'HKG', name: '香港',      nameEn: 'Hong Kong',       airport: '赤鱲角国际机场',     country: '中国香港' },
  { code: 'TPE', name: '台北',      nameEn: 'Taipei',          airport: '桃园国际机场',       country: '中国台湾' },
  { code: 'TSA', name: '台北',      nameEn: 'Taipei',          airport: '松山机场',           country: '中国台湾' },
  { code: 'KHH', name: '高雄',      nameEn: 'Kaohsiung',       airport: '小港国际机场',       country: '中国台湾' },
  { code: 'TNN', name: '台南',      nameEn: 'Tainan',          airport: '台南机场',           country: '中国台湾' },
  { code: 'HUN', name: '花莲',      nameEn: 'Hualien',         airport: '花莲机场',           country: '中国台湾' },
  { code: 'TTT', name: '台东',      nameEn: 'Taitung',         airport: '台东机场',           country: '中国台湾' },

  // ══ 日本 ══
  { code: 'NRT', name: '东京',      nameEn: 'Tokyo',           airport: '成田国际机场',       country: '日本' },
  { code: 'HND', name: '东京',      nameEn: 'Tokyo',           airport: '羽田机场',           country: '日本' },
  { code: 'KIX', name: '大阪',      nameEn: 'Osaka',           airport: '关西国际机场',       country: '日本' },
  { code: 'ITM', name: '大阪',      nameEn: 'Osaka',           airport: '伊丹机场',           country: '日本' },
  { code: 'CTS', name: '札幌',      nameEn: 'Sapporo',         airport: '新千岁机场',         country: '日本' },
  { code: 'FUK', name: '福冈',      nameEn: 'Fukuoka',         airport: '福冈机场',           country: '日本' },
  { code: 'NGO', name: '名古屋',    nameEn: 'Nagoya',          airport: '中部国际机场',       country: '日本' },
  { code: 'OKA', name: '冲绳',      nameEn: 'Okinawa',         airport: '那霸机场',           country: '日本' },
  { code: 'HIJ', name: '广岛',      nameEn: 'Hiroshima',       airport: '广岛机场',           country: '日本' },
  { code: 'SDJ', name: '仙台',      nameEn: 'Sendai',          airport: '仙台机场',           country: '日本' },
  { code: 'KOJ', name: '鹿儿岛',    nameEn: 'Kagoshima',       airport: '鹿儿岛机场',         country: '日本' },
  { code: 'KMQ', name: '小松',      nameEn: 'Komatsu',         airport: '小松机场',           country: '日本' },
  { code: 'AOJ', name: '青森',      nameEn: 'Aomori',          airport: '青森机场',           country: '日本' },
  { code: 'AKJ', name: '旭川',      nameEn: 'Asahikawa',       airport: '旭川机场',           country: '日本' },

  // ══ 韩国 ══
  { code: 'ICN', name: '首尔',      nameEn: 'Seoul',           airport: '仁川国际机场',       country: '韩国' },
  { code: 'GMP', name: '首尔',      nameEn: 'Seoul',           airport: '金浦机场',           country: '韩国' },
  { code: 'PUS', name: '釜山',      nameEn: 'Busan',           airport: '金海国际机场',       country: '韩国' },
  { code: 'CJU', name: '济州',      nameEn: 'Jeju',            airport: '济州国际机场',       country: '韩国' },

  // ══ 东南亚 ══
  { code: 'SIN', name: '新加坡',    nameEn: 'Singapore',       airport: '樟宜国际机场',       country: '新加坡' },
  { code: 'BKK', name: '曼谷',      nameEn: 'Bangkok',         airport: '素万那普机场',       country: '泰国' },
  { code: 'DMK', name: '曼谷',      nameEn: 'Bangkok',         airport: '廊曼国际机场',       country: '泰国' },
  { code: 'HKT', name: '普吉',      nameEn: 'Phuket',          airport: '普吉国际机场',       country: '泰国' },
  { code: 'CNX', name: '清迈',      nameEn: 'Chiang Mai',      airport: '清迈国际机场',       country: '泰国' },
  { code: 'USM', name: '苏梅',      nameEn: 'Koh Samui',       airport: '苏梅机场',           country: '泰国' },
  { code: 'KBV', name: '甲米',      nameEn: 'Krabi',           airport: '甲米机场',           country: '泰国' },
  { code: 'KUL', name: '吉隆坡',    nameEn: 'Kuala Lumpur',    airport: '吉隆坡国际机场',     country: '马来西亚' },
  { code: 'PEN', name: '槟城',      nameEn: 'Penang',          airport: '槟城国际机场',       country: '马来西亚' },
  { code: 'BKI', name: '亚庇',      nameEn: 'Kota Kinabalu',   airport: '亚庇国际机场',       country: '马来西亚' },
  { code: 'LGK', name: '兰卡威',    nameEn: 'Langkawi',        airport: '兰卡威国际机场',     country: '马来西亚' },
  { code: 'DPS', name: '巴厘岛',    nameEn: 'Bali',            airport: '恩古拉赖国际机场',   country: '印度尼西亚' },
  { code: 'CGK', name: '雅加达',    nameEn: 'Jakarta',         airport: '苏加诺-哈达机场',    country: '印度尼西亚' },
  { code: 'SUB', name: '泗水',      nameEn: 'Surabaya',        airport: '朱安达国际机场',     country: '印度尼西亚' },
  { code: 'JOG', name: '日惹',      nameEn: 'Yogyakarta',      airport: '阿迪苏西普托机场',   country: '印度尼西亚' },
  { code: 'LOP', name: '龙目岛',    nameEn: 'Lombok',          airport: '龙目岛国际机场',     country: '印度尼西亚' },
  { code: 'MNL', name: '马尼拉',    nameEn: 'Manila',          airport: '尼诺伊·阿基诺机场',  country: '菲律宾' },
  { code: 'CEB', name: '宿务',      nameEn: 'Cebu',            airport: '麦克坦-宿务国际机场',country: '菲律宾' },
  { code: 'MPH', name: '长滩岛',    nameEn: 'Boracay',         airport: '卡利博机场',         country: '菲律宾' },
  { code: 'PPS', name: '巴拉望',    nameEn: 'Puerto Princesa', airport: '巴拉望国际机场',     country: '菲律宾' },
  { code: 'SGN', name: '胡志明市',  nameEn: 'Ho Chi Minh',     airport: '新山一国际机场',     country: '越南' },
  { code: 'HAN', name: '河内',      nameEn: 'Hanoi',           airport: '内排国际机场',       country: '越南' },
  { code: 'DAD', name: '岘港',      nameEn: 'Da Nang',         airport: '岘港国际机场',       country: '越南' },
  { code: 'CXR', name: '芽庄',      nameEn: 'Nha Trang',       airport: '金兰国际机场',       country: '越南' },
  { code: 'PQC', name: '富国岛',    nameEn: 'Phu Quoc',        airport: '富国国际机场',       country: '越南' },
  { code: 'PNH', name: '金边',      nameEn: 'Phnom Penh',      airport: '金边国际机场',       country: '柬埔寨' },
  { code: 'REP', name: '暹粒',      nameEn: 'Siem Reap',       airport: '暹粒机场',           country: '柬埔寨' },
  { code: 'RGN', name: '仰光',      nameEn: 'Yangon',          airport: '仰光国际机场',       country: '缅甸' },
  { code: 'NYU', name: '蒲甘',      nameEn: 'Bagan',           airport: '曼德勒机场',         country: '缅甸' },
  { code: 'VTE', name: '万象',      nameEn: 'Vientiane',       airport: '瓦岱国际机场',       country: '老挝' },
  { code: 'LPQ', name: '龙坡邦',    nameEn: 'Luang Prabang',   airport: '龙坡邦机场',         country: '老挝' },
  { code: 'MLE', name: '马尔代夫',  nameEn: 'Maldives',        airport: '马累国际机场',       country: '马尔代夫' },
  { code: 'CMB', name: '科伦坡',    nameEn: 'Colombo',         airport: '班达拉奈克机场',     country: '斯里兰卡' },
  { code: 'HRI', name: '汉班托塔',  nameEn: 'Hambantota',      airport: '马塔拉机场',         country: '斯里兰卡' },
  { code: 'UTP', name: '芭提雅',    nameEn: 'Pattaya',         airport: '乌塔堡机场',         country: '泰国' },

  // ══ 中东 ══
  { code: 'DXB', name: '迪拜',      nameEn: 'Dubai',           airport: '迪拜国际机场',       country: '阿联酋' },
  { code: 'AUH', name: '阿布扎比',  nameEn: 'Abu Dhabi',       airport: '阿布扎比国际机场',   country: '阿联酋' },
  { code: 'DOH', name: '多哈',      nameEn: 'Doha',            airport: '哈马德国际机场',     country: '卡塔尔' },
  { code: 'IST', name: '伊斯坦布尔',nameEn: 'Istanbul',        airport: '伊斯坦布尔机场',     country: '土耳其' },
  { code: 'AYT', name: '安塔利亚',  nameEn: 'Antalya',         airport: '安塔利亚机场',       country: '土耳其' },
  { code: 'TLV', name: '特拉维夫',  nameEn: 'Tel Aviv',        airport: '本古里安机场',       country: '以色列' },
  { code: 'RUH', name: '利雅得',    nameEn: 'Riyadh',          airport: '阿卜杜勒阿齐兹机场', country: '沙特阿拉伯' },
  { code: 'JED', name: '吉达',      nameEn: 'Jeddah',          airport: '阿卜杜勒阿齐兹国王机场', country: '沙特阿拉伯' },

  // ══ 欧洲 ══
  { code: 'CDG', name: '巴黎',      nameEn: 'Paris',           airport: '戴高乐国际机场',     country: '法国' },
  { code: 'ORY', name: '巴黎',      nameEn: 'Paris',           airport: '奥利机场',           country: '法国' },
  { code: 'NCE', name: '尼斯',      nameEn: 'Nice',            airport: '尼斯蔚蓝海岸机场',   country: '法国' },
  { code: 'LHR', name: '伦敦',      nameEn: 'London',          airport: '希思罗机场',         country: '英国' },
  { code: 'LGW', name: '伦敦',      nameEn: 'London',          airport: '盖特威克机场',       country: '英国' },
  { code: 'EDI', name: '爱丁堡',    nameEn: 'Edinburgh',       airport: '爱丁堡机场',         country: '英国' },
  { code: 'MAN', name: '曼彻斯特',  nameEn: 'Manchester',      airport: '曼彻斯特机场',       country: '英国' },
  { code: 'FCO', name: '罗马',      nameEn: 'Rome',            airport: '菲乌米奇诺机场',     country: '意大利' },
  { code: 'MXP', name: '米兰',      nameEn: 'Milan',           airport: '马尔彭萨机场',       country: '意大利' },
  { code: 'VCE', name: '威尼斯',    nameEn: 'Venice',          airport: '威尼斯马可波罗机场', country: '意大利' },
  { code: 'FLR', name: '佛罗伦萨',  nameEn: 'Florence',        airport: '佩雷托拉机场',       country: '意大利' },
  { code: 'NAP', name: '那不勒斯',  nameEn: 'Naples',          airport: '那不勒斯卡波迪奇诺机场', country: '意大利' },
  { code: 'BCN', name: '巴塞罗那',  nameEn: 'Barcelona',       airport: '埃尔普拉特机场',     country: '西班牙' },
  { code: 'MAD', name: '马德里',    nameEn: 'Madrid',          airport: '巴拉哈斯机场',       country: '西班牙' },
  { code: 'PMI', name: '马略卡',    nameEn: 'Mallorca',        airport: '帕尔马机场',         country: '西班牙' },
  { code: 'AMS', name: '阿姆斯特丹',nameEn: 'Amsterdam',       airport: '史基浦机场',         country: '荷兰' },
  { code: 'FRA', name: '法兰克福',  nameEn: 'Frankfurt',       airport: '法兰克福国际机场',   country: '德国' },
  { code: 'MUC', name: '慕尼黑',    nameEn: 'Munich',          airport: '慕尼黑机场',         country: '德国' },
  { code: 'BER', name: '柏林',      nameEn: 'Berlin',          airport: '勃兰登堡机场',       country: '德国' },
  { code: 'VIE', name: '维也纳',    nameEn: 'Vienna',          airport: '维也纳国际机场',     country: '奥地利' },
  { code: 'ZRH', name: '苏黎世',    nameEn: 'Zurich',          airport: '苏黎世机场',         country: '瑞士' },
  { code: 'GVA', name: '日内瓦',    nameEn: 'Geneva',          airport: '日内瓦科万坦机场',   country: '瑞士' },
  { code: 'BRU', name: '布鲁塞尔',  nameEn: 'Brussels',        airport: '布鲁塞尔机场',       country: '比利时' },
  { code: 'CPH', name: '哥本哈根',  nameEn: 'Copenhagen',      airport: '哥本哈根机场',       country: '丹麦' },
  { code: 'ARN', name: '斯德哥尔摩',nameEn: 'Stockholm',       airport: '阿兰达机场',         country: '瑞典' },
  { code: 'OSL', name: '奥斯陆',    nameEn: 'Oslo',            airport: '加德莫恩机场',       country: '挪威' },
  { code: 'HEL', name: '赫尔辛基',  nameEn: 'Helsinki',        airport: '万塔机场',           country: '芬兰' },
  { code: 'KEF', name: '雷克雅未克',nameEn: 'Reykjavik',       airport: '凯夫拉维克机场',     country: '冰岛' },
  { code: 'PRG', name: '布拉格',    nameEn: 'Prague',          airport: '瓦茨拉夫哈维尔机场', country: '捷克' },
  { code: 'BUD', name: '布达佩斯',  nameEn: 'Budapest',        airport: '费伦茨·李斯特机场',  country: '匈牙利' },
  { code: 'WAW', name: '华沙',      nameEn: 'Warsaw',          airport: '肖邦机场',           country: '波兰' },
  { code: 'LIS', name: '里斯本',    nameEn: 'Lisbon',          airport: '乌姆贝托·德尔加多机场', country: '葡萄牙' },
  { code: 'ATH', name: '雅典',      nameEn: 'Athens',          airport: '埃莱夫塞里奥斯·韦尼泽洛斯机场', country: '希腊' },
  { code: 'HER', name: '克里特',    nameEn: 'Crete',           airport: '伊拉克利翁机场',     country: '希腊' },
  { code: 'DUB', name: '都柏林',    nameEn: 'Dublin',          airport: '都柏林机场',         country: '爱尔兰' },
  { code: 'OTP', name: '布加勒斯特',nameEn: 'Bucharest',       airport: '亨利·科安达国际机场',country: '罗马尼亚' },
  { code: 'SOF', name: '索菲亚',    nameEn: 'Sofia',           airport: '索菲亚机场',         country: '保加利亚' },
  { code: 'DUB', name: '都柏林',    nameEn: 'Dublin',          airport: '都柏林机场',         country: '爱尔兰' },
  { code: 'SKG', name: '塞萨洛尼基',nameEn: 'Thessaloniki',    airport: '马其顿机场',         country: '希腊' },
  { code: 'SVO', name: '莫斯科',    nameEn: 'Moscow',          airport: '谢列梅捷沃机场',     country: '俄罗斯' },
  { code: 'LED', name: '圣彼得堡',  nameEn: 'St. Petersburg',  airport: '普尔科沃机场',       country: '俄罗斯' },

  // ══ 大洋洲 ══
  { code: 'SYD', name: '悉尼',      nameEn: 'Sydney',          airport: '金斯福德·史密斯机场',country: '澳大利亚' },
  { code: 'MEL', name: '墨尔本',    nameEn: 'Melbourne',       airport: '图拉马林机场',       country: '澳大利亚' },
  { code: 'BNE', name: '布里斯班',  nameEn: 'Brisbane',        airport: '布里斯班机场',       country: '澳大利亚' },
  { code: 'PER', name: '珀斯',      nameEn: 'Perth',           airport: '珀斯机场',           country: '澳大利亚' },
  { code: 'ADL', name: '阿德莱德',  nameEn: 'Adelaide',        airport: '阿德莱德机场',       country: '澳大利亚' },
  { code: 'CNS', name: '凯恩斯',    nameEn: 'Cairns',          airport: '凯恩斯机场',         country: '澳大利亚' },
  { code: 'OOL', name: '黄金海岸',  nameEn: 'Gold Coast',      airport: '黄金海岸机场',       country: '澳大利亚' },
  { code: 'AKL', name: '奥克兰',    nameEn: 'Auckland',        airport: '奥克兰国际机场',     country: '新西兰' },
  { code: 'ZQN', name: '皇后镇',    nameEn: 'Queenstown',      airport: '皇后镇机场',         country: '新西兰' },
  { code: 'CHC', name: '基督城',    nameEn: 'Christchurch',    airport: '基督城机场',         country: '新西兰' },
  { code: 'WLG', name: '惠灵顿',    nameEn: 'Wellington',      airport: '惠灵顿机场',         country: '新西兰' },

  // ══ 美洲 ══
  { code: 'JFK', name: '纽约',      nameEn: 'New York',        airport: '肯尼迪国际机场',     country: '美国' },
  { code: 'LGA', name: '纽约',      nameEn: 'New York',        airport: '拉瓜迪亚机场',       country: '美国' },
  { code: 'LAX', name: '洛杉矶',    nameEn: 'Los Angeles',     airport: '洛杉矶国际机场',     country: '美国' },
  { code: 'SFO', name: '旧金山',    nameEn: 'San Francisco',   airport: '旧金山国际机场',     country: '美国' },
  { code: 'LAS', name: '拉斯维加斯',nameEn: 'Las Vegas',       airport: '哈利·里德国际机场',  country: '美国' },
  { code: 'ORD', name: '芝加哥',    nameEn: 'Chicago',         airport: '奥黑尔国际机场',     country: '美国' },
  { code: 'MIA', name: '迈阿密',    nameEn: 'Miami',           airport: '迈阿密国际机场',     country: '美国' },
  { code: 'HNL', name: '夏威夷',    nameEn: 'Hawaii',          airport: '檀香山国际机场',     country: '美国' },
  { code: 'SEA', name: '西雅图',    nameEn: 'Seattle',         airport: '西塔克机场',         country: '美国' },
  { code: 'BOS', name: '波士顿',    nameEn: 'Boston',          airport: '洛根机场',           country: '美国' },
  { code: 'IAD', name: '华盛顿',    nameEn: 'Washington',      airport: '杜勒斯机场',         country: '美国' },
  { code: 'YYZ', name: '多伦多',    nameEn: 'Toronto',         airport: '皮尔逊国际机场',     country: '加拿大' },
  { code: 'YVR', name: '温哥华',    nameEn: 'Vancouver',       airport: '温哥华国际机场',     country: '加拿大' },
  { code: 'YUL', name: '蒙特利尔',  nameEn: 'Montreal',        airport: '特鲁多机场',         country: '加拿大' },
  { code: 'MEX', name: '墨西哥城',  nameEn: 'Mexico City',     airport: '华雷斯机场',         country: '墨西哥' },
  { code: 'CUN', name: '坎昆',      nameEn: 'Cancun',          airport: '坎昆国际机场',       country: '墨西哥' },
  { code: 'GRU', name: '圣保罗',    nameEn: 'Sao Paulo',       airport: '瓜鲁柳斯机场',       country: '巴西' },
  { code: 'GIG', name: '里约热内卢',nameEn: 'Rio de Janeiro',  airport: '甘萨力诺机场',       country: '巴西' },
  { code: 'EZE', name: '布宜诺斯艾利斯', nameEn: 'Buenos Aires', airport: '埃塞萨机场',       country: '阿根廷' },
  { code: 'LIM', name: '利马',      nameEn: 'Lima',            airport: '豪尔赫查韦斯机场',   country: '秘鲁' },
  { code: 'BOG', name: '波哥大',    nameEn: 'Bogota',          airport: '埃尔多拉多机场',     country: '哥伦比亚' },

  // ══ 南亚 ══
  { code: 'DEL', name: '新德里',    nameEn: 'New Delhi',       airport: '英迪拉·甘地机场',    country: '印度' },
  { code: 'BOM', name: '孟买',      nameEn: 'Mumbai',          airport: '贾特拉帕蒂·希瓦吉机场', country: '印度' },
  { code: 'JAI', name: '斋普尔',    nameEn: 'Jaipur',          airport: '斋普尔机场',         country: '印度' },
  { code: 'CCU', name: '加尔各答',  nameEn: 'Kolkata',         airport: '内塔吉苏巴斯·钱德拉机场', country: '印度' },
  { code: 'BLR', name: '班加罗尔',  nameEn: 'Bangalore',       airport: '肯佩戈达机场',       country: '印度' },
  { code: 'GOI', name: '果阿',      nameEn: 'Goa',             airport: '达博林机场',         country: '印度' },
  { code: 'AMD', name: '艾哈迈达巴德', nameEn: 'Ahmedabad',    airport: '萨达尔·瓦拉巴伊机场',country: '印度' },
  { code: 'KTM', name: '加德满都',  nameEn: 'Kathmandu',       airport: '特里布万机场',       country: '尼泊尔' },

  // ══ 非洲 ══
  { code: 'CAI', name: '开罗',      nameEn: 'Cairo',           airport: '开罗国际机场',       country: '埃及' },
  { code: 'HRG', name: '赫尔格达',  nameEn: 'Hurghada',        airport: '赫尔格达机场',       country: '埃及' },
  { code: 'SSH', name: '沙姆沙伊赫',nameEn: 'Sharm El Sheikh', airport: '沙姆沙伊赫机场',     country: '埃及' },
  { code: 'RAK', name: '马拉喀什',  nameEn: 'Marrakech',       airport: '门纳拉机场',         country: '摩洛哥' },
  { code: 'CMN', name: '卡萨布兰卡',nameEn: 'Casablanca',      airport: '穆罕默德五世机场',   country: '摩洛哥' },
  { code: 'NBO', name: '内罗毕',    nameEn: 'Nairobi',         airport: '乔莫·肯雅塔机场',    country: '肯尼亚' },
  { code: 'JNB', name: '约翰内斯堡',nameEn: 'Johannesburg',    airport: '奥利弗·坦博机场',    country: '南非' },
  { code: 'CPT', name: '开普敦',    nameEn: 'Cape Town',       airport: '开普敦机场',         country: '南非' },
  { code: 'ZNZ', name: '桑给巴尔',  nameEn: 'Zanzibar',        airport: '阿贝德·卡鲁姆机场',  country: '坦桑尼亚' },
  { code: 'DAR', name: '达累斯萨拉姆', nameEn: 'Dar es Salaam', airport: '朱利叶斯·尼雷尔机场', country: '坦桑尼亚' },

  // ══ 中亚 ══
  { code: 'ALA', name: '阿拉木图',  nameEn: 'Almaty',          airport: '阿拉木图机场',       country: '哈萨克斯坦' },
  { code: 'TAS', name: '塔什干',    nameEn: 'Tashkent',        airport: '塔什干机场',         country: '乌兹别克斯坦' },
  { code: 'SKD', name: '撒马尔罕',  nameEn: 'Samarkand',       airport: '撒马尔罕机场',       country: '乌兹别克斯坦' },
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

  const seen = new Set<string>()
  const results: SearchResult[] = []

  for (const c of POPULAR_CITIES) {
    if (seen.has(c.name)) continue
    if (!q || c.name.includes(q) || c.nameEn.toLowerCase().includes(q) || (c.country ?? '').includes(q)) {
      seen.add(c.name)
      const primaryCode = CITY_PRIMARY[c.name] ?? c.code
      const primaryCity = POPULAR_CITIES.find((p) => p.code === primaryCode) ?? c
      results.push({ type: 'city', city: primaryCity, label: c.name, sub: primaryCity.country ?? '城市' })
    }
  }

  return q ? results.slice(0, 20) : results
}

export function getAirportsByCity(cityName: string): CityOption[] {
  return POPULAR_CITIES.filter((c) => c.name === cityName)
}
