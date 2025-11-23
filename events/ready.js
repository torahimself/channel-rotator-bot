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
      
      if (commands.length > 0) {
        console.log(`🔄 Registering ${commands.length} commands...`);
        
        await rest.put(
          Routes.applicationGuildCommands(client.user.id, config.rotation.serverId),
          { body: commands }
        );
        
        console.log(`✅ Successfully registered ${commands.length} commands!`);
      } else {
        console.log('ℹ️  No commands to register');
      }
    } catch (error) {
      if (error.code === 50001) {
        console.log('❌ Bot needs "applications.commands" scope invited with bot');
      } else {
        console.log('❌ Could not register commands:', error.message);
      }
    }

    // Start the rotation system
    rotationSystem.scheduleNextRotation();
    rotationSystem.startRotationCycle(client);

    console.log('🤖 Bot is fully operational!');
    console.log('🔄 Channel rotation system activated!');
    
    // Emit event for external modules
    client.emit('botReady', client);
  },
};
