import '../styles/globals.css'
import { useEffect } from 'react'

export default function App({ Component, pageProps }) {
  // Restore saved theme before first paint
  useEffect(() => {
    const saved = localStorage.getItem('eq-theme') || 'light'
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

  return <Component {...pageProps} />
}
