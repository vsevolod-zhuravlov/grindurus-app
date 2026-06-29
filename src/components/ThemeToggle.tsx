import { useState, useEffect } from 'react'
import { readSoundEnabled, writeSoundEnabled } from '../utils/soundPreference'

type Theme = 'light' | 'dark'

function readSavedTheme(): Theme {
  const saved = localStorage.getItem('theme')
  if (saved === 'light' || saved === 'dark') return saved
  return 'dark'
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(readSavedTheme)
  const [soundEnabled, setSoundEnabled] = useState(readSoundEnabled)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    writeSoundEnabled(soundEnabled)
  }, [soundEnabled])

  return (
    <div className="theme-toggle">
      <button
        className="theme-toggle-btn"
        onClick={() => {
          setTheme((current) => (current === 'light' ? 'dark' : 'light'))
        }}
      >
        {theme === 'light' ? '☀️' : '🌑'}
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
          className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
          onClick={() => setTheme('dark')}
        >
          <span>🌑</span>
          <span>Dark</span>
        </button>
        <div className="theme-dropdown-divider" aria-hidden="true" />
        <button
          type="button"
          className={`theme-option theme-option--sound${soundEnabled ? ' is-on' : ''}`}
          onClick={() => setSoundEnabled((on) => !on)}
          aria-pressed={soundEnabled}
        >
          <span>{soundEnabled ? '🔊' : '🔇'}</span>
          <span>Sound: {soundEnabled ? 'ON' : 'OFF'}</span>
        </button>
      </div>
    </div>
  )
}
