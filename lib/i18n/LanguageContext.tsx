'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { translations, type Language, type Translations } from './translations'

interface LanguageContextValue {
  lang: Language
  t: Translations
  toggleLang: () => void
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

const STORAGE_KEY = 'collaboard-language'

function getInitialLang(): Language {
  if (typeof window === 'undefined') return 'zh'
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'en' || stored === 'zh') return stored
  // Detect browser language
  const browserLang = navigator.language.toLowerCase()
  if (browserLang.startsWith('zh')) return 'zh'
  return 'en'
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>('zh')

  useEffect(() => {
    setLang(getInitialLang())
  }, [])

  const toggleLang = useCallback(() => {
    setLang((prev) => {
      const next = prev === 'zh' ? 'en' : 'zh'
      localStorage.setItem(STORAGE_KEY, next)
      return next
    })
  }, [])

  return (
    <LanguageContext.Provider value={{ lang, t: translations[lang], toggleLang }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }
  return ctx
}
