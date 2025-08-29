import React from 'react';

type Props = {
  mostraCompletate: boolean;
  setMostraCompletate: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function ToggleCompletate({ mostraCompletate, setMostraCompletate }: Props) {
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">✅ Completate</span>
      <div
        role="button"
        aria-pressed={mostraCompletate}
        onClick={() => setMostraCompletate(v => !v)}
        className={`toggle-theme ${mostraCompletate ? 'active' : ''}`}
        title={mostraCompletate ? 'Mostra anche completate (clicca per nasconderle)' : 'Nascondi completate attivo (clicca per mostrarle)'}
      >
        <div className={`toggle-thumb ${mostraCompletate ? 'translate' : ''} ${isDark ? 'dark' : ''}`} />
      </div>
    </div>
  );
}
