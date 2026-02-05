'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        return redirect(`/login?message=${encodeURIComponent(error.message)}`)
    }

    revalidatePath('/', 'layout')
    redirect('/')
}

export async function signup(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const username = formData.get('username') as string

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                username,
            },
        },
    })

    if (error) {
        return redirect(`/signup?message=${encodeURIComponent(error.message)}`)
    }

    revalidatePath('/', 'layout')

    return redirect(`/login?message=Check your email to confirm your account.`)
}

export async function forgotPassword(formData: FormData) {
    const supabase = await createClient()
    const email = formData.get('email') as string

    // We need the current origin to construct the redirect URL
    // In production this should be your production URL
    // For localhost we can try to grab it from headers or hardcode for dev
    const headersList = await import('next/headers').then(mod => mod.headers())
    const origin = headersList.get('origin') || 'http://localhost:3000'

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/callback?next=/update-password`,
    })

    if (error) {
        return redirect(`/forgot-password?message=${encodeURIComponent(error.message)}`)
    }

    return redirect(`/forgot-password?message=Password reset link sent to your email.`)
}
