import Link from 'next/link'
import { forgotPassword } from '../auth/actions'
import Footer from '@/components/Footer'

export default async function ForgotPassword({
    searchParams,
}: {
    searchParams: Promise<{ message: string }>
}) {
    const params = await searchParams
    return (
        <div className="flex-1 flex flex-col w-full px-4 sm:px-8 justify-center gap-2 mx-auto min-h-screen" style={{ backgroundImage: 'url(/login_background.jpeg)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
            <div className="absolute inset-0 bg-black/40"></div>
            <Link
                href="/login"
                className="absolute left-4 sm:left-8 top-4 sm:top-8 py-2 px-3 sm:px-4 rounded-md no-underline text-foreground bg-btn-background hover:bg-btn-background-hover flex items-center group text-xs sm:text-sm z-10"
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
                Back to Login
            </Link>

            <form className="animate-in flex-1 flex flex-col w-full sm:max-w-md mx-auto justify-center pt-24 gap-2 text-foreground relative z-10">
                <h1 className="text-2xl sm:text-4xl font-bold mb-4 sm:mb-6 text-center text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-teal-500">
                    Reset Password
                </h1>

                <p className="text-center text-sm text-gray-500 mb-4 sm:mb-6">
                    Enter your email address and we'll send you a link to reset your password.
                </p>

                <label className="text-sm sm:text-md text-center" htmlFor="email">
                    Email
                </label>
                <input
                    className="rounded-md px-3 sm:px-4 py-2 bg-inherit border mb-4 sm:mb-6 text-sm sm:text-base text-center"
                    name="email"
                    placeholder="you@example.com"
                    required
                />

                <button
                    formAction={forgotPassword}
                    className="bg-green-600 rounded-md px-3 sm:px-4 py-2 text-foreground hover:bg-green-700 mb-2 transition-colors duration-200 text-sm sm:text-base"
                >
                    Send Reset Link
                </button>

                {params?.message && (
                    <p className="mt-3 sm:mt-4 p-3 sm:p-4 bg-foreground/10 text-foreground text-center text-xs sm:text-sm">
                        {params.message}
                    </p>
                )}
            </form>

            <Footer />
        </div>
    )
}
