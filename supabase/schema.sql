-- ============================================================
-- Anywhere Door — Supabase Schema
-- 在 Supabase Dashboard → SQL Editor 中粘贴运行（幂等，可重复执行）
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
  planning_params  jsonb,                                -- 用于刷新恢复规划
  agent_progress   jsonb,                                -- 各 agent 完成状态快照
  ai_model         text        default 'deepseek',      -- 规划使用的 AI 模型
  saved_at         timestamptz not null default now()
);


-- ── 2. 索引 ──────────────────────────────────────────────

create index if not exists plans_device_id_idx on plans (device_id);
create index if not exists plans_saved_at_idx  on plans (saved_at desc);
create index if not exists plans_status_idx    on plans (status);


-- ── 3. 迁移（旧表补列，幂等）────────────────────────────

alter table plans add column if not exists status          text        not null default 'done';
alter table plans add column if not exists planning_params jsonb;
alter table plans add column if not exists agent_progress  jsonb;
alter table plans add column if not exists ai_model        text        default 'deepseek';
alter table plans alter column itinerary drop not null;


-- ── 4. feedbacks 表 ──────────────────────────────────────

create table if not exists feedbacks (
  id         bigserial    primary key,
  device_id  text         not null,
  contact    text,
  content    text         not null,
  created_at timestamptz  not null default now()
);

create index if not exists feedbacks_created_at_idx on feedbacks (created_at desc);
