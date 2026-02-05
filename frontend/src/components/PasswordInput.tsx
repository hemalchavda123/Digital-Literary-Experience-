'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    className?: string
}

export default function PasswordInput({ className, ...props }: PasswordInputProps) {
    const [showPassword, setShowPassword] = useState(false)

    return (
        <div className="relative mb-6">
            <input
                type={showPassword ? 'text' : 'password'}
                className={`w-full rounded-md px-4 py-2 bg-inherit border pr-10 ${className}`}
                {...props}
            />
            <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
                {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                ) : (
                    <Eye className="h-4 w-4" />
                )}
            </button>
        </div>
    )
}
