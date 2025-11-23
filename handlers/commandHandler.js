const fs = require('fs');
const path = require('path');

const commands = new Map();
const commandCategories = [];

function loadCommands() {
  try {
    const commandsPath = path.join(__dirname, '../commands');
    
    if (!fs.existsSync(commandsPath)) {
      console.log('⚠️  Commands directory not found, creating...');
      fs.mkdirSync(commandsPath, { recursive: true });
      return;
    }

    const categories = fs.readdirSync(commandsPath);

    for (const category of categories) {
      const categoryPath = path.join(commandsPath, category);
      if (!fs.statSync(categoryPath).isDirectory()) continue;

      const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));
      commandCategories.push(category);

      for (const file of commandFiles) {
        try {
          const commandPath = path.join(categoryPath, file);
          const command = require(commandPath);
          
          // FIX: Check if command has data property properly
          if (command.data && typeof command.data.name === 'string') {
            commands.set(command.data.name, command);
            console.log(`✅ Loaded command: ${command.data.name} (${category})`);
          } else {
            console.log(`❌ Invalid command structure in ${file}: missing data or data.name`);
          }
        } catch (error) {
          console.error(`❌ Error loading command ${file}:`, error.message);
        }
      }
    }

    console.log(`✅ Loaded ${commands.size} commands across ${commandCategories.length} categories`);
  } catch (error) {
    console.error('❌ Error loading commands:', error);
  }
}

function getCommands() {
  // FIX: Return the actual command data objects, not just the data property
  return Array.from(commands.values()).map(cmd => cmd.data.toJSON ? cmd.data.toJSON() : cmd.data);
}

function executeCommand(interaction) {
  const command = commands.get(interaction.commandName);
  if (!command) {
    console.log(`❌ Command not found: ${interaction.commandName}`);
    return false;
  }

  try {
    command.execute(interaction);
    return true;
  } catch (error) {
    console.error(`Error executing command ${interaction.commandName}:`, error);
    if (interaction.replied || interaction.deferred) {
      interaction.followUp({ content: 'There was an error executing this command!', ephemeral: true });
    } else {
      interaction.reply({ content: 'There was an error executing this command!', ephemeral: true });
    }
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
