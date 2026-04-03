-- Add expiration tracking columns to partner_verifications
ALTER TABLE partner_verifications
ADD COLUMN verified_at timestamp with time zone,
ADD COLUMN verified_by uuid,
ADD COLUMN expires_at timestamp with time zone,
ADD COLUMN renewal_reminder_sent boolean DEFAULT false;

-- Create index for efficient expiration queries
CREATE INDEX idx_partner_verifications_expires_at 
ON partner_verifications(expires_at) 
WHERE status = 'approved';

-- CREATE OR REPLACE FUNCTION to auto-set expires_at when verification is approved
CREATE OR REPLACE FUNCTION set_verification_expiration()
RETURNS trigger AS $$
BEGIN
  -- When status changes to 'approved', set verified_at and expires_at
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    NEW.verified_at := NOW();
    NEW.expires_at := NOW() + INTERVAL '1 year';
  END IF;
  
  -- Auto-expire verifications past their expiration date
  IF NEW.expires_at IS NOT NULL AND NEW.expires_at < NOW() AND NEW.status = 'approved' THEN
    NEW.status := 'expired';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update expiration
CREATE TRIGGER verification_expiration_trigger
BEFORE INSERT OR UPDATE ON partner_verifications
FOR EACH ROW
EXECUTE FUNCTION set_verification_expiration();