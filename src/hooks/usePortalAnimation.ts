'use client'

import { useCallback, useReducer } from 'react'

/* ============================================================
   usePortalAnimation — 传送门状态机 hook
   Portal animation state machine hook

   状态 States: IDLE → SEARCHING → OPEN → CLOSING
   来源 Source: design-system/anywhere-door/MASTER.md §7.4
   规则 Rule: 动画基于交互触发，非装饰性 infinite
              Animations are interaction-triggered, not decorative infinite
   ============================================================ */

export type PortalState = 'IDLE' | 'SEARCHING' | 'OPEN' | 'CLOSING'

interface PortalAnimationState {
  portalState: PortalState
  /** 当前旅行风格对应的光圈色 / Current travel style ring color */
  ringColor: string
  /** 传送门是否正在过渡 / Whether portal is transitioning */
  isTransitioning: boolean
}

type PortalAction =
  | { type: 'START_SEARCH' }
  | { type: 'OPEN_PORTAL' }
  | { type: 'RESET' }
  | { type: 'SET_RING_COLOR'; color: string }

const TRAVEL_STYLE_COLORS: Record<string, string> = {
  photography: 'var(--color-style-photography)',
  foodie:      'var(--color-style-foodie)',
  adventure:   'var(--color-style-adventure)',
  culture:     'var(--color-style-culture)',
  relaxation:  'var(--color-style-relaxation)',
  default:     'var(--color-portal-glow)',
}

const initialState: PortalAnimationState = {
  portalState:    'IDLE',
  ringColor:      TRAVEL_STYLE_COLORS.default,
  isTransitioning: false,
}

function reducer(state: PortalAnimationState, action: PortalAction): PortalAnimationState {
  switch (action.type) {
    case 'START_SEARCH':
      return { ...state, portalState: 'SEARCHING', isTransitioning: true }
    case 'OPEN_PORTAL':
      return { ...state, portalState: 'OPEN', isTransitioning: true }
    case 'RESET':
      return { ...initialState, ringColor: state.ringColor }
    case 'SET_RING_COLOR':
      return { ...state, ringColor: action.color }
    default:
      return state
  }
}

export function usePortalAnimation() {
  const [state, dispatch] = useReducer(reducer, initialState)

  const startSearch = useCallback(() => {
    dispatch({ type: 'START_SEARCH' })
  }, [])

  const openPortal = useCallback(() => {
    dispatch({ type: 'OPEN_PORTAL' })
  }, [])

  const resetPortal = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  /** 选择旅行风格时更新光圈颜色 / Update ring color when travel style selected */
  const setTravelStyle = useCallback((style: string) => {
    const color = TRAVEL_STYLE_COLORS[style] ?? TRAVEL_STYLE_COLORS.default
    dispatch({ type: 'SET_RING_COLOR', color })
  }, [])

  return {
    portalState:     state.portalState,
    ringColor:       state.ringColor,
    isTransitioning: state.isTransitioning,
    isIdle:          state.portalState === 'IDLE',
    isSearching:     state.portalState === 'SEARCHING',
    isOpen:          state.portalState === 'OPEN',
    startSearch,
    openPortal,
    resetPortal,
    setTravelStyle,
    TRAVEL_STYLE_COLORS,
  }
}
