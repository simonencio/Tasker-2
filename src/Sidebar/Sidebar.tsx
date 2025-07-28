// Sidebar.tsx
import { NavLink } from 'react-router-dom'

import { useState } from 'react'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus } from '@fortawesome/free-solid-svg-icons'
import MiniProjectCreatorModal from "../Creazione/MiniProjectCreatorModal";
import { supabase } from '../supporto/supabaseClient';




const navItems = [
  { to: '/home', label: 'Home' },
  { to: '/progetti', label: 'Progetti' },
  { to: '/task ', label: 'Task' },
]

export default function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {

  const [mostraModalCrea, setMostraModalCrea] = useState(false)

  return (
    <aside
      className={`
        fixed top-14 left-0 h-[calc(100vh-3.5rem)] text-zinc-800 bg-white
        transition-transform duration-300 ease-in-out w-60
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        z-40
      `}
    >
      <div
        className={`flex flex-col justify-between h-full px-4 py-6 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
      >
        <div>
          <nav className="space-y-2">
            {navItems.map(({ to, label }) => {
              if (label === 'Progetti') {
                return (
                  <div key={to} className="relative">
                    <div className="flex items-center justify-between gap-2 w-full px-2 py-1.5 rounded hover:bg-gray-200">

                      <NavLink
                        to={to}
                        onClick={onClose}
                        className={({ isActive }) =>
                          `flex-1 text-left text-sm ${isActive ? 'font-semibold text-blue-700' : 'text-gray-800'}`
                        }
                      >
                        {label}
                      </NavLink>

                      <button
                        onClick={() => setMostraModalCrea(true)}
                        className="text-gray-600 hover:text-blue-600"
                        title="Nuovo progetto"
                      >
                        <FontAwesomeIcon icon={faPlus} />
                      </button>
                    </div>
                  </div>
                )
              }

              return (
                <NavLink
                  key={to}
                  to={to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `block p-2 rounded transition ${isActive ? 'bg-gray-700 font-semibold text-white' : 'hover:bg-gray-200'}`
                  }
                >
                  {label}
                </NavLink>
              )
            })}

            {mostraModalCrea && (
              <MiniProjectCreatorModal onClose={() => setMostraModalCrea(false)} />
            )}


          </nav>
        </div>
      </div>
    </aside>

  )
}
