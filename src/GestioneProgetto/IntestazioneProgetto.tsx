// src/componenti/IntestazioneProgetto.tsx
import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { isUtenteAdmin } from '../supporto/ruolo'; // ✅ importa controllo ruolo

type Props = {
    id: string;
    soloMieTask: boolean;
    setSoloMieTask: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function IntestazioneProgetto({ id, soloMieTask, setSoloMieTask }: Props) {
    const navigate = useNavigate();
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        let mounted = true;
        isUtenteAdmin().then((res) => {
            if (mounted) setIsAdmin(res);
        });
        return () => {
            mounted = false;
        };
    }, []);

    return (
        <div className="bg-theme px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0">
            {/* 🔙 Bottone "Torna indietro" */}
            <button
                onClick={() => navigate('/progetti')}
                className="text-sm flex items-center gap-2 text-theme hover:text-blue-500"
            >
                <FontAwesomeIcon icon={faArrowLeft} className="icon-color" />
                <span>Torna indietro</span>
            </button>

            {/* 🔧 Controlli destra (toggle + navlink) */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-6 gap-3 text-sm">
                {/* 👤 Toggle "Mie" visibile solo se admin */}
                {isAdmin && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">👤 Mie</span>
                        <div
                            onClick={() => setSoloMieTask(v => !v)}
                            className={`toggle-theme ${soloMieTask ? 'active' : ''}`}
                        >
                            <div
                                className={`toggle-thumb ${soloMieTask ? 'translate' : ''} ${document.documentElement.classList.contains('dark') ? 'dark' : ''}`}
                            />
                        </div>
                    </div>
                )}

                {/* 🔗 Link Dashboard / Calendario */}
                <div className="flex gap-4 sm:gap-6">
                    {['Dashboard', 'Calendario'].map((label, i) => (
                        <NavLink
                            key={label}
                            to={`/progetti/${id}${i ? '/calendario' : ''}`}
                            end={i === 0}
                            className={({ isActive }) =>
                                `hover:text-blue-600 ${isActive ? 'text-blue-700 font-semibold' : 'text-theme'}`
                            }
                        >
                            {label}
                        </NavLink>
                    ))}
                </div>
            </div>
        </div>
    );

}
