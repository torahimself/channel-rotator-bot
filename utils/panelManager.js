const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('../config.js');
const voiceManager = require('./voiceManager');

class PanelManager {
  constructor() {
    this.client = null;
  }

  setClient(client) {
    this.client = client;
  }

  async createControlPanel(channelId, ownerId) {
    const channelData = voiceManager.getChannelData(channelId);
    if (!channelData) return null;

    const panelChannel = await this.client.channels.fetch(config.voice.controlPanelChannelId);
    if (!panelChannel) return null;

    const embed = {
      title: `🎛️ Voice Channel Control Panel`,
      description: `**Channel:** <#${channelId}>\n**Owner:** <@${ownerId}>`,
      fields: [
        {
          name: '🔧 Basic Controls',
          value: 'Change name, limit, privacy, or region',
          inline: false
        },
        {
          name: '👥 User Management',
          value: 'Trust, untrust, kick, block, or unblock users',
          inline: false
        },
        {
          name: '⚡ Quick Actions',
          value: 'Claim, transfer, or delete channel',
          inline: false
        }
      ],
      color: 0x00ff00,
      timestamp: new Date().toISOString(),
      footer: { text: 'Control your voice channel' }
    };

    const basicControls = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`voice_name_${channelId}`)
        .setLabel('✏️ Name')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`voice_limit_${channelId}`)
        .setLabel('👥 Limit')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`voice_privacy_${channelId}`)
        .setLabel('🔒 Privacy')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`voice_region_${channelId}`)
        .setLabel('🌍 Region')
        .setStyle(ButtonStyle.Primary)
    );

    const userManagement = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`voice_trust_${channelId}`)
        .setLabel('✅ Trust')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`voice_untrust_${channelId}`)
        .setLabel('❌ Untrust')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`voice_kick_${channelId}`)
        .setLabel('👢 Kick')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`voice_block_${channelId}`)
        .setLabel('🚫 Block')
        .setStyle(ButtonStyle.Danger)
    );

    const quickActions = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`voice_claim_${channelId}`)
        .setLabel('🎯 Claim')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`voice_transfer_${channelId}`)
        .setLabel('🔄 Transfer')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`voice_unblock_${channelId}`)
        .setLabel('✅ Unblock')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`voice_delete_${channelId}`)
        .setLabel('🗑️ Delete')
        .setStyle(ButtonStyle.Danger)
    );

    const message = await panelChannel.send({
      embeds: [embed],
      components: [basicControls, userManagement, quickActions]
    });

    return message.id;
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
            description: 'No one can join',
            value: 'locked'
          },
          {
            label: '👻 Unlocked Unseen',
            description: 'Can join but cannot see',
            value: 'unlocked-unseen'
          },
          {
            label: '👀 Unlocked Seen',
            description: 'Can see and join',
            value: 'unlocked-seen'
          }
        )
    );
  }

  createRegionMenu(channelId) {
    const options = config.voice.regions.map(region => ({
      label: region.charAt(0).toUpperCase() + region.slice(1),
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
    return {
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} User`,
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
}

module.exports = new PanelManager();
