-- ============================================================================
-- Yatra.AI — Trips table migration
-- Run this in your Supabase Dashboard → SQL Editor
-- ============================================================================

CREATE TABLE IF NOT EXISTS trips (
  id                    BIGSERIAL PRIMARY KEY,
  user_id               UUID NOT NULL,
  destination           TEXT NOT NULL DEFAULT '',
  start_date            TEXT,
  end_date              TEXT,
  budget                NUMERIC DEFAULT 0,
  interests             JSONB DEFAULT '[]',
  pace                  TEXT DEFAULT 'moderate',
  status                TEXT DEFAULT 'created',
  days                  JSONB DEFAULT '[]',
  disruptions           JSONB DEFAULT '[]',
  geocoded_days         JSONB,
  weather_forecast      JSONB,
  weather_summary       JSONB,
  total_days            INT DEFAULT 0,
  total_estimated_cost  NUMERIC DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

-- Fast user lookups
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);

-- Backend handles auth — no RLS needed
ALTER TABLE trips DISABLE ROW LEVEL SECURITY;
