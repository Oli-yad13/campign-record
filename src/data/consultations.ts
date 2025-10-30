export const COMMON_CONSULTATIONS = [
  'General consultation',
  'Blood pressure follow-up',
  'Diabetes screening',
  'HIV counseling',
  'Family planning',
  'Antenatal care (ANC)',
  'Postnatal care (PNC)',
  'Nutrition counseling',
  'Child wellness',
  'TB screening',
  'Malaria diagnosis',
  'Sexual diseases counseling',
] as const;

export type ConsultationType = typeof COMMON_CONSULTATIONS[number];

export const CONSULTATION_CHECK_FLAGS = [
  'Non-communicable screening (BP/BMI)',
  'Breast examination',
  'HIV testing',
  'HIVST distribution',
  'Sexual diseases',
] as const;



