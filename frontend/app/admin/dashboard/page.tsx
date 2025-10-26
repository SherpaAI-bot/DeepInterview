'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

interface CandidateStatus {
  id: number
  full_name: string
  processes: string
  interview_status: string
  progress_percent: number
  created_at: string
}

interface AdminStats {
  total_candidates: number
  completed_interviews: number
  in_progress_interviews: number
  not_started_interviews: number
}

interface AnalyticsData {
  full_name: string
  total_time_minutes: number
  estimated_cost_rub: number
  process_count: number
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [candidates, setCandidates] = useState<CandidateStatus[]>([])
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateStatus | null>(null)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('adminToken')
    if (!token) {
      router.push('/admin/login')
      return
    }

    loadDashboardData()
  }, [router])

  const loadDashboardData = async () => {
    const token = localStorage.getItem('adminToken')
    if (!token) return

    try {
      const [candidatesRes, statsRes, analyticsRes] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/analytics`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])

      setCandidates(candidatesRes.data)
      setStats(statsRes.data)
      setAnalytics(analyticsRes.data)
    } catch (error: any) {
      if (error.response?.status === 401) {
        localStorage.removeItem('adminToken')
        router.push('/admin/login')
      } else {
        setError('Ошибка загрузки данных')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    router.push('/admin/login')
  }

  const handleCsvUpload = async () => {
    if (!csvFile) return

    const token = localStorage.getItem('adminToken')
    if (!token) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', csvFile)

      await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      )

      setCsvFile(null)
      loadDashboardData() // Перезагружаем данные
    } catch (error) {
      setError('Ошибка загрузки CSV файла')
    } finally {
      setIsUploading(false)
    }
  }

  const handleExport = async () => {
    const token = localStorage.getItem('adminToken')
    if (!token) return

    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/export`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      )

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'candidates_export.csv')
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      setError('Ошибка экспорта данных')
    }
  }

  const handleGenerateReport = (candidate: CandidateStatus) => {
    setSelectedCandidate(candidate)
    setShowReportModal(true)
  }

  const handleDownloadReport = async (format: 'pdf' | 'excel') => {
    if (!selectedCandidate) return

    const token = localStorage.getItem('adminToken')
    if (!token) return

    setIsGeneratingReport(true)
    try {
      const endpoint = format === 'pdf' 
        ? `/api/admin/report/${selectedCandidate.id}`
        : `/api/admin/report_excel/${selectedCandidate.id}`

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}${endpoint}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      )

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `report_${selectedCandidate.full_name}_${format}.${format === 'pdf' ? 'pdf' : 'xlsx'}`)
      document.body.appendChild(link)
      link.click()
      link.remove()

      // Показываем уведомление об успехе
      setError('')
      setTimeout(() => {
        setShowReportModal(false)
        setSelectedCandidate(null)
      }, 1000)
    } catch (error) {
      setError('Ошибка генерации отчёта')
    } finally {
      setIsGeneratingReport(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'пройдено': return 'bg-green-100 text-green-800'
      case 'в процессе': return 'bg-yellow-100 text-yellow-800'
      case 'не начато': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">DeepInterview</h1>
              <p className="text-gray-600">Админская панель</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={loadDashboardData}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Обновить
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Всего кандидатов</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.total_candidates}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Завершено</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.completed_interviews}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">В процессе</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.in_progress_interviews}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Не начато</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.not_started_interviews}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Действия</h2>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
              />
              <button
                onClick={handleCsvUpload}
                disabled={!csvFile || isUploading}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                {isUploading ? 'Загрузка...' : 'Загрузить CSV'}
              </button>
            </div>
            <button
              onClick={handleExport}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              Экспортировать данные
            </button>
          </div>
        </div>

        {/* Analytics */}
        {analytics.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Метрики</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ФИО</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Общее время (мин)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Стоимость (₽)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Процессы</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analytics.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.full_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.total_time_minutes.toFixed(1)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.estimated_cost_rub.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.process_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Candidates Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Кандидаты</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ФИО</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Процессы</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Прогресс</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дата создания</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Отчёт</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {candidates.map((candidate) => (
                  <tr key={candidate.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{candidate.full_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{candidate.processes}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(candidate.interview_status)}`}>
                        {candidate.interview_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${candidate.progress_percent}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-500">{candidate.progress_percent}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(candidate.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => handleGenerateReport(candidate)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium"
                      >
                        📄 Отчёт
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Report Modal */}
        {showReportModal && selectedCandidate && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                  <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mt-2">Генерация отчёта</h3>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500">
                    Выберите формат отчёта для кандидата:<br />
                    <strong>{selectedCandidate.full_name}</strong>
                  </p>
                </div>
                <div className="flex justify-center space-x-4 mt-4">
                  <button
                    onClick={() => handleDownloadReport('pdf')}
                    disabled={isGeneratingReport}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center"
                  >
                    {isGeneratingReport ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Генерируется...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        Скачать PDF
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleDownloadReport('excel')}
                    disabled={isGeneratingReport}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center"
                  >
                    {isGeneratingReport ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Генерируется...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Скачать Excel
                      </>
                    )}
                  </button>
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => setShowReportModal(false)}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
