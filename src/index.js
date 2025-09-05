import 'dotenv/config';
import { Client, IntentsBitField, Collection } from 'discord.js';
import { commands } from './commands/index.js';


const client = new Client({ intents: [IntentsBitField.Flags.Guilds] });
client.commands = new Collection();
for (const cmd of commands) client.commands.set(cmd.data.name, cmd);


client.once('ready', () => {
    console.log(`🟢 Connecté en tant que ${client.user.tag}`);
    console.log(``);
});


client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const cmd = interaction.client.commands.get(interaction.commandName);
    if (!cmd) return;
    try { await cmd.execute(interaction); }
    catch (err) {
        console.error(err);
        const msg = err?.response?.status ? `${err.response.status} ${err.response.statusText}` : (err?.message || 'Erreur inconnue');
        if (interaction.deferred || interaction.replied) interaction.editReply(`❌ Oups: ${msg}`);
        else interaction.reply({ content: `❌ Oups: ${msg}`, ephemeral: true });
    }
});


if (!process.env.DISCORD_TOKEN) throw new Error('Missing DISCORD_TOKEN in .env');
client.login(process.env.DISCORD_TOKEN);
