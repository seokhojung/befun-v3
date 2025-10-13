-- 1.2E Must-Fix: 마이그레이션 실행 로그 표준 테이블 추가
-- 참고: docs/qa/snapshots/1.2E-execution-log-table.md

BEGIN;

CREATE TABLE IF NOT EXISTS public.migration_run_logs (
  run_id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,         -- e.g., 'user_profiles-full-scan'
  mode TEXT NOT NULL,          -- 'dry-run' | 'execute'
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL,        -- 'OK' | 'ERROR'
  created_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  missing_count INTEGER NOT NULL DEFAULT 0,
  errors_count INTEGER NOT NULL DEFAULT 0,
  details JSONB DEFAULT '{}'
);

COMMIT;

