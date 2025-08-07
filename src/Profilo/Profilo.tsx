import NotificationPreferencesSelector from "../Notifiche/NotificationPreferencesSelector";
import ModificaEmail from "./ModificaEmail";
import ModificaPassword from "./ModificaPassword";
import ModificaImmagineProfilo from "./ModificaImmagineProfilo";

export default function Profilo() {
    return (
        <div className="min-h-screen bg-theme py-8 px-4">
            <div className="max-w-4xl mx-auto space-y-8">
                <h1 className="text-3xl font-bold text-theme">Il tuo Profilo</h1>

                <section>
                    <NotificationPreferencesSelector />
                </section>

                <section>
                    <ModificaEmail />
                </section>

                <section>
                    <ModificaPassword />
                </section>

                <section>
                    <ModificaImmagineProfilo />
                </section>
            </div>
        </div>
    );
}
