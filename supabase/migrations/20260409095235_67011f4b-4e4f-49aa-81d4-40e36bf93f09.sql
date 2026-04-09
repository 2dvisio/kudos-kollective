
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Create scoring type enum
CREATE TYPE public.scoring_type AS ENUM ('thumbs_up', 'thumbs_up_down', 'nps');

-- Create kudos_requests table
CREATE TABLE public.kudos_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  scoring_type public.scoring_type NOT NULL DEFAULT 'thumbs_up',
  share_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.kudos_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own kudos requests" ON public.kudos_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view kudos requests by share token" ON public.kudos_requests FOR SELECT USING (true);
CREATE POLICY "Users can create their own kudos requests" ON public.kudos_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own kudos requests" ON public.kudos_requests FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own kudos requests" ON public.kudos_requests FOR DELETE USING (auth.uid() = user_id);

-- Create kudos_responses table
CREATE TABLE public.kudos_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kudos_request_id UUID NOT NULL REFERENCES public.kudos_requests(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  comment TEXT,
  respondent_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.kudos_responses ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a response (no auth required)
CREATE POLICY "Anyone can submit kudos responses" ON public.kudos_responses FOR INSERT WITH CHECK (true);
-- Only the owner of the kudos request can view responses
CREATE POLICY "Request owners can view responses" ON public.kudos_responses FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.kudos_requests kr
    WHERE kr.id = kudos_request_id AND kr.user_id = auth.uid()
  )
);

-- Create kudos_reports table
CREATE TABLE public.kudos_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  kudos_request_ids UUID[] NOT NULL,
  share_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.kudos_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reports" ON public.kudos_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view reports by share token" ON public.kudos_reports FOR SELECT USING (true);
CREATE POLICY "Users can create their own reports" ON public.kudos_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reports" ON public.kudos_reports FOR DELETE USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_kudos_requests_updated_at BEFORE UPDATE ON public.kudos_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index for share token lookups
CREATE INDEX idx_kudos_requests_share_token ON public.kudos_requests(share_token);
CREATE INDEX idx_kudos_reports_share_token ON public.kudos_reports(share_token);
CREATE INDEX idx_kudos_requests_user_id ON public.kudos_requests(user_id);
CREATE INDEX idx_kudos_responses_request_id ON public.kudos_responses(kudos_request_id);
