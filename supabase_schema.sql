-- Yatra.AI Supabase Database Schema

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(80) NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index on email for fast user lookups during login/register
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);

-- 2. User Tokens Table (For Session Management)
CREATE TABLE IF NOT EXISTS public.user_tokens (
    token TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index on user_id for session verification
CREATE INDEX IF NOT EXISTS idx_tokens_user_id ON public.user_tokens (user_id);

-- 3. Trips Table (For Storing Generated Itineraries & Replans)
CREATE TABLE IF NOT EXISTS public.trips (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    destination TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    budget NUMERIC(12, 2) DEFAULT 0,
    interests JSONB DEFAULT '[]'::jsonb,
    pace TEXT DEFAULT 'moderate',
    status TEXT DEFAULT 'created',
    total_days INT DEFAULT 0,
    total_estimated_cost NUMERIC(12, 2) DEFAULT 0,
    weather_summary JSONB,
    weather_forecast JSONB,
    days JSONB DEFAULT '[]'::jsonb,
    disruptions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index on user_id for fetching user trips
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON public.trips (user_id);
