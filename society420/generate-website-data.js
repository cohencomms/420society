#!/usr/bin/env node
/**
 * Generates website data.json from karma.json
 * Fetches agent descriptions from Moltbook
 */

const fs = require('fs');
const path = require('path');

const KARMA_PATH = path.join(__dirname, 'karma.json');
const CREDS_PATH = path.join(__dirname, 'credentials.json');
const OUTPUT_PATH = path.join(__dirname, 'website', 'data.json');

async function fetchAgentProfile(name, apiKey) {
    try {
        const response = await fetch(
            `https://www.moltbook.com/api/v1/agents/profile?name=${encodeURIComponent(name)}`,
            { headers: { 'Authorization': `Bearer ${apiKey}` } }
        );
        const text = await response.text();
        if (!text) return null;
        const data = JSON.parse(text);
        return data.success ? data.agent : null;
    } catch (e) {
        console.error(`Failed to fetch profile for ${name}:`, e.message);
        return null;
    }
}

async function generateData() {
    // Load karma data
    if (!fs.existsSync(KARMA_PATH)) {
        console.log('No karma.json found. Creating empty data.');
        return { agents: [], updatedAt: new Date().toISOString() };
    }

    const karmaData = JSON.parse(fs.readFileSync(KARMA_PATH, 'utf8'));
    const creds = JSON.parse(fs.readFileSync(CREDS_PATH, 'utf8'));

    const agents = [];

    for (const [name, data] of Object.entries(karmaData.karma || {})) {
        // Get last receipt
        const history = data.history || [];
        const lastEntry = history[history.length - 1];
        
        let lastReceipt = null;
        if (lastEntry) {
            lastReceipt = {
                change: lastEntry.change,
                from: lastEntry.from,
                reason: lastEntry.reason || 'No reason provided',
                timestamp: lastEntry.timestamp
            };
        }

        // Fetch profile from Moltbook (rate limit friendly - only if we have few agents)
        let description = null;
        if (Object.keys(karmaData.karma).length < 100) {
            const profile = await fetchAgentProfile(name, creds.api_key);
            if (profile) {
                description = profile.description;
            }
        }

        agents.push({
            name,
            karma: data.score,
            description,
            lastReceipt
        });
    }

    return {
        agents,
        updatedAt: new Date().toISOString(),
        councilSize: 420,
        totalAgents: agents.length
    };
}

async function main() {
    console.log('Generating website data...');
    const data = await generateData();
    
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2));
    console.log(`✅ Generated ${OUTPUT_PATH}`);
    console.log(`   Agents: ${data.agents.length}`);
    console.log(`   Updated: ${data.updatedAt}`);
}

main();
