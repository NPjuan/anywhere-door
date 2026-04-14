'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Map, Locate, Plus, Minus } from 'lucide-react'
import type { DayPlan, POI, Activity } from '@/lib/agents/types'
import { MapSkeleton } from '@/components/ui/Skeleton'

/* ============================================================
   RouteMap — 双地图支持
   · 中国大陆 / 港澳台 → 高德地图 JS API v1.4.15（Driving 路线）
   · 海外             → Leaflet + OpenStreetMap（折线）
   ============================================================ */

interface RouteMapProps {
  dayPlan:        DayPlan
  activePOIId?:   string
  onMarkerClick?: (poiId: string) => void
}

const DAY_COLOR = '#2563EB'

/* ---------- AMap 类型桩 ---------- */
declare global {
  interface Window {
    _AMapSecurityConfig?: { securityJsCode: string }
    AMap?: AMapStub
  }
}
interface AMapStub {
  Map:        new (el: HTMLElement, opts: object) => AMapInstance
  Marker:     new (opts: object) => AMapMarker
  Polyline:   new (opts: object) => AMapObj
  InfoWindow: new (opts: object) => AMapInfoWindow
  plugin:     (names: string[], cb: () => void) => void
  Driving:    new (opts: object) => DrivingInstance
}
interface AMapInstance {
  setFitView: (markers?: AMapObj[], immediately?: boolean) => void
  setZoom:    (zoom: number) => void
  getZoom:    () => number
  setCenter:  (pos: [number, number]) => void
  destroy:    () => void
  clearMap:   () => void
  on:         (event: string, handler: () => void) => void
}
interface AMapObj   { setMap: (m: AMapInstance | null) => void }
interface AMapMarker extends AMapObj { on: (event: string, handler: () => void) => void }
interface AMapInfoWindow { open: (map: AMapInstance, pos: [number, number]) => void; close: () => void }
interface DrivingInstance {
  search: (
    origin: [number, number],
    dest:   [number, number],
    opts:   { waypoints?: [number, number][] },
    cb:     (status: string, result: unknown) => void,
  ) => void
  clear: () => void
}

/* ---------- 工具函数 ---------- */
function isInChinaRegion(lat: number, lng: number): boolean {
  return lat >= 17.5 && lat <= 53.5 && lng >= 73.5 && lng <= 135.5
}

/**
 * 为 Leaflet 地图添加瓦片层，返回 remove 方法
 */
function applyTileSource(
  L: typeof import('leaflet'),
  map: import('leaflet').Map,
  source: 'carto' | 'esri',
): import('leaflet').TileLayer {
  if (source === 'esri') {
    return L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      { attribution: '© <a href="https://www.esri.com/">Esri</a>', maxZoom: 18 }
    ).addTo(map)
  }
  return L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a> © <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }
  ).addTo(map)
}

type POIMapEntry = {
  index:    number
  poi:      POI & { latLng: { lat: number; lng: number } }
  activity: Activity
}

function buildInfoWindowContent(poi: POI, activity?: Activity): string {
  const cost      = activity?.cost      ?? ''
  const duration  = activity?.duration  ?? ''
  const transport = activity?.transport ?? ''
  const time      = activity?.time      ?? ''
  return `
    <div style="padding:12px 14px;min-width:200px;max-width:260px;font-family:-apple-system,sans-serif;line-height:1.5">
      <div style="font-weight:600;font-size:14px;color:#0F172A;margin-bottom:2px">${poi.name}</div>
      ${poi.address ? `<div style="font-size:12px;color:#64748B;margin-bottom:8px">${poi.address}</div>` : ''}
      <div style="display:flex;flex-wrap:wrap;gap:6px;font-size:12px">
        ${time     ? `<span style="background:#EFF6FF;color:#2563EB;padding:2px 7px;border-radius:4px">🕐 ${time}</span>` : ''}
        ${duration ? `<span style="background:#F1F5F9;color:#475569;padding:2px 7px;border-radius:4px">⏱ ${duration}</span>` : ''}
        ${cost     ? `<span style="background:#F0FDF4;color:#16A34A;padding:2px 7px;border-radius:4px">💰 ${cost}</span>` : ''}
      </div>
      ${transport  ? `<div style="font-size:11px;color:#2563EB;margin-top:8px;padding-top:8px;border-top:1px solid #F1F5F9">🚇 ${transport}</div>` : ''}
      ${poi.category ? `<div style="font-size:11px;color:#94A3B8;margin-top:4px">${poi.category}</div>` : ''}
    </div>
  `
}

/* ---------- 组件 ---------- */
export function RouteMap({ dayPlan, activePOIId, onMarkerClick }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  /* AMap refs */
  const amapRef       = useRef<AMapInstance | null>(null)
  const amapMkRef     = useRef<AMapMarker[]>([])
  const drivingRef    = useRef<DrivingInstance | null>(null)
  const infoWinRef    = useRef<AMapInfoWindow | null>(null)

  /* Leaflet refs */
  const lfMapRef      = useRef<import('leaflet').Map | null>(null)
  const lfMkRef       = useRef<import('leaflet').Marker[]>([])
  const lfPolyRef     = useRef<import('leaflet').Polyline | null>(null)

  const poiIndexMapRef = useRef<Record<string, POIMapEntry>>({})

  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [tileSource, setTileSource] = useState<'carto' | 'esri'>('carto')
  const tileLayerRef = useRef<import('leaflet').TileLayer | null>(null)

  const webKey      = process.env.NEXT_PUBLIC_AMAP_WEB_KEY
  const securityKey = process.env.NEXT_PUBLIC_AMAP_SECURITY_KEY

  /* 收集所有活动 */
  const allActivities = [
    ...(dayPlan.morning   ?? []),
    ...(dayPlan.afternoon ?? []),
    ...(dayPlan.evening   ?? []),
  ]
  const poisWithActivity = allActivities
    .filter((a): a is Activity & { poi: POI & { latLng: { lat: number; lng: number } } } => !!a.poi?.latLng)
    .map(a => ({ poi: a.poi, activity: a }))
  const pois = poisWithActivity.map(p => p.poi)

  /* 判断是否用高德：多数 POI 在中国才用高德（避免出发机场误判） */
  const chinaCount = pois.filter(p => isInChinaRegion(p.latLng.lat, p.latLng.lng)).length
  const isChina    = pois.length === 0 || chinaCount > pois.length / 2

  /* ---- 控制按钮 ---- */
  const handleFitView = useCallback(() => {
    if (amapRef.current && amapMkRef.current.length > 0) {
      amapRef.current.setFitView(amapMkRef.current, true)
    } else if (lfMapRef.current && lfMkRef.current.length > 0) {
      import('leaflet').then(({ default: L }) => {
        if (!lfMapRef.current) return
        const grp = L.featureGroup(lfMkRef.current)
        lfMapRef.current.fitBounds(grp.getBounds(), { padding: [30, 30] })
      })
    }
  }, [])

  const handleZoomIn = useCallback(() => {
    if (amapRef.current) amapRef.current.setZoom(amapRef.current.getZoom() + 1)
    else if (lfMapRef.current) lfMapRef.current.setZoom(lfMapRef.current.getZoom() + 1)
  }, [])

  const handleZoomOut = useCallback(() => {
    if (amapRef.current) amapRef.current.setZoom(amapRef.current.getZoom() - 1)
    else if (lfMapRef.current) lfMapRef.current.setZoom(lfMapRef.current.getZoom() - 1)
  }, [])

  /* 消除高德 label 默认外边框 */
  useEffect(() => {
    const id = 'amap-label-reset'
    if (!document.getElementById(id)) {
      const s = document.createElement('style')
      s.id = id
      s.textContent = '.amap-marker-label{border:none!important;background:transparent!important;padding:0!important;box-shadow:none!important;}'
      document.head.appendChild(s)
    }
  }, [])

  /* ======================================================
     AMap effect — 仅中国区
     ====================================================== */
  useEffect(() => {
    if (!isChina) return
    if (!webKey || !containerRef.current) { setHasError(true); return }

    let destroyed = false

    /* 降级直线 */
    const drawPolyline = (map: AMapInstance, pts: [number, number][]) => {
      if (!window.AMap || pts.length < 2) return
      const poly = new window.AMap.Polyline({
        path: pts, strokeColor: DAY_COLOR, strokeWeight: 5,
        strokeOpacity: 0.8, strokeStyle: 'dashed',
        isOutline: true, outlineColor: '#ffffff', borderWeight: 1,
      })
      poly.setMap(map)
    }

    /* 真实路线 */
    const drawDriving = (map: AMapInstance, pts: [number, number][]) => {
      if (!window.AMap || pts.length < 2) return
      window.AMap.plugin(['AMap.Driving'], () => {
        if (!window.AMap) return
        const driving = new window.AMap.Driving({
          map, hideMarkers: true, showTraffic: false, autoFitView: false,
          lineOptions: {
            strokeColor: DAY_COLOR, strokeWeight: 6, strokeOpacity: 0.9,
            isOutline: true, outlineColor: '#ffffff', borderWeight: 1,
          },
        })
        drivingRef.current = driving
        const origin = pts[0], dest = pts[pts.length - 1]
        const waypoints = pts.slice(1, -1) as [number, number][]
        driving.search(origin, dest, { waypoints }, (status: string) => {
          if (status !== 'complete') drawPolyline(map, pts)
        })
      })
    }

    const loadMap = async () => {
      try {
        if (securityKey) window._AMapSecurityConfig = { securityJsCode: securityKey }
        if (!window.AMap) {
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement('script')
            s.src = `https://webapi.amap.com/maps?v=1.4.15&key=${webKey}`
            s.async = true
            s.onload  = () => resolve()
            s.onerror = () => reject(new Error('AMap load failed'))
            document.head.appendChild(s)
          })
        }
        if (destroyed || !window.AMap || !containerRef.current) return

        const centerPoi = pois.find(p => isInChinaRegion(p.latLng.lat, p.latLng.lng)) ?? pois[0]
        const center: [number, number] = centerPoi?.latLng
          ? [centerPoi.latLng.lng, centerPoi.latLng.lat]
          : [121.4737, 31.2304]
        const map = new window.AMap.Map(containerRef.current, {
          zoom: 12, center, viewMode: '2D', resizeEnable: true,
          zoomEnable: true, scrollWheel: true,
        })
        amapRef.current = map
        if (destroyed) { map.destroy(); return }

        map.on('click', () => infoWinRef.current?.close())

        const markers: AMapMarker[] = []
        for (const k in poiIndexMapRef.current) delete poiIndexMapRef.current[k]
        poisWithActivity.forEach(({ poi, activity }, i) => {
          poiIndexMapRef.current[poi.id ?? poi.name] = { index: i, poi, activity }
          const marker = new window.AMap!.Marker({
            position: [poi.latLng.lng, poi.latLng.lat],
            title: poi.name,
            label: {
              content: `<div style="background:#fff;border:1.5px solid ${DAY_COLOR};border-radius:4px;padding:2px 7px;font-size:11px;color:#1e40af;white-space:nowrap;box-shadow:0 2px 6px rgba(37,99,235,0.15);">${i + 1}. ${poi.name}</div>`,
              offset: { x: 0, y: -36 },
            },
          })
          marker.setMap(map)
          marker.on('click', () => {
            if (!window.AMap) return
            infoWinRef.current?.close()
            const iw = new window.AMap!.InfoWindow({
              content: buildInfoWindowContent(poi, activity),
              offset: { x: 0, y: -10 },
              closeWhenClickMap: true,
            })
            iw.open(map, [poi.latLng.lng, poi.latLng.lat])
            infoWinRef.current = iw
            onMarkerClick?.(poi.id ?? poi.name)
          })
          markers.push(marker)
        })
        amapMkRef.current = markers

        if (pois.length >= 2) {
          drawDriving(map, pois.map((p): [number, number] => [p.latLng.lng, p.latLng.lat]))
        }
        if (markers.length > 0) map.setFitView(markers)
        if (!destroyed) setIsLoaded(true)
      } catch (err) {
        console.error('[RouteMap AMap]', err)
        if (!destroyed) setHasError(true)
      }
    }

    loadMap()

    return () => {
      destroyed = true
      amapMkRef.current = []
      infoWinRef.current = null
      for (const k in poiIndexMapRef.current) delete poiIndexMapRef.current[k]
      if (drivingRef.current) { drivingRef.current.clear(); drivingRef.current = null }
      if (amapRef.current)    { amapRef.current.destroy();  amapRef.current = null }
      setIsLoaded(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayPlan.day, webKey, isChina])

  /* ======================================================
     Leaflet effect — 海外
     ====================================================== */
  useEffect(() => {
    if (isChina) return
    if (!containerRef.current || !pois.length) return

    let destroyed = false

    const initLeaflet = async () => {
      try {
        const L = (await import('leaflet')).default
        if (destroyed || !containerRef.current) return

        /* 修复 webpack 打包后图标路径丢失 */
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (L.Icon.Default.prototype as any)._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl:        'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl:      'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        })

        const fp  = pois[0]
        const map = L.map(containerRef.current, {
          zoomControl: false,
          center: [fp.latLng.lat, fp.latLng.lng],
          zoom: 13,
        })

        tileLayerRef.current = applyTileSource(L, map, tileSource)

        lfMapRef.current = map
        if (destroyed) { map.remove(); return }

        for (const k in poiIndexMapRef.current) delete poiIndexMapRef.current[k]
        const markers: import('leaflet').Marker[] = []

        poisWithActivity.forEach(({ poi, activity }, i) => {
          poiIndexMapRef.current[poi.id ?? poi.name] = { index: i, poi, activity }

          const icon = L.divIcon({
            className: '',
            html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translateX(-50%)">
              <div style="width:24px;height:24px;background:${DAY_COLOR};border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700;box-shadow:0 2px 6px rgba(37,99,235,0.4);flex-shrink:0">${i + 1}</div>
              <div style="background:#fff;border:1.5px solid ${DAY_COLOR};border-radius:4px;padding:2px 7px;font-size:11px;color:#1e40af;white-space:nowrap;box-shadow:0 2px 6px rgba(37,99,235,0.15);margin-top:2px;font-family:-apple-system,sans-serif">${poi.name}</div>
            </div>`,
            iconSize:   [0, 0],
            iconAnchor: [0, 50],
          })

          const mk = L.marker([poi.latLng.lat, poi.latLng.lng], { icon }).addTo(map)
          mk.on('click', () => {
            L.popup({ offset: [0, -55] })
              .setLatLng([poi.latLng.lat, poi.latLng.lng])
              .setContent(buildInfoWindowContent(poi, activity))
              .openOn(map)
            onMarkerClick?.(poi.id ?? poi.name)
          })
          markers.push(mk)
        })
        lfMkRef.current = markers

        /* 折线 */
        if (pois.length >= 2) {
          const latlngs = pois.map(p => [p.latLng.lat, p.latLng.lng] as [number, number])
          const poly = L.polyline(latlngs, {
            color: DAY_COLOR, weight: 4, opacity: 0.8, dashArray: '8 6',
          }).addTo(map)
          lfPolyRef.current = poly
        }

        if (markers.length > 0) {
          map.fitBounds(L.featureGroup(markers).getBounds(), { padding: [40, 40] })
        }
        if (!destroyed) setIsLoaded(true)
      } catch (err) {
        console.error('[RouteMap Leaflet]', err)
        if (!destroyed) setHasError(true)
      }
    }

    initLeaflet()

    return () => {
      destroyed = true
      lfMkRef.current = []
      lfPolyRef.current = null
      for (const k in poiIndexMapRef.current) delete poiIndexMapRef.current[k]
      if (lfMapRef.current) { lfMapRef.current.remove(); lfMapRef.current = null }
      setIsLoaded(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayPlan.day, isChina])

  /* tileSource 切换 → 替换瓦片层 */
  useEffect(() => {
    if (isChina || !lfMapRef.current) return
    import('leaflet').then(({ default: L }) => {
      if (!lfMapRef.current) return
      if (tileLayerRef.current) tileLayerRef.current.remove()
      tileLayerRef.current = applyTileSource(L, lfMapRef.current, tileSource)
    })
  }, [tileSource, isChina])

  /* ======================================================
     activePOIId → 飞到标记
     ====================================================== */
  useEffect(() => {
    if (!activePOIId || !isLoaded) return
    const entry = poiIndexMapRef.current[activePOIId]
    if (!entry) return
    const { poi, activity } = entry

    if (isChina && amapRef.current && window.AMap) {
      const pos: [number, number] = [poi.latLng.lng, poi.latLng.lat]
      infoWinRef.current?.close()
      const iw = new window.AMap!.InfoWindow({
        content: buildInfoWindowContent(poi, activity),
        offset: { x: 0, y: -10 },
        closeWhenClickMap: true,
      })
      iw.open(amapRef.current, pos)
      infoWinRef.current = iw
      amapRef.current.setCenter(pos)
    } else if (!isChina && lfMapRef.current) {
      import('leaflet').then(({ default: L }) => {
        if (!lfMapRef.current) return
        lfMapRef.current.setView([poi.latLng.lat, poi.latLng.lng], lfMapRef.current.getZoom())
        L.popup({ offset: [0, -55] })
          .setLatLng([poi.latLng.lat, poi.latLng.lng])
          .setContent(buildInfoWindowContent(poi, activity))
          .openOn(lfMapRef.current)
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePOIId, isLoaded])

  /* ---- 无 key 且是国内才降级到 POI 列表 ---- */
  if (hasError || (isChina && !webKey)) {
    return (
      <div
        className="w-full rounded-lg flex flex-col items-center justify-center gap-3 p-6 text-center"
        style={{ background: '#F8FAFF', border: '1px solid #E2E8F0', minHeight: 280 }}
      >
        <Map size={32} style={{ color: '#CBD5E1' }} />
        <div>
          <p className="text-sm font-medium" style={{ color: '#475569' }}>地图暂不可用</p>
          <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>配置 NEXT_PUBLIC_AMAP_WEB_KEY 后启用</p>
        </div>
        {pois.length > 0 && (
          <div className="w-full text-left space-y-1.5 mt-2">
            {pois.map((poi, i) => (
              <div key={poi.id ?? i} className="flex items-center gap-2 text-xs" style={{ color: '#64748B' }}>
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                  style={{ background: DAY_COLOR, fontSize: 10 }}>
                  {i + 1}
                </span>
                {poi.name}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative w-full rounded-lg overflow-hidden h-[280px] sm:h-[400px]">
      {/* 加载骨架 */}
      {!isLoaded && <MapSkeleton />}

      {/* 地图容器 */}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* 右上角：海外模式瓦片切换 */}
      {isLoaded && !isChina && (
        <div className="absolute top-3 right-3 z-[1000]"
          style={{ filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.12))' }}>
          <button
            onClick={() => setTileSource(s => s === 'carto' ? 'esri' : 'carto')}
            className="text-xs px-2.5 py-1 cursor-pointer transition-all"
            style={{
              background: '#FFFFFF',
              color: '#64748B',
              border: '1px solid #E2E8F0',
              borderRadius: 6,
            }}
          >
            加载失败？切换地图
          </button>
        </div>
      )}

      {/* 自定义控件 — 右下角 */}
      {isLoaded && (
        <div
          className="absolute bottom-4 right-3 z-[1000] flex flex-col gap-1"
          style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.12))' }}
        >
          <button
            onClick={handleFitView}
            title="回到全览"
            className="w-8 h-8 flex items-center justify-center cursor-pointer transition-colors"
            style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 6, color: '#2563EB' }}
          >
            <Locate size={14} />
          </button>

          <div style={{ height: 4 }} />

          <button
            onClick={handleZoomIn}
            title="放大"
            className="w-8 h-8 flex items-center justify-center cursor-pointer transition-colors hover:bg-gray-50"
            style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px 6px 0 0', borderBottom: 'none', color: '#374151' }}
          >
            <Plus size={14} />
          </button>

          <button
            onClick={handleZoomOut}
            title="缩小"
            className="w-8 h-8 flex items-center justify-center cursor-pointer transition-colors hover:bg-gray-50"
            style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '0 0 6px 6px', color: '#374151' }}
          >
            <Minus size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
