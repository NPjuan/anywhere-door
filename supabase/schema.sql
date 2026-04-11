-- ============================================================
-- Anywhere Door — Supabase Schema
-- 在 Supabase Dashboard → SQL Editor 中粘贴运行
-- ============================================================


-- ── 1. 创建表 ─────────────────────────────────────────────

create table if not exists plans (
  id               text        primary key,
  device_id        text        not null,
  status           text        not null default 'done',  -- pending | done | error
  title            text        not null default '规划中...',
  summary          text,
  destination      text,
  start_date       text,
  end_date         text,
  days_count       int         default 0,
  budget_low       numeric     default 0,
  budget_high      numeric     default 0,
  itinerary        jsonb,                                -- pending 时为 null，完成后填充
  planning_params  jsonb,                                -- 用于刷新恢复规划，完成后清空
  saved_at         timestamptz not null default now()
);


-- ── 2. 索引 ──────────────────────────────────────────────

create index if not exists plans_device_id_idx on plans (device_id);
create index if not exists plans_saved_at_idx  on plans (saved_at desc);
create index if not exists plans_status_idx    on plans (status);


-- ── 3. 旧表迁移（幂等，可重复执行）──────────────────────

-- 新增列
alter table plans add column if not exists status          text not null default 'done';
alter table plans add column if not exists planning_params jsonb;
alter table plans add column if not exists agent_progress  jsonb;  -- 各 agent 完成状态快照

-- 分享功能字段（Phase 1: Basic Sharing）
alter table plans add column if not exists share_enabled   boolean     default false;  -- 是否开启分享
alter table plans add column if not exists share_token     text;                       -- 分享令牌（用于验证）
alter table plans add column if not exists share_expires_at timestamptz;              -- 分享过期时间

-- itinerary 允许为 null（pending 状态下尚无结果）
alter table plans alter column itinerary drop not null;


-- ── 4. 分享功能索引 ──────────────────────────────────────
create index if not exists plans_share_token_idx on plans (share_token) where share_token is not null;
create index if not exists plans_share_enabled_idx on plans (share_enabled) where share_enabled = true;


-- ── 5. API 覆盖的操作一览（仅供参考，无需执行）──────────
--
-- GET  /api/plans?deviceId=xxx
--   SELECT id, status, title, summary, destination,
--          start_date, end_date, days_count,
--          budget_low, budget_high, saved_at
--   FROM plans WHERE device_id = $1
--   ORDER BY saved_at DESC LIMIT 50
--
-- GET  /api/plans/[id]
--   SELECT * FROM plans WHERE id = $1
--
-- POST /api/plans
--   INSERT INTO plans (...) VALUES (...)
--   支持 status='pending'（规划中，itinerary 为 null）
--      或 status='done'（直接保存完整行程）
--
-- PATCH /api/plans/[id]
--   情况 A：仅更新状态
--     UPDATE plans SET status=$1, planning_params=null WHERE id=$2
--   情况 B：填充完整行程（规划完成）
--     UPDATE plans SET status='done', title=$1, summary=$2,
--                      destination=$3, days_count=$4,
--                      budget_low=$5, budget_high=$6,
--                      itinerary=$7, planning_params=null
--     WHERE id=$8
--   情况 C：更新分享设置
--     UPDATE plans SET share_enabled=$1, share_expires_at=$2 WHERE id=$3
--
-- DELETE /api/plans/[id]?deviceId=xxx
--   DELETE FROM plans WHERE id=$1 AND device_id=$2


-- ── 6. Row Level Security（可选，按需开启）──────────────

-- alter table plans enable row level security;
--
-- create policy "设备只能访问自己的计划"
--   on plans for all
--   using (device_id = current_setting('app.device_id', true));


-- ── 7. feedbacks 表 ──────────────────────────────────────

create table if not exists feedbacks (
  id         bigserial    primary key,
  device_id  text         not null,
  contact    text,                    -- 可选，邮箱/手机/微信等任意联系方式
  content    text         not null,
  created_at timestamptz  not null default now()
);

create index if not exists feedbacks_created_at_idx on feedbacks (created_at desc);


-- ── 8. 版本管理表（Phase 2: Version Management）────────────

-- 添加版本字段到 plans 表
alter table plans add column if not exists current_version int default 1;

-- 版本历史表
create table if not exists plan_versions (
  id              bigserial    primary key,
  plan_id         text         not null references plans(id) on delete cascade,
  version_number  int          not null,
  itinerary       jsonb        not null,
  change_type     text         not null,  -- 'initial' | 'refine' | 'manual_edit'
  change_description text,
  user_feedback   text,
  created_at      timestamptz  not null default now(),
  unique(plan_id, version_number)
);

create index if not exists plan_versions_plan_id_idx on plan_versions(plan_id);
create index if not exists plan_versions_created_at_idx on plan_versions(created_at desc);
