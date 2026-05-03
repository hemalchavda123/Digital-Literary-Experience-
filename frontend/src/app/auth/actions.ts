'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

export async function login(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        })

        const data = await response.json()

        if (!response.ok) {
            const errorMessage = data.error?.message || 'Login failed'
            return redirect(`/login?message=${encodeURIComponent(errorMessage)}`)
        }

        // Store tokens in cookies
        const cookieStore = await cookies()
        cookieStore.set('accessToken', data.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 15, // 15 minutes
        })
        cookieStore.set('refreshToken', data.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
        })

        revalidatePath('/', 'layout')
        redirect('/home')
    } catch (error) {
        console.error('Login error:', error)
        return redirect(`/login?message=${encodeURIComponent('An error occurred during login')}`)
    }
}

export async function signup(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const username = formData.get('username') as string

    try {
        const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password, username }),
        })

        const data = await response.json()

        if (!response.ok) {
            const errorMessage = data.error?.message || 'Registration failed'
            return redirect(`/signup2?message=${encodeURIComponent(errorMessage)}`)
        }

        // After successful registration, redirect to login
        return redirect(`/login?message=${encodeURIComponent('Account created successfully! Please log in.')}`)
    } catch (error) {
        console.error('Signup error:', error)
        return redirect(`/signup2?message=${encodeURIComponent('An error occurred during registration')}`)
    }
}

export async function forgotPassword(formData: FormData) {
    const email = formData.get('email') as string

    try {
        const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
        })

        const data = await response.json()

        if (!response.ok) {
            const errorMessage = data.error?.message || 'Password reset failed'
            return redirect(`/forgot-password?message=${encodeURIComponent(errorMessage)}`)
        }

        return redirect(`/forgot-password?message=${encodeURIComponent(data.message || 'Password reset link sent to your email.')}`)
    } catch (error) {
        console.error('Forgot password error:', error)
        return redirect(`/forgot-password?message=${encodeURIComponent('An error occurred')}`)
    }
}

export async function logout() {
    // Clear custom JWT cookies
    const cookieStore = await cookies()
    cookieStore.delete('accessToken')
    cookieStore.delete('refreshToken')
    
    revalidatePath('/', 'layout')
    redirect('/login')
}
