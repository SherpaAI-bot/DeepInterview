'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

interface Message {
  id: number
  text: string
  isBot: boolean
  timestamp: Date
}

export default function ChatPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [fullName, setFullName] = useState('')
  const [isInterviewComplete, setIsInterviewComplete] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Получаем имя пользователя из localStorage или параметров URL
    const savedName = localStorage.getItem('candidateName')
    if (savedName) {
      setFullName(savedName)
      // Начинаем интервью
      startInterview(savedName)
    } else {
      router.push('/register')
    }
  }, [router])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const startInterview = async (name: string) => {
    setIsLoading(true)
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat`,
        { full_name: name, message: "Начать интервью" }
      )
      
      addMessage(response.data.bot_message, true)
      setProgress(response.data.progress)
    } catch (error) {
      addMessage("Произошла ошибка при запуске интервью. Попробуйте снова.", true)
    } finally {
      setIsLoading(false)
    }
  }

  const addMessage = (text: string, isBot: boolean) => {
    const newMessage: Message = {
      id: Date.now(),
      text,
      isBot,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, newMessage])
  }
  // --- Новый интеллектуальный помощник (уточняющие вопросы) ---
  const maybeAskFollowUp = async (currentQuestion: string, userAnswer: string) => {
    const tooShort = userAnswer.trim().length < 12
    const lacksNumber = !/\b\d+\b/.test(userAnswer)
    const needFollowUp =
      tooShort ||
      /сколько времени|в минутах|как часто|сесс/i.test(currentQuestion) && lacksNumber ||
      /как начинается процесс|первый шаг|инструменты|программы|критерий успешности/i.test(currentQuestion) && tooShort

    if (!needFollowUp) return null

    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/interview/ai-helper`, {
        question: currentQuestion,
        answer: userAnswer,
        context: {},
        step_counter: messages.filter(m => !m.isBot).length
      })
      return res.data
    } catch (e) {
      console.error("AI-helper error", e)
      return null
    }
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage = inputMessage.trim()
    addMessage(userMessage, false)
    setInputMessage('')
    setIsLoading(true)

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat`,
        { full_name: fullName, message: userMessage }
      )
      
      addMessage(response.data.bot_message, true)
      setProgress(response.data.progress)
            // --- Проверяем, нужен ли уточняющий вопрос ---
            const followUp = await maybeAskFollowUp(response.data.bot_message, userMessage)
            if (followUp && followUp.follow_up_question) {
              addMessage(followUp.motivation_phrase, true)
              addMessage(followUp.follow_up_question, true)
              setIsLoading(false)
              return
            }
      
      // Проверяем, завершено ли интервью
      if (response.data.progress === 100) {
        setIsInterviewComplete(true)
      }
    } catch (error) {
      addMessage("Произошла ошибка. Попробуйте снова.", true)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (isInterviewComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center px-4">
        <div className="max-w-2xl w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            
            <h2 className="text-3xl font-semibold text-gray-800 mb-4">
              Поздравляем!
            </h2>
            
            <p className="text-lg text-gray-600 mb-8">
              Ваше интервью завершено! Спасибо за участие!
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.push('/register')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
              >
                Пройти еще раз
              </button>
              
              <button
                onClick={() => router.push('/')}
                className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
              >
                На главную
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              DeepInterview
            </h1>
            <p className="text-gray-600">
              Интервью с {fullName}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Прогресс интервью</span>
              <span className="text-sm font-medium text-gray-700">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="bg-white rounded-lg shadow-lg h-96 overflow-y-auto p-4 mb-6">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p>Загружаем интервью...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.isBot
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-blue-600 text-white'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                      <p className={`text-xs mt-1 ${
                        message.isBot ? 'text-gray-500' : 'text-blue-100'
                      }`}>
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                        <span className="text-sm">Бот печатает...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Введите ваш ответ..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200"
              >
                Отправить
              </button>
            </div>
          </div>

          {/* Back Button */}
          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors duration-200"
            >
              ← Вернуться на главную
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
