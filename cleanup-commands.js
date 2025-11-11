const { REST, Routes } = require('discord.js');
require('dotenv').config();

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

async function cleanup() {
  try {
    // Get all global commands
    const commands = await rest.get(Routes.applicationCommands(process.env.CLIENT_ID));
    
    // Delete all global commands
    for (const command of commands) {
      await rest.delete(Routes.applicationCommand(process.env.CLIENT_ID, command.id));
      console.log(`Deleted global command: ${command.name}`);
    }

    // Get all guild commands
    const guildCommands = await rest.get(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, '1357219315820269578')
    );
    
    // Delete all guild commands
    for (const command of guildCommands) {
      await rest.delete(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, '1357219315820269578', command.id)
      );
      console.log(`Deleted guild command: ${command.name}`);
    }

    console.log('✅ All commands cleaned up!');
  } catch (error) {
    console.error('Error cleaning commands:', error);
  }
}

cleanup();
