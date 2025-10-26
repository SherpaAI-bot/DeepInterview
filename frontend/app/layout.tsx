import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'DeepInterview - Платформа для глубинных интервью',
  description: 'Система для проведения глубинных интервью сотрудников',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-gray-50">
        {children}
      </body>
    </html>
  )
}
