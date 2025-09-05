import fs from 'node:fs/promises';
import path from 'node:path';


export const DATA_DIR = path.resolve(process.cwd(), 'data');
export const DATA_FILE = path.join(DATA_DIR, 'crous_tlse_opendata.json');


export async function ensureDataDir() { await fs.mkdir(DATA_DIR, { recursive: true }); }
export async function saveJSON(filePath, obj) { await fs.writeFile(filePath, JSON.stringify(obj, null, 2), 'utf8'); }
export async function readJSON(filePath) { return JSON.parse(await fs.readFile(filePath, 'utf8')); }