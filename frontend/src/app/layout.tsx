import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ProjectProvider } from '@/context/ProjectContext'
import { AnnotationProvider } from '@/context/AnnotationContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Digital Literary Experience',
  description: 'A platform for literary enthusiasts',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ProjectProvider>
          <AnnotationProvider>
            <main className="min-h-screen flex flex-col">
              {children}
            </main>
          </AnnotationProvider>
        </ProjectProvider>
      </body>
    </html>
  )
}
