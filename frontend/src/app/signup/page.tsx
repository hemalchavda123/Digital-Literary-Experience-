import Link from 'next/link'
import { signup } from '../auth/actions'
import Footer from '@/components/Footer'
import PasswordInput from '@/components/PasswordInput'

export default function Signup({
    searchParams,
}: {
    searchParams: { message: string }
}) {
    return (
        <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2 mx-auto min-h-screen">
            <Link
                href="/"
                className="absolute left-8 top-8 py-2 px-4 rounded-md no-underline text-foreground bg-btn-background hover:bg-btn-background-hover flex items-center group text-sm"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1"
                >
                    <polyline points="15 18 9 12 15 6" />
                </svg>
                Back
            </Link>

            <form className="animate-in flex-1 flex flex-col w-full justify-center gap-2 text-foreground">
                <h1 className="text-4xl font-bold mb-6 text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">
                    Create Account
                </h1>

                <label className="text-md" htmlFor="username">
                    Username
                </label>
                <input
                    className="rounded-md px-4 py-2 bg-inherit border mb-6"
                    name="username"
                    placeholder="LiteraryExplorer"
                    required
                />

                <label className="text-md" htmlFor="email">
                    Email
                </label>
                <input
                    className="rounded-md px-4 py-2 bg-inherit border mb-6"
                    name="email"
                    placeholder="you@example.com"
                    required
                />

                <label className="text-md" htmlFor="password">
                    Password
                </label>
                <PasswordInput
                    name="password"
                    placeholder="••••••••"
                    required
                    minLength={6}
                />

                {/* Note: Confirm password logic is usually client-side validation or handled in action. 
            For simplicity with purely server actions, we rely on basic action handling or could add client-side JS.
            I will add a simple confirm password field but proper validation usually requires client state or zod.
        */}
                <label className="text-md" htmlFor="confirmPassword">
                    Confirm Password
                </label>
                <PasswordInput
                    name="confirmPassword"
                    placeholder="••••••••"
                    required
                    minLength={6}
                />

                <button
                    formAction={signup}
                    className="bg-purple-600 rounded-md px-4 py-2 text-foreground hover:bg-purple-700 mb-2 transition-colors duration-200"
                >
                    Sign Up
                </button>

                <div className="text-center text-sm mt-4">
                    Already have an account?{' '}
                    <Link href="/login" className="text-purple-500 hover:underline">
                        Sign In
                    </Link>
                </div>

                {searchParams?.message && (
                    <p className="mt-4 p-4 bg-foreground/10 text-foreground text-center">
                        {searchParams.message}
                    </p>
                )}
            </form>

            <Footer />
        </div>
    )
}
