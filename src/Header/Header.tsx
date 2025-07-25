// src/components/Header.tsx
import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserCircle, faBars, faPlus } from "@fortawesome/free-solid-svg-icons";
import { supabase } from "../supporto/supabaseClient";
import MiniTaskCreatorModal from "../Task-Creazione/MiniTaskCreatorModal";
import AggiungiCliente from "../Clienti";

type HeaderProps = {
    onToggleSidebar: () => void;
    loggedIn: boolean;
};

export default function Header({ loggedIn, onToggleSidebar }: HeaderProps) {
    const [open, setOpen] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [showClientModal, setShowClientModal] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const createRef = useRef<HTMLDivElement>(null);
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
            if (createRef.current && !createRef.current.contains(e.target as Node)) {
                setCreateOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <>
            <header className="w-full bg-white shadow-md z-50 relative px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onToggleSidebar}
                        className="text-gray-600 hover:text-black focus:outline-none"
                        title="Apri Menu"
                    >
                        <FontAwesomeIcon icon={faBars} size="lg" />
                    </button>


                    <div className="flex items-center gap-8">
                        <div className="text-xl font-bold text-gray-800 tracking-wide"><img className="h-auto max-w-[50%]" src="../public/kalimero_logo.png" ></img></div>
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

                <div className="flex items-center gap-4">
                    {/* Bottone Crea */}
                    <div className="relative" ref={createRef}>
                        <button
                            className="text-gray-600 hover:text-green-600 transition duration-200"
                            title="Crea"
                            onClick={() => setCreateOpen((prev) => !prev)}
                        >
                            <FontAwesomeIcon icon={faPlus} size="lg" />
                        </button>

                        {createOpen && (
                            <div className="absolute right-0 mt-2 w-40 bg-white border rounded-lg shadow-lg p-2 z-50">
                                <button
                                    onClick={() => {
                                        setCreateOpen(false)
                                        setShowTaskModal(true)
                                    }}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                                >
                                    Attività
                                </button>
                                <button
                                    onClick={() => {
                                        setCreateOpen(false)
                                        setShowClientModal(true)
                                    }}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                                >
                                    Clienti
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Bottone Account */}
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
                </div>
            </header>

            {/* Modale per creare attività */}
            {showTaskModal && <MiniTaskCreatorModal onClose={() => setShowTaskModal(false)} />}
            {showClientModal && <AggiungiCliente onClose={() => setShowClientModal(false)} />}
        </>
    );
}
