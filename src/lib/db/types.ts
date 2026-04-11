/**
 * Database Schema Types
 * Auto-generated from Supabase schema
 * See: supabase/schema.sql
 */

import type { FullItinerary } from '@/lib/agents/types'

/**
 * Plans Table
 * Core table for storing travel itineraries
 */
export interface Plan {
  id: string
  device_id: string
  status: 'pending' | 'done' | 'error' | 'interrupted'
  title: string
  summary?: string
  destination?: string
  start_date?: string
  end_date?: string
  days_count: number
  budget_low: number
  budget_high: number
  itinerary: FullItinerary | null
  planning_params?: Record<string, unknown> | null
  agent_progress?: Record<string, unknown> | null
  saved_at: string
  // Phase 1: Basic Sharing
  share_enabled: boolean
  share_token?: string | null
  share_expires_at?: string | null
}

/**
 * Plan Summary for list view
 * Subset of Plan for pagination/search
 */
export interface PlanSummary {
  id: string
  status: string
  title: string
  summary?: string
  destination?: string
  start_date?: string
  end_date?: string
  days_count: number
  budget_low: number
  budget_high: number
  saved_at: string
  share_enabled: boolean
}

/**
 * Plan Share Settings
 * Subset for share modal/settings
 */
export interface PlanShareSettings {
  id: string
  share_enabled: boolean
  share_token?: string | null
  share_expires_at?: string | null
}

/**
 * Feedback Table
 * User feedback submission
 */
export interface Feedback {
  id: number
  device_id: string
  contact?: string | null
  content: string
  created_at: string
}
