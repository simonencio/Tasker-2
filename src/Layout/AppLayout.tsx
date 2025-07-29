// AppLayout.tsx
import { useState } from 'react'
import Sidebar from '../Sidebar/Sidebar'
import Header from '../Header/Header'
import MiniProjectCreatorModal from '../Creazione/MiniProjectCreatorModal'
import type { ReactNode } from 'react'

export default function AppLayout({
    children,
    loggedIn,
}: {
    children: ReactNode
    loggedIn: boolean
}) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [showProjectModal, setShowProjectModal] = useState(false)

    return (
        <>
            <div className="min-h-screen flex flex-col bg-theme text-theme">
                <Header
                    onToggleSidebar={() => setSidebarOpen(prev => !prev)}
                    loggedIn={loggedIn}
                />

                <div className="flex flex-1 relative">
                    <Sidebar
                        isOpen={sidebarOpen}
                        onClose={() => setSidebarOpen(false)}
                        onApriProjectModal={() => setShowProjectModal(true)} // 👈 callback
                    />

                    <main
                        className={`
              flex-1  transition-all duration-300
              ${sidebarOpen ? 'ml-60' : 'ml-0'}
            `}
                    >
                        {children}
                    </main>
                </div>
            </div>

            {showProjectModal && (
                <MiniProjectCreatorModal
                    onClose={() => setShowProjectModal(false)}
                    offsetIndex={0}
                />
            )}
        </>
    )
}
