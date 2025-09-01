// src/hooks/useToast.ts

import { useEffect } from 'react';
import { Toast } from 'toaster-js';

type ToastType = 'success' | 'error' | 'warning' | 'info';

let isObserverRegistered = false;
let toastCounter = 0;

const registerToastObserver = () => {
    if (isObserverRegistered) return;

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach((node) => {
                    if (node instanceof HTMLElement) {
                        // Cerca il toast più specificamente
                        const toast = node.classList?.contains('toast') ? node : node.querySelector?.('.toast');

                        if (toast instanceof HTMLElement && !toast.hasAttribute('data-styled')) {
                            // Marca come già processato per evitare duplicazioni
                            toast.setAttribute('data-styled', 'true');

                            const savedMessage = (window as any).lastToastMessage;
                            const savedType = (window as any).lastToastType;

                            if (savedMessage) {
                                // Pulisci completamente il contenuto esistente
                                toast.innerHTML = '';
                                toast.className = 'toast';

                                let icon = '';
                                let typeClass = '';

                                if (savedType === 'success') {
                                    icon = '<svg class="toast-icon toast-icon-success" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>';
                                    typeClass = 'success';
                                } else if (savedType === 'error') {
                                    icon = '<svg class="toast-icon toast-icon-error" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>';
                                    typeClass = 'error';
                                } else if (savedType === 'warning') {
                                    icon = '<svg class="toast-icon toast-icon-warning" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>';
                                    typeClass = 'warning';
                                } else {
                                    icon = '<svg class="toast-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path></svg>';
                                    typeClass = 'info';
                                }

                                // Applica la classe del tipo
                                toast.classList.add(typeClass);

                                // Crea il contenuto
                                toast.innerHTML = `
                                    <div class="toast-content">
                                        ${icon}
                                        <span class="toast-message">${savedMessage}</span>
                                    </div>
                                `;

                                // Rimuovi tutti gli stili inline che potrebbero interferire
                                toast.removeAttribute('style');

                                // Forza gli stili importanti
                                const styles = {
                                    position: 'fixed',
                                    bottom: '24px',
                                    right: '24px',
                                    left: 'auto',
                                    top: 'auto',
                                    transform: 'none',
                                    zIndex: '9999',
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '16px 20px',
                                    minWidth: '280px',
                                    maxWidth: '400px',
                                    backgroundColor: '#ffffff',
                                    color: '#1f2937',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '16px',
                                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                                    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                                    fontSize: '15px',
                                    fontWeight: '500',
                                    lineHeight: '1.4',
                                    visibility: 'visible',
                                    opacity: '1',
                                    pointerEvents: 'auto'
                                };

                                // Applica gli stili uno per uno
                                Object.entries(styles).forEach(([property, value]) => {
                                    toast.style.setProperty(property, value, 'important');
                                });

                                // Applica stili specifici per tipo
                                if (typeClass === 'success') {
                                    toast.style.setProperty('borderColor', '#10b981', 'important');
                                    toast.style.setProperty('color', '#065f46', 'important');
                                } else if (typeClass === 'error') {
                                    toast.style.setProperty('borderColor', '#ef4444', 'important');
                                    toast.style.setProperty('color', '#9f1239', 'important');
                                } else if (typeClass === 'warning') {
                                    toast.style.setProperty('borderColor', '#f59e0b', 'important');
                                    toast.style.setProperty('color', '#92400e', 'important');
                                } else if (typeClass === 'info') {
                                    toast.style.setProperty('borderColor', '#10b981', 'important');
                                    toast.style.setProperty('color', '#065f46', 'important');        // testo blu scuro leggibile
                                }

                                // Pulisci le variabili globali
                                delete (window as any).lastToastMessage;
                                delete (window as any).lastToastType;

                                // Auto-remove dopo 4 secondi
                                setTimeout(() => {
                                    if (toast && toast.parentNode) {
                                        toast.style.setProperty('opacity', '0', 'important');
                                        toast.style.setProperty('transform', 'translateX(100%)', 'important');
                                        setTimeout(() => {
                                            if (toast.parentNode) {
                                                toast.parentNode.removeChild(toast);
                                            }
                                        }, 300);
                                    }
                                }, 4000);
                            }
                        }
                    }
                });
            }
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    isObserverRegistered = true;
};

export const showToast = (message: string, type: ToastType = 'info') => {
    // Incrementa il counter per evitare conflitti
    toastCounter++;

    // Salva i dati per il MutationObserver
    (window as any).lastToastMessage = message;
    (window as any).lastToastType = type;

    // Usa sempre lo stesso tipo per toaster-js per evitare stili inconsistenti
    new Toast(message, Toast.TYPE_DONE, Toast.TIME_SHORT);
};

export const useToast = () => {
    useEffect(() => {
        registerToastObserver();

        // Cleanup function
        return () => {
            // Nota: non possiamo facilmente disconnettere l'observer
            // perché è condiviso tra tutti i componenti
        };
    }, []);

    return showToast;
};