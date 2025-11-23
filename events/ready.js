const { REST, Routes } = require('discord.js');
const config = require('../config.js');
const commandHandler = require('../handlers/commandHandler');
const rotationSystem = require('../utils/rotationSystem');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`✅ Bot logged in as ${client.user.tag}!`);

    // Register slash commands
    try {
      const rest = new REST({ version: '10' }).setToken(config.botToken);
      const commands = commandHandler.getCommands();
      
      console.log(`📋 Commands to register:`, commands.map(cmd => cmd.name));
      
      if (commands.length > 0) {
        console.log(`🔄 Registering ${commands.length} commands...`);
        
        const data = await rest.put(
          Routes.applicationGuildCommands(client.user.id, config.rotation.serverId),
          { body: commands }
        );
        
        console.log(`✅ Successfully registered ${commands.length} commands!`);
        console.log(`📝 Registered commands:`, data.map(cmd => cmd.name));
      } else {
        console.log('❌ No commands to register - check command loading');
      }
    } catch (error) {
      console.error('❌ Could not register commands:', error);
      if (error.code === 50001) {
        console.log('❌ Bot needs "applications.commands" scope invited with bot');
      }
    }

    // Start the rotation system
    try {
      rotationSystem.scheduleNextRotation();
      rotationSystem.startRotationCycle(client);
      console.log('🔄 Channel rotation system activated!');
    } catch (error) {
      console.error('❌ Error starting rotation system:', error);
    }

    console.log('🤖 Channel Rotation Bot is fully operational!');
  },
};
