const commandHandler = require('../handlers/commandHandler');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    try {
      // Only handle slash commands
      if (!interaction.isChatInputCommand()) return;

      console.log(`🔧 Command received: ${interaction.commandName}`);
      
      const command = commandHandler.commands.get(interaction.commandName);
      if (!command) {
        console.log(`❌ No command matching ${interaction.commandName} was found.`);
        return;
      }

      await command.execute(interaction);
      console.log(`✅ Command executed: ${interaction.commandName}`);
      
    } catch (error) {
      console.error(`❌ Error executing command ${interaction.commandName}:`, error);
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ 
          content: 'There was an error executing this command!', 
          ephemeral: true 
        });
      } else {
        await interaction.reply({ 
          content: 'There was an error executing this command!', 
          ephemeral: true 
        });
      }
    }
  },
};
