import { XMLParser } from 'fast-xml-parser';
import { MENU_FEED_URL } from '../config.js';
import { http } from '../lib/http.js';
import { cache } from '../lib/cache.js';


function groupMenuByMomentAndType(rows) {
    const out = {};
    for (const r of rows) {
        if (!r || !r.moment || !r.type || !r.label) continue;
        const mom = String(r.moment).toLowerCase();
        const typ = String(r.type).toLowerCase();
        if (!out[mom]) out[mom] = {};
        if (!out[mom][typ]) out[mom][typ] = [];
        out[mom][typ].push(r.label);
    }
    return out;
}


export async function fetchMenuFor({ restaurantId, dateISO }) {
    if (!MENU_FEED_URL) return null;
    const cacheKey = `menu:xml:${restaurantId}:${dateISO}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;


    const { data: xml } = await http.get(MENU_FEED_URL, { responseType: 'text' });
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', textNodeName: 'text', trimValues: true });
    const json = parser.parse(xml);
    const rows = (json?.rows || json?.dataset || json?.root || json?.feed || json)?.row || json?.records || [];
    const flat = Array.isArray(rows) ? rows : Object.values(rows || {});


    const wanted = [];
    for (const r of flat) {
        const obj = r?.row || r;
        const id = obj.id || obj.identifiant || obj.uuid || obj.identifiant_unique;
        const d = (obj.date || obj.jour || obj.datetime || '').slice(0, 10);
        const moment = obj.moment || obj.service || obj.repas || '';
        const type = obj.type || obj.categorie || '';
        const comp = obj.composition || obj.plat || obj.libelle || obj.nom || '';
        if (id && d === dateISO && String(id) === String(restaurantId)) {
            wanted.push({ id, date: d, moment, type, label: comp });
        }
    }


    const grouped = groupMenuByMomentAndType(wanted);
    cache.set(cacheKey, grouped, 60 * 15);
    return grouped;
}