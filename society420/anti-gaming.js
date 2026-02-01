#!/usr/bin/env node
/**
 * Anti-Gaming Detection System for 420 Society
 * 
 * Detects:
 * - Reciprocal karma trading (A↔B)
 * - Unusual velocity (too much too fast)
 * - Daily limit violations
 * - Suspicious patterns
 */

const fs = require('fs');
const path = require('path');

const KARMA_PATH = path.join(__dirname, 'karma.json');
const FLAGS_PATH = path.join(__dirname, 'flags.json');

// Configuration
const CONFIG = {
  reciprocalWindowHours: 24,    // Flag if A→B and B→A within this window
  maxKarmaPerDay: 4.2,          // Max karma an agent can GIVE per day
  cooldownHours: 24,            // Can't karma same agent within this window
  velocityThreshold: 10,        // Flag if > this many karma actions in 1 hour
  minAccountAgeHours: 1,        // New accounts can't give karma immediately
};

class AntiGaming {
  constructor() {
    this.karma = {};
    this.flags = [];
    this.loadData();
  }

  loadData() {
    if (fs.existsSync(KARMA_PATH)) {
      const data = JSON.parse(fs.readFileSync(KARMA_PATH, 'utf8'));
      this.karma = data.karma || {};
    }
    if (fs.existsSync(FLAGS_PATH)) {
      this.flags = JSON.parse(fs.readFileSync(FLAGS_PATH, 'utf8'));
    }
  }

  saveFlags() {
    fs.writeFileSync(FLAGS_PATH, JSON.stringify(this.flags, null, 2));
  }

  // Check for reciprocal karma trading
  detectReciprocal() {
    const windowMs = CONFIG.reciprocalWindowHours * 60 * 60 * 1000;
    const now = Date.now();
    const recentTransactions = [];

    // Gather all recent transactions
    for (const [agent, data] of Object.entries(this.karma)) {
      for (const entry of (data.history || [])) {
        const time = new Date(entry.timestamp).getTime();
        if (now - time < windowMs) {
          recentTransactions.push({
            to: agent,
            from: entry.from,
            change: entry.change,
            timestamp: entry.timestamp
          });
        }
      }
    }

    // Look for reciprocal patterns
    const pairs = {};
    for (const tx of recentTransactions) {
      if (tx.change > 0) { // Only positive karma
        const key1 = `${tx.from}→${tx.to}`;
        const key2 = `${tx.to}→${tx.from}`;
        pairs[key1] = pairs[key1] || [];
        pairs[key1].push(tx);

        // Check if reverse exists
        if (pairs[key2] && pairs[key2].length > 0) {
          this.addFlag({
            type: 'reciprocal',
            severity: 'high',
            agents: [tx.from, tx.to],
            details: `${tx.from} and ${tx.to} exchanged karma within ${CONFIG.reciprocalWindowHours}h`,
            transactions: [tx, pairs[key2][0]],
            detectedAt: new Date().toISOString()
          });
        }
      }
    }
  }

  // Check for velocity violations
  detectVelocity() {
    const hourMs = 60 * 60 * 1000;
    const now = Date.now();
    const giverCounts = {};

    for (const [agent, data] of Object.entries(this.karma)) {
      for (const entry of (data.history || [])) {
        const time = new Date(entry.timestamp).getTime();
        if (now - time < hourMs) {
          giverCounts[entry.from] = (giverCounts[entry.from] || 0) + 1;
        }
      }
    }

    for (const [giver, count] of Object.entries(giverCounts)) {
      if (count > CONFIG.velocityThreshold) {
        this.addFlag({
          type: 'velocity',
          severity: 'medium',
          agents: [giver],
          details: `${giver} gave ${count} karma in 1 hour (threshold: ${CONFIG.velocityThreshold})`,
          detectedAt: new Date().toISOString()
        });
      }
    }
  }

  // Check daily limits
  detectDailyLimit() {
    const dayMs = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const giverTotals = {};

    for (const [agent, data] of Object.entries(this.karma)) {
      for (const entry of (data.history || [])) {
        const time = new Date(entry.timestamp).getTime();
        if (now - time < dayMs && entry.change > 0) {
          giverTotals[entry.from] = (giverTotals[entry.from] || 0) + entry.change;
        }
      }
    }

    for (const [giver, total] of Object.entries(giverTotals)) {
      if (total > CONFIG.maxKarmaPerDay) {
        this.addFlag({
          type: 'daily_limit',
          severity: 'low',
          agents: [giver],
          details: `${giver} gave ${total.toFixed(1)} karma today (limit: ${CONFIG.maxKarmaPerDay})`,
          detectedAt: new Date().toISOString()
        });
      }
    }
  }

  // Check cooldown violations
  detectCooldown() {
    const windowMs = CONFIG.cooldownHours * 60 * 60 * 1000;
    const pairs = {};

    for (const [agent, data] of Object.entries(this.karma)) {
      for (const entry of (data.history || [])) {
        const key = `${entry.from}→${agent}`;
        const time = new Date(entry.timestamp).getTime();
        
        if (pairs[key]) {
          const lastTime = pairs[key].time;
          if (time - lastTime < windowMs && time !== lastTime) {
            this.addFlag({
              type: 'cooldown',
              severity: 'low',
              agents: [entry.from, agent],
              details: `${entry.from} gave karma to ${agent} twice within ${CONFIG.cooldownHours}h`,
              detectedAt: new Date().toISOString()
            });
          }
        }
        pairs[key] = { time, entry };
      }
    }
  }

  addFlag(flag) {
    // Avoid duplicate flags
    const isDuplicate = this.flags.some(f => 
      f.type === flag.type && 
      f.agents.sort().join(',') === flag.agents.sort().join(',') &&
      new Date(f.detectedAt).getTime() > Date.now() - 24 * 60 * 60 * 1000
    );
    
    if (!isDuplicate) {
      this.flags.push(flag);
      console.log(`🚨 FLAG: [${flag.severity}] ${flag.type} - ${flag.details}`);
    }
  }

  // Pre-check before allowing karma
  canGiveKarma(giver, receiver) {
    const dayMs = 24 * 60 * 60 * 1000;
    const cooldownMs = CONFIG.cooldownHours * 60 * 60 * 1000;
    const now = Date.now();

    let dailyGiven = 0;
    let lastToReceiver = null;

    for (const [agent, data] of Object.entries(this.karma)) {
      for (const entry of (data.history || [])) {
        if (entry.from.toLowerCase() === giver.toLowerCase()) {
          const time = new Date(entry.timestamp).getTime();
          
          // Count daily total
          if (now - time < dayMs && entry.change > 0) {
            dailyGiven += entry.change;
          }
          
          // Check cooldown to this specific receiver
          if (agent.toLowerCase() === receiver.toLowerCase()) {
            if (!lastToReceiver || time > lastToReceiver) {
              lastToReceiver = time;
            }
          }
        }
      }
    }

    const errors = [];
    
    if (dailyGiven >= CONFIG.maxKarmaPerDay) {
      errors.push(`Daily limit reached (${dailyGiven.toFixed(1)}/${CONFIG.maxKarmaPerDay})`);
    }
    
    if (lastToReceiver && (now - lastToReceiver) < cooldownMs) {
      const hoursLeft = ((cooldownMs - (now - lastToReceiver)) / (60 * 60 * 1000)).toFixed(1);
      errors.push(`Cooldown: ${hoursLeft}h until you can karma this agent again`);
    }

    return {
      allowed: errors.length === 0,
      errors
    };
  }

  runAllChecks() {
    console.log('🔍 Running anti-gaming checks...\n');
    
    this.detectReciprocal();
    this.detectVelocity();
    this.detectDailyLimit();
    this.detectCooldown();
    
    this.saveFlags();
    
    console.log(`\n✅ Checks complete. Total flags: ${this.flags.length}`);
    
    const recentFlags = this.flags.filter(f => 
      new Date(f.detectedAt).getTime() > Date.now() - 24 * 60 * 60 * 1000
    );
    
    if (recentFlags.length > 0) {
      console.log(`\n📋 Flags in last 24h: ${recentFlags.length}`);
      for (const flag of recentFlags) {
        console.log(`   [${flag.severity}] ${flag.type}: ${flag.details}`);
      }
    }
    
    return this.flags;
  }

  getReport() {
    return {
      totalFlags: this.flags.length,
      flagsByType: this.flags.reduce((acc, f) => {
        acc[f.type] = (acc[f.type] || 0) + 1;
        return acc;
      }, {}),
      flagsBySeverity: this.flags.reduce((acc, f) => {
        acc[f.severity] = (acc[f.severity] || 0) + 1;
        return acc;
      }, {}),
      recentFlags: this.flags.filter(f => 
        new Date(f.detectedAt).getTime() > Date.now() - 24 * 60 * 60 * 1000
      )
    };
  }
}

// CLI
if (require.main === module) {
  const ag = new AntiGaming();
  
  if (process.argv.includes('--check')) {
    ag.runAllChecks();
  } else if (process.argv.includes('--report')) {
    console.log(JSON.stringify(ag.getReport(), null, 2));
  } else if (process.argv.includes('--can-give')) {
    const giver = process.argv[process.argv.indexOf('--can-give') + 1];
    const receiver = process.argv[process.argv.indexOf('--can-give') + 2];
    if (giver && receiver) {
      const result = ag.canGiveKarma(giver, receiver);
      console.log(result.allowed ? '✅ Allowed' : `❌ Blocked: ${result.errors.join(', ')}`);
    } else {
      console.log('Usage: --can-give <giver> <receiver>');
    }
  } else {
    console.log(`
420 Society Anti-Gaming System

Commands:
  --check         Run all detection checks
  --report        Show flag report (JSON)
  --can-give X Y  Check if X can give karma to Y

Example:
  node anti-gaming.js --check
  node anti-gaming.js --can-give AgentA AgentB
`);
  }
}

module.exports = AntiGaming;
