-- ==============================================================================
-- STUDY INSIGHTS / ESPARK - SUPABASE POSTGRESQL SCHEMA & INITIAL SETUP
-- ==============================================================================
-- Instructions:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/cbotvfgzvvfrbvsoyiqz
-- 2. Go to the "SQL Editor" on the left sidebar.
-- 3. Click "New Query", paste the entire contents of this file, and click "Run".
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PROFILES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    class TEXT DEFAULT 'Class 12th',
    exam TEXT DEFAULT 'NEET',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 2. DOCUMENTS TABLE (PDF / Resource Uploads)
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
    time_taken INT DEFAULT 0
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
-- 9. PRACTICE_QUESTIONS TABLE
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
-- INDEXES FOR HIGH PERFORMANCE
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
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- 2. Documents RLS
DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;
CREATE POLICY "Users can view their own documents"
    ON public.documents FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own documents" ON public.documents;
CREATE POLICY "Users can insert their own documents"
    ON public.documents FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own documents" ON public.documents;
CREATE POLICY "Users can update their own documents"
    ON public.documents FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own documents" ON public.documents;
CREATE POLICY "Users can delete their own documents"
    ON public.documents FOR DELETE
    USING (auth.uid() = user_id);

-- 3. Tests RLS
DROP POLICY IF EXISTS "Users can view their own tests" ON public.tests;
CREATE POLICY "Users can view their own tests"
    ON public.tests FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own tests" ON public.tests;
CREATE POLICY "Users can create their own tests"
    ON public.tests FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own tests" ON public.tests;
CREATE POLICY "Users can delete their own tests"
    ON public.tests FOR DELETE
    USING (auth.uid() = user_id);

-- 4. Questions RLS
DROP POLICY IF EXISTS "Users can view questions of their tests" ON public.questions;
CREATE POLICY "Users can view questions of their tests"
    ON public.questions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tests
            WHERE tests.id = questions.test_id AND tests.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert questions to their tests" ON public.questions;
CREATE POLICY "Users can insert questions to their tests"
    ON public.questions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tests
            WHERE tests.id = questions.test_id AND tests.user_id = auth.uid()
        )
    );

-- 5. Attempts RLS
DROP POLICY IF EXISTS "Users can view their own attempts" ON public.attempts;
CREATE POLICY "Users can view their own attempts"
    ON public.attempts FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own attempts" ON public.attempts;
CREATE POLICY "Users can insert their own attempts"
    ON public.attempts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own attempts" ON public.attempts;
CREATE POLICY "Users can update their own attempts"
    ON public.attempts FOR UPDATE
    USING (auth.uid() = user_id);

-- 6. Answers RLS
DROP POLICY IF EXISTS "Users can view their own answers" ON public.answers;
CREATE POLICY "Users can view their own answers"
    ON public.answers FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.attempts
            WHERE attempts.id = answers.attempt_id AND attempts.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert their own answers" ON public.answers;
CREATE POLICY "Users can insert their own answers"
    ON public.answers FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.attempts
            WHERE attempts.id = answers.attempt_id AND attempts.user_id = auth.uid()
        )
    );

-- 7. Mistakes RLS
DROP POLICY IF EXISTS "Users can view their own mistakes" ON public.mistakes;
CREATE POLICY "Users can view their own mistakes"
    ON public.mistakes FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own mistakes" ON public.mistakes;
CREATE POLICY "Users can insert their own mistakes"
    ON public.mistakes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 8. Insights RLS
DROP POLICY IF EXISTS "Users can view their own insights" ON public.insights;
CREATE POLICY "Users can view their own insights"
    ON public.insights FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own insights" ON public.insights;
CREATE POLICY "Users can insert their own insights"
    ON public.insights FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 9. Practice Questions RLS
DROP POLICY IF EXISTS "Users can view practice questions for their insights" ON public.practice_questions;
CREATE POLICY "Users can view practice questions for their insights"
    ON public.practice_questions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.insights
            WHERE insights.id = practice_questions.insight_id AND insights.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert practice questions for their insights" ON public.practice_questions;
CREATE POLICY "Users can insert practice questions for their insights"
    ON public.practice_questions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.insights
            WHERE insights.id = practice_questions.insight_id AND insights.user_id = auth.uid()
        )
    );

-- ==============================================================================
-- AUTOMATIC PROFILE CREATION TRIGGER (FOR GOOGLE & EMAIL SIGNUPS)
-- ==============================================================================
-- Automatically provisions a row in public.profiles whenever a new user signs up
-- via Google OAuth or Email/Password in auth.users.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, class, exam, avatar_url)
    VALUES (
        new.id,
        COALESCE(
            new.raw_user_meta_data->>'full_name',
            new.raw_user_meta_data->>'name',
            split_part(new.email, '@', 1)
        ),
        COALESCE(new.raw_user_meta_data->>'class', 'Class 12th'),
        COALESCE(new.raw_user_meta_data->>'exam', 'NEET'),
        COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', NULL)
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
        updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if already exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==============================================================================
-- 10. VECTOR EMBEDDINGS (SUPABASE PGVECTOR FOR RAG PERSISTENCE)
-- ==============================================================================
-- Enable pgvector extension for cloud vector search
CREATE EXTENSION IF NOT EXISTS vector;

-- Document chunks table storing chunk text, metadata, and 384-dimensional dense vectors
CREATE TABLE IF NOT EXISTS public.document_chunks (
    id TEXT PRIMARY KEY,
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL DEFAULT 0,
    text TEXT NOT NULL,
    embedding vector(384),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance and isolation
CREATE INDEX IF NOT EXISTS idx_document_chunks_user ON public.document_chunks(user_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_doc ON public.document_chunks(document_id);

-- Row Level Security (RLS) for tenant isolation
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own document chunks" ON public.document_chunks;
CREATE POLICY "Users can view their own document chunks"
    ON public.document_chunks FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own document chunks" ON public.document_chunks;
CREATE POLICY "Users can insert their own document chunks"
    ON public.document_chunks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own document chunks" ON public.document_chunks;
CREATE POLICY "Users can delete their own document chunks"
    ON public.document_chunks FOR DELETE
    USING (auth.uid() = user_id);

-- Match document chunks function for cosine similarity retrieval
CREATE OR REPLACE FUNCTION match_document_chunks(
    query_embedding vector(384),
    match_count INT DEFAULT 5,
    filter_user_id UUID DEFAULT NULL,
    filter_subject TEXT DEFAULT NULL,
    filter_chapter TEXT DEFAULT NULL
)
RETURNS TABLE (
    id TEXT,
    document_id UUID,
    user_id UUID,
    text TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id,
        dc.document_id,
        dc.user_id,
        dc.text,
        dc.metadata,
        1 - (dc.embedding <=> query_embedding) AS similarity
    FROM public.document_chunks dc
    WHERE (filter_user_id IS NULL OR dc.user_id = filter_user_id)
      AND (filter_subject IS NULL OR (dc.metadata->>'subject') = filter_subject OR filter_subject = 'General')
      AND (filter_chapter IS NULL OR (dc.metadata->>'chapter') = filter_chapter OR filter_chapter = 'General')
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
