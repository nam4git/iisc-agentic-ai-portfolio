export interface ModelPricing {
  id: string
  name: string
  inputUsdM: number
  outputUsdM: number
  cacheCreateM: number
  cacheReadM: number
}

export interface PlatformCatalogue {
  slug: string
  label: string
  color: string
  models: ModelPricing[]
}

export const PRICING_CATALOGUE: PlatformCatalogue[] = [
  {
    slug: 'claude-chat',
    label: 'Claude Chat',
    color: '#c05621',
    models: [
      { id: 'claude-opus-5-5',   name: 'Claude Opus 5.5',   inputUsdM: 15,  outputUsdM: 75,  cacheCreateM: 18.75, cacheReadM: 1.50 },
      { id: 'claude-sonnet-5-5', name: 'Claude Sonnet 5.5', inputUsdM: 3,   outputUsdM: 15,  cacheCreateM: 3.75,  cacheReadM: 0.30 },
      { id: 'claude-haiku-5-5',  name: 'Claude Haiku 5.5',  inputUsdM: 0.8, outputUsdM: 4,   cacheCreateM: 1.00,  cacheReadM: 0.08 },
    ],
  },
  {
    slug: 'claude-code',
    label: 'Claude Code',
    color: '#a85218',
    models: [
      { id: 'claude-opus-5-5-cc',   name: 'Claude Opus 5.5',   inputUsdM: 15, outputUsdM: 75, cacheCreateM: 18.75, cacheReadM: 1.50 },
      { id: 'claude-sonnet-5-5-cc', name: 'Claude Sonnet 5.5', inputUsdM: 3,  outputUsdM: 15, cacheCreateM: 3.75,  cacheReadM: 0.30 },
    ],
  },
  {
    slug: 'openai-chat',
    label: 'OpenAI Chat',
    color: '#10a37f',
    models: [
      { id: 'gpt-4o',      name: 'GPT-4o',      inputUsdM: 2.5,  outputUsdM: 10,  cacheCreateM: 0, cacheReadM: 1.25  },
      { id: 'gpt-4o-mini', name: 'GPT-4o mini', inputUsdM: 0.15, outputUsdM: 0.6, cacheCreateM: 0, cacheReadM: 0.075 },
      { id: 'o3',          name: 'o3',           inputUsdM: 10,   outputUsdM: 40,  cacheCreateM: 0, cacheReadM: 2.5   },
    ],
  },
  {
    slug: 'openai-codex',
    label: 'OpenAI Codex',
    color: '#0d8f6f',
    models: [
      { id: 'codex-mini', name: 'Codex Mini', inputUsdM: 1.5, outputUsdM: 6, cacheCreateM: 0, cacheReadM: 0.375 },
    ],
  },
  {
    slug: 'gemini',
    label: 'Gemini',
    color: '#4285f4',
    models: [
      { id: 'gemini-2-5-pro',   name: 'Gemini 2.5 Pro',   inputUsdM: 3.5, outputUsdM: 10.5, cacheCreateM: 0, cacheReadM: 0.875 },
      { id: 'gemini-2-5-flash', name: 'Gemini 2.5 Flash', inputUsdM: 0.3, outputUsdM: 2.5,  cacheCreateM: 0, cacheReadM: 0.075 },
    ],
  },
  {
    slug: 'antigravity',
    label: 'Antigravity',
    color: '#7c3aed',
    models: [
      { id: 'ag-1', name: 'AG-1', inputUsdM: 2, outputUsdM: 8, cacheCreateM: 0, cacheReadM: 0.5 },
    ],
  },
]

export function getCatalogueBySlug(slug: string): PlatformCatalogue | undefined {
  return PRICING_CATALOGUE.find(p => p.slug === slug)
}

export function getModelById(modelId: string): ModelPricing | undefined {
  for (const platform of PRICING_CATALOGUE) {
    const model = platform.models.find(m => m.id === modelId)
    if (model) return model
  }
}
