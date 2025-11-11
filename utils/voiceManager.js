const { ChannelType, PermissionFlagsBits } = require('discord.js');
const config = require('../config.js');

class VoiceManager {
  constructor() {
    this.tempChannels = new Map();
    this.client = null;
    this.cleanupIntervals = new Map();
    this.userChannelNames = new Map(); // Store user's preferred channel names
    this.userTrustedLists = new Map(); // Store user's trusted users
    this.userBlockedLists = new Map(); // Store user's blocked users
  }

  setClient(client) {
    this.client = client;
  }

  async createTempChannel(member, parentChannel) {
    try {
      const guild = member.guild;
      
      // Get user's preferred settings
      const preferredName = this.userChannelNames.get(member.id) || `${member.displayName}'s Room`;
      const trustedUsers = this.userTrustedLists.get(member.id) || [];
      const blockedUsers = this.userBlockedLists.get(member.id) || [];
      
      const channelName = preferredName;
      
      const tempChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildVoice,
        parent: config.voice.categoryId,
        userLimit: config.voice.defaultSettings.limit,
        permissionOverwrites: this.getDefaultPermissions(member, guild)
      });

      this.tempChannels.set(tempChannel.id, {
        ownerId: member.id,
        trustedUsers: [...trustedUsers], // Copy the trusted users
        blockedUsers: [...blockedUsers], // Copy the blocked users
        settings: {
          name: channelName,
          limit: config.voice.defaultSettings.limit,
          privacy: config.voice.defaultSettings.privacy,
          region: config.voice.defaultSettings.region
        },
        guildId: guild.id,
        panelMessageId: null
      });

      // Apply trusted users permissions
      for (const userId of trustedUsers) {
        try {
          await tempChannel.permissionOverwrites.edit(userId, {
            ViewChannel: true,
            Connect: true
          });
        } catch (error) {
          console.log(`Error applying trusted permissions for ${userId}:`, error.message);
        }
      }

      // Apply blocked users permissions
      for (const userId of blockedUsers) {
        try {
          await tempChannel.permissionOverwrites.edit(userId, {
            ViewChannel: false,
            Connect: false
          });
        } catch (error) {
          console.log(`Error applying blocked permissions for ${userId}:`, error.message);
        }
      }

      // Setup auto-cleanup
      this.setupAutoCleanup(tempChannel.id);

      await member.voice.setChannel(tempChannel);
      return tempChannel;
    } catch (error) {
      console.error('Error creating temp channel:', error);
      return null;
    }
  }

  setupAutoCleanup(channelId) {
    if (this.cleanupIntervals.has(channelId)) {
      clearInterval(this.cleanupIntervals.get(channelId));
    }

    const interval = setInterval(async () => {
      try {
        const channel = await this.getChannel(channelId);
        if (channel && channel.members.size === 0) {
          console.log(`Auto-deleting empty channel: ${channelId}`);
          await this.deleteChannel(channelId, 'system');
          clearInterval(interval);
          this.cleanupIntervals.delete(channelId);
        }
      } catch (error) {
        console.log('Cleanup error:', error.message);
      }
    }, 30000);

    this.cleanupIntervals.set(channelId, interval);
  }

  getDefaultPermissions(owner, guild) {
    return [
      {
        id: guild.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect]
      },
      {
        id: owner.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] // REMOVED ManageChannels and MoveMembers
      },
      {
        id: config.voice.jailRoleId,
        deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect]
      }
    ];
  }

  async getChannel(channelId) {
    if (!this.client) return null;
    return this.client.channels.cache.get(channelId);
  }

  async updateChannelName(channelId, newName) {
    try {
      const channelData = this.tempChannels.get(channelId);
      if (!channelData) return false;

      channelData.settings.name = newName;
      
      // Store the user's preferred name for future channels
      this.userChannelNames.set(channelData.ownerId, newName);
      
      const channel = await this.getChannel(channelId);
      if (channel) {
        await channel.setName(newName);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating channel name:', error);
      return false;
    }
  }

  async updateUserLimit(channelId, limit) {
    try {
      const channelData = this.tempChannels.get(channelId);
      if (!channelData) return false;

      channelData.settings.limit = limit;
      const channel = await this.getChannel(channelId);
      if (channel) {
        await channel.setUserLimit(limit);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating user limit:', error);
      return false;
    }
  }

  async updatePrivacy(channelId, privacyType) {
    try {
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
    } catch (error) {
      console.error('Error updating privacy:', error);
      return false;
    }
  }

  async trustUser(channelId, userId) {
    try {
      const channelData = this.tempChannels.get(channelId);
      if (!channelData || channelData.trustedUsers.length >= config.voice.maxTrustedUsers) return false;

      if (!channelData.trustedUsers.includes(userId)) {
        channelData.trustedUsers.push(userId);
        
        // Add to user's permanent trusted list
        const userTrustedList = this.userTrustedLists.get(channelData.ownerId) || [];
        if (!userTrustedList.includes(userId)) {
          userTrustedList.push(userId);
          this.userTrustedLists.set(channelData.ownerId, userTrustedList);
        }
        
        const channel = await this.getChannel(channelId);
        if (channel) {
          await channel.permissionOverwrites.edit(userId, {
            ViewChannel: true,
            Connect: true
          });
        }
      }
      return true;
    } catch (error) {
      console.error('Error trusting user:', error);
      return false;
    }
  }

  async untrustUser(channelId, userId) {
    try {
      const channelData = this.tempChannels.get(channelId);
      if (!channelData) return false;

      channelData.trustedUsers = channelData.trustedUsers.filter(id => id !== userId);
      
      // Remove from user's permanent trusted list
      const userTrustedList = this.userTrustedLists.get(channelData.ownerId) || [];
      this.userTrustedLists.set(channelData.ownerId, userTrustedList.filter(id => id !== userId));
      
      const channel = await this.getChannel(channelId);
      if (channel && userId !== channelData.ownerId) {
        await channel.permissionOverwrites.delete(userId);
      }
      return true;
    } catch (error) {
      console.error('Error untrusting user:', error);
      return false;
    }
  }

  async blockUser(channelId, userId) {
    try {
      const channelData = this.tempChannels.get(channelId);
      if (!channelData) return false;

      if (!channelData.blockedUsers.includes(userId)) {
        channelData.blockedUsers.push(userId);
        
        // Add to user's permanent blocked list
        const userBlockedList = this.userBlockedLists.get(channelData.ownerId) || [];
        if (!userBlockedList.includes(userId)) {
          userBlockedList.push(userId);
          this.userBlockedLists.set(channelData.ownerId, userBlockedList);
        }
        
        const channel = await this.getChannel(channelId);
        if (channel) {
          await channel.permissionOverwrites.edit(userId, {
            ViewChannel: false,
            Connect: false
          });
        }
      }
      return true;
    } catch (error) {
      console.error('Error blocking user:', error);
      return false;
    }
  }

  async unblockUser(channelId, userId) {
    try {
      const channelData = this.tempChannels.get(channelId);
      if (!channelData) return false;

      channelData.blockedUsers = channelData.blockedUsers.filter(id => id !== userId);
      
      // Remove from user's permanent blocked list
      const userBlockedList = this.userBlockedLists.get(channelData.ownerId) || [];
      this.userBlockedLists.set(channelData.ownerId, userBlockedList.filter(id => id !== userId));
      
      const channel = await this.getChannel(channelId);
      if (channel) {
        await channel.permissionOverwrites.delete(userId);
      }
      return true;
    } catch (error) {
      console.error('Error unblocking user:', error);
      return false;
    }
  }

  async kickUser(channelId, userId) {
    try {
      const channel = await this.getChannel(channelId);
      if (!channel) return false;

      const member = channel.guild.members.cache.get(userId);
      if (member && member.voice.channelId === channelId) {
        await member.voice.setChannel(null);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error kicking user:', error);
      return false;
    }
  }

  async changeRegion(channelId, region) {
    try {
      const channel = await this.getChannel(channelId);
      if (!channel) return false;

      const channelData = this.tempChannels.get(channelId);
      if (channelData) {
        channelData.settings.region = region;
      }

      await channel.setRTCRegion(region);
      return true;
    } catch (error) {
      console.error('Error changing region:', error);
      return false;
    }
  }

  async claimChannel(channelId, newOwnerId) {
    try {
      const channelData = this.tempChannels.get(channelId);
      if (!channelData) return false;

      const channel = await this.getChannel(channelId);
      if (!channel) return false;

      const currentOwnerInChannel = channel.members.has(channelData.ownerId);
      if (currentOwnerInChannel) return false;

      // Transfer ownership data
      channelData.ownerId = newOwnerId;
      
      // Transfer memory settings to new owner
      this.userChannelNames.set(newOwnerId, this.userChannelNames.get(channelData.ownerId) || `${channel.name}`);
      this.userTrustedLists.set(newOwnerId, [...(this.userTrustedLists.get(channelData.ownerId) || [])]);
      this.userBlockedLists.set(newOwnerId, [...(this.userBlockedLists.get(channelData.ownerId) || [])]);

      return true;
    } catch (error) {
      console.error('Error claiming channel:', error);
      return false;
    }
  }

  async transferOwnership(channelId, currentOwnerId, newOwnerId) {
    try {
      const channelData = this.tempChannels.get(channelId);
      if (!channelData || channelData.ownerId !== currentOwnerId) return false;

      const channel = await this.getChannel(channelId);
      if (!channel) return false;

      // Transfer ownership data
      channelData.ownerId = newOwnerId;
      
      // Transfer memory settings to new owner
      this.userChannelNames.set(newOwnerId, this.userChannelNames.get(currentOwnerId) || `${channel.name}`);
      this.userTrustedLists.set(newOwnerId, [...(this.userTrustedLists.get(currentOwnerId) || [])]);
      this.userBlockedLists.set(newOwnerId, [...(this.userBlockedLists.get(currentOwnerId) || [])]);

      return true;
    } catch (error) {
      console.error('Error transferring ownership:', error);
      return false;
    }
  }

  async deleteChannel(channelId, requesterId) {
    try {
      const channelData = this.tempChannels.get(channelId);
      if (!channelData) return false;

      const channel = await this.getChannel(channelId);
      if (!channel) return false;

      if (requesterId !== 'system') {
        const requester = channel.guild.members.cache.get(requesterId);
        if (channelData.ownerId !== requesterId && !requester.permissions.has(PermissionFlagsBits.Administrator)) {
          return false;
        }
      }

      if (this.cleanupIntervals.has(channelId)) {
        clearInterval(this.cleanupIntervals.get(channelId));
        this.cleanupIntervals.delete(channelId);
      }

      for (const [memberId, member] of channel.members) {
        try {
          await member.voice.setChannel(null);
        } catch (error) {
          console.log('Error moving member:', error.message);
        }
      }

      if (channelData.panelMessageId) {
        try {
          const panelChannel = await this.client.channels.fetch(config.voice.controlPanelChannelId);
          const panelMessage = await panelChannel.messages.fetch(channelData.panelMessageId);
          await panelMessage.delete();
        } catch (error) {
          // Ignore message deletion errors
        }
      }

      await channel.delete();
      this.tempChannels.delete(channelId);
      return true;
    } catch (error) {
      console.error('Error deleting channel:', error);
      return false;
    }
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

  getUserCurrentChannel(userId) {
    for (const [channelId, channelData] of this.tempChannels.entries()) {
      const channel = this.client.channels.cache.get(channelId);
      if (channel && channel.members.has(userId)) {
        return channelId;
      }
    }
    return null;
  }

  // Get user's memory data (for debugging)
  getUserMemory(userId) {
    return {
      channelName: this.userChannelNames.get(userId),
      trustedUsers: this.userTrustedLists.get(userId) || [],
      blockedUsers: this.userBlockedLists.get(userId) || []
    };
  }
}

module.exports = new VoiceManager();
