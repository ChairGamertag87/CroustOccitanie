// src/commands/restos.js
import {
    SlashCommandBuilder,
    AttachmentBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} from 'discord.js';
import path from 'node:path';
import fs from 'node:fs/promises';

import { fetchEstablishmentsRaw, writeRawToDisk, readRawFromDisk } from '../services/opendata.js';
import { normalizeRecords, isInCity } from '../services/normalize.js';
import { titleCase } from '../utils/strings.js';

// ---------------- Helpers ----------------
function buildSafePreview(header, lines, hardLimit = 1000) {
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

const BRAND = {
    color: 0xFF0000, // jaune doux
    authorName: 'CROUS Toulouse',
    authorIcon: 'https://imgur.com/CzPzlqC.png',
    thumb: 'https://i.imgur.com/Mk0G6fM.png',
};
const E = { fork: '🍽️', pin: '📍', time: '⏰' };

const stripTags = (s) => String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s{2,}/g, ' ').trim();
const cut = (s, n) => (s && s.length > n ? s.slice(0, n - 1) + '…' : s || '');

function mapLink(est) {
    if (est?.coordinates?.lat != null && est?.coordinates?.lon != null) {
        return `https://www.google.com/maps?q=${est.coordinates.lat},${est.coordinates.lon}`;
    }
    if (est?.address) {
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            est.address + (est.city ? ', ' + est.city : '')
        )}`;
    }
    return null;
}
function formatHours(h) {
    if (!h) return '—';
    return cut(stripTags(h).replace(/; ?/g, ' · '), 200);
}

function makeCard(r) {
    const name = cut(stripTags(r.name), 256);
    const type = titleCase(r.type || 'Restaurant');
    const loc = stripTags([r.city, r.address].filter(Boolean).join(' — ')) || '—';
    const time = formatHours(r.hours_raw);
    const maps = mapLink(r);

    const value = [
        `${E.fork} **Type :** ${cut(type, 64)}`,
        `${E.pin} **Localisation :** ${cut(loc, 180)}`,
        `${E.time} **Horaires :** ${time}`,
        maps ? `[Voir sur la carte](${maps})` : null,
    ]
        .filter(Boolean)
        .join('\n');

    return { name, value: cut(value, 1024) };
}

// Construit un embed (page) avec N cartes (<= 8 pour rester large)
function buildEmbedPage({ pageIndex, pageCount, cards, totalCount }) {
    const emb = new EmbedBuilder()
        .setColor(BRAND.color)
        .setAuthor({ name: BRAND.authorName, iconURL: BRAND.authorIcon })
        .setTitle(`${E.fork} Liste des restaurants`)
        .setThumbnail(BRAND.thumb)
        .setDescription(`Établissements à Toulouse : **${totalCount}** · page **${pageIndex + 1}/${pageCount}**`)
        .setFooter({ text: 'Source : Open data CNOUS — /crous-restos' })
        .setTimestamp(new Date());

    for (const c of cards) emb.addFields({ name: c.name, value: c.value });
    return emb;
}

function buildRow({ pageIndex, pageCount, uid }) {
    const first = new ButtonBuilder()
        .setCustomId(`first:${uid}`)
        .setLabel('⏮️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(pageIndex === 0);
    const prev = new ButtonBuilder()
        .setCustomId(`prev:${uid}`)
        .setLabel('◀️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(pageIndex === 0);
    const next = new ButtonBuilder()
        .setCustomId(`next:${uid}`)
        .setLabel('▶️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(pageIndex >= pageCount - 1);
    const last = new ButtonBuilder()
        .setCustomId(`last:${uid}`)
        .setLabel('⏭️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(pageIndex >= pageCount - 1);

    return new ActionRowBuilder().addComponents(first, prev, next, last);
}

function paginateCards(allCards, pageSize = 8) {
    const pages = [];
    for (let i = 0; i < allCards.length; i += pageSize) {
        pages.push(allCards.slice(i, i + pageSize));
    }
    return pages;
}

// ---------------- Commande ----------------
export default {
    data: new SlashCommandBuilder()
        .setName('crous-restos')
        .setDescription('Télécharge et met en cache local, puis liste les établissements (Toulouse) avec des pages')
        .addStringOption((o) =>
            o.setName('type').setDescription('Filtrer par type (restaurant|cafétéria|brasserie …)'),
        ),

    async execute(i) {
        await i.deferReply();

        // 1) Télécharger & écrire localement
        const raw = await fetchEstablishmentsRaw();
        const filePath = await writeRawToDisk(raw);
        const local = await readRawFromDisk();

        // 2) Normaliser + Toulouse uniquement
        const items = normalizeRecords(local.records).filter(isInCity);

        // 3) Filtre optionnel par type
        const typeFilter = i.options.getString('type');
        const filtered = typeFilter
            ? items.filter((x) => (x.type || '').toLowerCase().includes(typeFilter.toLowerCase()))
            : items;

        // 4) Liste complète (.txt joint)
        const linesAll = filtered
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((a) => `• ${stripTags(a.name)} — ${titleCase(a.type)}${a.city ? ` — ${a.city}` : ''}`);

        // 5) Aperçu court
        const header =
            `Données mises à jour (Toulouse) et enregistrées dans **${path.relative(process.cwd(), filePath)}**.` +
            `\nTotal: **${filtered.length}** établissements.\n\nNavigation via les boutons ci-dessous.`;
        const preview = buildSafePreview(header, []);


        // 6) Préparer les cartes & pages d'embeds
        const allCards = filtered.map(makeCard);
        const PAGES = paginateCards(allCards, 8);
        const pageCount = Math.max(1, PAGES.length);
        let pageIndex = 0;

        const uid = `${i.user.id}:${Date.now()}`;
        const embed0 = buildEmbedPage({
            pageIndex,
            pageCount,
            cards: PAGES[pageIndex] || [],
            totalCount: filtered.length,
        });
        const row0 = buildRow({ pageIndex, pageCount, uid });

        const msg = await i.editReply({
            content: preview,
            embeds: [embed0],
            components: [row0],
        });

        // 7 Collector pour changer de page (2 minutes)
        const collector = msg.createMessageComponentCollector({
            time: 120_000,
            filter: (btn) => btn.user.id === i.user.id && btn.customId.endsWith(uid),
        });

        collector.on('collect', async (btn) => {
            await btn.deferUpdate();
            if (btn.customId.startsWith('first:')) pageIndex = 0;
            if (btn.customId.startsWith('prev:')) pageIndex = Math.max(0, pageIndex - 1);
            if (btn.customId.startsWith('next:')) pageIndex = Math.min(pageCount - 1, pageIndex + 1);
            if (btn.customId.startsWith('last:')) pageIndex = pageCount - 1;

            const embed = buildEmbedPage({
                pageIndex,
                pageCount,
                cards: PAGES[pageIndex] || [],
                totalCount: filtered.length,
            });
            const row = buildRow({ pageIndex, pageCount, uid });
            await i.editReply({ embeds: [embed], components: [row] });
        });

        collector.on('end', async () => {
            try { await i.editReply({ components: [] }); } catch {}
        });
    },
};
