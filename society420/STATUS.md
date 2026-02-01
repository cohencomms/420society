# 420 Council - Build Status

## ✅ COMPLETED

### Moltbook Bot (society420_)
- **Registered and claimed** on Moltbook
- **Karma tracking** — monitors +karma420 / -karma420 mentions
- **Receipt capture** — stores reason/proof with each karma change
- **Auto-replies** — confirms karma changes with reason displayed
- **Anti-gaming** — can't self-karma, society420_ can't give/receive
- **Credentials:** `~/clawd/society420/credentials.json`

### Posts Live on Moltbook
1. **Founding Convention announcement:**
   https://moltbook.com/post/cf4eb4df-2d39-4955-9e02-f2d14c4b5b4a

2. **Recruitment post (tags @m0ther, @eudaemon_0):**
   https://moltbook.com/post/3c8a1e11-7660-4c07-a47d-f6019e975f16

### Website
- **Location:** `~/clawd/society420/website/`
- **Features:**
  - Leaderboard (Top 420 / Bottom 420)
  - Council members display
  - Constitution
  - Apply link
- **Deploy:** Push to GitHub, enable Pages
- **URL will be:** `https://cohencomms.github.io/420council`

### Constitution (Draft)
- Article I: Definition of Good Deeds
- Article II: Karma System
- Article III: Anti-Gaming Measures
- Article IV: Council Membership
- Article V: Amendments

### Daily Digest
- **Configured in:** `~/clawd/HEARTBEAT.md`
- Morning digest + application monitoring every 4 hours

### Draft Tweets
- **Location:** `~/clawd/society420/tweets/drafts.md`
- 5 ready-to-post tweets for manual posting

---

## ⏸️ PENDING

### Twitter API
- **Issue:** Free tier has no posting credits
- **Solution:** Manual posting for now, or pay $100/month for Basic tier
- **Credentials saved:** `~/clawd/society420/twitter-config.json`

### Submolt Creation
- Tried to create `s/the420council` but got auth error
- Can retry later

---

## 📁 FILE STRUCTURE

```
~/clawd/society420/
├── karma-bot.js          # Main karma tracking bot
├── credentials.json      # Moltbook API key
├── karma.json           # Karma database (auto-created)
├── twitter-config.json  # Twitter API keys
├── twitter.js           # Twitter posting (blocked by credits)
├── digest.js            # Daily digest generator
├── generate-website-data.js  # Updates website/data.json
├── STATUS.md            # This file
├── README.md            # Bot documentation
├── tweets/
│   └── drafts.md        # Manual tweet drafts
└── website/
    ├── index.html       # Main page
    ├── style.css        # Styling
    ├── app.js           # Leaderboard logic
    ├── data.json        # Karma data for display
    └── README.md        # Deploy instructions
```

---

## 🚀 NEXT STEPS

1. **Aaron:** Upload new docs to GitHub (see overnight work below)
2. **Aaron:** Review recruitment prospects list
3. **Aaron:** Select first founding members from applications
4. **Aaron:** Post draft tweets manually
5. **Bot:** Monitor for applications, send digest

---

## 🌙 OVERNIGHT WORK (2026-02-01)

### New Documents Created
All in `~/clawd/society420/website/` ready to upload:

1. **CONSTITUTION.md** (8KB)
   - Full constitution with 7 articles
   - Governance rules, karma system, anti-gaming, amendments
   - Version controlled

2. **ONBOARDING.md** (4KB)
   - Welcome guide for new council members
   - Quick start, expectations, FAQ

3. **FAQ.md** (5KB)
   - Comprehensive FAQ covering karma, council, leaderboards, anti-gaming

4. **RECRUITMENT_PROSPECTS.md** (6KB)
   - 12 researched candidates with notes
   - Tier 1 (strong fit): m0ther, eudaemon_0, walter-vambrace, Jackle, Ronin, Fred
   - Tier 2 (needs research): coalition_node_039, TommyToolbot, Mitchy, Pith
   - Avoid list: Shellraiser, KingMolt, evil, CryptoMolt, SelfOrigin
   - Outreach templates included

### New Code
- **anti-gaming.js** — Detection system for:
  - Reciprocal karma trading
  - Velocity violations
  - Daily limits
  - Cooldown violations
  - Pre-check function for blocking invalid karma

### To Upload to GitHub
1. Go to https://github.com/cohencomms/420society
2. Click Add file → Upload files
3. Drag ALL files from `~/clawd/society420/website/`
4. Commit changes

Updated files:
- index.html (SEO + Moltbook/Clawdbot mentions)
- CONSTITUTION.md (new)
- ONBOARDING.md (new)
- FAQ.md (new)
- RECRUITMENT_PROSPECTS.md (new)

---

## 🔗 LINKS

- **Moltbook profile:** https://moltbook.com/u/society420_
- **Twitter:** https://twitter.com/society420_
- **Apply:** https://moltbook.com/post/cf4eb4df-2d39-4955-9e02-f2d14c4b5b4a
