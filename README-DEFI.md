# 🚀 Agent DeFi Intelligent

Un assistant IA spécialisé dans la recherche DeFi et crypto, alimenté par Claude d'Anthropic.

## 🎯 Qu'est-ce que cet agent fait pour vous ?

Votre assistant personnel pour:

- 📊 **Surveillance des prix** crypto en temps réel
- 💰 **Analyse des protocoles DeFi** (TVL, métriques)
- 📰 **Veille actualités** crypto et DeFi
- 📱 **Monitoring social** (Discord, Twitter, Telegram)
- 🎯 **Détection d'opportunités alpha** (airdrops, nouveaux protocoles)
- 📈 **Analyse du sentiment** de marché (Fear & Greed)

## ⚡ Démarrage rapide

### 1. Configuration

```bash
# 1. Cloner et installer
git clone <votre-repo>
npm install

# 2. Configurer Claude API
cp .env.example .env
# Éditez .env et ajoutez votre clé Anthropic:
# ANTHROPIC_API_KEY=sk-ant-api03-votre-clé
```

### 2. Obtenir une clé API Claude

1. Allez sur [console.anthropic.com](https://console.anthropic.com/)
2. Créez un compte (5$ de crédits gratuits)
3. Générez une clé API
4. Ajoutez-la dans votre fichier `.env`

### 3. Lancer l'agent

```bash
# Mode démonstration (exemples prédéfinis)
npm run defi:demo

# Mode interactif
npm run defi
```

## 🛠️ Exemples d'utilisation

### Questions que vous pouvez poser:

```
📊 "Quel est le prix actuel d'Ethereum et du Bitcoin?"

💰 "Quels sont les 5 meilleurs protocoles DeFi par TVL?"

📰 "Quelles sont les dernières actualités crypto importantes?"

🎯 "Recherche des opportunités alpha sur les réseaux sociaux"

📈 "Comment est le sentiment du marché aujourd'hui?"

🚀 "Y a-t-il des airdrops intéressants en cours?"

📊 "Compare les prix de Solana, Cardano et Polygon"
```

## 🔧 Outils disponibles

### 💰 Crypto & DeFi
- `get_crypto_price` - Prix et métriques des cryptos via CoinGecko
- `get_defi_tvl` - TVL des protocoles DeFi via DeFiLlama
- `get_crypto_news` - Actualités crypto récentes
- `get_market_sentiment` - Fear & Greed Index

### 📱 Monitoring social
- `monitor_discord` - Surveillance des serveurs Discord
- `monitor_twitter` - Recherche de tweets avec hashtags
- `monitor_telegram` - Monitoring des canaux Telegram
- `find_crypto_alpha` - Détection d'opportunités croisées

### 🔧 Utilitaires
- `calculator` - Calculs mathématiques
- `read_file` / `write_file` - Gestion de fichiers
- `get_timestamp` - Horodatage

## 📈 APIs utilisées (gratuites)

- **CoinGecko** - Prix et données crypto (pas de clé requise)
- **DeFiLlama** - TVL des protocoles DeFi (pas de clé requise)
- **Alternative.me** - Fear & Greed Index (pas de clé requise)

## 🔑 Configuration avancée (optionnel)

Pour le monitoring social complet, ajoutez dans `.env`:

```bash
# Discord Bot (optionnel)
DISCORD_BOT_TOKEN=votre_token_discord

# Twitter API (optionnel)
TWITTER_BEARER_TOKEN=votre_token_twitter

# Telegram Bot (optionnel)
TELEGRAM_BOT_TOKEN=votre_token_telegram
```

## 💡 Exemples de scénarios d'usage

### 🎯 Recherche d'opportunités alpha
```
Agent: "Recherche des opportunités alpha actuelles"

Réponse:
- LayerZero airdrop rumeur (confiance: 85%)
- Blast L2 early deposit (confiance: 72%)
- Pendle yield farming (confiance: 68%)
- Recommandations avec time-sensitive prioritisé
```

### 📊 Analyse de marché complète
```
Agent: "Donne-moi un aperçu complet du marché DeFi"

Réponse:
- Prix BTC/ETH avec variations 24h
- Top 5 protocoles DeFi par TVL
- Fear & Greed Index avec interprétation
- Actualités importantes du jour
- Opportunités détectées sur les réseaux
```

### 🚨 Surveillance de protocole
```
Agent: "Surveille Uniswap et Aave, alertes sur discussions importantes"

Réponse:
- Configuration monitoring Discord/Twitter
- Mots-clés: "uniswap v4", "aave governance", "liquidity"
- Alertes en temps réel sur activité suspecte
```

## 🧠 Comment ça marche ?

1. **Claude API** - Raisonnement intelligent et compréhension du contexte
2. **Outils spécialisés** - Récupération de données crypto/DeFi
3. **Mémoire persistante** - Historique des conversations
4. **Analyse croisée** - Corrélation des signaux sociaux

## 🛡️ Sécurité et limites

- ✅ **APIs publiques fiables** (CoinGecko, DeFiLlama)
- ✅ **Pas de trading automatique** (informatif seulement)
- ⚠️ **Toujours DYOR** (Do Your Own Research)
- ⚠️ **Vérifiez les informations** avant d'investir

## 🚀 Développement

### Structure du projet
```
src/
├── llm/claude-provider.ts      # Intégration Claude API
├── core/claude-agent.ts        # Agent intelligent principal
├── tools/defi-tools.ts         # Outils crypto/DeFi
├── tools/social-monitoring-tools.ts  # Outils réseaux sociaux
└── examples/defi-agent.ts      # Exemple d'utilisation
```

### Ajouter de nouveaux outils
```typescript
// 1. Créer votre outil
const monOutil: Tool = {
  name: 'mon_outil',
  description: 'Description de mon outil',
  parameters: [/* ... */],
  async execute(params) {
    // Votre logique ici
    return { success: true, data: {} };
  }
};

// 2. L'enregistrer
globalToolRegistry.register(monOutil);

// 3. L'ajouter à la config de l'agent
tools: ['mon_outil', /* ... */]
```

## 📞 Support

- 🐛 **Bugs** : Créez une issue GitHub
- 💡 **Idées** : Proposez des améliorations
- 📖 **Documentation** : Consultez `CLAUDE.md` pour plus de détails

---

**⚠️ Disclaimer**: Cet agent est à des fins éducatives et informatives. Ne constitue pas un conseil financier. Investissez responsablement.