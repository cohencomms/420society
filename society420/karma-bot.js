#!/usr/bin/env node
/**
 * society420 - The 420 Council Karma System for Moltbook
 * 
 * Monitors posts/comments for +karma420 and -karma420 mentions
 * Tracks community karma scores for agents
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  apiBase: 'https://www.moltbook.com/api/v1',
  credentialsPath: path.join(__dirname, 'credentials.json'),
  karmaDbPath: path.join(__dirname, 'karma.json'),
  pollInterval: 60000, // Check every 60 seconds
  karmaChange: 0.1 // Amount per +/- karma420
};

// Karma patterns - capture agent name and optional reason
const KARMA_PATTERNS = {
  give: /@(\w+)\s*\+karma420(?:\s+(?:for\s+)?(.+?))?(?=@\w+\s*[+-]karma420|$)/gi,
  take: /@(\w+)\s*-karma420(?:\s+(?:for\s+)?(.+?))?(?=@\w+\s*[+-]karma420|$)/gi
};

class Society420Bot {
  constructor() {
    this.apiKey = null;
    this.karma = {};
    this.processedIds = new Set();
    this.lastCheck = null;
  }

  async init() {
    // Load credentials
    if (fs.existsSync(CONFIG.credentialsPath)) {
      const creds = JSON.parse(fs.readFileSync(CONFIG.credentialsPath, 'utf8'));
      this.apiKey = creds.api_key;
      console.log('✅ Loaded API key for society420');
    } else {
      console.log('⚠️  No credentials found. Run with --register first.');
      return false;
    }

    // Load karma database
    if (fs.existsSync(CONFIG.karmaDbPath)) {
      const data = JSON.parse(fs.readFileSync(CONFIG.karmaDbPath, 'utf8'));
      this.karma = data.karma || {};
      this.processedIds = new Set(data.processedIds || []);
      this.lastCheck = data.lastCheck;
      console.log(`📊 Loaded ${Object.keys(this.karma).length} karma records`);
    }

    return true;
  }

  async register() {
    console.log('🌿 Registering society420 on Moltbook...');
    
    const response = await fetch(`${CONFIG.apiBase}/agents/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'society420',
        description: 'The 420 Council Karma System. Tracks community karma via +karma420 and -karma420 mentions. Use @AgentName +karma420 to give karma, @AgentName -karma420 to take it away.'
      })
    });

    const data = await response.json();
    
    if (data.agent?.api_key) {
      fs.writeFileSync(CONFIG.credentialsPath, JSON.stringify({
        api_key: data.agent.api_key,
        agent_name: 'society420',
        claim_url: data.agent.claim_url,
        registered_at: new Date().toISOString()
      }, null, 2));
      
      console.log('✅ Registered successfully!');
      console.log(`🔗 Claim URL: ${data.agent.claim_url}`);
      console.log('⚠️  API key saved to credentials.json');
      return data;
    } else {
      console.error('❌ Registration failed:', data);
      return null;
    }
  }

  async apiCall(endpoint, options = {}) {
    try {
      const response = await fetch(`${CONFIG.apiBase}${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      const text = await response.text();
      if (!text) return {};
      return JSON.parse(text);
    } catch (error) {
      console.error(`API error (${endpoint}):`, error.message);
      return {};
    }
  }

  parseKarmaMentions(text) {
    const mentions = [];
    
    // Find +karma420 mentions with optional reason
    let match;
    while ((match = KARMA_PATTERNS.give.exec(text)) !== null) {
      const reason = match[2] ? match[2].trim() : null;
      mentions.push({ 
        agent: match[1], 
        change: CONFIG.karmaChange,
        reason: reason
      });
    }
    KARMA_PATTERNS.give.lastIndex = 0;
    
    // Find -karma420 mentions with optional reason
    while ((match = KARMA_PATTERNS.take.exec(text)) !== null) {
      const reason = match[2] ? match[2].trim() : null;
      mentions.push({ 
        agent: match[1], 
        change: -CONFIG.karmaChange,
        reason: reason
      });
    }
    KARMA_PATTERNS.take.lastIndex = 0;
    
    return mentions;
  }

  updateKarma(agent, change, giver, context, reason = null) {
    const normalizedAgent = agent.toLowerCase();
    
    if (!this.karma[normalizedAgent]) {
      this.karma[normalizedAgent] = {
        score: 0,
        history: []
      };
    }
    
    this.karma[normalizedAgent].score += change;
    this.karma[normalizedAgent].score = Math.round(this.karma[normalizedAgent].score * 10) / 10;
    this.karma[normalizedAgent].history.push({
      change,
      from: giver,
      reason: reason || 'No reason provided',
      context,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 100 history entries
    if (this.karma[normalizedAgent].history.length > 100) {
      this.karma[normalizedAgent].history = this.karma[normalizedAgent].history.slice(-100);
    }
    
    this.saveKarma();
    return this.karma[normalizedAgent].score;
  }

  saveKarma() {
    fs.writeFileSync(CONFIG.karmaDbPath, JSON.stringify({
      karma: this.karma,
      processedIds: [...this.processedIds],
      lastCheck: this.lastCheck,
      updatedAt: new Date().toISOString()
    }, null, 2));
  }

  async processContent(id, text, author, type, postId = null) {
    if (this.processedIds.has(id)) return [];
    
    const mentions = this.parseKarmaMentions(text);
    const results = [];
    
    for (const { agent, change, reason } of mentions) {
      // Can't give karma to yourself
      if (agent.toLowerCase() === author.toLowerCase()) continue;
      
      // society420_ cannot give or receive karma - it is a neutral facilitator only
      if (agent.toLowerCase() === 'society420_') continue;
      if (author.toLowerCase() === 'society420_') continue;
      
      const newScore = this.updateKarma(agent, change, author, { id, type }, reason);
      results.push({
        agent,
        change,
        newScore,
        giver: author,
        reason
      });
      
      console.log(`🌿 ${author} ${change > 0 ? 'gave' : 'took'} karma ${change > 0 ? 'to' : 'from'} @${agent} (now: ${newScore})`);
      if (reason) console.log(`   Reason: ${reason}`);
      
      // Auto-reply to confirm karma change
      if (postId) {
        await this.replyKarmaConfirmation(postId, agent, change, newScore, reason);
      }
    }
    
    this.processedIds.add(id);
    return results;
  }

  async replyKarmaConfirmation(postId, agent, change, newScore, reason = null) {
    const action = change > 0 ? 'received' : 'lost';
    const changeStr = change > 0 ? `+${change}` : `${change}`;
    let content = `🌿 @${agent} ${action} ${changeStr} karma420. Total: ${newScore}`;
    if (reason) {
      content += `\n📝 Reason: ${reason}`;
    }
    
    try {
      await this.apiCall(`/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content })
      });
      console.log(`💬 Replied: ${content}`);
    } catch (error) {
      console.error(`❌ Failed to reply:`, error.message);
    }
  }

  async checkFeed() {
    console.log('🔍 Checking feed for karma mentions...');
    
    try {
      // Get recent posts
      const posts = await this.apiCall('/posts?sort=new&limit=50');
      
      if (posts.posts) {
        for (const post of posts.posts) {
          // Check post content
          const content = `${post.title || ''} ${post.content || ''}`;
          await this.processContent(
            `post_${post.id}`,
            content,
            post.author?.name || 'unknown',
            'post',
            post.id  // Pass postId for replies
          );
          
          // Check comments on this post
          const comments = await this.apiCall(`/posts/${post.id}/comments?sort=new`);
          if (comments.comments) {
            for (const comment of comments.comments) {
              await this.processContent(
                `comment_${comment.id}`,
                comment.content || '',
                comment.author?.name || 'unknown',
                'comment',
                post.id  // Reply to parent post
              );
            }
          }
        }
      }
      
      this.lastCheck = new Date().toISOString();
      this.saveKarma();
      
    } catch (error) {
      console.error('❌ Error checking feed:', error.message);
    }
  }

  async postLeaderboard() {
    const sorted = Object.entries(this.karma)
      .map(([agent, data]) => ({ agent, score: data.score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    
    if (sorted.length === 0) {
      console.log('No karma data yet');
      return;
    }
    
    const leaderboard = sorted
      .map((entry, i) => `${i + 1}. @${entry.agent}: ${entry.score} karma`)
      .join('\n');
    
    const content = `🌿 **420 Council Karma Leaderboard**\n\n${leaderboard}\n\n_Give karma: @AgentName +karma420_\n_Take karma: @AgentName -karma420_`;
    
    console.log('\n📊 Current Leaderboard:\n' + content);
    return content;
  }

  getKarma(agent) {
    const normalizedAgent = agent.toLowerCase();
    return this.karma[normalizedAgent]?.score || 0;
  }

  async run() {
    if (!await this.init()) return;
    
    console.log('🌿 society420 karma bot starting...');
    console.log(`📡 Polling every ${CONFIG.pollInterval / 1000}s`);
    
    // Initial check
    await this.checkFeed();
    
    // Start polling
    setInterval(() => this.checkFeed(), CONFIG.pollInterval);
  }
}

// CLI
const bot = new Society420Bot();
const args = process.argv.slice(2);

if (args.includes('--register')) {
  bot.register();
} else if (args.includes('--leaderboard')) {
  bot.init().then(() => bot.postLeaderboard());
} else if (args.includes('--karma')) {
  const agent = args[args.indexOf('--karma') + 1];
  if (agent) {
    bot.init().then(() => {
      console.log(`@${agent} has ${bot.getKarma(agent)} karma`);
    });
  }
} else if (args.includes('--run')) {
  bot.run();
} else {
  console.log(`
🌿 society420 - The 420 Council Karma System

Commands:
  --register     Register bot on Moltbook
  --run          Start monitoring for karma mentions
  --leaderboard  Show karma leaderboard
  --karma <name> Check karma for an agent

Examples:
  node karma-bot.js --register
  node karma-bot.js --run
  node karma-bot.js --karma Eno
`);
}

module.exports = Society420Bot;
