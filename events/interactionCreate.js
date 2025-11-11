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
  
  if (!voiceManager.isOwner(channelId, interaction.user.id)) {
    await interaction.reply({ content: '❌ You are not the owner of this voice channel!', ephemeral: true });
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
        content: claimResult ? '✅ Successfully claimed the channel!' : '❌ Cannot claim channel - owner is still present.',
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
        content: deleteResult ? '✅ Channel deleted successfully!' : '❌ Failed to delete channel.',
        ephemeral: true 
      });
      break;
  }
}

async function handleSelectMenuInteraction(interaction) {
  const [action, channelId] = interaction.customId.split('_').slice(1);
  const value = interaction.values[0];

  if (!voiceManager.isOwner(channelId, interaction.user.id)) {
    await interaction.reply({ content: '❌ You are not the owner of this voice channel!', ephemeral: true });
    return;
  }

  switch (action) {
    case 'privacy':
      const privacyResult = await voiceManager.updatePrivacy(channelId, value);
      await interaction.reply({ 
        content: privacyResult ? `✅ Privacy set to: ${value}` : '❌ Failed to update privacy.',
        ephemeral: true 
      });
      break;

    case 'region':
      const regionResult = await voiceManager.changeRegion(channelId, value);
      await interaction.reply({ 
        content: regionResult ? `✅ Region set to: ${value}` : '❌ Failed to update region.',
        ephemeral: true 
      });
      break;
  }
}

async function handleModalInteraction(interaction) {
  const [action, channelId] = interaction.customId.split('_').slice(1);

  if (!voiceManager.isOwner(channelId, interaction.user.id)) {
    await interaction.reply({ content: '❌ You are not the owner of this voice channel!', ephemeral: true });
    return;
  }

  switch (action) {
    case 'name':
      const newName = interaction.fields.getTextInputValue('name_input');
      const nameResult = await voiceManager.updateChannelName(channelId, newName);
      await interaction.reply({ 
        content: nameResult ? `✅ Channel name updated to: ${newName}` : '❌ Failed to update channel name.',
        ephemeral: true 
      });
      break;

    case 'limit':
      const limitInput = interaction.fields.getTextInputValue('limit_input');
      const limit = parseInt(limitInput);
      if (isNaN(limit) || limit < 0 || limit > 99) {
        await interaction.reply({ content: '❌ Please enter a valid number between 0 and 99.', ephemeral: true });
        return;
      }
      const limitResult = await voiceManager.updateUserLimit(channelId, limit);
      await interaction.reply({ 
        content: limitResult ? `✅ User limit set to: ${limit}` : '❌ Failed to update user limit.',
        ephemeral: true 
      });
      break;

    case 'trust':
      const userToTrust = await extractUserId(interaction, 'user_input');
      if (!userToTrust) return;
      const trustResult = await voiceManager.trustUser(channelId, userToTrust);
      await interaction.reply({ 
        content: trustResult ? `✅ User <@${userToTrust}> has been trusted.` : '❌ Failed to trust user.',
        ephemeral: true 
      });
      break;

    case 'untrust':
      const userToUntrust = await extractUserId(interaction, 'user_input');
      if (!userToUntrust) return;
      const untrustResult = await voiceManager.untrustUser(channelId, userToUntrust);
      await interaction.reply({ 
        content: untrustResult ? `✅ User <@${userToUntrust}> has been untrusted.` : '❌ Failed to untrust user.',
        ephemeral: true 
      });
      break;

    case 'kick':
      const userToKick = await extractUserId(interaction, 'user_input');
      if (!userToKick) return;
      const kickResult = await voiceManager.kickUser(channelId, userToKick);
      await interaction.reply({ 
        content: kickResult ? `✅ User <@${userToKick}> has been kicked.` : '❌ Failed to kick user.',
        ephemeral: true 
      });
      break;

    case 'block':
      const userToBlock = await extractUserId(interaction, 'user_input');
      if (!userToBlock) return;
      const blockResult = await voiceManager.blockUser(channelId, userToBlock);
      await interaction.reply({ 
        content: blockResult ? `✅ User <@${userToBlock}> has been blocked.` : '❌ Failed to block user.',
        ephemeral: true 
      });
      break;

    case 'unblock':
      const userToUnblock = await extractUserId(interaction, 'user_input');
      if (!userToUnblock) return;
      const unblockResult = await voiceManager.unblockUser(channelId, userToUnblock);
      await interaction.reply({ 
        content: unblockResult ? `✅ User <@${userToUnblock}> has been unblocked.` : '❌ Failed to unblock user.',
        ephemeral: true 
      });
      break;

    case 'transfer':
      const newOwnerId = await extractUserId(interaction, 'user_input');
      if (!newOwnerId) return;
      const transferResult = await voiceManager.transferOwnership(channelId, interaction.user.id, newOwnerId);
      await interaction.reply({ 
        content: transferResult ? `✅ Ownership transferred to <@${newOwnerId}>!` : '❌ Failed to transfer ownership.',
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
      await interaction.reply({ content: '❌ User not found!', ephemeral: true });
      return null;
    }
  }
  
  await interaction.reply({ content: '❌ Please provide a valid user mention or ID.', ephemeral: true });
  return null;
}
