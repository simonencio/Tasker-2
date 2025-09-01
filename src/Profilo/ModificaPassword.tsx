// ModificaPassword.tsx
import { useState } from "react";
import { supabase } from "../supporto/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronUp, faEnvelope } from "@fortawesome/free-solid-svg-icons";
import "toaster-js/default.css";
import "../App.css";
import { useToast } from "../supporto/useToast";

export default function ModificaPassword() {
  const toast = useToast();
  const [aperto, setAperto] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleAperto = () => setAperto(!aperto);

  // 🔹 invio email reset già loggati
  const inviaResetLink = async () => {
    setLoading(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user?.email) {
        toast("Nessuna email trovata per l’utente", "error");
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        console.error("Errore resetPasswordForEmail:", error.message);
        toast("Errore nell’invio del link", "error");
      } else {
        toast(
          "Ti abbiamo inviato un’email con il link per resettare la password",
          "success"
        );
      }
    } catch (err) {
      toast("Errore durante la richiesta di reset", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-container max-w-xl mx-auto rounded-xl shadow p-4 space-y-4 mb-6">
      <button
        onClick={toggleAperto}
        className="w-full flex justify-between items-center text-theme font-semibold text-xl focus:outline-none"
      >
        <span>Modifica Password</span>
        <FontAwesomeIcon
          icon={aperto ? faChevronUp : faChevronDown}
          className="text-lg"
        />
      </button>

      {aperto && (
        <div className="mt-4">
          <button
            type="button"
            onClick={inviaResetLink}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
          >
            <FontAwesomeIcon icon={faEnvelope} />
            {loading ? "Invio..." : "Invia link reset"}
          </button>
        </div>
      )}
    </div>
  );
}
