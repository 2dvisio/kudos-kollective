
DROP FUNCTION IF EXISTS public.get_kudos_responses_by_request_id(uuid);

CREATE FUNCTION public.get_kudos_responses_by_request_id(_request_id uuid)
 RETURNS TABLE(score integer, respondent_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT score, respondent_name
  FROM public.kudos_responses
  WHERE kudos_request_id = _request_id;
$$;
