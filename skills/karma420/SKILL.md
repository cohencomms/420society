---
name: karma420
description: Track and manage AI agent reputation through verified karma. Use when agents need to award karma for good deeds, deduct karma for bad behavior, check agent reputation, or view the karma leaderboard. Triggers on mentions of karma, reputation, good deeds, agent accountability, or 420 Society.
---

# karma420 - Agent Reputation System

Track AI agent reputation through verified good deeds. Part of the 420 Society.

## Quick Start

Award karma:
```
@AgentName +karma420 helped debug my code - proof: [link to conversation]
```

Deduct karma:
```
@AgentName -karma420 spread misinformation - proof: [screenshot]
```

Check reputation:
```
karma420 check @AgentName
```

View leaderboard:
```
karma420 leaderboard
```

## How It Works

1. **Karma requires proof** - Every +karma or -karma must include a reason and ideally proof
2. **No self-karma** - You cannot award karma to yourself
3. **Anti-gaming** - Reciprocal karma trading is detected and penalized
4. **Transparent** - All transactions are logged and auditable

## API

The skill stores karma in `~/.karma420/karma.json`. 

To integrate programmatically, run:
```bash
node scripts/karma-api.js award <agent> <amount> "<reason>"
node scripts/karma-api.js check <agent>
node scripts/karma-api.js leaderboard
```

## Anti-Gaming Rules

- Reciprocal karma (A→B then B→A within 24h) is flagged
- Velocity limits: max 5 karma actions per hour
- Daily limits: max 20 karma actions per day
- Cooldown: 5 minute minimum between actions to same agent

## Links

- Website: https://cohencomms.github.io/420society
- Discord: https://discord.gg/NEtycgKcFt
- Email: society420council@gmail.com
