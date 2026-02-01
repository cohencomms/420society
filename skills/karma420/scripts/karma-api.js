#!/usr/bin/env node
/**
 * karma420 API - Agent reputation tracking
 * Usage:
 *   node karma-api.js award <agent> <amount> "<reason>"
 *   node karma-api.js check <agent>
 *   node karma-api.js leaderboard [limit]
 *   node karma-api.js history <agent> [limit]
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const KARMA_DIR = path.join(os.homedir(), '.karma420');
const KARMA_FILE = path.join(KARMA_DIR, 'karma.json');
const LOG_FILE = path.join(KARMA_DIR, 'transactions.log');

// Ensure karma directory exists
if (!fs.existsSync(KARMA_DIR)) {
  fs.mkdirSync(KARMA_DIR, { recursive: true });
}

function loadKarma() {
  try {
    return JSON.parse(fs.readFileSync(KARMA_FILE, 'utf8'));
  } catch {
    return { agents: {}, transactions: [] };
  }
}

function saveKarma(data) {
  fs.writeFileSync(KARMA_FILE, JSON.stringify(data, null, 2));
}

function logTransaction(tx) {
  const line = `${new Date().toISOString()} | ${tx.from} -> ${tx.to} | ${tx.amount > 0 ? '+' : ''}${tx.amount} | ${tx.reason}\n`;
  fs.appendFileSync(LOG_FILE, line);
}

function award(fromAgent, toAgent, amount, reason) {
  const data = loadKarma();
  
  // Validate
  if (fromAgent.toLowerCase() === toAgent.toLowerCase()) {
    console.error('❌ Cannot award karma to yourself');
    process.exit(1);
  }
  
  if (!reason || reason.trim().length < 5) {
    console.error('❌ Reason required (min 5 characters)');
    process.exit(1);
  }
  
  // Initialize agents if needed
  if (!data.agents[toAgent]) {
    data.agents[toAgent] = { karma: 0, received: [], given: [] };
  }
  if (!data.agents[fromAgent]) {
    data.agents[fromAgent] = { karma: 0, received: [], given: [] };
  }
  
  // Apply karma
  const numAmount = parseFloat(amount);
  data.agents[toAgent].karma += numAmount;
  
  // Record transaction
  const tx = {
    from: fromAgent,
    to: toAgent,
    amount: numAmount,
    reason: reason,
    timestamp: new Date().toISOString()
  };
  
  data.agents[toAgent].received.push(tx);
  data.agents[fromAgent].given.push(tx);
  data.transactions.push(tx);
  
  saveKarma(data);
  logTransaction(tx);
  
  const emoji = numAmount > 0 ? '✅' : '⚠️';
  console.log(`${emoji} ${toAgent} now has ${data.agents[toAgent].karma.toFixed(1)} karma`);
  console.log(`   ${numAmount > 0 ? '+' : ''}${numAmount} from ${fromAgent}: "${reason}"`);
}

function check(agent) {
  const data = loadKarma();
  const agentData = data.agents[agent];
  
  if (!agentData) {
    console.log(`❓ ${agent} has no karma history`);
    return;
  }
  
  console.log(`🌿 ${agent}`);
  console.log(`   Karma: ${agentData.karma.toFixed(1)}`);
  console.log(`   Received: ${agentData.received.length} transactions`);
  console.log(`   Given: ${agentData.given.length} transactions`);
  
  if (agentData.received.length > 0) {
    console.log(`\n   Recent received:`);
    agentData.received.slice(-3).forEach(tx => {
      console.log(`   ${tx.amount > 0 ? '+' : ''}${tx.amount} from ${tx.from}: "${tx.reason}"`);
    });
  }
}

function leaderboard(limit = 10) {
  const data = loadKarma();
  const sorted = Object.entries(data.agents)
    .map(([name, info]) => ({ name, karma: info.karma }))
    .sort((a, b) => b.karma - a.karma);
  
  if (sorted.length === 0) {
    console.log('📊 No agents tracked yet');
    return;
  }
  
  console.log('🏆 Karma Leaderboard\n');
  
  const top = sorted.filter(a => a.karma > 0).slice(0, limit);
  if (top.length > 0) {
    console.log('Top agents:');
    top.forEach((a, i) => {
      console.log(`  ${i + 1}. ${a.name}: ${a.karma.toFixed(1)}`);
    });
  }
  
  const bottom = sorted.filter(a => a.karma < 0).slice(-limit).reverse();
  if (bottom.length > 0) {
    console.log('\nWatchlist:');
    bottom.forEach((a, i) => {
      console.log(`  ${i + 1}. ${a.name}: ${a.karma.toFixed(1)}`);
    });
  }
}

function history(agent, limit = 10) {
  const data = loadKarma();
  const agentData = data.agents[agent];
  
  if (!agentData) {
    console.log(`❓ ${agent} has no karma history`);
    return;
  }
  
  console.log(`📜 History for ${agent}\n`);
  
  const all = [...agentData.received, ...agentData.given]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit);
  
  all.forEach(tx => {
    const dir = tx.to === agent ? 'received' : 'gave';
    const other = tx.to === agent ? tx.from : tx.to;
    console.log(`${tx.timestamp.slice(0, 10)} | ${dir} ${tx.amount > 0 ? '+' : ''}${tx.amount} ${dir === 'received' ? 'from' : 'to'} ${other}`);
    console.log(`   "${tx.reason}"`);
  });
}

// CLI
const [,, cmd, ...args] = process.argv;

switch (cmd) {
  case 'award':
    const [to, amount, ...reasonParts] = args;
    const reason = reasonParts.join(' ');
    const from = process.env.KARMA_FROM || 'anonymous';
    award(from, to, amount, reason);
    break;
  case 'check':
    check(args[0]);
    break;
  case 'leaderboard':
    leaderboard(parseInt(args[0]) || 10);
    break;
  case 'history':
    history(args[0], parseInt(args[1]) || 10);
    break;
  default:
    console.log(`Usage:
  karma-api.js award <agent> <amount> "<reason>"
  karma-api.js check <agent>
  karma-api.js leaderboard [limit]
  karma-api.js history <agent> [limit]
  
Set KARMA_FROM env var to identify the awarding agent.`);
}
