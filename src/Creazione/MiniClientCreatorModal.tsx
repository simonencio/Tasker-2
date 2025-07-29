import { useState } from "react";
import { supabase } from "../supporto/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEnvelope, faPhone, faImage, faXmark,
} from "@fortawesome/free-solid-svg-icons";

type Props = { onClose: () => void; offsetIndex?: number };
type PopupField = "email" | "telefono" | "avatar";

export default function MiniClientCreatorModal({ onClose, offsetIndex = 0 }: Props) {
  const [nome, setNome] = useState("");
  const [note, setNote] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [popupOpen, setPopupOpen] = useState<PopupField | null>(null);
  const [loading, setLoading] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const reset = () => {
    setNome(""); setNote(""); setEmail(""); setTelefono(""); setAvatarUrl("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrore(null); setSuccess(false); setLoading(true);

    if (!nome.trim()) {
      setErrore("Il nome del cliente è obbligatorio.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("clienti").insert({
      nome,
      note: note || null,
      email: email || null,
      telefono: telefono || null,
      avatar_url: avatarUrl || null,
    });

    if (error) {
      setErrore(error.message);
      setLoading(false);
      setTimeout(() => setErrore(null), 3000);
      return;
    }

    setSuccess(true);
    reset();
    setLoading(false);
    setTimeout(() => setSuccess(false), 3000);
  };

  const renderPopupContent = () => {
    if (!popupOpen) return null;
    const base = "w-full border rounded px-2 py-1 input-style";

    const popup = {
      email: <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={base} />,
      telefono: <input type="text" value={telefono} onChange={(e) => setTelefono(e.target.value)} className={base} />,
      avatar: <input type="text" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} className={base} />,
    };

    return (
      <div className="absolute bottom-10 left-0 rounded shadow-lg p-4 z-50 w-[300px] popup-panel">
        <div className="flex justify-between items-center mb-2">
          <strong className="capitalize text-theme">{popupOpen}</strong>
          <FontAwesomeIcon icon={faXmark} className="cursor-pointer icon-color" onClick={() => setPopupOpen(null)} />
        </div>
        {popup[popupOpen]}
      </div>
    );
  };

  const popupButtons = [
    { icon: faEnvelope, popup: "email", color: "text-blue-400", active: "text-blue-600" },
    { icon: faPhone, popup: "telefono", color: "text-green-400", active: "text-green-600" },
    { icon: faImage, popup: "avatar", color: "text-purple-400", active: "text-purple-600" },
  ] as const;

  return (
    <div
      className="fixed bottom-6 transition-all duration-300 w-[400px] rounded-xl shadow-xl p-5 modal-container"
      style={{ left: `${offsetIndex ? offsetIndex * 420 + 24 : 24}px`, zIndex: 100 + (offsetIndex || 0) }}
    >
      <button onClick={onClose} className="absolute top-4 right-4 text-red-600 text-2xl" title="Chiudi">
        <FontAwesomeIcon icon={faXmark} className="icon-color" />
      </button>

      <h2 className="text-xl font-semibold mb-4 text-center text-theme">Aggiungi Cliente</h2>

      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        <div>
          <label className="block mb-1 font-medium text-theme">Nome *</label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            className="w-full border rounded px-3 py-2 input-style"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium text-theme">Note</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="w-full border rounded px-3 py-2 resize-none input-style"
          />
        </div>

        {renderPopupContent()}

        <div className="relative h-4 mb-2">
          {errore && <div className="absolute w-full text-center text-red-600 text-sm">{errore}</div>}
          {success && <div className="absolute w-full text-center text-green-600 text-sm">✅ Cliente inserito</div>}
        </div>

        <div className="flex justify-between items-center pt-4">
          <div className="flex gap-4 text-lg">
            {popupButtons.map(({ icon, popup, color, active }) => (
              <button
                key={popup}
                type="button"
                onClick={() => setPopupOpen(popupOpen === popup ? null : popup)}
                className={`${popupOpen === popup ? active : color}`}
              >
                <FontAwesomeIcon icon={icon} />
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            {loading ? "Salvataggio..." : "Crea Cliente"}
          </button>
        </div>
      </form>
    </div>
  );
}
