const { ChannelType } = require('discord.js');
const config = require('../config.js');

class VoiceManager {
  constructor() {
    this.tempChannels = new Map();
    this.client = null;
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
      guildId: guild.id
    });

    await member.voice.setChannel(tempChannel);
    return tempChannel;
  }

  getDefaultPermissions(owner, guild) {
    return [
      {
        id: guild.id,
        deny: ['ViewChannel', 'Connect']
      },
      {
        id: owner.id,
        allow: ['ViewChannel', 'Connect', 'ManageChannels', 'MoveMembers']
      }
    ];
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
        everyonePerms.Connect = null;
        break;
      case 'unlocked-seen':
        everyonePerms.ViewChannel = true;
        everyonePerms.Connect = null;
        break;
    }

    await channel.permissionOverwrites.edit(channel.guild.id, everyonePerms);
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
      await channel.permissionOverwrites.delete(userId);
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

    // Remove old owner permissions
    await channel.permissionOverwrites.edit(currentOwnerId, {
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

  async deleteChannel(channelId, requesterId) {
    const channelData = this.tempChannels.get(channelId);
    if (!channelData) return false;

    // Only owner or admin can delete
    const channel = await this.getChannel(channelId);
    if (!channel) return false;

    const requester = channel.guild.members.cache.get(requesterId);
    if (channelData.ownerId !== requesterId && !requester.permissions.has('Administrator')) {
      return false;
    }

    // Move all members out first
    for (const [memberId, member] of channel.members) {
      await member.voice.setChannel(null);
    }

    await channel.delete();
    this.tempChannels.delete(channelId);
    return true;
  }

  async cleanupEmptyChannels(guild) {
    const channelsToDelete = [];
    
    for (const [channelId, channelData] of this.tempChannels.entries()) {
      const channel = guild.channels.cache.get(channelId);
      if (channel && channel.members.size === 0) {
        channelsToDelete.push(channelId);
      }
    }

    for (const channelId of channelsToDelete) {
      const channel = await this.getChannel(channelId);
      if (channel) {
        await channel.delete();
      }
      this.tempChannels.delete(channelId);
    }

    return channelsToDelete.length;
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
}

module.exports = new VoiceManager();
