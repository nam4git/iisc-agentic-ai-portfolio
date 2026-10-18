import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(amount)
}

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

export function calcBilledUsd(params: {
  inputTokens: number
  outputTokens: number
  cacheCreate: number
  cacheRead: number
  inputUsdM: number
  outputUsdM: number
  cacheCreateM: number
  cacheReadM: number
}): number {
  const { inputTokens, outputTokens, cacheCreate, cacheRead, inputUsdM, outputUsdM, cacheCreateM, cacheReadM } = params
  return (
    (inputTokens / 1_000_000) * inputUsdM +
    (outputTokens / 1_000_000) * outputUsdM +
    (cacheCreate / 1_000_000) * cacheCreateM +
    (cacheRead / 1_000_000) * cacheReadM
  )
}

export function cacheHitRate(cacheRead: number, inputTokens: number): number {
  if (inputTokens === 0) return 0
  return Math.min(100, (cacheRead / inputTokens) * 100)
}
