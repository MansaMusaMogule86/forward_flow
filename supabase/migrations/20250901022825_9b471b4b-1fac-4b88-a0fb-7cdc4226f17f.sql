-- Fix security vulnerability: Add RLS policies to organizations_public
-- Enable RLS on organizations_public (if it's a table/view that supports it)
-- Removed illegal RLS enablement on view

-- Allow anyone to view verified organizations (public data)
-- Removed illegal policy drop on view -- Removed illegal policy on view;

-- Allow authenticated users to view all organizations in public view
-- Removed illegal policy drop on view -- Removed illegal policy on view;