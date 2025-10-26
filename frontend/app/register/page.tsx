'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!fullName.trim()) {
      setError('Пожалуйста, введите ФИО')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/register`,
        { full_name: fullName.trim() }
      )

      if (response.data.status === 'ok' && response.data.message === 'allowed') {
        // Сохраняем имя пользователя в localStorage
        localStorage.setItem('candidateName', fullName.trim())
        // Перенаправляем на страницу чата
        router.push('/chat')
      } else {
        setError('Вы не включены в список кандидатов')
      }
    } catch (error: any) {
      if (error.response?.data?.message === 'forbidden') {
        setError('Вы не включены в список кандидатов')
      } else {
        setError('Произошла ошибка при регистрации')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            DeepInterview
          </h1>
          <p className="text-lg text-gray-600">
            Регистрация кандидата
          </p>
        </div>

        {/* Registration Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                ФИО
              </label>
              <input
                type="text"
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Введите ваше полное имя"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200"
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-red-700 text-sm">{error}</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Проверка...
                </>
              ) : (
                'Начать интервью'
              )}
            </button>
          </form>

          {/* Back to Home */}
          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors duration-200"
            >
              ← Вернуться на главную
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Для прохождения интервью необходимо быть в списке кандидатов</p>
        </div>
      </div>
    </div>
  )
}
