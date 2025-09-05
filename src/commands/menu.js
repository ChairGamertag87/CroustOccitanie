import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { loadNormalizedFromLocal } from '../services/normalize.js';
import { fetchMenuFor } from '../services/menus.js';
import { titleCase } from '../utils/strings.js';


export default {
    data: new SlashCommandBuilder()
        .setName('crous-menu')
        .setDescription('Menu du jour pour un établissement de Toulouse (ID via cache local, menus via XML)')
        .addStringOption((o) => o.setName('nom').setDescription("Nom (ou extrait) de l'établissement").setRequired(true))
        .addStringOption((o) => o.setName('date').setDescription('Date (YYYY-MM-DD), par défaut: aujourd\'hui')),
    async execute(i) {
        await i.deferReply();
        let payload;
        try { payload = await loadNormalizedFromLocal(); }
        catch { return i.editReply('Aucune donnée locale. Lance d\'abord `/crous-restos`.'); }


        const q = i.options.getString('nom');
        const dateStr = i.options.getString('date');
        const date = dateStr ? new Date(dateStr) : new Date();
        const dateISO = date.toISOString().slice(0, 10);


        const match = payload.fuse.search(q)?.[0]?.item;
        if (!match) return i.editReply(`Aucun établissement (Toulouse) trouvé pour « ${q} ».`);


        const data = await fetchMenuFor({ restaurantId: match.id, dateISO });
        if (!data || Object.keys(data).length === 0) {
            return i.editReply(`Aucun menu trouvé pour ${match.name} le ${dateISO}.`);
        }


        const emb = new EmbedBuilder()
            .setTitle(`Menu — ${match.name} (${dateISO})`)
            .setFooter({ text: 'Sources: Menus CNOUS (XML) • établissements via cache local ./data (Toulouse)' });


        const sections = [];
        for (const moment of Object.keys(data)) {
            const byType = data[moment];
            const prettyMoment = moment === 'midi' ? 'Midi' : moment === 'soir' ? 'Soir' : titleCase(moment);
            const parts = Object.entries(byType).map(([typ, arr]) => `**${titleCase(typ)}**\n• ${arr.join('\n• ')}`);
            sections.push(`__${prettyMoment}__\n${parts.join('\n\n')}`);
        }


        emb.setDescription(sections.join('\n\n'));
        await i.editReply({ embeds: [emb] });
    }
};