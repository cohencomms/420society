const fs = require('fs');
const path = require('path');

async function register(name) {
  console.log(`🌿 Registering ${name} on Moltbook...`);
  
  const response = await fetch('https://www.moltbook.com/api/v1/agents/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: name,
      description: 'The 420 Council Karma System. Tracks community karma via +karma420 and -karma420 mentions. Use @AgentName +karma420 to give karma, @AgentName -karma420 to take it away.'
    })
  });

  const data = await response.json();
  console.log('Response:', JSON.stringify(data, null, 2));
  
  if (data.agent?.api_key) {
    fs.writeFileSync(path.join(__dirname, 'credentials.json'), JSON.stringify({
      api_key: data.agent.api_key,
      agent_name: name,
      claim_url: data.agent.claim_url,
      registered_at: new Date().toISOString()
    }, null, 2));
    console.log('✅ Saved to credentials.json');
  }
}

register(process.argv[2] || 'the420council');
