import Link from 'next/link'
import Footer from '@/components/Footer'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const supabase = await createClient()

  // check if logged in
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const signOut = async () => {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    return redirect('/login')
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-20 items-center">
      <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
        <div className="w-full max-w-4xl flex justify-between items-center p-3 text-sm">
          <div className="font-bold text-xl">DLE</div>
          <div className="flex gap-4 items-center">
            {user ? (
              <div className="flex bg-slate-100 dark:bg-slate-900 rounded-md p-2 gap-4 items-center">
                <span>Hey, {user.email}!</span>
                <form action={signOut}>
                  <button className="py-2 px-4 rounded-md no-underline bg-btn-background hover:bg-btn-background-hover">
                    Logout
                  </button>
                </form>
              </div>
            ) : (
              <>
                <Link href="/login" className="py-2 px-3 flex rounded-md no-underline hover:bg-btn-background-hover">
                  Login
                </Link>
                <Link href="/signup" className="py-2 px-3 flex rounded-md no-underline bg-foreground text-background hover:bg-opacity-90">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <div className="animate-in flex-1 flex flex-col gap-20 opacity-0 max-w-4xl px-3">
        <main className="flex-1 flex flex-col gap-6 items-center justify-center">
          <h1 className="text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 p-2 text-center">
            Digital Literary Experience
          </h1>
          <p className="text-xl text-center text-muted-foreground max-w-lg">
            Immerse yourself in the world of literature. Connect, read, and share your stories with a global community.
          </p>
          {!user && (
            <div className="flex gap-4 mt-8">
              <Link
                href="/signup"
                className="px-8 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
              >
                Get Started
              </Link>
              <Link
                href="/login"
                className="px-8 py-3 rounded-lg border border-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                Sign In
              </Link>
            </div>
          )}
        </main>
      </div>

      <Footer />
    </div>
  )
}
