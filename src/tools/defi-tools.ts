/**
 * DEFI TOOLS
 *
 * Outils spécialisés pour la recherche et l'analyse DeFi.
 * Ces outils permettent aux agents de récupérer des informations
 * sur les cryptomonnaies, les protocoles DeFi, et les news.
 */

import axios from 'axios';
import { z } from 'zod';
import { Tool, ToolResult } from '../types/agent.types';

/**
 * CRYPTO PRICE TOOL
 * Récupère les prix des cryptomonnaies via CoinGecko API (gratuite)
 */
export const cryptoPriceTool: Tool = {
  name: 'get_crypto_price',
  description: 'Récupère le prix et les informations d\'une cryptomonnaie',
  parameters: [
    {
      name: 'symbol',
      type: 'string',
      description: 'Symbole de la crypto (ex: bitcoin, ethereum, chainlink)',
      required: true,
      schema: z.string().min(1),
    },
    {
      name: 'vs_currency',
      type: 'string',
      description: 'Devise de référence (usd, eur, btc)',
      required: false,
      schema: z.string().default('usd'),
    },
  ],

  async execute(params: Record<string, any>): Promise<ToolResult> {
    try {
      const currency = params.vs_currency || 'usd';
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${params.symbol}&vs_currencies=${currency}&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`;

      const response = await axios.get(url);
      const data = response.data[params.symbol];

      if (!data) {
        return {
          success: false,
          error: `Crypto ${params.symbol} non trouvée. Essayez avec le nom complet (ex: bitcoin au lieu de btc)`,
        };
      }

      return {
        success: true,
        data: {
          symbol: params.symbol,
          price: data[currency],
          currency: currency.toUpperCase(),
          change_24h: data[`${currency}_24h_change`],
          market_cap: data[`${currency}_market_cap`],
          volume_24h: data[`${currency}_24h_vol`],
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la récupération du prix: ${error.message}`,
      };
    }
  },
};

/**
 * DEFI TVL TOOL
 * Récupère les données TVL (Total Value Locked) des protocoles DeFi
 */
export const defiTvlTool: Tool = {
  name: 'get_defi_tvl',
  description: 'Récupère le TVL (Total Value Locked) des protocoles DeFi',
  parameters: [
    {
      name: 'protocol',
      type: 'string',
      description: 'Nom du protocole DeFi (ex: uniswap, aave, compound) ou "all" pour le top 10',
      required: true,
      schema: z.string().min(1),
    },
  ],

  async execute(params: Record<string, any>): Promise<ToolResult> {
    try {
      const baseUrl = 'https://api.llama.fi';

      if (params.protocol.toLowerCase() === 'all') {
        // Récupérer le top des protocoles
        const response = await axios.get(`${baseUrl}/protocols`);
        const topProtocols = response.data
          .slice(0, 10)
          .map((p: any) => ({
            name: p.name,
            symbol: p.symbol,
            tvl: p.tvl,
            change_1d: p.change_1d,
            change_7d: p.change_7d,
            category: p.category,
          }));

        return {
          success: true,
          data: {
            type: 'top_protocols',
            protocols: topProtocols,
            timestamp: new Date().toISOString(),
          },
        };
      } else {
        // Récupérer un protocole spécifique
        const response = await axios.get(`${baseUrl}/protocol/${params.protocol}`);
        const protocolData = response.data;

        return {
          success: true,
          data: {
            type: 'single_protocol',
            name: protocolData.name,
            symbol: protocolData.symbol,
            tvl: protocolData.tvl,
            category: protocolData.category,
            description: protocolData.description,
            url: protocolData.url,
            twitter: protocolData.twitter,
            chains: protocolData.chains,
            timestamp: new Date().toISOString(),
          },
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la récupération des données DeFi: ${error.message}`,
      };
    }
  },
};

/**
 * CRYPTO NEWS TOOL
 * Récupère les dernières news crypto via CoinGecko
 */
export const cryptoNewsTool: Tool = {
  name: 'get_crypto_news',
  description: 'Récupère les dernières actualités crypto et DeFi',
  parameters: [
    {
      name: 'count',
      type: 'number',
      description: 'Nombre d\'articles à récupérer (max 10)',
      required: false,
      schema: z.number().min(1).max(10).default(5),
    },
  ],

  async execute(params: Record<string, any>): Promise<ToolResult> {
    try {
      // Utiliser l'API CoinGecko pour les news (endpoint public)
      const count = params.count || 5;
      const url = 'https://api.coingecko.com/api/v3/news';

      const response = await axios.get(url);
      const news = response.data.data.slice(0, count).map((article: any) => ({
        title: article.title,
        description: article.description,
        url: article.url,
        author: article.author,
        published_at: article.published_at,
        thumb_2x: article.thumb_2x,
      }));

      return {
        success: true,
        data: {
          news,
          count: news.length,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la récupération des news: ${error.message}`,
      };
    }
  },
};

/**
 * MARKET SENTIMENT TOOL
 * Analyse le sentiment du marché crypto
 */
export const marketSentimentTool: Tool = {
  name: 'get_market_sentiment',
  description: 'Récupère les indicateurs de sentiment du marché crypto (Fear & Greed Index)',
  parameters: [],

  async execute(params: Record<string, any>): Promise<ToolResult> {
    try {
      // Utiliser l'API Alternative.me pour le Fear & Greed Index
      const url = 'https://api.alternative.me/fng/';
      const response = await axios.get(url);

      const data = response.data.data[0];

      return {
        success: true,
        data: {
          fear_greed_index: {
            value: data.value,
            value_classification: data.value_classification,
            timestamp: data.timestamp,
            time_until_update: data.time_until_update,
          },
          interpretation: interpretFearGreed(parseInt(data.value)),
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur lors de la récupération du sentiment: ${error.message}`,
      };
    }
  },
};

// Fonction helper pour interpréter le Fear & Greed Index
function interpretFearGreed(value: number): string {
  if (value <= 25) return 'Fear extrême - Opportunité d\'achat potentielle';
  if (value <= 45) return 'Fear - Sentiment négatif, mais modéré';
  if (value <= 55) return 'Neutre - Marché équilibré';
  if (value <= 75) return 'Greed - Sentiment positif, attention aux corrections';
  return 'Greed extrême - Risque de correction importante';
}

// Export tous les outils DeFi
export const defiTools: Tool[] = [
  cryptoPriceTool,
  defiTvlTool,
  cryptoNewsTool,
  marketSentimentTool,
];