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

  // Create the single main control panel
  async createMainPanel() {
    const panelChannel = await this.client.channels.fetch(config.voice.controlPanelChannelId);
    if (!panelChannel) return null;

    // Clear existing messages in the panel channel
    try {
      const messages = await panelChannel.messages.fetch({ limit: 10 });
      await panelChannel.bulkDelete(messages);
    } catch (error) {
      console.log('Could not clear panel channel:', error.message);
    }

    const embed = {
      title: `🎛️ لوحة تحكم غرف الصوت الرئيسية`,
      description: `**لوحة التحكم المركزية**\nاستخدم الأزرار أدناه للتحكم في غرفة الصوت الخاصة بك\n\n**ملاحظة:** يجب أن تكون في غرفة صوتية تم إنشاؤها بواسطة البوت لاستخدام هذه اللوحة`,
      fields: [
        {
          name: '⚙️ الإعدادات الأساسية',
          value: 'تغيير الاسم، الحد، الخصوصية، أو المنطقة',
          inline: false
        },
        {
          name: '👥 إدارة المستخدمين',
          value: 'إضافة ثقة، إزالة ثقة، طرد، حظر، أو إلغاء حظر المستخدمين',
          inline: false
        },
        {
          name: '🚀 الإجراءات السريعة',
          value: 'المطالبة، نقل الملكية، أو حذف الغرفة',
          inline: false
        }
      ],
      color: 0x5865F2,
      timestamp: new Date().toISOString(),
      footer: { text: 'لوحة التحكم المركزية - جميع المستخدمين' }
    };

    // Row 1: Basic Settings (Blue)
    const basicControls = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('voice_name_main')
        .setLabel('✏️ تغيير الاسم')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('voice_limit_main')
        .setLabel('👥 تحديد العدد')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('voice_privacy_main')
        .setLabel('🔒 إعدادات الخصوصية')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('voice_region_main')
        .setLabel('🌍 تغيير المنطقة')
        .setStyle(ButtonStyle.Primary)
    );

    // Row 2: User Management - Positive actions (Green)
    const userManagementPositive = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('voice_trust_main')
        .setLabel('✅ إضافة ثقة')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('voice_untrust_main')
        .setLabel('❌ إزالة ثقة')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('voice_unblock_main')
        .setLabel('🔓 إلغاء الحظر')
        .setStyle(ButtonStyle.Success)
    );

    // Row 3: User Management - Negative actions (Red)
    const userManagementNegative = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('voice_kick_main')
        .setLabel('👢 طرد مستخدم')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('voice_block_main')
        .setLabel('🚫 حظر مستخدم')
        .setStyle(ButtonStyle.Danger)
    );

    // Row 4: Quick Actions (Secondary/Grey)
    const quickActions = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('voice_claim_main')
        .setLabel('🎯 المطالبة بالملكية')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('voice_transfer_main')
        .setLabel('🔄 نقل الملكية')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('voice_delete_main')
        .setLabel('🗑️ حذف الغرفة')
        .setStyle(ButtonStyle.Danger)
    );

    const message = await panelChannel.send({
      embeds: [embed],
      components: [basicControls, userManagementPositive, userManagementNegative, quickActions]
    });

    this.mainPanelMessageId = message.id;
    return message.id;
  }

  // Create per-channel panel (sent to the voice channel)
  async createChannelPanel(channelId, ownerId) {
    const channel = await voiceManager.getChannel(channelId);
    if (!channel) return null;

    const embed = {
      title: `🎛️ لوحة تحكم غرفتك الصوتية`,
      description: `**الغرفة:** ${channel.name}\n**المالك:** <@${ownerId}>\n\nاستخدم الأزرار أدناه للتحكم في غرفتك`,
      color: 0x00ff00,
      timestamp: new Date().toISOString(),
      footer: { text: 'لوحة التحكم الخاصة بالغرفة' }
    };

    const controls = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`voice_name_${channelId}`)
        .setLabel('✏️ الاسم')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`voice_limit_${channelId}`)
        .setLabel('👥 العدد')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`voice_privacy_${channelId}`)
        .setLabel('🔒 الخصوصية')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`voice_delete_${channelId}`)
        .setLabel('🗑️ حذف')
        .setStyle(ButtonStyle.Danger)
    );

    const message = await channel.send({
      embeds: [embed],
      components: [controls]
    });

    return message.id;
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
            description: 'لا أحد يستطيع الدخول',
            value: 'locked'
          },
          {
            label: '👻 مفتوح غير مرئي',
            description: 'يمكن الدخول لكن لا يمكن الرؤية',
            value: 'unlocked-unseen'
          },
          {
            label: '👀 مفتوح مرئي',
            description: 'يمكن الرؤية والدخول',
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
      title: actionLabels[action] || 'إدارة المستخدم',
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
