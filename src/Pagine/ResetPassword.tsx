import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supporto/supabaseClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

export default function ResetPassword() {
    const { userId } = useParams<{ userId: string }>();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (!userId) {
            setError("Nessun ID utente fornito.");
            return;
        }

        const fetchEmail = async () => {
            const { data, error } = await supabase
                .from('utenti')
                .select('email')
                .eq('id', userId)
                .single();

            if (error || !data) {
                setError('Utente non trovato o ID non valido.');
            } else {
                setEmail(data.email);
            }
        };

        fetchEmail();
    }, [userId]);

    useEffect(() => {
        if (success) {
            const timer = setTimeout(() => navigate('/', { replace: true }), 2000);
            return () => clearTimeout(timer);
        }
    }, [success, navigate]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        if (!password || !confirmPassword) {
            setError("Inserisci entrambe le password.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Le password non corrispondono.");
            return;
        }

        setLoading(true);

        const { error: updateError } = await supabase.auth.updateUser({ password });

        setLoading(false);

        if (updateError) {
            setError("Errore durante l'aggiornamento della password: " + updateError.message);
        } else {
            setSuccess(true);
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="max-w-md mx-auto bg-white dark:bg-[#2c3542] shadow-xl p-6 sm:p-8 rounded-xl space-y-4"
        >
            <h2 className="text-xl font-semibold text-center">Reset della Password</h2>

            {/* Email utente */}
            <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Email
                </label>
                <input
                    id="email"
                    type="email"
                    value={email}
                    readOnly
                    className="w-full p-2 border rounded-md bg-gray-100 text-gray-500"
                />
            </div>

            {/* Nuova Password */}
            <div className="relative">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Nuova Password
                </label>
                <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-2 border rounded-md pr-10 text-gray-600 dark:bg-[#1f2937]"
                    required
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-2 flex items-center text-gray-600"
                >
                    <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                </button>
            </div>

            {/* Conferma Password */}
            <div className="relative">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Conferma Password
                </label>
                <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full p-2 border rounded-md pr-10 text-gray-600 dark:bg-[#1f2937]"
                    required
                />
                <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-2 flex items-center text-gray-600"
                >
                    <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} />
                </button>
            </div>

            {/* Pulsante */}
            <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
            >
                {loading ? 'Reset in corso...' : 'Resetta Password'}
            </button>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            {success && <p className="text-green-500 text-sm text-center">Password aggiornata con successo!</p>}
        </form>
    );
}
