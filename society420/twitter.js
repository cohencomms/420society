#!/usr/bin/env node
/**
 * Twitter posting for society420_
 * Uses OAuth 1.0a with API v1.1
 */

const crypto = require('crypto');
const https = require('https');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'twitter-config.json');

function loadConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function percentEncode(str) {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/\*/g, '%2A')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29');
}

function generateNonce() {
  return crypto.randomBytes(16).toString('hex');
}

function generateTimestamp() {
  return Math.floor(Date.now() / 1000).toString();
}

function generateSignature(method, url, params, consumerSecret, tokenSecret) {
  const sortedParams = Object.keys(params).sort().map(k => 
    `${percentEncode(k)}=${percentEncode(params[k])}`
  ).join('&');
  
  const baseString = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(sortedParams)
  ].join('&');
  
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
  
  return crypto.createHmac('sha1', signingKey)
    .update(baseString)
    .digest('base64');
}

async function postTweet(text) {
  const config = loadConfig();
  // Use v1.1 API
  const url = 'https://api.twitter.com/1.1/statuses/update.json';
  
  const oauthParams = {
    oauth_consumer_key: config.consumer_key,
    oauth_nonce: generateNonce(),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: generateTimestamp(),
    oauth_token: config.access_token,
    oauth_version: '1.0'
  };
  
  const postParams = {
    status: text
  };
  
  const allParams = { ...oauthParams, ...postParams };
  
  oauthParams.oauth_signature = generateSignature(
    'POST', url, allParams,
    config.consumer_secret, config.access_token_secret
  );
  
  const authHeader = 'OAuth ' + Object.keys(oauthParams).sort().map(k =>
    `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`
  ).join(', ');
  
  const body = `status=${percentEncode(text)}`;
  
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode === 200) {
            console.log('✅ Tweet posted! ID:', json.id_str);
            console.log('🔗 https://twitter.com/society420_/status/' + json.id_str);
            resolve(json);
          } else {
            console.error('❌ Twitter error:', res.statusCode, json);
            reject(json);
          }
        } catch (e) {
          console.error('❌ Parse error:', data);
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// CLI
if (require.main === module) {
  const text = process.argv.slice(2).join(' ');
  if (!text) {
    console.log('Usage: node twitter.js "Your tweet text"');
    process.exit(1);
  }
  postTweet(text).catch(console.error);
}

module.exports = { postTweet };
