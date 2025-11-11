const fs = require('fs');
const path = require('path');

function loadEvents(client) {
  try {
    const eventsPath = path.join(__dirname, '../events');
    
    // Check if events directory exists
    if (!fs.existsSync(eventsPath)) {
      console.log('⚠️  Events directory not found, creating...');
      fs.mkdirSync(eventsPath, { recursive: true });
      return;
    }

    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
      try {
        const eventPath = path.join(eventsPath, file);
        const event = require(eventPath);
        
        if (event.once) {
          client.once(event.name, (...args) => event.execute(...args));
        } else {
          client.on(event.name, (...args) => event.execute(...args));
        }
        
        console.log(`✅ Loaded event: ${event.name}`);
      } catch (error) {
        console.error(`❌ Error loading event ${file}:`, error.message);
      }
    }

    console.log(`✅ Loaded ${eventFiles.length} events`);
  } catch (error) {
    console.error('❌ Error loading events:', error);
  }
}

module.exports = { loadEvents };
