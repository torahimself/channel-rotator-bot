const config = require('../config.js');

class VoiceManager {
  constructor() {
    this.tempChannels = new Map(); // channelId -> {ownerId, trustedUsers, blockedUsers, settings}
  }

  // Create temp voice channel
  async createTempChannel(member, parentChannel) {
    const guild = member.guild;
    
    const tempChannel = await guild.channels.create({
      name: `${member.displayName}'s Room`,
      type: 2, // GUILD_VOICE
      parent: config.voice.categoryId || parentChannel.parentId,
      userLimit: 0,
      permissionOverwrites: this.getDefaultPermissions(member)
    });

    // Store channel data
    this.tempChannels.set(tempChannel.id, {
      ownerId: member.id,
      trustedUsers: [],
      blockedUsers: [],
      settings: {
        name: `${member.displayName}'s Room`,
        limit: 0,
        privacy: 'unlocked-seen',
        region: 'automatic'
      }
    });

    await member.voice.setChannel(tempChannel);
    return tempChannel;
  }

  getDefaultPermissions(owner) {
    return [
      {
        id: owner.guild.id, // @everyone
        deny: ['ViewChannel', 'Connect']
      },
      {
        id: owner.id,
        allow: ['ViewChannel', 'Connect', 'ManageChannels', 'MoveMembers']
      }
    ];
  }

  // Update channel name
  async updateChannelName(channelId, newName) {
    const channelData = this.tempChannels.get(channelId);
    if (!channelData) return false;

    channelData.settings.name = newName;
    const channel = await this.getChannel(channelId);
    if (channel) {
      await channel.setName(newName);
      return true;
    }
    return false;
  }

  // Update user limit
  async updateUserLimit(channelId, limit) {
    const channelData = this.tempChannels.get(channelId);
    if (!channelData) return false;

    channelData.settings.limit = limit;
    const channel = await this.getChannel(channelId);
    if (channel) {
      await channel.setUserLimit(limit);
      return true;
    }
    return false;
  }

  // Update privacy settings
  async updatePrivacy(channelId, privacyType) {
    const channelData = this.tempChannels.get(channelId);
    if (!channelData) return false;

    const channel = await this.getChannel(channelId);
    if (!channel) return false;

    channelData.settings.privacy = privacyType;

    switch (privacyType) {
      case 'locked':
        await channel.permissionOverwrites.edit(channel.guild.id, {
          ViewChannel: false,
          Connect: false
        });
        break;
      case 'unlocked-unseen':
        await channel.permissionOverwrites.edit(channel.guild.id, {
          ViewChannel: false,
          Connect: null
        });
        break;
      case 'unlocked-seen':
        await channel.permissionOverwrites.edit(channel.guild.id, {
          ViewChannel: true,
          Connect: null
        });
        break;
    }

    return true;
  }

  // Trust a user
  async trustUser(channelId, userId) {
    const channelData = this.tempChannels.get(channelId);
    if (!channelData || channelData.trustedUsers.length >= config.voice.maxTrustedUsers) return false;

    if (!channelData.trustedUsers.includes(userId)) {
      channelData.trustedUsers.push(userId);
      
      const channel = await this.getChannel(channelId);
      if (channel) {
        await channel.permissionOverwrites.edit(userId, {
          ViewChannel: true,
          Connect: true
        });
      }
    }
    return true;
  }

  // Untrust a user
  async untrustUser(channelId, userId) {
    const channelData = this.tempChannels.get(channelId);
    if (!channelData) return false;

    channelData.trustedUsers = channelData.trustedUsers.filter(id => id !== userId);
    
    const channel = await this.getChannel(channelId);
    if (channel) {
      await channel.permissionOverwrites.delete(userId);
    }
    return true;
  }

  // Block a user
  async blockUser(channelId, userId) {
    const channelData = this.tempChannels.get(channelId);
    if (!channelData) return false;

    if (!channelData.blockedUsers.includes(userId)) {
      channelData.blockedUsers.push(userId);
      
      const channel = await this.getChannel(channelId);
      if (channel) {
        await channel.permissionOverwrites.edit(userId, {
          ViewChannel: false,
          Connect: false
        });
      }
    }
    return true;
  }

  // Unblock a user
  async unblockUser(channelId, userId) {
    const channelData = this.tempChannels.get(channelId);
    if (!channelData) return false;

    channelData.blockedUsers = channelData.blockedUsers.filter(id => id !== userId);
    
    const channel = await this.getChannel(channelId);
    if (channel) {
      await channel.permissionOverwrites.delete(userId);
    }
    return true;
  }

  // Kick user from voice channel
  async kickUser(channelId, userId) {
    const channel = await this.getChannel(channelId);
    if (!channel) return false;

    const member = channel.guild.members.cache.get(userId);
    if (member && member.voice.channelId === channelId) {
      await member.voice.setChannel(null);
      return true;
    }
    return false;
  }

  // Change voice region
  async changeRegion(channelId, region) {
    const channel = await this.getChannel(channelId);
    if (!channel) return false;

    const channelData = this.tempChannels.get(channelId);
    if (channelData) {
      channelData.settings.region = region;
    }

    await channel.setRTCRegion(region);
    return true;
  }

  // Claim ownership
  async claimChannel(channelId, newOwnerId) {
    const channelData = this.tempChannels.get(channelId);
    if (!channelData) return false;

    const channel = await this.getChannel(channelId);
    if (!channel) return false;

    // Check if current owner is in channel
    const currentOwnerInChannel = channel.members.has(channelData.ownerId);
    if (currentOwnerInChannel) return false; // Can't claim if owner is present

    channelData.ownerId = newOwnerId;
    
    // Update permissions for new owner
    await channel.permissionOverwrites.edit(newOwnerId, {
      ViewChannel: true,
      Connect: true,
      ManageChannels: true,
      MoveMembers: true
    });

    return true;
  }

  // Transfer ownership
  async transferOwnership(channelId, currentOwnerId, newOwnerId) {
    const channelData = this.tempChannels.get(channelId);
    if (!channelData || channelData.ownerId !== currentOwnerId) return false;

    const channel = await this.getChannel(channelId);
    if (!channel) return false;

    channelData.ownerId = newOwnerId;
    
    // Update permissions
    await channel.permissionOverwrites.edit(currentOwnerId, {
      ManageChannels: null,
      MoveMembers: null
    });
    
    await channel.permissionOverwrites.edit(newOwnerId, {
      ViewChannel: true,
      Connect: true,
      ManageChannels: true,
      MoveMembers: true
    });

    return true;
  }

  // Delete temp channel
  async deleteChannel(channelId, requesterId) {
    const channelData = this.tempChannels.get(channelId);
    if (!channelData) return false;

    // Only owner or admin can delete
    if (channelData.ownerId !== requesterId && 
        !channelData.guild.members.cache.get(requesterId).permissions.has('ADMINISTRATOR')) {
      return false;
    }

    const channel = await this.getChannel(channelId);
    if (channel) {
      await channel.delete();
    }
    
    this.tempChannels.delete(channelId);
    return true;
  }

  // Clean up empty channels
  async cleanupEmptyChannels(guild) {
    for (const [channelId, channelData] of this.tempChannels.entries()) {
      const channel = guild.channels.cache.get(channelId);
      if (channel && channel.members.size === 0) {
        await channel.delete();
        this.tempChannels.delete(channelId);
      }
    }
  }

  async getChannel(channelId) {
    // This would need access to client, we'll handle this differently
    return null; // Placeholder
  }

  getChannelData(channelId) {
    return this.tempChannels.get(channelId);
  }

  isOwner(channelId, userId) {
    const channelData = this.tempChannels.get(channelId);
    return channelData && channelData.ownerId === userId;
  }
}

module.exports = new VoiceManager();
