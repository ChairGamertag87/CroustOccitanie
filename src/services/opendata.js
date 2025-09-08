import { CROUS_TERRITORY, ODATA_BASE } from '../config.js';
import { http } from '../lib/http.js';
import { ensureDataDir, DATA_FILE, saveJSON, readJSON } from '../utils/files.js';


export async function fetchEstablishmentsRaw() {
    const url = `${ODATA_BASE}/?dataset=fr_crous_restauration_france_entiere&q=&rows=2000&geofilter.distance=43.6045,1.4440,15000`;
    const { data } = await http.get(url);
    return data; // {nhits, parameters, records: [...]}
}


export async function writeRawToDisk(raw) {
    await ensureDataDir();
    const payload = {
        savedAt: new Date().toISOString(),
        meta: {
            region: CROUS_TERRITORY.region,
            crous: CROUS_TERRITORY.crous,
            rows: raw?.parameters?.rows ?? (raw?.records?.length || 0)
        },
        records: raw?.records ?? []
    };
    await saveJSON(DATA_FILE, payload);
    return DATA_FILE;
}


export async function readRawFromDisk() { return readJSON(DATA_FILE); }