const fs = require('fs');
const path = require('path');

const commands = new Map();
const commandCategories = [];

function loadCommands() {
  const commandsPath = path.join(__dirname, '../commands');
  const categories = fs.readdirSync(commandsPath);

  for (const category of categories) {
    const categoryPath = path.join(commandsPath, category);
    if (!fs.statSync(categoryPath).isDirectory()) continue;

    const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));
    commandCategories.push(category);

    for (const file of commandFiles) {
      const command = require(path.join(categoryPath, file));
      commands.set(command.data.name, {
        ...command,
        category: category
      });
    }
  }

  console.log(`✅ Loaded ${commands.size} commands across ${commandCategories.length} categories`);
}

function getCommands() {
  return Array.from(commands.values()).map(cmd => cmd.data);
}

function executeCommand(interaction) {
  const command = commands.get(interaction.commandName);
  if (!command) return false;

  try {
    command.execute(interaction);
    return true;
  } catch (error) {
    console.error(`Error executing command ${interaction.commandName}:`, error);
    interaction.reply({ content: 'There was an error executing this command!', ephemeral: true });
    return true;
  }
}

module.exports = {
  loadCommands,
  getCommands,
  executeCommand,
  commands,
  commandCategories
};
