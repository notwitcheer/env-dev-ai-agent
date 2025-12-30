# 🚀 Intelligent DeFi Agent

An AI assistant specialized in DeFi and crypto research, powered by Anthropic's Claude.

## 🎯 What Does This Agent Do For You?

Your personal assistant for:

- 📊 **Real-time crypto price monitoring**
- 💰 **DeFi protocol analysis** (TVL, metrics)
- 📰 **Crypto and DeFi news monitoring**
- 📱 **Social monitoring** (Discord, Twitter, Telegram)
- 🎯 **Alpha opportunity detection** (airdrops, new protocols)
- 📈 **Market sentiment analysis** (Fear & Greed)

## ⚡ Quick Start

### 1. Setup

```bash
# 1. Clone and install
git clone <your-repo>
npm install

# 2. Configure Claude API
cp .env.example .env
# Edit .env and add your Anthropic key:
# ANTHROPIC_API_KEY=sk-ant-api03-your-key
```

### 2. Get Claude API Key

1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Create an account ($5 free credits)
3. Generate an API key
4. Add it to your `.env` file

### 3. Launch the Agent

```bash
# Demo mode (predefined examples)
npm run defi:demo

# Interactive mode
npm run defi
```

## 🛠️ Usage Examples

### Questions you can ask:

```
📊 "What's the current Ethereum and Bitcoin price?"

💰 "What are the top 5 DeFi protocols by TVL?"

📰 "What are the latest important crypto news?"

🎯 "Find alpha opportunities on social networks"

📈 "How's the market sentiment today?"

🚀 "Are there any interesting airdrops happening?"

📊 "Compare prices of Solana, Cardano and Polygon"
```

## 🔧 Available Tools

### 💰 Crypto & DeFi
- `get_crypto_price` - Crypto prices and metrics via CoinGecko
- `get_defi_tvl` - DeFi protocol TVL via DeFiLlama
- `get_crypto_news` - Recent crypto news
- `get_market_sentiment` - Fear & Greed Index

### 📱 Social Monitoring
- `monitor_discord` - Monitor Discord servers
- `monitor_twitter` - Search tweets with hashtags
- `monitor_telegram` - Monitor Telegram channels
- `find_crypto_alpha` - Cross-platform opportunity detection

### 🔧 Utilities
- `calculator` - Mathematical calculations
- `read_file` / `write_file` - File management
- `get_timestamp` - Timestamping

## 📈 APIs Used (Free)

- **CoinGecko** - Crypto prices and data (no key required)
- **DeFiLlama** - DeFi protocol TVL (no key required)
- **Alternative.me** - Fear & Greed Index (no key required)

## 🔑 Advanced Configuration (Optional)

For complete social monitoring, add to `.env`:

```bash
# Discord Bot (optional)
DISCORD_BOT_TOKEN=your_discord_token

# Twitter API (optional)
TWITTER_BEARER_TOKEN=your_twitter_token

# Telegram Bot (optional)
TELEGRAM_BOT_TOKEN=your_telegram_token
```

## 💡 Usage Scenario Examples

### 🎯 Alpha Opportunity Research
```
User: "Find current alpha opportunities"

Response:
- LayerZero airdrop rumors (confidence: 85%)
- Blast L2 early deposit (confidence: 72%)
- Pendle yield farming (confidence: 68%)
- Recommendations with time-sensitive prioritized
```

### 📊 Complete Market Analysis
```
User: "Give me a complete DeFi market overview"

Response:
- BTC/ETH prices with 24h changes
- Top 5 DeFi protocols by TVL
- Fear & Greed Index with interpretation
- Important news of the day
- Opportunities detected on social networks
```

### 🚨 Protocol Monitoring
```
User: "Monitor Uniswap and Aave, alert on important discussions"

Response:
- Configure Discord/Twitter monitoring
- Keywords: "uniswap v4", "aave governance", "liquidity"
- Real-time alerts on suspicious activity
```

## 🧠 How It Works

1. **Claude API** - Intelligent reasoning and context understanding
2. **Specialized Tools** - Crypto/DeFi data retrieval
3. **Persistent Memory** - Conversation history
4. **Cross-Analysis** - Social signal correlation

## 🛡️ Security and Limitations

- ✅ **Reliable public APIs** (CoinGecko, DeFiLlama)
- ✅ **No automatic trading** (informational only)
- ⚠️ **Always DYOR** (Do Your Own Research)
- ⚠️ **Verify information** before investing

## 🚀 Development

### Project Structure
```
src/
├── llm/claude-provider.ts      # Claude API integration
├── core/claude-agent.ts        # Main intelligent agent
├── tools/defi-tools.ts         # Crypto/DeFi tools
├── tools/social-monitoring-tools.ts  # Social network tools
└── examples/defi-agent.ts      # Usage example
```

### Adding New Tools
```typescript
// 1. Create your tool
const myTool: Tool = {
  name: 'my_tool',
  description: 'Description of my tool',
  parameters: [/* ... */],
  async execute(params) {
    // Your logic here
    return { success: true, data: {} };
  }
};

// 2. Register it
globalToolRegistry.register(myTool);

// 3. Add it to agent config
tools: ['my_tool', /* ... */]
```

## 📞 Support

- 🐛 **Bugs**: Create a GitHub issue
- 💡 **Ideas**: Propose improvements
- 📖 **Documentation**: Check `CLAUDE.md` for more details

---

**⚠️ Disclaimer**: This agent is for educational and informational purposes. Does not constitute financial advice. Invest responsibly.