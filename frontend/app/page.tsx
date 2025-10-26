'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

export default function Home() {
  const [apiStatus, setApiStatus] = useState<string>('Проверка...')
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/ping`)
        setApiStatus(response.data.status === 'ok' ? 'Работает' : 'Ошибка')
      } catch (error) {
        setApiStatus('Недоступен')
      } finally {
        setIsLoading(false)
      }
    }

    checkApiStatus()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              DeepInterview
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Платформа для проведения глубинных интервью сотрудников
            </p>
          </div>

          {/* Main Status Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            
            <h2 className="text-3xl font-semibold text-gray-800 mb-4">
              Система DeepInterview работает
            </h2>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-lg font-medium text-gray-700">Статус API:</span>
                <div className="flex items-center">
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  ) : (
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      apiStatus === 'Работает' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {apiStatus}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Frontend</h3>
                <p>Next.js приложение запущено</p>
                <p className="text-green-600">✓ Готово к работе</p>
              </div>
              
              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="font-semibold text-purple-900 mb-2">Backend API</h3>
                <p>FastAPI сервер активен</p>
                <p className={apiStatus === 'Работает' ? 'text-green-600' : 'text-red-600'}>
                  {apiStatus === 'Работает' ? '✓ Подключен' : '✗ Ошибка подключения'}
                </p>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h3 className="text-2xl font-semibold text-gray-800 mb-6">
              Возможности платформы
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-800 mb-2">Интервью сотрудников</h4>
                <p className="text-gray-600 text-sm">Проведение структурированных интервью</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-800 mb-2">Анализ данных</h4>
                <p className="text-gray-600 text-sm">Автоматический анализ результатов</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-800 mb-2">Отчеты</h4>
                <p className="text-gray-600 text-sm">Детальные отчеты по интервью</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push('/register')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-lg transition-colors duration-200 text-lg"
            >
              Начать интервью
            </button>
            <button
              onClick={() => router.push('/admin/login')}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 px-8 rounded-lg transition-colors duration-200 text-lg"
            >
              Админка
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
