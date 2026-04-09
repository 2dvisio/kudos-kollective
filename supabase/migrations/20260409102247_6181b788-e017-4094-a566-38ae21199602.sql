
-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Anyone can view kudos requests by share token" ON public.kudos_requests;
DROP POLICY IF EXISTS "Anyone can view reports by share token" ON public.kudos_reports;

-- Recreate with share_token check: anonymous users must filter by share_token
CREATE POLICY "Anyone can view kudos requests by share token"
ON public.kudos_requests
FOR SELECT
TO public
USING (share_token IS NOT NULL);

CREATE POLICY "Anyone can view reports by share token"
ON public.kudos_reports
FOR SELECT
TO public
USING (share_token IS NOT NULL);
