export const ETHIOPIA_REGIONS = [
  "Addis Ababa",
  "Diredawa",
  "Afar",
  "Amhara",
  "Benishangul-Gumuz",
  "Central Ethiopia",
  "Gambela",
  "Harari",
  "Oromia",
  "Sidama",
  "Somali",
  "South Ethiopia",
  "Southwest Ethiopia Peoples'",
  "Tigray",
] as const;

export const ADDIS_SUB_CITIES = [
  "Addis Ketema",
  "Akaky Kaliti",
  "Arada",
  "Bole",
  "Gullele",
  "Kirkos",
  "Kolfe Keranio",
  "Lideta",
  "Nifas Silk-Lafto",
  "Yeka",
  "Lemi Kura",
] as const;

export type EthiopiaRegion = typeof ETHIOPIA_REGIONS[number];
export type AddisSubCity = typeof ADDIS_SUB_CITIES[number];



