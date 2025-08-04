import { useEffect, useState } from 'react';
import { isUtenteAdmin } from '../supporto/ruolo';

type Props = {
    soloMieTask: boolean;
    setSoloMieTask: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function ToggleMie({ soloMieTask, setSoloMieTask }: Props) {
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

    if (!isAdmin) return null;

    return (
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
    );
}
