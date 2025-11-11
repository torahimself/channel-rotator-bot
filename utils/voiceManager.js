const { ChannelType, PermissionFlagsBits } = require('discord.js');
const config = require('../config.js');

class VoiceManager {
  constructor() {
    this.tempChannels = new Map();
    this.client = null;
    this.cleanupIntervals = new Map();
    this.userChannelNames = new Map();
    this.userTrustedLists = new Map();
    this.userBlockedLists = new Map();
  }

  setClient(client) {
    this.client = client;
  }

  async createTempChannel(member, parentChannel) {
    try {
      const guild = member.guild;
      
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
        trustedUsers: [...trustedUsers],
        blockedUsers: [...blockedUsers],
        settings: {
          name: channelName,
          limit: config.voice.defaultSettings.limit,
          privacy: config.voice.defaultSettings.privacy,
          region: config.voice.defaultSettings.region
        },
        guildId: guild.id,
        panelMessageId: null
      });

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
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect]
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
      if (!channelData) return { success: false, error: 'Channel not found' };
      
      if (channelData.trustedUsers.length >= config.voice.maxTrustedUsers) {
        return { 
          success: false, 
          error: `❌ Maximum ${config.voice.maxTrustedUsers} trusted users reached! Please untrust someone first.` 
        };
      }

      if (!channelData.trustedUsers.includes(userId)) {
        channelData.trustedUsers.push(userId);
        
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
      return { success: true };
    } catch (error) {
      console.error('Error trusting user:', error);
      return { success: false, error: 'Failed to trust user' };
    }
  }

  async untrustUser(channelId, userId) {
    try {
      const channelData = this.tempChannels.get(channelId);
      if (!channelData) return { success: false, error: 'Channel not found' };

      channelData.trustedUsers = channelData.trustedUsers.filter(id => id !== userId);
      
      const userTrustedList = this.userTrustedLists.get(channelData.ownerId) || [];
      this.userTrustedLists.set(channelData.ownerId, userTrustedList.filter(id => id !== userId));
      
      const channel = await this.getChannel(channelId);
      if (channel && userId !== channelData.ownerId) {
        await channel.permissionOverwrites.delete(userId);
      }
      return { success: true };
    } catch (error) {
      console.error('Error untrusting user:', error);
      return { success: false, error: 'Failed to untrust user' };
    }
  }

  async blockUser(channelId, userId) {
    try {
      const channelData = this.tempChannels.get(channelId);
      if (!channelData) return { success: false, error: 'Channel not found' };

      if (!channelData.blockedUsers.includes(userId)) {
        channelData.blockedUsers.push(userId);
        
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
      return { success: true };
    } catch (error) {
      console.error('Error blocking user:', error);
      return { success: false, error: 'Failed to block user' };
    }
  }

  async unblockUser(channelId, userId) {
    try {
      const channelData = this.tempChannels.get(channelId);
      if (!channelData) return { success: false, error: 'Channel not found' };

      channelData.blockedUsers = channelData.blockedUsers.filter(id => id !== userId);
      
      const userBlockedList = this.userBlockedLists.get(channelData.ownerId) || [];
      this.userBlockedLists.set(channelData.ownerId, userBlockedList.filter(id => id !== userId));
      
      const channel = await this.getChannel(channelId);
      if (channel) {
        await channel.permissionOverwrites.delete(userId);
      }
      return { success: true };
    } catch (error) {
      console.error('Error unblocking user:', error);
      return { success: false, error: 'Failed to unblock user' };
    }
  }

  async kickUser(channelId, userId) {
    try {
      const channel = await this.getChannel(channelId);
      if (!channel) return { success: false, error: 'Channel not found' };

      const member = channel.guild.members.cache.get(userId);
      if (member && member.voice.channelId === channelId) {
        await member.voice.setChannel(null);
        return { success: true };
      }
      return { success: false, error: 'User not in channel' };
    } catch (error) {
      console.error('Error kicking user:', error);
      return { success: false, error: 'Failed to kick user' };
    }
  }

  async changeRegion(channelId, region) {
    try {
      const channel = await this.getChannel(channelId);
      if (!channel) return { success: false, error: 'Channel not found' };

      const channelData = this.tempChannels.get(channelId);
      if (channelData) {
        channelData.settings.region = region;
      }

      await channel.setRTCRegion(region);
      return { success: true };
    } catch (error) {
      console.error('Error changing region:', error);
      return { success: false, error: 'Failed to change region' };
    }
  }

  async claimChannel(channelId, newOwnerId) {
    try {
      const channelData = this.tempChannels.get(channelId);
      if (!channelData) return { success: false, error: 'Channel not found' };

      const channel = await this.getChannel(channelId);
      if (!channel) return { success: false, error: 'Channel not found' };

      const currentOwnerInChannel = channel.members.has(channelData.ownerId);
      if (currentOwnerInChannel) {
        return { success: false, error: 'Cannot claim channel - current owner is still present' };
      }

      channelData.ownerId = newOwnerId;
      
      this.userChannelNames.set(newOwnerId, this.userChannelNames.get(channelData.ownerId) || `${channel.name}`);
      this.userTrustedLists.set(newOwnerId, [...(this.userTrustedLists.get(channelData.ownerId) || [])]);
      this.userBlockedLists.set(newOwnerId, [...(this.userBlockedLists.get(channelData.ownerId) || [])]);

      return { success: true };
    } catch (error) {
      console.error('Error claiming channel:', error);
      return { success: false, error: 'Failed to claim channel' };
    }
  }

  async transferOwnership(channelId, currentOwnerId, newOwnerId) {
    try {
      const channelData = this.tempChannels.get(channelId);
      if (!channelData || channelData.ownerId !== currentOwnerId) {
        return { success: false, error: 'You are not the owner of this channel' };
      }

      const channel = await this.getChannel(channelId);
      if (!channel) return { success: false, error: 'Channel not found' };

      channelData.ownerId = newOwnerId;
      
      this.userChannelNames.set(newOwnerId, this.userChannelNames.get(currentOwnerId) || `${channel.name}`);
      this.userTrustedLists.set(newOwnerId, [...(this.userTrustedLists.get(currentOwnerId) || [])]);
      this.userBlockedLists.set(newOwnerId, [...(this.userBlockedLists.get(currentOwnerId) || [])]);

      return { success: true };
    } catch (error) {
      console.error('Error transferring ownership:', error);
      return { success: false, error: 'Failed to transfer ownership' };
    }
  }

  async deleteChannel(channelId, requesterId) {
    try {
      const channelData = this.tempChannels.get(channelId);
      if (!channelData) return { success: false, error: 'Channel not found' };

      const channel = await this.getChannel(channelId);
      if (!channel) return { success: false, error: 'Channel not found' };

      if (requesterId !== 'system') {
        const requester = channel.guild.members.cache.get(requesterId);
        if (channelData.ownerId !== requesterId && !requester.permissions.has(PermissionFlagsBits.Administrator)) {
          return { success: false, error: 'You are not the owner of this channel' };
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
      return { success: true };
    } catch (error) {
      console.error('Error deleting channel:', error);
      return { success: false, error: 'Failed to delete channel' };
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

  getUserMemory(userId) {
    return {
      channelName: this.userChannelNames.get(userId),
      trustedUsers: this.userTrustedLists.get(userId) || [],
      blockedUsers: this.userBlockedLists.get(userId) || []
    };
  }

  getTrustedUsersCount(userId) {
    const trustedList = this.userTrustedLists.get(userId) || [];
    return trustedList.length;
  }
}

module.exports = new VoiceManager();
