import { useState, useEffect } from 'react'

export function useTheme() {
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    const saved = typeof localStorage !== 'undefined'
      ? (localStorage.getItem('eq-theme') || 'light')
      : 'light'
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

  function toggle() {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    try { localStorage.setItem('eq-theme', next) } catch {}
  }

  return { theme, toggle }
}

// For SVG charts — returns raw color values for current theme
export function useChartColors() {
  const [colors, setColors] = useState({
    fg2: '#4b5563', fg3: '#9ca3af', border: '#e5e7eb', bg: '#ffffff',
  })

  useEffect(() => {
    function read() {
      const s = getComputedStyle(document.documentElement)
      setColors({
        fg2:   s.getPropertyValue('--eq-fg2').trim()    || '#4b5563',
        fg3:   s.getPropertyValue('--eq-fg3').trim()    || '#9ca3af',
        border:s.getPropertyValue('--eq-border').trim() || '#e5e7eb',
        bg:    s.getPropertyValue('--eq-bg').trim()     || '#ffffff',
      })
    }
    read()
    const ob = new MutationObserver(read)
    ob.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => ob.disconnect()
  }, [])

  return colors
}
