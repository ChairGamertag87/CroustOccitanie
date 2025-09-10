import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { loadNormalizedFromLocal } from '../services/normalize.js';
import { codeBlock } from '../utils/strings.js';

const BRAND = {
    color: 0xFF0000, // jaune doux
    authorName: 'CROUS Toulouse',
    authorIcon: 'https://imgur.com/CzPzlqC.png',
    thumb: 'https://i.imgur.com/Mk0G6fM.png',
};

export default {

    data: new SlashCommandBuilder()
        .setName('crous-horaires')
        .setDescription('Affiche les horaires pour un établissement de Toulouse (cache local)')
        .addStringOption((o) => o.setName('nom').setDescription("Nom (ou extrait) de l'établissement").setRequired(true)),
    async execute(i) {
        await i.deferReply();
        let payload;
        try { payload = await loadNormalizedFromLocal(); }
        catch { return i.editReply('Aucune donnée locale. Lance d\'abord `/crous-restos`.'); }


        const q = i.options.getString('nom');
        const match = payload.fuse.search(q)?.[0]?.item;
        if (!match) return i.editReply(`Aucun établissement (Toulouse) trouvé pour « ${q} ».`);


        const emb = new EmbedBuilder()
            .setColor(BRAND.color)
            .setAuthor({ name: BRAND.authorName, iconURL: BRAND.authorIcon })
            .setTitle(match.name)
            .setDescription(match.description || null)
            .addFields(
                match.hours_raw ? [{ name: 'Horaires', value: codeBlock(match.hours_raw) }] : [],
                match.address ? [{ name: 'Adresse', value: match.address + (match.city ? `, ${match.city}` : '') }] : []
            )
            .setFooter({ text: 'Source : Open data CNOUS — /crous-horaires' })
            .setTimestamp(new Date());


        await i.editReply({ embeds: [emb] });
    }
};