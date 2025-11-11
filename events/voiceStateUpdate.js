const config = require('../config.js');
const voiceManager = require('../utils/voiceManager');
const panelManager = require('../utils/panelManager');

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState) {
    // User joined the create channel
    if (newState.channelId === config.voice.createChannelId) {
      try {
        const createChannel = newState.channel;
        const tempChannel = await voiceManager.createTempChannel(newState.member, createChannel);
        
        if (tempChannel) {
          // Create panel in the voice channel itself
          const panelMessageId = await panelManager.createChannelPanel(tempChannel.id, newState.member.id);
          if (panelMessageId) {
            voiceManager.setPanelMessageId(tempChannel.id, panelMessageId);
          }
          console.log(`✅ Created temp voice channel for ${newState.member.displayName}`);
        }
      } catch (error) {
        console.error('❌ Error creating temp voice channel:', error);
      }
    }

    // User left a temp channel - auto cleanup is now handled by voiceManager
    if (oldState.channelId && oldState.channelId !== config.voice.createChannelId) {
      const channelData = voiceManager.getChannelData(oldState.channelId);
      if (channelData) {
        // Auto-cleanup is now handled by the interval in voiceManager
        console.log(`User left channel ${oldState.channelId}, auto-cleanup will handle if empty`);
      }
    }
  },
};
