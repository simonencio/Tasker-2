// Sidebar.tsx
import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/home', label: 'Home' },

]

export default function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
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
            {navItems.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={onClose}
                className={({ isActive }) =>
                  `block p-2 rounded transition ${isActive ? 'bg-gray-700 font-semibold text-white' : 'hover:bg-gray-200'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </aside>
  )
}
