'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Map, Locate, Plus, Minus } from 'lucide-react'
import type { DayPlan, POI } from '@/lib/agents/types'

/* ============================================================
   RouteMap — 高德地图 JS API v1.4.15
   ============================================================ */

interface RouteMapProps {
  dayPlan:      DayPlan
  activePOIId?: string
}

const DAY_COLOR = '#2563EB'

declare global {
  interface Window {
    _AMapSecurityConfig?: { securityJsCode: string }
    AMap?: AMapStub
  }
}
interface AMapStub {
  Map:      new (el: HTMLElement, opts: object) => AMapInstance
  Marker:   new (opts: object) => AMapObj
  Polyline: new (opts: object) => AMapObj
  plugin:   (names: string[], cb: () => void) => void
}
interface AMapInstance {
  setFitView:   (markers?: AMapObj[], immediately?: boolean) => void
  setZoom:      (zoom: number) => void
  getZoom:      () => number
  destroy:      () => void
  clearMap:     () => void
}
interface AMapObj {
  setMap: (m: AMapInstance) => void
}

export function RouteMap({ dayPlan }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<AMapInstance | null>(null)
  const markersRef   = useRef<AMapObj[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  const webKey      = process.env.NEXT_PUBLIC_AMAP_WEB_KEY
  const securityKey = process.env.NEXT_PUBLIC_AMAP_SECURITY_KEY

  const allActivities = [
    ...(dayPlan.morning   ?? []),
    ...(dayPlan.afternoon ?? []),
    ...(dayPlan.evening   ?? []),
  ]
  const pois: POI[] = allActivities
    .map((a) => a.poi)
    .filter((p): p is POI => !!p?.latLng)

  /* 回到全局视野 */
  const handleFitView = useCallback(() => {
    if (mapRef.current && markersRef.current.length > 0) {
      mapRef.current.setFitView(markersRef.current, true)
    }
  }, [])

  /* 放大 */
  const handleZoomIn = useCallback(() => {
    if (mapRef.current) mapRef.current.setZoom(mapRef.current.getZoom() + 1)
  }, [])

  /* 缩小 */
  const handleZoomOut = useCallback(() => {
    if (mapRef.current) mapRef.current.setZoom(mapRef.current.getZoom() - 1)
  }, [])

  useEffect(() => {
    if (!webKey || !containerRef.current) {
      setHasError(true)
      return
    }

    let destroyed = false

    const loadMap = async () => {
      try {
        if (securityKey) {
          window._AMapSecurityConfig = { securityJsCode: securityKey }
        }

        if (!window.AMap) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script')
            script.src = `https://webapi.amap.com/maps?v=1.4.15&key=${webKey}`
            script.async = true
            script.onload  = () => resolve()
            script.onerror = () => reject(new Error('Amap script load failed'))
            document.head.appendChild(script)
          })
        }

        if (destroyed || !window.AMap || !containerRef.current) return

        const firstPoi = pois[0]
        const center: [number, number] = firstPoi?.latLng
          ? [firstPoi.latLng.lng, firstPoi.latLng.lat]
          : [121.4737, 31.2304]

        const map = new window.AMap.Map(containerRef.current, {
          zoom:         12,
          center,
          viewMode:     '2D',
          resizeEnable: true,
          // 禁用默认控件（我们自己做）
          zoomEnable:   true,
          scrollWheel:  true,
        })
        mapRef.current = map

        if (destroyed) { map.destroy(); return }

        /* 标记 */
        const markers: AMapObj[] = []
        pois.forEach((poi, i) => {
          const marker = new window.AMap!.Marker({
            position: [poi.latLng.lng, poi.latLng.lat],
            title:    poi.name,
            label: {
              content: `<div style="
                background:#fff;
                border:1.5px solid ${DAY_COLOR};
                border-radius:4px;
                padding:2px 7px;
                font-size:11px;
                color:#1e40af;
                white-space:nowrap;
                box-shadow:0 2px 6px rgba(37,99,235,0.15);
              ">${i + 1}. ${poi.name}</div>`,
              offset: { x: 0, y: -36 },
            },
          })
          marker.setMap(map)
          markers.push(marker)
        })
        markersRef.current = markers

        /* 折线 */
        if (pois.length > 1) {
          const polyline = new window.AMap!.Polyline({
            path:          pois.map((p) => [p.latLng.lng, p.latLng.lat]),
            strokeColor:   DAY_COLOR,
            strokeWeight:  2,
            strokeOpacity: 0.6,
            strokeStyle:   'solid',
          })
          polyline.setMap(map)
        }

        if (markers.length > 0) map.setFitView(markers)
        if (!destroyed) setIsLoaded(true)

      } catch (err) {
        console.error('[RouteMap]', err)
        if (!destroyed) setHasError(true)
      }
    }

    loadMap()

    return () => {
      destroyed = true
      markersRef.current = []
      if (mapRef.current) {
        mapRef.current.destroy()
        mapRef.current = null
      }
      setIsLoaded(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayPlan.day, webKey])

  /* 降级 */
  if (!webKey || hasError) {
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
    <div className="relative w-full rounded-lg overflow-hidden" style={{ height: 400 }}>
      {/* 加载遮罩 */}
      {!isLoaded && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2"
          style={{ background: '#F8FAFF' }}>
          <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: `${DAY_COLOR} transparent ${DAY_COLOR} ${DAY_COLOR}` }} />
          <p className="text-xs" style={{ color: '#94A3B8' }}>地图加载中...</p>
        </div>
      )}

      {/* 地图容器 */}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* 自定义控件 — 右下角 */}
      {isLoaded && (
        <div
          className="absolute bottom-4 right-3 z-10 flex flex-col gap-1"
          style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.12))' }}
        >
          {/* 回到全局视野 */}
          <button
            onClick={handleFitView}
            title="回到全览"
            className="w-8 h-8 flex items-center justify-center cursor-pointer transition-colors"
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 6,
              color: '#2563EB',
            }}
          >
            <Locate size={14} />
          </button>

          {/* 分隔 */}
          <div style={{ height: 4 }} />

          {/* 放大 */}
          <button
            onClick={handleZoomIn}
            title="放大"
            className="w-8 h-8 flex items-center justify-center cursor-pointer transition-colors hover:bg-gray-50"
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '6px 6px 0 0',
              borderBottom: 'none',
              color: '#374151',
            }}
          >
            <Plus size={14} />
          </button>

          {/* 缩小 */}
          <button
            onClick={handleZoomOut}
            title="缩小"
            className="w-8 h-8 flex items-center justify-center cursor-pointer transition-colors hover:bg-gray-50"
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '0 0 6px 6px',
              color: '#374151',
            }}
          >
            <Minus size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
