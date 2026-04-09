
-- Remove the permissive public SELECT policies
DROP POLICY IF EXISTS "Anyone can view kudos requests by share token" ON public.kudos_requests;
DROP POLICY IF EXISTS "Anyone can view reports by share token" ON public.kudos_reports;

-- Create security-definer function for token-based kudos_request lookup
CREATE OR REPLACE FUNCTION public.get_kudos_request_by_token(_share_token text)
RETURNS TABLE(id uuid, title text, description text, scoring_type scoring_type, expires_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, title, description, scoring_type, expires_at
  FROM public.kudos_requests
  WHERE share_token = _share_token
  LIMIT 1;
$$;

-- Create security-definer function for token-based kudos_report lookup
CREATE OR REPLACE FUNCTION public.get_kudos_report_by_token(_share_token text)
RETURNS TABLE(id uuid, title text, kudos_request_ids uuid[], created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, title, kudos_request_ids::uuid[], created_at
  FROM public.kudos_reports
  WHERE share_token = _share_token
  LIMIT 1;
$$;
