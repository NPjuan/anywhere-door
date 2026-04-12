'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { MapPin, Locate } from 'lucide-react'

/* ============================================================
   MiniMap — 探索卡片用的轻量地图
   · 中国大陆 / 港澳台 → 高德地图 JS API（共享 window.AMap）
   · 海外             → Leaflet + OpenStreetMap
   ============================================================ */

export interface MiniMapPOI {
  name: string
  lat:  number
  lng:  number
}

interface MiniMapProps {
  pois:    MiniMapPOI[]
  height?: number
}

interface AMapInst { setFitView: (m?: AMapMk[]) => void; destroy: () => void }
interface AMapMk   { setMap: (m: AMapInst | null) => void }
interface AMapPoly { setMap: (m: AMapInst | null) => void }
type AMapLib = {
  Map:      new (el: HTMLElement, opts: object) => AMapInst
  Marker:   new (opts: object) => AMapMk
  Polyline: new (opts: object) => AMapPoly
}

declare global {
  interface Window {
    _AMapSecurityConfig?: { securityJsCode: string }
    _amapScriptLoading?:  Promise<void>
  }
}

const getAMap = (): AMapLib | undefined =>
  (window as unknown as { AMap?: AMapLib }).AMap

function loadAmapSDK(webKey: string, securityKey?: string): Promise<void> {
  if (getAMap()) return Promise.resolve()
  if (window._amapScriptLoading) return window._amapScriptLoading
  if (securityKey) window._AMapSecurityConfig = { securityJsCode: securityKey }
  window._amapScriptLoading = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://webapi.amap.com/maps?v=1.4.15&key=${webKey}`
    script.async = true
    script.onload  = () => resolve()
    script.onerror = () => reject(new Error('AMap load failed'))
    document.head.appendChild(script)
  })
  return window._amapScriptLoading
}

function isInChinaRegion(lat: number, lng: number): boolean {
  return lat >= 17.5 && lat <= 53.5 && lng >= 73.5 && lng <= 135.5
}

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

const DAY_COLOR = '#2563EB'

export function MiniMap({ pois, height = 160 }: MiniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  /* AMap refs */
  const amapRef     = useRef<AMapInst | null>(null)
  const amapMkRef   = useRef<AMapMk[]>([])
  const amapPolyRef = useRef<AMapPoly | null>(null)

  /* Leaflet refs */
  const lfMapRef  = useRef<import('leaflet').Map | null>(null)
  const lfMkRef   = useRef<import('leaflet').Marker[]>([])
  const lfPolyRef = useRef<import('leaflet').Polyline | null>(null)

  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  const webKey      = process.env.NEXT_PUBLIC_AMAP_WEB_KEY
  const securityKey = process.env.NEXT_PUBLIC_AMAP_SECURITY_KEY

  /* 判断目标区域：多数 POI 在中国才用高德 */
  const chinaCount = pois.filter(p => isInChinaRegion(p.lat, p.lng)).length
  const isChina    = pois.length === 0 || chinaCount > pois.length / 2

  /* 居中/全览 */
  const handleFitView = useCallback(() => {
    if (isChina && amapRef.current && amapMkRef.current.length > 0) {
      amapRef.current.setFitView(amapMkRef.current)
    } else if (!isChina && lfMapRef.current && lfMkRef.current.length > 0) {
      import('leaflet').then(({ default: L }) => {
        if (!lfMapRef.current) return
        const grp = L.featureGroup(lfMkRef.current)
        lfMapRef.current.fitBounds(grp.getBounds(), { padding: [30, 30] })
      })
    }
  }, [isChina])

  // 注入一次全局 CSS
  useEffect(() => {
    const id = 'amap-label-reset'
    if (!document.getElementById(id)) {
      const s = document.createElement('style')
      s.id = id
      s.textContent = '.amap-marker-label{border:none!important;background:transparent!important;padding:0!important;box-shadow:none!important;}'
      document.head.appendChild(s)
    }
  }, [])

  /* ======= AMap effect ======= */
  useEffect(() => {
    if (!isChina) return
    if (!webKey || !containerRef.current || !pois.length) {
      if (!webKey) setHasError(true)
      return
    }

    let destroyed = false

    const init = async () => {
      try {
        await loadAmapSDK(webKey, securityKey)
        const AMap = getAMap()
        if (destroyed || !AMap || !containerRef.current) return

        const fp  = pois[0]
        const map = new AMap.Map(containerRef.current, {
          zoom: 13, center: [fp.lng, fp.lat], viewMode: '2D',
          resizeEnable: true, zoomEnable: true, scrollWheel: true,
          dragEnable: true, mapStyle: 'amap://styles/light',
        })
        amapRef.current = map
        if (destroyed) { map.destroy(); return }

        const markers: AMapMk[] = []
        pois.forEach((poi, i) => {
          const marker = new AMap.Marker({
            position: [poi.lng, poi.lat],
            title: poi.name,
            label: {
              content: `<div style="background:#fff;border:1.5px solid ${DAY_COLOR};border-radius:4px;padding:2px 6px;font-size:10px;color:#1e40af;white-space:nowrap;box-shadow:0 2px 6px rgba(37,99,235,0.15);line-height:1.4;">${i + 1}. ${poi.name}</div>`,
              offset: { x: 0, y: -32 },
            },
          })
          marker.setMap(map)
          markers.push(marker)
        })
        amapMkRef.current = markers

        if (pois.length >= 2) {
          const poly = new AMap.Polyline({
            path: pois.map(p => [p.lng, p.lat]),
            strokeColor: DAY_COLOR, strokeWeight: 3, strokeOpacity: 0.7,
            strokeStyle: 'dashed', isOutline: true, outlineColor: '#ffffff', borderWeight: 1,
          })
          poly.setMap(map)
          amapPolyRef.current = poly
        }

        if (markers.length > 0) map.setFitView(markers)
        if (!destroyed) setIsLoaded(true)
      } catch (err) {
        console.warn('[MiniMap AMap]', err)
        if (!destroyed) setHasError(true)
      }
    }

    init()

    return () => {
      destroyed = true
      amapMkRef.current.forEach(m => m.setMap(null))
      amapMkRef.current = []
      if (amapPolyRef.current) { amapPolyRef.current.setMap(null); amapPolyRef.current = null }
      if (amapRef.current)     { amapRef.current.destroy();        amapRef.current = null }
      setIsLoaded(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pois.map(p => `${p.lat},${p.lng}`).join('|'), webKey, isChina])

  /* ======= Leaflet effect ======= */
  useEffect(() => {
    if (isChina) return
    if (!containerRef.current || !pois.length) return

    let destroyed = false

    const init = async () => {
      try {
        const L = (await import('leaflet')).default
        if (destroyed || !containerRef.current) return

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
          center: [fp.lat, fp.lng],
          zoom: 13,
        })
        applyTileSource(L, map, 'carto')

        lfMapRef.current = map
        if (destroyed) { map.remove(); return }

        const markers: import('leaflet').Marker[] = []
        pois.forEach((poi, i) => {
          const icon = L.divIcon({
            className: '',
            html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translateX(-50%)">
              <div style="width:20px;height:20px;background:${DAY_COLOR};border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:700;box-shadow:0 2px 4px rgba(37,99,235,0.4);flex-shrink:0">${i + 1}</div>
              <div style="background:#fff;border:1.5px solid ${DAY_COLOR};border-radius:4px;padding:1px 5px;font-size:10px;color:#1e40af;white-space:nowrap;box-shadow:0 1px 4px rgba(37,99,235,0.15);margin-top:1px;font-family:-apple-system,sans-serif;line-height:1.4">${poi.name}</div>
            </div>`,
            iconSize: [0, 0], iconAnchor: [0, 42],
          })
          const mk = L.marker([poi.lat, poi.lng], { icon }).addTo(map)
          markers.push(mk)
        })
        lfMkRef.current = markers

        if (pois.length >= 2) {
          const poly = L.polyline(
            pois.map(p => [p.lat, p.lng] as [number, number]),
            { color: DAY_COLOR, weight: 3, opacity: 0.7, dashArray: '7 5' }
          ).addTo(map)
          lfPolyRef.current = poly
        }

        if (markers.length > 0) {
          map.fitBounds(L.featureGroup(markers).getBounds(), { padding: [30, 30] })
        }
        if (!destroyed) setIsLoaded(true)
      } catch (err) {
        console.warn('[MiniMap Leaflet]', err)
        if (!destroyed) setHasError(true)
      }
    }

    init()

    return () => {
      destroyed = true
      lfMkRef.current = []
      lfPolyRef.current = null
      if (lfMapRef.current) { lfMapRef.current.remove(); lfMapRef.current = null }
      setIsLoaded(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pois.map(p => `${p.lat},${p.lng}`).join('|'), isChina])

  if (hasError || (isChina && !webKey)) {
    return (
      <div className="flex flex-col gap-1 px-1 py-2" style={{ minHeight: height }}>
        {pois.map((p, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs" style={{ color: '#64748B' }}>
            <span className="w-4 h-4 rounded flex items-center justify-center text-white shrink-0"
              style={{ background: DAY_COLOR, fontSize: 9 }}>{i + 1}</span>
            <MapPin size={9} style={{ color: '#94A3B8', flexShrink: 0 }} />
            {p.name}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="relative w-full overflow-hidden" style={{ height, borderRadius: 8 }}>
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center z-10"
          style={{ background: '#F1F5F9' }}>
          <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: `${DAY_COLOR} transparent ${DAY_COLOR} ${DAY_COLOR}` }} />
        </div>
      )}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {/* 居中按钮 */}
      {isLoaded && (
        <button
          onClick={handleFitView}
          title="回到全览"
          className="absolute bottom-2 right-2 z-[1000] w-7 h-7 flex items-center justify-center cursor-pointer"
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 6,
            color: DAY_COLOR,
            boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
          }}
        >
          <Locate size={12} />
        </button>
      )}
    </div>
  )
}
