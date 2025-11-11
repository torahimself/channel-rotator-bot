const { REST, Routes } = require('discord.js');
const config = require('../config.js');
const commandHandler = require('../handlers/commandHandler');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`✅ Bot logged in as ${client.user.tag}!`);

    // Register slash commands
    try {
      const rest = new REST({ version: '10' }).setToken(config.botToken);
      const commands = commandHandler.getCommands();
      
      await rest.put(
        Routes.applicationGuildCommands(client.user.id, config.rotation.serverId),
        { body: commands }
      );
      
      console.log(`✅ Registered ${commands.length} slash commands!`);
    } catch (error) {
      console.log('ℹ️ Slash commands not registered (bot may not have permission)');
    }

    console.log('🤖 Bot is fully operational!');
  },
};
