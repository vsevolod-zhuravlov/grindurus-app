import { useState, useEffect } from 'react'

type Theme = 'light' | 'dark' | 'system'

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme') as Theme
    return saved || 'system'
  })

  useEffect(() => {
    const applyTheme = (selectedTheme: Theme) => {
      let effectiveTheme: 'light' | 'dark' = 'dark'

      if (selectedTheme === 'system') {
        effectiveTheme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
      } else {
        effectiveTheme = selectedTheme
      }

      document.documentElement.setAttribute('data-theme', effectiveTheme)
      localStorage.setItem('theme', selectedTheme)
    }

    applyTheme(theme)

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: light)')
      const handleChange = () => applyTheme('system')
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [theme])

  return (
    <div className="theme-toggle">
      <button
        className="theme-toggle-btn"
        onClick={() => {
          const nextTheme = theme === 'light' ? 'system' : theme === 'system' ? 'dark' : 'light'
          setTheme(nextTheme)
        }}
      >
        {theme === 'light' ? '☀️' : theme === 'dark' ? '🌙' : '💻'}
      </button>
      <div className="theme-dropdown">
        <button
          className={`theme-option ${theme === 'light' ? 'active' : ''}`}
          onClick={() => setTheme('light')}
        >
          <span>☀️</span>
          <span>Light</span>
        </button>
        <button
          className={`theme-option ${theme === 'system' ? 'active' : ''}`}
          onClick={() => setTheme('system')}
        >
          <span>💻</span>
          <span>System</span>
        </button>
        <button
          className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
          onClick={() => setTheme('dark')}
        >
          <span>🌙</span>
          <span>Dark</span>
        </button>
      </div>
    </div>
  )
}
