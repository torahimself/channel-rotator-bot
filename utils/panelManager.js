const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('../config.js');
const voiceManager = require('./voiceManager');

class PanelManager {
  constructor() {
    this.client = null;
    this.mainPanelMessageId = null;
  }

  setClient(client) {
    this.client = client;
  }

  async createMainPanel() {
    try {
      const panelChannel = await this.client.channels.fetch(config.voice.controlPanelChannelId);
      if (!panelChannel) return null;

      const embed = {
        title: `🎛️ • Voice Channel Control Panel`,
        description: `**Central Control Panel**\nUse the buttons below to control your voice channel\n\n**Note:** You must be in a voice channel created by the bot to use this panel`,
        fields: [
          {
            name: '⚙️ Basic Settings',
            value: 'Change name, limit, privacy, or region',
            inline: false
          },
          {
            name: '👥 User Management',
            value: 'Trust, untrust, kick, block, or unblock users',
            inline: false
          },
          {
            name: '🚀 Quick Actions',
            value: 'Claim, transfer ownership, or delete channel',
            inline: false
          }
        ],
        color: 0x5865F2,
        timestamp: new Date().toISOString(),
        footer: { text: 'Central Control Panel - All Users' }
      };

      // Row 1: Basic Settings (Icons only)
      const basicControls = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('voice_name_main')
          .setLabel('✏️')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('✏️'),
        new ButtonBuilder()
          .setCustomId('voice_limit_main')
          .setLabel('👥')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('👥'),
        new ButtonBuilder()
          .setCustomId('voice_privacy_main')
          .setLabel('🔒')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🔒'),
        new ButtonBuilder()
          .setCustomId('voice_region_main')
          .setLabel('🌍')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🌍')
      );

      // Row 2: User Management - Trust/Block (Icons only)
      const userManagementTrust = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('voice_trust_main')
          .setLabel('👤+')
          .setStyle(ButtonStyle.Success)
          .setEmoji('✅'),
        new ButtonBuilder()
          .setCustomId('voice_untrust_main')
          .setLabel('👤-')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('❌'),
        new ButtonBuilder()
          .setCustomId('voice_block_main')
          .setLabel('🚫')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🚫'),
        new ButtonBuilder()
          .setCustomId('voice_unblock_main')
          .setLabel('🔓')
          .setStyle(ButtonStyle.Success)
          .setEmoji('🔓')
      );

      // Row 3: User Management - Kick & Quick Actions (Icons only)
      const userManagementKick = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('voice_kick_main')
          .setLabel('👢')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('👢'),
        new ButtonBuilder()
          .setCustomId('voice_claim_main')
          .setLabel('🎯')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🎯'),
        new ButtonBuilder()
          .setCustomId('voice_transfer_main')
          .setLabel('🔄')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🔄'),
        new ButtonBuilder()
          .setCustomId('voice_delete_main')
          .setLabel('🗑️')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🗑️')
      );

      const message = await panelChannel.send({
        embeds: [embed],
        components: [basicControls, userManagementTrust, userManagementKick]
      });

      this.mainPanelMessageId = message.id;
      return message.id;
    } catch (error) {
      console.error('Error creating main panel:', error);
      return null;
    }
  }

  async createChannelPanel(channelId, ownerId) {
    try {
      const channel = await voiceManager.getChannel(channelId);
      if (!channel) return null;

      const embed = {
        title: `🎛️ • Your Voice Channel Control`,
        description: `**Channel:** ${channel.name}\n**Owner:** <@${ownerId}>\n\nUse the buttons below to control your room`,
        color: 0x00ff00,
        timestamp: new Date().toISOString(),
        footer: { text: 'Channel Control Panel' }
      };

      // Compact channel panel with icons only
      const controls = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`voice_name_${channelId}`)
          .setLabel('✏️')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('✏️'),
        new ButtonBuilder()
          .setCustomId(`voice_limit_${channelId}`)
          .setLabel('👥')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('👥'),
        new ButtonBuilder()
          .setCustomId(`voice_privacy_${channelId}`)
          .setLabel('🔒')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🔒'),
        new ButtonBuilder()
          .setCustomId(`voice_delete_${channelId}`)
          .setLabel('🗑️')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🗑️')
      );

      const message = await channel.send({
        embeds: [embed],
        components: [controls]
      });

      return message.id;
    } catch (error) {
      console.error('Error creating channel panel:', error);
      return null;
    }
  }

  createNameModal(channelId) {
    return {
      title: 'Change Channel Name',
      custom_id: `modal_name_${channelId}`,
      components: [{
        type: 1,
        components: [{
          type: 4,
          custom_id: 'name_input',
          label: 'New Channel Name',
          style: 1,
          min_length: 1,
          max_length: 100,
          placeholder: 'Enter new channel name...',
          required: true
        }]
      }]
    };
  }

  createLimitModal(channelId) {
    return {
      title: 'Change User Limit',
      custom_id: `modal_limit_${channelId}`,
      components: [{
        type: 1,
        components: [{
          type: 4,
          custom_id: 'limit_input',
          label: 'User Limit (0 for no limit)',
          style: 1,
          min_length: 1,
          max_length: 2,
          placeholder: 'Enter number (0-99)...',
          required: true
        }]
      }]
    };
  }

  createPrivacyMenu(channelId) {
    return new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`menu_privacy_${channelId}`)
        .setPlaceholder('Select privacy setting...')
        .addOptions(
          {
            label: '🔒 Locked',
            description: 'Everyone sees channel, only trusted users can join',
            value: 'locked'
          },
          {
            label: '👻 Unseen',
            description: 'Channel hidden, only trusted users can see/join',
            value: 'unlocked-unseen'
          },
          {
            label: '👀 Visible',
            description: 'Everyone sees and can join channel',
            value: 'unlocked-seen'
          }
        )
    );
  }

  createRegionMenu(channelId) {
    const options = config.voice.regions.map(region => ({
      label: this.formatRegionName(region),
      description: `Set region to ${region}`,
      value: region
    }));

    options.unshift({
      label: 'Automatic',
      description: 'Use automatic region selection',
      value: 'automatic'
    });

    return new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`menu_region_${channelId}`)
        .setPlaceholder('Select voice region...')
        .addOptions(options)
    );
  }

  createUserInputModal(channelId, action) {
    const actionLabels = {
      'trust': 'Trust User',
      'untrust': 'Untrust User', 
      'kick': 'Kick User',
      'block': 'Block User',
      'unblock': 'Unblock User',
      'transfer': 'Transfer Ownership'
    };

    const actionIcons = {
      'trust': '✅',
      'untrust': '❌', 
      'kick': '👢',
      'block': '🚫',
      'unblock': '🔓',
      'transfer': '🔄'
    };

    return {
      title: `${actionIcons[action]} ${actionLabels[action]}`,
      custom_id: `modal_${action}_${channelId}`,
      components: [{
        type: 1,
        components: [{
          type: 4,
          custom_id: 'user_input',
          label: 'User ID or Mention',
          style: 1,
          min_length: 1,
          max_length: 100,
          placeholder: 'Enter user ID or mention...',
          required: true
        }]
      }]
    };
  }

  formatRegionName(region) {
    const regionNames = {
      'brazil': 'Brazil',
      'hongkong': 'Hong Kong',
      'india': 'India',
      'japan': 'Japan',
      'rotterdam': 'Rotterdam',
      'russia': 'Russia',
      'singapore': 'Singapore',
      'southafrica': 'South Africa',
      'sydney': 'Sydney',
      'us-central': 'US Central',
      'us-east': 'US East', 
      'us-south': 'US South',
      'us-west': 'US West'
    };

    return regionNames[region] || region;
  }
}

module.exports = new PanelManager();
