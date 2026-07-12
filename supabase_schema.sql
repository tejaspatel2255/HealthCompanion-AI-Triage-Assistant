-- 1. Create Conversations Table
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    messages JSONB DEFAULT '[]'::jsonb NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Conversations Policies
CREATE POLICY "Users can view their own conversations" 
    ON public.conversations 
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations" 
    ON public.conversations 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations" 
    ON public.conversations 
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations" 
    ON public.conversations 
    FOR DELETE 
    USING (auth.uid() = user_id);


-- 2. Create Symptom Logs Table
CREATE TABLE IF NOT EXISTS public.symptom_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    severity VARCHAR(50) NOT NULL,
    possible_causes JSONB DEFAULT '[]'::jsonb NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.symptom_logs ENABLE ROW LEVEL SECURITY;

-- Symptom Logs Policies
CREATE POLICY "Users can view their own symptom logs" 
    ON public.symptom_logs 
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own symptom logs" 
    ON public.symptom_logs 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own symptom logs" 
    ON public.symptom_logs 
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own symptom logs" 
    ON public.symptom_logs 
    FOR DELETE 
    USING (auth.uid() = user_id);
