const { REST, Routes } = require('discord.js');
const config = require('../config.js');
const commandHandler = require('../handlers/commandHandler');
const rotationSystem = require('../utils/rotationSystem');
const voiceManager = require('../utils/voiceManager');
const panelManager = require('../utils/panelManager');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`✅ Bot logged in as ${client.user.tag}!`);

    // Set client for voice and panel managers
    voiceManager.setClient(client);
    panelManager.setClient(client);

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

    // Create the main control panel
    try {
      await panelManager.createMainPanel();
      console.log('✅ Main control panel created!');
    } catch (error) {
      console.log('❌ Could not create main panel:', error.message);
    }

    // Start the rotation system
    rotationSystem.scheduleNextRotation();
    rotationSystem.startRotationCycle(client);

    console.log('🤖 Bot is fully operational!');
    console.log('🎤 Temp Voice System: Ready');
    console.log(`📊 Voice Create Channel: ${config.voice.createChannelId}`);
    console.log(`📋 Control Panel Channel: ${config.voice.controlPanelChannelId}`);
  },
};
