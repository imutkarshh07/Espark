# Supabase PostgreSQL Database Schema & Security Architecture

This document contains the complete relational schema, Row Level Security (RLS) policies, indexes, and storage bucket configuration for **Study Insights**.

## Architectural Decision: Pure Supabase PostgreSQL (No MongoDB)
- PostgreSQL is the sole relational datastore.
- We utilize PostgreSQL's native `JSONB` data types for flexible structures like question options and practice questions, eliminating any necessity for MongoDB.
- Native Foreign Keys guarantee referential integrity (`ON DELETE CASCADE`).
- Native Row Level Security (RLS) enforces database-level tenant isolation.

---

## 1. Complete SQL DDL & Migration Script

Execute the following SQL in the Supabase SQL Editor:

```sql
-- ==============================================================================
-- STUDY INSIGHTS POSTGRESQL SCHEMA (SUPABASE)
-- ==============================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PROFILES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    class TEXT,
    exam TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 2. DOCUMENTS TABLE (PDF Metadata)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT DEFAULT 'application/pdf',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    processing_error TEXT,
    subject TEXT DEFAULT 'General',
    chapter TEXT DEFAULT 'General',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 3. TESTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    chapter TEXT,
    total_questions INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 4. QUESTIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    topic TEXT,
    difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 5. ATTEMPTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
    score NUMERIC(5,2) DEFAULT 0.00,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

-- ------------------------------------------------------------------------------
-- 6. ANSWERS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES public.attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    selected_answer TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    time_taken INT DEFAULT 0 -- Duration in seconds
);

-- ------------------------------------------------------------------------------
-- 7. MISTAKES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mistakes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    attempt_id UUID NOT NULL REFERENCES public.attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('conceptual', 'careless', 'time_pressure', 'memory', 'calculation', 'unknown')),
    reason TEXT,
    student_answer TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    confidence NUMERIC(4,3) DEFAULT 0.000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 8. INSIGHTS TABLE (AI Diagnosis)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    mistake_id UUID NOT NULL REFERENCES public.mistakes(id) ON DELETE CASCADE,
    diagnosis TEXT NOT NULL,
    explanation TEXT NOT NULL,
    recommended_action TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 9. PRACTICE_QUESTIONS TABLE (Targeted AI Follow-ups)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.practice_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    insight_id UUID NOT NULL REFERENCES public.insights(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    correct_answer TEXT NOT NULL,
    explanation TEXT
);

-- ==============================================================================
-- INDEXES FOR HIGH-PERFORMANCE QUERYING
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_documents_user ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_tests_user ON public.tests(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_test ON public.questions(test_id);
CREATE INDEX IF NOT EXISTS idx_attempts_user ON public.attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_test ON public.attempts(test_id);
CREATE INDEX IF NOT EXISTS idx_answers_attempt ON public.answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_answers_question ON public.answers(question_id);
CREATE INDEX IF NOT EXISTS idx_mistakes_user ON public.mistakes(user_id);
CREATE INDEX IF NOT EXISTS idx_mistakes_attempt ON public.mistakes(attempt_id);
CREATE INDEX IF NOT EXISTS idx_mistakes_category ON public.mistakes(category);
CREATE INDEX IF NOT EXISTS idx_insights_user ON public.insights(user_id);
CREATE INDEX IF NOT EXISTS idx_insights_mistake ON public.insights(mistake_id);
CREATE INDEX IF NOT EXISTS idx_practice_questions_insight ON public.practice_questions(insight_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mistakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_questions ENABLE ROW LEVEL SECURITY;

-- 1. Profiles RLS
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- 2. Documents RLS
CREATE POLICY "Users can view their own documents"
    ON public.documents FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents"
    ON public.documents FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
    ON public.documents FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
    ON public.documents FOR DELETE
    USING (auth.uid() = user_id);

-- 3. Tests RLS
CREATE POLICY "Users can view their own tests"
    ON public.tests FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tests"
    ON public.tests FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tests"
    ON public.tests FOR DELETE
    USING (auth.uid() = user_id);

-- 4. Questions RLS
CREATE POLICY "Users can view questions of their tests"
    ON public.questions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tests
            WHERE tests.id = questions.test_id AND tests.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert questions to their tests"
    ON public.questions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tests
            WHERE tests.id = questions.test_id AND tests.user_id = auth.uid()
        )
    );

-- 5. Attempts RLS
CREATE POLICY "Users can view their own attempts"
    ON public.attempts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own attempts"
    ON public.attempts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own attempts"
    ON public.attempts FOR UPDATE
    USING (auth.uid() = user_id);

-- 6. Answers RLS
CREATE POLICY "Users can view their own answers"
    ON public.answers FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.attempts
            WHERE attempts.id = answers.attempt_id AND attempts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own answers"
    ON public.answers FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.attempts
            WHERE attempts.id = answers.attempt_id AND attempts.user_id = auth.uid()
        )
    );

-- 7. Mistakes RLS
CREATE POLICY "Users can view their own mistakes"
    ON public.mistakes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mistakes"
    ON public.mistakes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 8. Insights RLS
CREATE POLICY "Users can view their own insights"
    ON public.insights FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own insights"
    ON public.insights FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 9. Practice Questions RLS
CREATE POLICY "Users can view practice questions for their insights"
    ON public.practice_questions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.insights
            WHERE insights.id = practice_questions.insight_id AND insights.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert practice questions for their insights"
    ON public.practice_questions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.insights
            WHERE insights.id = practice_questions.insight_id AND insights.user_id = auth.uid()
        )
    );

-- ==============================================================================
-- AUTOMATIC PROFILE CREATION TRIGGER
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, class, exam)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        COALESCE(new.raw_user_meta_data->>'class', 'General'),
        COALESCE(new.raw_user_meta_data->>'exam', 'Target Exam')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if already exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users table
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==============================================================================
-- STORAGE BUCKET CONFIGURATION
-- ==============================================================================
-- In Supabase Storage, create a private bucket named 'study-documents'
-- Standard path convention:
-- study-documents/{user_id}/{document_id}/{original_filename}.pdf

-- Storage RLS Policies:
-- 1. Select policy:
-- (bucket_id = 'study-documents' AND auth.uid()::text = (storage.foldername(name))[1])
-- 2. Insert policy:
-- (bucket_id = 'study-documents' AND auth.uid()::text = (storage.foldername(name))[1])
-- 3. Delete policy:
-- (bucket_id = 'study-documents' AND auth.uid()::text = (storage.foldername(name))[1])
```
