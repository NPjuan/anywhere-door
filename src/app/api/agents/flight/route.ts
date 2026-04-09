import { NextRequest, NextResponse } from 'next/server'

/* Agent flight — 已移除机票功能，返回空数据保持路由兼容
   Flight agent removed, returns empty for route compatibility */
export async function POST(_req: NextRequest) {
  return NextResponse.json({
    selectedFlight: null,
    commentary: '机票功能暂未开放 / Flight feature coming soon',
  })
}
