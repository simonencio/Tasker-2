// AppLayout.tsx
import Sidebar from '../Sidebar/Sidebar'
import Header from '../Header/Header'
import type { ReactNode } from 'react'
import { useState } from 'react'

export default function AppLayout({
    children,
    loggedIn,
}: {
    children: ReactNode;
    loggedIn: boolean;
}) {
    const [sidebarOpen, setSidebarOpen] = useState(false)

    return (
        <div className="min-h-screen flex flex-col">
            <Header onToggleSidebar={() => setSidebarOpen(prev => !prev)} loggedIn={loggedIn} />

            <div className="flex flex-1 relative">
                <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

                <main
                    className={`
                        flex-1 transition-all duration-300
                        ${sidebarOpen ? 'ml-60' : 'ml-0'} 
                    `}
                >
                    {children}
                </main>
            </div>
        </div>
    )
}
