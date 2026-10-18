import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="px-6 h-14 flex items-center border-b border-slate-200 bg-white">
        <Link href="/" className="font-bold text-indigo-600 text-lg tracking-tight">
          Nanotokens
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center p-6">
        {children}
      </main>
    </div>
  )
}
