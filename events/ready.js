const { REST, Routes } = require('discord.js');
const config = require('../config.js');
const commandHandler = require('../handlers/commandHandler');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`✅ Bot logged in as ${client.user.tag}!`);

    // Clear ALL existing commands and register only the ones we want
    try {
      const rest = new REST({ version: '10' }).setToken(config.botToken);
      
      // First, clear all existing commands
      await rest.put(
        Routes.applicationGuildCommands(client.user.id, config.rotation.serverId),
        { body: [] } // Empty array removes all commands
      );
      
      console.log('🗑️ Cleared all existing commands');

      // Now register only the commands we actually have
      const commands = commandHandler.getCommands();
      
      await rest.put(
        Routes.applicationGuildCommands(client.user.id, config.rotation.serverId),
        { body: commands }
      );
      
      console.log(`✅ Registered ${commands.length} slash commands: ${commands.map(cmd => cmd.name).join(', ')}`);
    } catch (error) {
      console.log('❌ Error updating commands:', error);
    }

    console.log('🤖 Bot is fully operational!');
  },
};
