const commandHandler = require('../handlers/commandHandler');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    if (interaction.isCommand()) {
      await commandHandler.executeCommand(interaction);
    }
    
    // Voice system interactions will be added later
    if (interaction.isButton() || interaction.isModalSubmit() || interaction.isStringSelectMenu()) {
      await interaction.reply({ 
        content: '⚠️ نظام الصوت قيد التطوير حالياً', 
        ephemeral: true 
      });
    }
  },
};
