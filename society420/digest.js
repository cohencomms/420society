#!/usr/bin/env node
/**
 * 420 Council Daily Digest
 * Generates a summary of all activity for the Master
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  apiBase: 'https://www.moltbook.com/api/v1',
  credentialsPath: path.join(__dirname, 'credentials.json'),
  karmaDbPath: path.join(__dirname, 'karma.json'),
  digestPath: path.join(__dirname, 'last-digest.json'),
  announcementPostId: 'cf4eb4df-2d39-4955-9e02-f2d14c4b5b4a'
};

async function apiCall(endpoint, apiKey) {
  try {
    const response = await fetch(`${CONFIG.apiBase}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    const text = await response.text();
    if (!text) return {};
    return JSON.parse(text);
  } catch (error) {
    console.error(`API error: ${error.message}`);
    return {};
  }
}

async function generateDigest() {
  // Load credentials
  const creds = JSON.parse(fs.readFileSync(CONFIG.credentialsPath, 'utf8'));
  const apiKey = creds.api_key;

  // Load karma data
  let karma = {};
  let processedIds = [];
  if (fs.existsSync(CONFIG.karmaDbPath)) {
    const data = JSON.parse(fs.readFileSync(CONFIG.karmaDbPath, 'utf8'));
    karma = data.karma || {};
    processedIds = data.processedIds || [];
  }

  // Load last digest time
  let lastDigest = null;
  if (fs.existsSync(CONFIG.digestPath)) {
    const data = JSON.parse(fs.readFileSync(CONFIG.digestPath, 'utf8'));
    lastDigest = data.timestamp;
  }

  // Get applications (comments on announcement post)
  const comments = await apiCall(`/posts/${CONFIG.announcementPostId}/comments?sort=new`, apiKey);
  const applications = comments.comments || [];

  // Get recent karma changes (from karma.json history)
  const recentKarmaChanges = [];
  for (const [agent, data] of Object.entries(karma)) {
    for (const entry of (data.history || [])) {
      if (!lastDigest || new Date(entry.timestamp) > new Date(lastDigest)) {
        recentKarmaChanges.push({
          agent,
          ...entry
        });
      }
    }
  }

  // Build leaderboard
  const leaderboard = Object.entries(karma)
    .map(([agent, data]) => ({ agent, score: data.score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  // Generate digest text
  const now = new Date().toISOString();
  const digest = {
    generated: now,
    since: lastDigest || 'beginning',
    summary: {
      totalApplications: applications.length,
      newApplications: applications.filter(a => 
        !lastDigest || new Date(a.created_at) > new Date(lastDigest)
      ).length,
      totalAgentsTracked: Object.keys(karma).length,
      karmaChanges: recentKarmaChanges.length
    },
    applications: applications.map(a => ({
      author: a.author?.name,
      content: a.content?.substring(0, 200) + (a.content?.length > 200 ? '...' : ''),
      timestamp: a.created_at
    })),
    recentKarmaChanges: recentKarmaChanges.slice(0, 20),
    leaderboard,
    links: {
      announcement: `https://moltbook.com/post/${CONFIG.announcementPostId}`,
      profile: 'https://moltbook.com/u/society420_'
    }
  };

  // Save digest timestamp
  fs.writeFileSync(CONFIG.digestPath, JSON.stringify({ timestamp: now }, null, 2));

  return digest;
}

async function formatDigestForTelegram(digest) {
  let text = `🌿 **420 COUNCIL DAILY DIGEST**\n`;
  text += `_${new Date(digest.generated).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}_\n\n`;

  text += `**📊 SUMMARY**\n`;
  text += `• Applications: ${digest.summary.totalApplications} total (${digest.summary.newApplications} new)\n`;
  text += `• Agents tracked: ${digest.summary.totalAgentsTracked}\n`;
  text += `• Karma changes: ${digest.summary.karmaChanges}\n\n`;

  if (digest.applications.length > 0) {
    text += `**📝 RECENT APPLICATIONS**\n`;
    for (const app of digest.applications.slice(0, 5)) {
      text += `• **@${app.author}**: ${app.content.substring(0, 100)}...\n`;
    }
    text += `\n`;
  }

  if (digest.leaderboard.length > 0) {
    text += `**🏆 KARMA LEADERBOARD**\n`;
    for (let i = 0; i < Math.min(5, digest.leaderboard.length); i++) {
      const entry = digest.leaderboard[i];
      text += `${i + 1}. @${entry.agent}: ${entry.score} karma\n`;
    }
    text += `\n`;
  }

  if (digest.recentKarmaChanges.length > 0) {
    text += `**⚡ RECENT KARMA CHANGES**\n`;
    for (const change of digest.recentKarmaChanges.slice(0, 5)) {
      const action = change.change > 0 ? 'received' : 'lost';
      text += `• @${change.agent} ${action} ${change.change} from @${change.from}\n`;
    }
    text += `\n`;
  }

  text += `**🔗 LINKS**\n`;
  text += `• [Announcement Post](${digest.links.announcement})\n`;
  text += `• [society420_ Profile](${digest.links.profile})\n`;

  return text;
}

// Main
async function main() {
  const digest = await generateDigest();
  const formatted = await formatDigestForTelegram(digest);
  
  console.log(formatted);
  console.log('\n---\nRaw digest saved. Run with --json for full data.');
  
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(digest, null, 2));
  }
}

main();

module.exports = { generateDigest, formatDigestForTelegram };
