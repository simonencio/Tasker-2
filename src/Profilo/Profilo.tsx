import NotificationPreferencesSelector from "../Notifiche/NotificationPreferencesSelector";

export default function Profilo() {
    return (
        <div className="min-h-screen bg-theme py-8 px-4">
            <div className="max-w-4xl mx-auto space-y-8">
                <h1 className="text-3xl font-bold text-theme">Il tuo Profilo</h1>

                {/* Sezione notifiche */}
                <section>
                    <NotificationPreferencesSelector />
                </section>

                {/* Aggiungi altre sezioni qui in futuro */}
                {/* <section> <ModificaPassword /> </section> */}
                {/* <section> <ImpostazioniAccount /> </section> */}
            </div>
        </div>
    );
}
