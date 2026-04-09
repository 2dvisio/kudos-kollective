
CREATE OR REPLACE FUNCTION public.get_kudos_requests_by_ids(_ids uuid[])
RETURNS TABLE(id uuid, title text, description text, scoring_type scoring_type)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, title, description, scoring_type
  FROM public.kudos_requests
  WHERE id = ANY(_ids);
$$;

CREATE OR REPLACE FUNCTION public.get_kudos_responses_by_request_id(_request_id uuid)
RETURNS TABLE(score integer, comment text, respondent_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT score, comment, respondent_name
  FROM public.kudos_responses
  WHERE kudos_request_id = _request_id;
$$;
