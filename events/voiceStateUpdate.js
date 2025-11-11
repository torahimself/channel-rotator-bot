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
          await panelManager.createControlPanel(tempChannel.id, newState.member.id);
          console.log(`✅ Created temp voice channel for ${newState.member.displayName}`);
        }
      } catch (error) {
        console.error('❌ Error creating temp voice channel:', error);
      }
    }

    // User left a temp channel - check if empty and cleanup
    if (oldState.channelId && oldState.channelId !== config.voice.createChannelId) {
      const channelData = voiceManager.getChannelData(oldState.channelId);
      if (channelData) {
        const channel = oldState.channel;
        if (channel && channel.members.size === 0 && config.voice.autoCleanup) {
          setTimeout(async () => {
            const updatedChannel = await voiceManager.getChannel(oldState.channelId);
            if (updatedChannel && updatedChannel.members.size === 0) {
              await voiceManager.deleteChannel(oldState.channelId, channelData.ownerId);
              console.log(`🧹 Cleaned up empty temp channel: ${oldState.channelId}`);
            }
          }, 30000); // Wait 30 seconds before cleanup
        }
      }
    }
  },
};
