-- Migration: Create drawing_jobs and extend saved_design table
-- Purpose: Support asynchronous drawing generation and design management
-- Story: 4.1 - Drawing Generation and Design Management

-- ================================================
-- 1. Create drawing_jobs table for async job tracking
-- ================================================

CREATE TABLE IF NOT EXISTS drawing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  design_id UUID NOT NULL REFERENCES saved_designs(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  file_url TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create index for performance
CREATE INDEX idx_drawing_jobs_user_id ON drawing_jobs(user_id);
CREATE INDEX idx_drawing_jobs_design_id ON drawing_jobs(design_id);
CREATE INDEX idx_drawing_jobs_status ON drawing_jobs(status);
CREATE INDEX idx_drawing_jobs_created_at ON drawing_jobs(created_at DESC);

-- Enable RLS
ALTER TABLE drawing_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for drawing_jobs
CREATE POLICY "Users can view own drawing jobs"
  ON drawing_jobs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own drawing jobs"
  ON drawing_jobs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own drawing jobs"
  ON drawing_jobs
  FOR UPDATE
  USING (auth.uid() = user_id);

-- ================================================
-- 2. Extend saved_designs table for drawing management
-- ================================================

-- Add drawing-related fields
ALTER TABLE saved_designs
ADD COLUMN IF NOT EXISTS drawing_file_url TEXT,
ADD COLUMN IF NOT EXISTS drawing_generated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS design_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Add index for user queries
CREATE INDEX IF NOT EXISTS idx_saved_designs_user_id ON saved_designs(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_designs_created_at ON saved_designs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_designs_updated_at ON saved_designs(updated_at DESC);

-- ================================================
-- 3. Add updated_at trigger for drawing_jobs
-- ================================================

CREATE OR REPLACE FUNCTION update_drawing_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_drawing_jobs_updated_at
  BEFORE UPDATE ON drawing_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_drawing_jobs_updated_at();

-- ================================================
-- 4. Comments for documentation
-- ================================================

COMMENT ON TABLE drawing_jobs IS 'Async job tracking for PDF drawing generation';
COMMENT ON COLUMN drawing_jobs.status IS 'Job status: pending, processing, completed, failed';
COMMENT ON COLUMN drawing_jobs.progress IS 'Job progress percentage (0-100)';
COMMENT ON COLUMN drawing_jobs.file_url IS 'Supabase Storage URL for generated PDF';

COMMENT ON COLUMN saved_designs.drawing_file_url IS 'Latest generated drawing PDF URL';
COMMENT ON COLUMN saved_designs.drawing_generated_at IS 'Timestamp of last drawing generation';
COMMENT ON COLUMN saved_designs.design_name IS 'User-specified name for the design';
COMMENT ON COLUMN saved_designs.thumbnail_url IS '3D view thumbnail image URL';