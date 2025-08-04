// src/componenti/IntestazioneProgetto.tsx
import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { isUtenteAdmin } from '../supporto/ruolo';

type Props = {
    id: string;
    soloMieTask: boolean;
    setSoloMieTask: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function IntestazioneProgetto({ id }: Props) {
    const navigate = useNavigate();
    const [, setIsAdmin] = useState(false);

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
        <div className="bg-theme px-6 py-4 flex items-center justify-between flex-wrap gap-4">
            {/* 🔙 Bottone torna indietro a sinistra */}
            <button
                onClick={() => navigate('/progetti')}
                title="Torna ai progetti"
                className="text-theme hover:text-blue-500"
            >
                <FontAwesomeIcon icon={faArrowLeft} className="icon-color w-5 h-5" />
            </button>

            {/* 🔗 Link Dashboard / Calendario a destra */}
            <div className="flex gap-4 sm:gap-6 items-center text-sm">
                {['Dashboard', 'Calendario'].map((label, i) => (
                    <NavLink
                        key={label}
                        to={`/progetti/${id}${i ? '/calendario' : ''}`}
                        end={i === 0}
                        className={({ isActive }) =>
                            `hover:text-blue-600 ${isActive ? 'text-blue-700 font-semibold' : 'text-theme'
                            }`
                        }
                    >
                        {label}
                    </NavLink>
                ))}
            </div>
        </div>
    );
}
