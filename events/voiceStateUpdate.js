const config = require('../config.js');

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState) {
    // Temp voice channel system
    if (newState.channelId === config.voice.createChannelId) {
      const guild = newState.guild;
      const member = newState.member;
      
      const tempChannel = await guild.channels.create({
        name: `🎙️ ${member.displayName}'s Room`,
        type: 2, // GUILD_VOICE
        parent: config.voice.categoryId || newState.channel.parentId,
      });

      await member.voice.setChannel(tempChannel);
    }

    // Clean up empty temp channels
    if (oldState.channel && 
        oldState.channel.name.includes("'s Room") && 
        oldState.channel.id !== config.voice.createChannelId &&
        oldState.channel.members.size === 0) {
      await oldState.channel.delete();
    }
  },
};
