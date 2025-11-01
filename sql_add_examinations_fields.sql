-- Add examination and testing fields to visits table
-- Run this in Supabase SQL Editor

ALTER TABLE public.visits
ADD COLUMN IF NOT EXISTS breast_examination_result TEXT CHECK (breast_examination_result IN ('P', 'N', 'NA')),
ADD COLUMN IF NOT EXISTS hiv_test_provided TEXT CHECK (hiv_test_provided IN ('Y', 'N')),
ADD COLUMN IF NOT EXISTS hiv_test_result TEXT CHECK (hiv_test_result IN ('P', 'N')),
ADD COLUMN IF NOT EXISTS hivst_kit_given TEXT CHECK (hivst_kit_given IN ('Yes', 'No')),
ADD COLUMN IF NOT EXISTS hivst_result TEXT CHECK (hivst_result IN ('R', 'NR')),
ADD COLUMN IF NOT EXISTS remarks TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.visits.breast_examination_result IS 'P=Positive findings, N=No abnormalities, NA=Not applicable (male clients)';
COMMENT ON COLUMN public.visits.hiv_test_provided IS 'Y=Test provided, N=Not provided';
COMMENT ON COLUMN public.visits.hiv_test_result IS 'P=Positive, N=Negative (only set if hiv_test_provided=Y)';
COMMENT ON COLUMN public.visits.hivst_kit_given IS 'Yes=HIVST kit given, No=Not given';
COMMENT ON COLUMN public.visits.hivst_result IS 'R=Reactive, NR=Non-reactive (only set if hivst_kit_given=Yes)';
COMMENT ON COLUMN public.visits.remarks IS 'Optional notes: referrals, follow-up appointments, special observations';

