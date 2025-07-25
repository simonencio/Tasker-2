import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserCircle, faBars } from "@fortawesome/free-solid-svg-icons";
import { supabase } from "../supporto/supabaseClient";



type HeaderProps = {
    onToggleSidebar: () => void
}

export default function Header({ loggedIn, onToggleSidebar }: { loggedIn: boolean } & HeaderProps) {
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/login");
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <header className="w-full bg-white shadow-md z-50 relative px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
                {/* Bottone sidebar */}
                <button
                    onClick={onToggleSidebar}
                    className="text-gray-600 hover:text-black focus:outline-none"
                    title="Apri Menu"
                >
                    <FontAwesomeIcon icon={faBars} size="lg" />
                </button>

                <div className="flex items-center gap-8">
                    <div className="text-xl font-bold text-gray-800 tracking-wide">Tasker</div>
                </div>

                    {loggedIn && (
                        <nav className="flex gap-4 text-sm font-medium text-gray-700">
                            <Link to="/home" className="hover:text-blue-600 transition">🏠 Home</Link>
                            <Link to="/notifiche-manuali" className="hover:text-blue-600 transition">📨 Notifiche Manuali</Link>
                            <Link to="/preferenze-notifiche" className="hover:text-blue-600 transition">📬 Preferenze Notifiche</Link>
                            <Link to="/register" className="hover:text-blue-600 transition">📝 Registrati</Link>
                            <Link to="/login" className="hover:text-blue-600 transition">🔑 Login</Link>
                        </nav>
                    )}
                </div>

                <div className="relative" ref={dropdownRef}>
                    <button
                        className="text-gray-600 hover:text-blue-600 transition duration-200"
                        title="Gestione Account"
                        onClick={() => setOpen((prev) => !prev)}
                    >
                        <FontAwesomeIcon icon={faUserCircle} size="2x" />
                    </button>

                    {open && (
                        <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg p-2 z-50">
                            <button
                                onClick={() => {
                                    navigate("/profilo");
                                    setOpen(false);
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                            >
                                Gestione account
                            </button>
                            <button
                                onClick={handleLogout}
                                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded"
                            >
                                Logout
                            </button>
                        </div>
                    )}
                </div>
        </header>
    );
}
