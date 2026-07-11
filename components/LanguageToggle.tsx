'use client'

import { useLanguage } from '@/lib/i18n/LanguageContext'

export default function LanguageToggle() {
  const { lang, toggleLang } = useLanguage()
  const isZh = lang === 'zh'

  return (
    <button
      onClick={toggleLang}
      className={`relative w-14 h-7 rounded-full transition-all duration-200 ${
        isZh
          ? 'bg-gradient-to-r from-cyan-600 to-cyan-500'
          : 'bg-gradient-to-r from-indigo-600 to-purple-500'
      }`}
      title={isZh ? 'Switch to English' : '切换到中文'}
    >
      <div
        className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200 flex items-center justify-center text-xs font-bold ${
          isZh ? 'translate-x-0.5 text-cyan-700' : 'translate-x-7.5 text-indigo-700'
        }`}
      >
        {isZh ? '中' : 'EN'}
      </div>
    </button>
  )
}
