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

      const panelImageURL = 'https://your-image-host.com/voice-control-panel.png';

      const embed = {
        title: `🎛️ • لوحة تحكم غرف الصوت`,
        description: `**لوحة التحكم المركزية**\nاستخدم الأزرار أدناه للتحكم في غرفة الصوت الخاصة بك\n\n**ملاحظة:** يجب أن تكون في غرفة صوتية تم إنشاؤها بواسطة البوت لاستخدام هذه اللوحة`,
        image: { url: panelImageURL },
        color: 0x5865F2,
        timestamp: new Date().toISOString(),
        footer: { text: 'لوحة التحكم المركزية - جميع المستخدمين' }
      };

      // Row 1: Basic Settings - Custom Emojis
      const basicControls = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('voice_name_main')
          .setEmoji('1438035089526231073') // REPLACE: Name emoji ID
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('voice_limit_main')
          .setEmoji('1438034919975682169') // REPLACE: Limit emoji ID
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('voice_privacy_main')
          .setEmoji('1438035151585021953') // REPLACE: Privacy emoji ID
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('voice_region_main')
          .setEmoji('1438034655373955114') // REPLACE: Region emoji ID
          .setStyle(ButtonStyle.Secondary)
      );

      // Row 2: User Management - Custom Emojis
      const userManagementTrust = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('voice_trust_main')
          .setEmoji('1438035064351883405') // REPLACE: Trust emoji ID
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('voice_untrust_main')
          .setEmoji('1438034959498477629') // REPLACE: Untrust emoji ID
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('voice_block_main')
          .setEmoji('1438035029090500650') // REPLACE: Block emoji ID
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('voice_unblock_main')
          .setEmoji('1438034996349632562') // REPLACE: Unblock emoji ID
          .setStyle(ButtonStyle.Secondary)
      );

      // Row 3: Quick Actions - Custom Emojis
      const quickActions = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('voice_kick_main')
          .setEmoji('1438034884521365534') // REPLACE: Kick emoji ID
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('voice_claim_main')
          .setEmoji('1438034836030754927') // REPLACE: Claim emoji ID
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('voice_transfer_main')
          .setEmoji('1438034801746509925') // REPLACE: Transfer emoji ID
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('voice_delete_main')
          .setEmoji('1438034752971214898') // REPLACE: Delete emoji ID
          .setStyle(ButtonStyle.Secondary)
      );

      const message = await panelChannel.send({
        embeds: [embed],
        components: [basicControls, userManagementTrust, quickActions]
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
        title: `🎛️ • لوحة تحكم غرفتك الصوتية`,
        description: `**الغرفة:** ${channel.name}\n**المالك:** <@${ownerId}>`,
        color: 0x00ff00,
        timestamp: new Date().toISOString(),
        footer: { text: 'لوحة التحكم الخاصة بالغرفة' }
      };

      // Channel panel - Custom Emojis
      const controls = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`voice_name_${channelId}`)
          .setEmoji('123456789012345671') // REPLACE: Name emoji ID (same as above)
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`voice_limit_${channelId}`)
          .setEmoji('123456789012345672') // REPLACE: Limit emoji ID (same as above)
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`voice_privacy_${channelId}`)
          .setEmoji('123456789012345673') // REPLACE: Privacy emoji ID (same as above)
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`voice_delete_${channelId}`)
          .setEmoji('123456789012345682') // REPLACE: Delete emoji ID (same as above)
          .setStyle(ButtonStyle.Secondary)
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
      title: 'تغيير اسم الغرفة',
      custom_id: `modal_name_${channelId}`,
      components: [{
        type: 1,
        components: [{
          type: 4,
          custom_id: 'name_input',
          label: 'الاسم الجديد للغرفة',
          style: 1,
          min_length: 1,
          max_length: 100,
          placeholder: 'أدخل الاسم الجديد...',
          required: true
        }]
      }]
    };
  }

  createLimitModal(channelId) {
    return {
      title: 'تغيير الحد الأقصى للمستخدمين',
      custom_id: `modal_limit_${channelId}`,
      components: [{
        type: 1,
        components: [{
          type: 4,
          custom_id: 'limit_input',
          label: 'الحد الأقصى للمستخدمين (0 يعني لا يوجد حد)',
          style: 1,
          min_length: 1,
          max_length: 2,
          placeholder: 'أدخل رقم بين 0 و 99...',
          required: true
        }]
      }]
    };
  }

  createPrivacyMenu(channelId) {
    return new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`menu_privacy_${channelId}`)
        .setPlaceholder('اختر إعدادات الخصوصية...')
        .addOptions(
          {
            label: '🔒 مقفل',
            description: 'الجميع يرى الغرفة، فقط الثقات يمكنهم الدخول',
            value: 'locked'
          },
          {
            label: '👻 مفتوح غير مرئي',
            description: 'الغرفة مخفية، فقط الثقات يمكنهم رؤيتها والدخول',
            value: 'unlocked-unseen'
          },
          {
            label: '👀 مفتوح مرئي',
            description: 'الجميع يرى الغرفة ويمكنهم الدخول',
            value: 'unlocked-seen'
          }
        )
    );
  }

  createRegionMenu(channelId) {
    const options = config.voice.regions.map(region => ({
      label: this.formatRegionName(region),
      description: `تعيين المنطقة إلى ${region}`,
      value: region
    }));

    options.unshift({
      label: 'تلقائي',
      description: 'استخدام اختيار المنطقة التلقائي',
      value: 'automatic'
    });

    return new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`menu_region_${channelId}`)
        .setPlaceholder('اختر منطقة الصوت...')
        .addOptions(options)
    );
  }

  createUserInputModal(channelId, action) {
    const actionLabels = {
      'trust': 'إضافة ثقة',
      'untrust': 'إزالة ثقة', 
      'kick': 'طرد',
      'block': 'حظر',
      'unblock': 'إلغاء الحظر',
      'transfer': 'نقل الملكية'
    };

    return {
      title: `${actionLabels[action]}`,
      custom_id: `modal_${action}_${channelId}`,
      components: [{
        type: 1,
        components: [{
          type: 4,
          custom_id: 'user_input',
          label: 'معرف المستخدم أو المنشن',
          style: 1,
          min_length: 1,
          max_length: 100,
          placeholder: 'أدخل معرف المستخدم أو المنشن...',
          required: true
        }]
      }]
    };
  }

  formatRegionName(region) {
    const regionNames = {
      'brazil': 'البرازيل',
      'hongkong': 'هونغ كونغ',
      'india': 'الهند',
      'japan': 'اليابان',
      'rotterdam': 'روتردام',
      'russia': 'روسيا',
      'singapore': 'سنغافورة',
      'southafrica': 'جنوب أفريقيا',
      'sydney': 'سيدني',
      'us-central': 'الولايات المتحدة الوسطى',
      'us-east': 'الولايات المتحدة الشرقية', 
      'us-south': 'الولايات المتحدة الجنوبية',
      'us-west': 'الولايات المتحدة الغربية'
    };

    return regionNames[region] || region;
  }
}

module.exports = new PanelManager();
