import Link from 'next/link'
import Footer from '@/components/Footer'
import Navbar from '@/components/Navbar'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

//   if (!user) redirect('/login')

  return (
      <div className="min-h-screen w-full" style={{ backgroundColor: '#ffffff' }}>
      <Navbar />

      <header className="w-full">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 min-h-[70vh]">
            <div className="flex items-center" style={{ backgroundColor: '#a17038' }}>
              <div className="p-8 sm:p-12 lg:p-16">
                  <h2 className="text-3xl sm:text-5xl font-extrabold mb-6" style={{ color: '#000000' }}>Lorem ipsum.</h2>
                  <p className="text-sm sm:text-base max-w-md mb-8" style={{ color: '#0f120f' }}>Discover and create literary projects with a beautiful, distraction-free workspace.</p>
                  <div className="flex items-center gap-4">
                    <Link href="/create" className="inline-flex items-center px-6 py-3 rounded-md text-sm font-semibold hover:opacity-95" style={{ backgroundColor: '#000000', color: '#ffffff' }}>Make New Project</Link>
                    <span className="text-sm" style={{ color: '#0c172e' }}>Signed in as <strong>{user?.email}</strong></span>
                  </div>
              </div>
            </div>

            <div className="hidden md:block bg-cover bg-center" style={{ backgroundImage: "url('/home_background.png')" }} />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <p className="text-center" style={{ color: '#6b7280' }}>Start a new project, explore collections, or continue where you left off.</p>
      </main>

      <Footer />
    </div>
  )
}
