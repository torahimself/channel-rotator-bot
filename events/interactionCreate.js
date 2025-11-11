const { InteractionType, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const commandHandler = require('../handlers/commandHandler');
const voiceManager = require('../utils/voiceManager');
const panelManager = require('../utils/panelManager');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    if (interaction.isCommand()) {
      commandHandler.executeCommand(interaction);
      return;
    }

    if (interaction.isButton()) {
      await handleButtonInteraction(interaction);
      return;
    }

    if (interaction.isStringSelectMenu()) {
      await handleSelectMenuInteraction(interaction);
      return;
    }

    if (interaction.isModalSubmit()) {
      await handleModalInteraction(interaction);
      return;
    }
  },
};

async function handleButtonInteraction(interaction) {
  const [action, channelId] = interaction.customId.split('_').slice(1);
  
  // Fix: Check if user is in the voice channel AND is the owner
  const channelData = voiceManager.getChannelData(channelId);
  if (!channelData) {
    await interaction.reply({ content: '❌ لم تعد هذه الغرفة موجودة!', ephemeral: true });
    return;
  }

  const userInChannel = interaction.member.voice.channelId === channelId;
  const isOwner = voiceManager.isOwner(channelId, interaction.user.id);
  
  if (!userInChannel || !isOwner) {
    await interaction.reply({ content: '❌ يجب أن تكون المالك وتكون في الغرفة الصوتية!', ephemeral: true });
    return;
  }

  switch (action) {
    case 'name':
      const nameModal = panelManager.createNameModal(channelId);
      await interaction.showModal(nameModal);
      break;

    case 'limit':
      const limitModal = panelManager.createLimitModal(channelId);
      await interaction.showModal(limitModal);
      break;

    case 'privacy':
      const privacyMenu = panelManager.createPrivacyMenu(channelId);
      await interaction.reply({ components: [privacyMenu], ephemeral: true });
      break;

    case 'region':
      const regionMenu = panelManager.createRegionMenu(channelId);
      await interaction.reply({ components: [regionMenu], ephemeral: true });
      break;

    case 'trust':
    case 'untrust':
    case 'kick':
    case 'block':
    case 'unblock':
      const userModal = panelManager.createUserInputModal(channelId, action);
      await interaction.showModal(userModal);
      break;

    case 'claim':
      const claimResult = await voiceManager.claimChannel(channelId, interaction.user.id);
      await interaction.reply({ 
        content: claimResult ? '✅ تم المطالبة بالغرفة بنجاح!' : '❌ لا يمكن المطالبة بالغرفة - المالك الأصلي لا يزال موجوداً.',
        ephemeral: true 
      });
      break;

    case 'transfer':
      const transferModal = panelManager.createUserInputModal(channelId, 'transfer');
      await interaction.showModal(transferModal);
      break;

    case 'delete':
      const deleteResult = await voiceManager.deleteChannel(channelId, interaction.user.id);
      await interaction.reply({ 
        content: deleteResult ? '✅ تم حذف الغرفة بنجاح!' : '❌ فشل في حذف الغرفة.',
        ephemeral: true 
      });
      break;
  }
}

async function handleSelectMenuInteraction(interaction) {
  const [action, channelId] = interaction.customId.split('_').slice(1);
  const value = interaction.values[0];

  // Fix: Check if user is in the voice channel AND is the owner
  const channelData = voiceManager.getChannelData(channelId);
  if (!channelData) {
    await interaction.reply({ content: '❌ لم تعد هذه الغرفة موجودة!', ephemeral: true });
    return;
  }

  const userInChannel = interaction.member.voice.channelId === channelId;
  const isOwner = voiceManager.isOwner(channelId, interaction.user.id);
  
  if (!userInChannel || !isOwner) {
    await interaction.reply({ content: '❌ يجب أن تكون المالك وتكون في الغرفة الصوتية!', ephemeral: true });
    return;
  }

  switch (action) {
    case 'privacy':
      const privacyResult = await voiceManager.updatePrivacy(channelId, value);
      await interaction.reply({ 
        content: privacyResult ? `✅ تم تعيين الخصوصية إلى: ${value}` : '❌ فشل في تحديث الخصوصية.',
        ephemeral: true 
      });
      break;

    case 'region':
      const regionResult = await voiceManager.changeRegion(channelId, value);
      await interaction.reply({ 
        content: regionResult ? `✅ تم تعيين المنطقة إلى: ${value}` : '❌ فشل في تحديث المنطقة.',
        ephemeral: true 
      });
      break;
  }
}

async function handleModalInteraction(interaction) {
  const [action, channelId] = interaction.customId.split('_').slice(1);

  // Fix: Check if user is in the voice channel AND is the owner
  const channelData = voiceManager.getChannelData(channelId);
  if (!channelData) {
    await interaction.reply({ content: '❌ لم تعد هذه الغرفة موجودة!', ephemeral: true });
    return;
  }

  const userInChannel = interaction.member.voice.channelId === channelId;
  const isOwner = voiceManager.isOwner(channelId, interaction.user.id);
  
  if (!userInChannel || !isOwner) {
    await interaction.reply({ content: '❌ يجب أن تكون المالك وتكون في الغرفة الصوتية!', ephemeral: true });
    return;
  }

  switch (action) {
    case 'name':
      const newName = interaction.fields.getTextInputValue('name_input');
      const nameResult = await voiceManager.updateChannelName(channelId, newName);
      await interaction.reply({ 
        content: nameResult ? `✅ تم تحديث اسم الغرفة إلى: ${newName}` : '❌ فشل في تحديث اسم الغرفة.',
        ephemeral: true 
      });
      break;

    case 'limit':
      const limitInput = interaction.fields.getTextInputValue('limit_input');
      const limit = parseInt(limitInput);
      if (isNaN(limit) || limit < 0 || limit > 99) {
        await interaction.reply({ content: '❌ الرجاء إدخال رقم صحيح بين 0 و 99.', ephemeral: true });
        return;
      }
      const limitResult = await voiceManager.updateUserLimit(channelId, limit);
      await interaction.reply({ 
        content: limitResult ? `✅ تم تعيين الحد الأقصى للمستخدمين إلى: ${limit}` : '❌ فشل في تحديث الحد الأقصى.',
        ephemeral: true 
      });
      break;

    case 'trust':
      const userToTrust = await extractUserId(interaction, 'user_input');
      if (!userToTrust) return;
      const trustResult = await voiceManager.trustUser(channelId, userToTrust);
      await interaction.reply({ 
        content: trustResult ? `✅ تم منح الثقة للمستخدم <@${userToTrust}>` : '❌ فشل في منح الثقة للمستخدم.',
        ephemeral: true 
      });
      break;

    case 'untrust':
      const userToUntrust = await extractUserId(interaction, 'user_input');
      if (!userToUntrust) return;
      const untrustResult = await voiceManager.untrustUser(channelId, userToUntrust);
      await interaction.reply({ 
        content: untrustResult ? `✅ تم إزالة الثقة من المستخدم <@${userToUntrust}>` : '❌ فشل في إزالة الثقة.',
        ephemeral: true 
      });
      break;

    case 'kick':
      const userToKick = await extractUserId(interaction, 'user_input');
      if (!userToKick) return;
      const kickResult = await voiceManager.kickUser(channelId, userToKick);
      await interaction.reply({ 
        content: kickResult ? `✅ تم طرد المستخدم <@${userToKick}>` : '❌ فشل في طرد المستخدم.',
        ephemeral: true 
      });
      break;

    case 'block':
      const userToBlock = await extractUserId(interaction, 'user_input');
      if (!userToBlock) return;
      const blockResult = await voiceManager.blockUser(channelId, userToBlock);
      await interaction.reply({ 
        content: blockResult ? `✅ تم حظر المستخدم <@${userToBlock}>` : '❌ فشل في حظر المستخدم.',
        ephemeral: true 
      });
      break;

    case 'unblock':
      const userToUnblock = await extractUserId(interaction, 'user_input');
      if (!userToUnblock) return;
      const unblockResult = await voiceManager.unblockUser(channelId, userToUnblock);
      await interaction.reply({ 
        content: unblockResult ? `✅ تم إلغاء حظر المستخدم <@${userToUnblock}>` : '❌ فشل في إلغاء الحظر.',
        ephemeral: true 
      });
      break;

    case 'transfer':
      const newOwnerId = await extractUserId(interaction, 'user_input');
      if (!newOwnerId) return;
      const transferResult = await voiceManager.transferOwnership(channelId, interaction.user.id, newOwnerId);
      await interaction.reply({ 
        content: transferResult ? `✅ تم نقل الملكية إلى <@${newOwnerId}>!` : '❌ فشل في نقل الملكية.',
        ephemeral: true 
      });
      break;
  }
}

async function extractUserId(interaction, fieldName) {
  const input = interaction.fields.getTextInputValue(fieldName);
  
  // Check if it's a mention
  const mentionMatch = input.match(/<@!?(\d+)>/);
  if (mentionMatch) return mentionMatch[1];
  
  // Check if it's a user ID
  if (/^\d+$/.test(input)) {
    try {
      const user = await interaction.client.users.fetch(input);
      return user.id;
    } catch {
      await interaction.reply({ content: '❌ المستخدم غير موجود!', ephemeral: true });
      return null;
    }
  }
  
  await interaction.reply({ content: '❌ الرجاء تقديم منشن أو معرف مستخدم صحيح.', ephemeral: true });
  return null;
}
