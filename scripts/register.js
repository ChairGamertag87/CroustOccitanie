import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { commands } from '../src/commands/index.js';


const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
const body = commands.map((c) => c.data.toJSON());


(async () => {
    try {
        if (process.env.GUILD_ID) {
            await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body });
            console.log('✅ Slash commands registered (guild)');
        } else {
            await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body });
            console.log('✅ Slash commands registered (global)');
        }
    } catch (e) {
        console.error(e);
        process.exitCode = 1;
    }
})();