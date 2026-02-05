import Link from 'next/link'

export default function Footer() {
    return (
        <footer className="w-full border-t border-t-foreground/10 p-8 flex justify-center text-center text-xs">
            <div className="flex flex-row gap-4 justify-center items-center whitespace-nowrap flex-wrap sm:flex-nowrap">
                <div className="font-semibold">Customer Support:</div>
                <div className="flex gap-4 items-center">
                    <a href="mailto:support@example.com" className="hover:underline">support@example.com</a>
                    <span className="hidden sm:inline">|</span>
                    <a href="tel:+1234567890" className="hover:underline">+1 (234) 567-890</a>
                </div>
            </div>
        </footer>
    )
}
