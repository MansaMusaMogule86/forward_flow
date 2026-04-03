-- Fix security warning: Drop trigger and function, then recreate with search_path
DROP TRIGGER IF EXISTS verification_expiration_trigger ON partner_verifications;
-- Removed DROP FUNCTION to avoid dependency issues: set_verification_expiration();

CREATE OR REPLACE FUNCTION set_verification_expiration()
RETURNS trigger 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When status changes to 'approved', set verified_at and expires_at
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    NEW.verified_at := NOW();
    NEW.expires_at := NOW() + INTERVAL '1 year';
  END IF;
  
  -- Auto-expire verifications past their expiration date
  IF NEW.expires_at IS NOT NULL AND NEW.expires_at < NOW() AND NEW.status = 'approved' THEN
    NEW.status := 'expired';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER verification_expiration_trigger
BEFORE INSERT OR UPDATE ON partner_verifications
FOR EACH ROW
EXECUTE FUNCTION set_verification_expiration();