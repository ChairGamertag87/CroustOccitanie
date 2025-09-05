import { SlashCommandBuilder, AttachmentBuilder } from 'discord.js';
import path from 'node:path';
import { fetchEstablishmentsRaw, writeRawToDisk, readRawFromDisk } from '../services/opendata.js';
import { normalizeRecords, isInCity } from '../services/normalize.js';
import { titleCase } from '../utils/strings.js';
import fs from 'node:fs/promises';


function buildSafePreview(header, lines, hardLimit = 2000) {
    const maxBody = Math.max(0, hardLimit - header.length - 50);
    const acc = [];
    let used = 0;
    for (const line of lines) {
        const L = line + '\n';
        if (used + L.length > maxBody) break;
        acc.push(line);
        used += L.length;
    }
    const rest = lines.length - acc.length;
    const suffix = rest > 0 ? `\n… (+${rest} autres, voir pièces jointes)` : '';
    return `${header}\n${acc.join('\n')}${suffix}`;
}


export default {
    data: new SlashCommandBuilder()
        .setName('crous-restos')
        .setDescription('Télécharge et met en cache local, puis liste les établissements (Toulouse)')
        .addStringOption((o) => o.setName('type').setDescription('Filtrer par type (restaurant|cafétéria|brasserie …)')),
    async execute(i) {
        await i.deferReply();
        const raw = await fetchEstablishmentsRaw();
        const filePath = await writeRawToDisk(raw);
        const local = await readRawFromDisk();


        const items = normalizeRecords(local.records).filter(isInCity);
        const typeFilter = i.options.getString('type');
        const filtered = typeFilter
            ? items.filter((x) => (x.type || '').toLowerCase().includes(typeFilter.toLowerCase()))
            : items;


        const linesAll = filtered
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((a) => `• **${a.name}** — ${titleCase(a.type)}${a.city ? ` — ${a.city}` : ''}`);


        const header = `Données mises à jour (Toulouse) et enregistrées dans **${path.relative(process.cwd(), filePath)}**.` +
            `\nTotal: **${filtered.length}** établissements.\n\nAperçu :`;
        const preview = buildSafePreview(header, linesAll);


        const listBuf = Buffer.from(linesAll.join('\n'), 'utf8');
        const listAttach = new AttachmentBuilder(listBuf, { name: 'crous_tlse_list.txt' });
        const jsonBuf = await fs.readFile(filePath);
        const jsonAttach = new AttachmentBuilder(jsonBuf, { name: path.basename(filePath) });


        await i.editReply({ content: preview, files: [listAttach, jsonAttach] });
    }
};