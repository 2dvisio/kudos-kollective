
-- Allow anyone to view responses for requests that are in a public report
CREATE POLICY "Anyone can view responses via public report"
ON public.kudos_responses
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.kudos_reports
    WHERE kudos_responses.kudos_request_id = ANY(kudos_reports.kudos_request_ids)
  )
);
