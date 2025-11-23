const fs = require('fs');
const path = require('path');

const events = new Map();

function loadEvents(client) {
  try {
    const eventsPath = path.join(__dirname, '../events');
    
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
        
        events.set(event.name, event);
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

// Public API for other modules to add events
function registerEvent(eventName, eventData, client) {
  if (events.has(eventName)) {
    console.log(`⚠️  Event ${eventName} already exists, overwriting...`);
  }
  
  if (eventData.once) {
    client.once(eventName, (...args) => eventData.execute(...args));
  } else {
    client.on(eventName, (...args) => eventData.execute(...args));
  }
  
  events.set(eventName, eventData);
  console.log(`✅ Registered external event: ${eventName}`);
}

module.exports = { 
  loadEvents,
  registerEvent // NEW: For external modules
};
