import NotificationPreferencesSelector from "../Notifiche/NotificationPreferencesSelector";
import ModificaEmail from "./ModificaEmail";
import ModificaPassword from "./ModificaPassword";
import ModificaImmagineProfilo from "./ModificaImmagineProfilo";
import ModificaNominativo from "./ModificaNomeCognome";

export default function Profilo() {
    return (
        <div className="min-h-screen bg-theme py-8 px-4">
            <div className="max-w-4xl mx-auto space-y-6">
                <h1 className="text-3xl font-bold text-theme mb-6">Il tuo Profilo</h1>

                <ModificaNominativo />
                <ModificaEmail />
                <ModificaPassword />
                <ModificaImmagineProfilo />
                <NotificationPreferencesSelector />
            </div>
        </div>
    );
}
