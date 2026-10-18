import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: { default: 'Nanotokens', template: '%s | Nanotokens' },
  description: 'Track the true cost of your AI subscriptions. Monitor token spend, cache efficiency, and cost-per-task across Claude, OpenAI, Gemini, and more.',
  metadataBase: new URL('https://nanotoken.vercel.app'),
  openGraph: {
    title: 'Nanotokens — AI Token Economics Tracker',
    description: 'Token counts are not cost. Nanotokens tracks what you actually pay.',
    siteName: 'Nanotokens',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-white text-slate-900 antialiased">
        {children}
      </body>
    </html>
  )
}
