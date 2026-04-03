-- Create table for expungement program applications
CREATE TABLE IF NOT EXISTS expungement_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  county TEXT NOT NULL,
  city TEXT NOT NULL,
  annual_income TEXT,
  conviction_type TEXT NOT NULL,
  conviction_date DATE NOT NULL,
  offense_description TEXT NOT NULL,
  court_case_number TEXT,
  conviction_county TEXT NOT NULL,
  probation_completed BOOLEAN DEFAULT false,
  restitution_paid BOOLEAN DEFAULT false,
  additional_info TEXT,
  status TEXT DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'under_review', 'accepted', 'denied', 'completed')),
  notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_expungement_status ON expungement_applications(status);
CREATE INDEX IF NOT EXISTS idx_expungement_county ON expungement_applications(county);
CREATE INDEX IF NOT EXISTS idx_expungement_email ON expungement_applications(email);

-- Set up RLS policies
ALTER TABLE expungement_applications ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (for applications)
DROP POLICY IF EXISTS "Anyone can submit application" ON expungement_applications;
CREATE POLICY "Anyone can submit application" 
  ON expungement_applications 
  FOR INSERT 
  TO public 
  WITH CHECK (true);

-- Only admins can view/update
DROP POLICY IF EXISTS "Only admins can view applications" ON expungement_applications;
CREATE POLICY "Only admins can view applications" 
  ON expungement_applications 
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Only admins can update applications" ON expungement_applications;
CREATE POLICY "Only admins can update applications" 
  ON expungement_applications 
  FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- CREATE OR REPLACE FUNCTION to update updated_at
CREATE OR REPLACE FUNCTION update_expungement_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS expungement_updated_at ON expungement_applications;
CREATE TRIGGER expungement_updated_at
  BEFORE UPDATE ON expungement_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_expungement_updated_at();

-- Add comment explaining the table
COMMENT ON TABLE expungement_applications IS 
'Stores applications for the Elite Expungement Program. Status values: pending_review, under_review, accepted, denied, completed';
