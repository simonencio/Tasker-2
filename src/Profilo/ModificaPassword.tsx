// ModificaPassword.tsx
import { useState } from "react";
import { supabase } from "../supporto/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronUp } from "@fortawesome/free-solid-svg-icons";
import "toaster-js/default.css";
import "../App.css";
import { useToast } from '../supporto/useToast'

export default function ModificaPassword() {
  const toast = useToast();
  const [aperto, setAperto] = useState(false);
  const toggleAperto = () => setAperto(!aperto);

  const [password, setPassword] = useState("");

  const aggiornaPassword = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const { error: authError } = await supabase.auth.updateUser({ password });
    const { error: utentiError } = await supabase
      .from("utenti")
      .update({ ultima_modifica_password: new Date().toISOString() })
      .eq("id", user.id);

    if (authError || utentiError) {
      toast("Errore nel salvataggio", 'error');
    } else {
      toast("Password modificata con successo", 'success');
    }
  };

  return (
    <div className="modal-container max-w-xl mx-auto rounded-xl shadow p-4 space-y-4 mb-6">
      <button
        onClick={toggleAperto}
        className="w-full flex justify-between items-center text-theme font-semibold text-xl focus:outline-none"
      >
        <span>Modifica Password</span>
        <FontAwesomeIcon icon={aperto ? faChevronUp : faChevronDown} className="text-lg" />
      </button>

      {aperto && (
        <form autoComplete="off" onSubmit={aggiornaPassword}>
          {/* Honeypot anti-autofill */}
          <input
            type="text"
            name="username"
            tabIndex={-1}
            autoComplete="username"
            aria-hidden="true"
            style={{ position: "absolute", opacity: 0, height: 0, width: 0, pointerEvents: "none" }}
          />
          <input
            type="password"
            name="password"
            tabIndex={-1}
            autoComplete="current-password"
            aria-hidden="true"
            style={{ position: "absolute", opacity: 0, height: 0, width: 0, pointerEvents: "none" }}
          />

          <label className="block text-sm text-theme mb-1 mt-4">Nuova Password</label>
          <input
            type="password"
            className="input-style w-full"
            placeholder="Nuova password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            name="nuova_password" // nome non convenzionale
            spellCheck={false}
          />
          <button type="submit" className="mt-2 px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
            Aggiorna Password
          </button>
        </form>
      )}
    </div>
  );
}
