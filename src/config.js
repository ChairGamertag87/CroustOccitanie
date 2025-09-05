export const CROUS_TERRITORY = { region: 'Occitanie', crous: 'Toulouse-Occitanie' };
export const ODATA_BASE = (process.env.CROUS_ODATA_BASE?.replace(/\/?$/, '') || 'https://data.enseignementsup-recherche.gouv.fr/api/records/1.0/search');
export const MENU_FEED_URL = process.env.MENU_FEED_URL || '';
export const CITY_FILTER = (process.env.CITY_FILTER || 'toulouse')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);