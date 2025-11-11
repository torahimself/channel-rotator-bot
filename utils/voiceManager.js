const { ChannelType } = require('discord.js');
const config = require('../config.js');

class VoiceManager {
  constructor() {
    this.tempChannels = new Map();
    this.client = null;
    this.cleanupIntervals = new Map();
  }

  setClient(client) {
    this.client = client;
  }

  async createTempChannel(member, parentChannel) {
    const guild = member.guild;
    const channelName = config.voice.defaultSettings.name.replace('{username}', member.displayName);
    
    const tempChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildVoice,
      parent: config.voice.categoryId,
      userLimit: config.voice.defaultSettings.limit,
      permissionOverwrites: this.getDefaultPermissions(member, guild)
    });

    this.tempChannels.set(tempChannel.id, {
      ownerId: member.id,
      trustedUsers: [],
      blockedUsers: [],
      settings: {
        name: channelName,
        limit: config.voice.defaultSettings.limit,
        privacy: config.voice.defaultSettings.privacy,
        region: config.voice.defaultSettings.region
      },
      guildId: guild.id,
      panelMessageId: null
    });

    // Setup auto-cleanup when channel becomes empty
    this.setupAutoCleanup(tempChannel.id);

    await member.voice.setChannel(tempChannel);
    return tempChannel;
  }

  setupAutoCleanup(channelId) {
    // Clear any existing interval
    if (this.cleanupIntervals.has(channelId)) {
      clearInterval(this.cleanupIntervals.get(channelId));
    }

    // Check every 30 seconds if channel is empty
    const interval = setInterval(async () => {
      const channel = await this.getChannel(channelId);
      if (channel && channel.members.size === 0) {
        console.log(`🧹 Auto-deleting empty channel: ${channelId}`);
        await this.deleteChannel(channelId, 'system');
        clearInterval(interval);
        this.cleanupIntervals.delete(channelId);
      }
    }, 30000); // Check every 30 seconds

    this.cleanupIntervals.set(channelId, interval);
  }

  getDefaultPermissions(owner, guild) {
    const permissions = [
      {
        id: guild.id, // @everyone - ALLOW viewing and connecting by default
        allow: ['ViewChannel', 'Connect']
      },
      {
        id: owner.id, // Owner - Full permissions
        allow: ['ViewChannel', 'Connect', 'ManageChannels', 'MoveMembers']
      },
      {
        id: config.voice.jailRoleId, // Jail role - ALWAYS DENY
        deny: ['ViewChannel', 'Connect']
      }
    ];

    return permissions;
  }

  async getChannel(channelId) {
    if (!this.client) return null;
    return this.client.channels.cache.get(channelId);
  }

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

  async updatePrivacy(channelId, privacyType) {
    const channelData = this.tempChannels.get(channelId);
    if (!channelData) return false;

    const channel = await this.getChannel(channelId);
    if (!channel) return false;

    channelData.settings.privacy = privacyType;

    const everyonePerms = {
      ViewChannel: null,
      Connect: null
    };

    switch (privacyType) {
      case 'locked':
        everyonePerms.ViewChannel = false;
        everyonePerms.Connect = false;
        break;
      case 'unlocked-unseen':
        everyonePerms.ViewChannel = false;
        everyonePerms.Connect = true;
        break;
      case 'unlocked-seen':
        everyonePerms.ViewChannel = true;
        everyonePerms.Connect = true;
        break;
    }

    await channel.permissionOverwrites.edit(channel.guild.id, everyonePerms);
    
    await channel.permissionOverwrites.edit(config.voice.jailRoleId, {
      ViewChannel: false,
      Connect: false
    });

    return true;
  }

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

  async untrustUser(channelId, userId) {
    const channelData = this.tempChannels.get(channelId);
    if (!channelData) return false;

    channelData.trustedUsers = channelData.trustedUsers.filter(id => id !== userId);
    
    const channel = await this.getChannel(channelId);
    if (channel) {
      if (userId !== channelData.ownerId) {
        await channel.permissionOverwrites.delete(userId);
      }
    }
    return true;
  }

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

  async claimChannel(channelId, newOwnerId) {
    const channelData = this.tempChannels.get(channelId);
    if (!channelData) return false;

    const channel = await this.getChannel(channelId);
    if (!channel) return false;

    // Check if current owner is in channel
    const currentOwnerInChannel = channel.members.has(channelData.ownerId);
    if (currentOwnerInChannel) return false;

    // Remove old owner permissions
    await channel.permissionOverwrites.edit(channelData.ownerId, {
      ManageChannels: null,
      MoveMembers: null
    });

    channelData.ownerId = newOwnerId;
    
    // Add new owner permissions
    await channel.permissionOverwrites.edit(newOwnerId, {
      ViewChannel: true,
      Connect: true,
      ManageChannels: true,
      MoveMembers: true
    });

    return true;
  }

  async transferOwnership(channelId, currentOwnerId, newOwnerId) {
    const channelData = this.tempChannels.get(channelId);
    if (!channelData || channelData.ownerId !== currentOwnerId) return false;

    const channel = await this.getChannel(channelId);
    if (!channel) return false;

    await channel.permissionOverwrites.edit(currentOwnerId, {
      ManageChannels: null,
      MoveMembers: null
    });

    channelData.ownerId = newOwnerId;
    
    await channel.permissionOverwrites.edit(newOwnerId, {
      ViewChannel: true,
      Connect: true,
      ManageChannels: true,
      MoveMembers: true
    });

    return true;
  }

  async deleteChannel(channelId, requesterId) {
    const channelData = this.tempChannels.get(channelId);
    if (!channelData) return false;

    const channel = await this.getChannel(channelId);
    if (!channel) return false;

    // Only owner, admin, or system can delete
    if (requesterId !== 'system') {
      const requester = channel.guild.members.cache.get(requesterId);
      if (channelData.ownerId !== requesterId && !requester.permissions.has('Administrator')) {
        return false;
      }
    }

    // Clear cleanup interval
    if (this.cleanupIntervals.has(channelId)) {
      clearInterval(this.cleanupIntervals.get(channelId));
      this.cleanupIntervals.delete(channelId);
    }

    // Move all members out first
    for (const [memberId, member] of channel.members) {
      await member.voice.setChannel(null);
    }

    // Delete panel message if exists
    if (channelData.panelMessageId) {
      try {
        const panelChannel = await this.client.channels.fetch(config.voice.controlPanelChannelId);
        const panelMessage = await panelChannel.messages.fetch(channelData.panelMessageId);
        await panelMessage.delete();
      } catch (error) {
        console.log('Could not delete panel message:', error.message);
      }
    }

    await channel.delete();
    this.tempChannels.delete(channelId);
    return true;
  }

  setPanelMessageId(channelId, messageId) {
    const channelData = this.tempChannels.get(channelId);
    if (channelData) {
      channelData.panelMessageId = messageId;
    }
  }

  getChannelData(channelId) {
    return this.tempChannels.get(channelId);
  }

  isOwner(channelId, userId) {
    const channelData = this.tempChannels.get(channelId);
    return channelData && channelData.ownerId === userId;
  }

  getUserChannels(userId) {
    const userChannels = [];
    for (const [channelId, channelData] of this.tempChannels.entries()) {
      if (channelData.ownerId === userId) {
        userChannels.push(channelId);
      }
    }
    return userChannels;
  }

  getUserCurrentChannel(userId) {
    for (const [channelId, channelData] of this.tempChannels.entries()) {
      const channel = this.client.channels.cache.get(channelId);
      if (channel && channel.members.has(userId)) {
        return channelId;
      }
    }
    return null;
  }
}

module.exports = new VoiceManager();
