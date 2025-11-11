const commandHandler = require('../handlers/commandHandler');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    if (interaction.isCommand()) {
      commandHandler.executeCommand(interaction);
    }
  },
};
