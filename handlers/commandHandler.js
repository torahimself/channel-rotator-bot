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
          
          if (command.data && command.execute) {
            commands.set(command.data.name, {
              ...command,
              category: category
            });
            console.log(`✅ Loaded command: ${command.data.name} (${category})`);
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

// Public API for other modules to add commands
function registerCommand(commandName, commandData) {
  if (commands.has(commandName)) {
    console.log(`⚠️  Command ${commandName} already exists, overwriting...`);
  }
  commands.set(commandName, commandData);
  console.log(`✅ Registered external command: ${commandName}`);
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
  registerCommand, // NEW: For external modules
  commands,
  commandCategories
};
