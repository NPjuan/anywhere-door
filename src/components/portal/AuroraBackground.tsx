'use client'

/* ============================================================
   亮色背景 — 极简白底 + 微弱蓝色光晕
   Light background — clean white + subtle blue glow
   ============================================================ */

export function TechBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: 0 }}
    >
      {/* 基底白 */}
      <div className="absolute inset-0" style={{ background: '#F8FAFF' }} />

      {/* 左上角极淡蓝色光晕 */}
      <div
        className="absolute"
        style={{
          top: '-15%', left: '-10%',
          width: '55%', height: '60%',
          background: 'radial-gradient(ellipse at 35% 40%, rgba(219,234,254,0.70) 0%, rgba(191,219,254,0.25) 45%, transparent 75%)',
          filter: 'blur(2px)',
        }}
      />

      {/* 右下角极淡暖色光晕 */}
      <div
        className="absolute"
        style={{
          bottom: '-10%', right: '-8%',
          width: '50%', height: '55%',
          background: 'radial-gradient(ellipse at 65% 60%, rgba(254,243,199,0.55) 0%, rgba(253,230,138,0.15) 50%, transparent 75%)',
          filter: 'blur(2px)',
        }}
      />

      {/* 细网格纹 — 极淡 */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(99,102,241,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,0.035) 1px, transparent 1px)
          `,
          backgroundSize: '72px 72px',
        }}
      />
    </div>
  )
}

export { TechBackground as SkyBackground }
export { TechBackground as AuroraBackground }
export { TechBackground as DeepBackground }
export { TechBackground as DoraemonBackground }
