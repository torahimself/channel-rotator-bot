const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('voice-setup')
    .setDescription('Setup the temp voice system')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  async execute(interaction) {
    const embed = {
      title: '🎤 Temp Voice System',
      description: 'The temp voice system is now active!',
      fields: [
        {
          name: 'How to use:',
          value: `1. Join <#${config.voice.createChannelId}>\n2. A temp voice channel will be created\n3. Use the control panel to manage your channel`,
          inline: false
        },
        {
          name: 'Features:',
          value: '• Custom channel names\n• User limits\n• Privacy settings\n• Trust/Block users\n• Region selection\n• Channel claiming',
          inline: false
        }
      ],
      color: 0x0099ff,
      timestamp: new Date().toISOString()
    };

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
