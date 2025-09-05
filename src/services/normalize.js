import Fuse from 'fuse.js';
import { cache } from '../lib/cache.js';
import { CITY_FILTER } from '../config.js';
import { readRawFromDisk } from './opendata.js';


const FUSE_OPTS = { keys: ['name'], threshold: 0.35, includeScore: true };


const first = (...vals) => vals.find((v) => v != null && String(v).trim() !== '') ?? null;


export function normalizeRecords(records) {
    return (records || []).map((r) => {
        const f = r.fields || {};
        const name = first(
            f.title, f.nom, f.name,
            f.nom_du_site, f.nom_site, f.nom_du_lieu, f.nom_lieu,
            f.nom_point_de_vente, f.nom_commercial, f.enseigne,
            f.libelle, f.label, f.intitule, f.appellation, f.titre
        );


        const type = first(
            f.type, f.type_de_restaurant, f.categorie, f.categorie_du_point_de_vente, f.type_etablissement
        ) || 'Restaurant';


        const hours = first(
            f.horaires, f.horaires_ouverture, f.opening_hours, f.horaires_douverture, f.horaires_douverture_detail,
            f.infos && (String(f.infos).match(/horaires[\s:]+([^\n]+)/i)?.[1] || f.infos)
        );


        const address = first(
            f.adresse, f.adresse_complete, f.adresse_postale, f.contact,
            [f.numero_voie, f.voie, f.cp || f.code_postal, f.ville || f.commune].filter(Boolean).join(' ')
        );


        const city = first(f.ville, f.commune, f.city, f.zone2, f.zone, f.localite);
        const coordinates = f.geo_point_2d || f.geolocalisation || (f.latitude && f.longitude ? { lat: f.latitude, lon: f.longitude } : null);


        return {
            id: f.id || f.identifiant || r.recordid,
            name: name || 'Sans nom',
            type,
            address,
            city,
            hours_raw: hours,
            payment: first(f.moyens_de_paiement, f.moyen_de_paiement, f.moyens_paiement),
            phone: first(f.telephone, f.tel, f.phone),
            email: first(f.mail, f.email, f.courriel),
            website: first(f.site, f.website, f.url),
            description: first(f.description_courte, f.description, f.short_desc),
            coordinates
        };
    });
}


export function isInCity(est) {
    const addr = String(est.address || '').toLowerCase();
    const city = String(est.city || '').toLowerCase();
    return CITY_FILTER.some((c) => city.includes(c) || addr.includes(c));
}


export async function loadNormalizedFromLocal() {
    const cacheKey = 'norm:items';
    const cached = cache.get(cacheKey);
    if (cached) return cached;
    const raw = await readRawFromDisk();
    const items = normalizeRecords(raw.records).filter(isInCity);
    const fuse = new Fuse(items, FUSE_OPTS);
    const payload = { items, fuse, updatedAt: raw.savedAt };
    cache.set(cacheKey, payload, 60 * 30);
    return payload;
}