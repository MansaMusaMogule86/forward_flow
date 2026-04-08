ALTER TABLE public.partnership_requests
ADD COLUMN IF NOT EXISTS partnership_type text;

COMMENT ON COLUMN public.partnership_requests.partnership_type IS 'Structured partnership category submitted by the partnership request form.';