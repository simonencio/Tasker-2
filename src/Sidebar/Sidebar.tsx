// Sidebar.tsx
import { NavLink } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus } from '@fortawesome/free-solid-svg-icons'

const navItems = [
  { to: '/home', label: 'Home' },
  { to: '/progetti', label: 'Progetti', hasAddButton: true },
  { to: '/task', label: 'Task' },
]

type Props = {
  isOpen: boolean
  onClose: () => void
  onApriProjectModal: () => void
}

export default function Sidebar({ isOpen, onClose, onApriProjectModal }: Props) {
  return (
    <aside
      className={`
        fixed top-14 left-0 h-[calc(100vh-3.5rem)] w-60 z-40
        transition-transform duration-300 ease-in-out
        bg-theme text-theme border-r
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
    >
      <div className="flex flex-col justify-between h-full px-4 py-6">
        <nav className="space-y-2">
          {navItems.map(({ to, label, hasAddButton }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center justify-between gap-2 px-3 py-2 rounded transition font-medium group ${isActive
                  ? 'bg-blue-600 text-white dark:bg-blue-500'
                  : 'hover-bg-theme text-theme'
                }`
              }
            >
              <span className='text-lg'>{label}</span>

              {hasAddButton && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    onApriProjectModal()
                  }}
                  className="icon-color hover:text-blue-400 transition"
                  title="Nuovo progetto"
                >
                  <FontAwesomeIcon icon={faPlus} size='lg' />
                </button>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  )
}
