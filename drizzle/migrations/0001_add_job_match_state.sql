CREATE TABLE public.job_match_state (
 user_id uuid PRIMARY KEY,
 profile_key text NOT NULL DEFAULT '',
 rankings jsonb NOT NULL DEFAULT '[]'::jsonb,
 state text NOT NULL DEFAULT 'idle',
 message text NOT NULL DEFAULT '',
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_match_state TO authenticated;
GRANT ALL ON public.job_match_state TO service_role;
ALTER TABLE public.job_match_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own match state select" ON public.job_match_state FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own match state insert" ON public.job_match_state FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own match state update" ON public.job_match_state FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own match state delete" ON public.job_match_state FOR DELETE TO authenticated USING (auth.uid() = user_id);