import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faBell, faCalendarAlt, faFolderOpen } from "@fortawesome/free-solid-svg-icons";

export default function QuickActionsWidget() {
  const navigate = useNavigate();

  const apriNuovoTask = () => {
    const fn = (window as any).__openMiniTask;
    if (typeof fn === "function") fn();
    else navigate("/tasks");
  };

  const apriNuovoProgetto = () => {
    const fn = (window as any).__openMiniProject;
    if (typeof fn === "function") fn();
    else navigate("/progetti");
  };

  const apriNotifiche = () => {
    const fn = (window as any).__toggleNotifiche;
    if (typeof fn === "function") fn();
    // eventuale fallback: navigate("/notifiche") se hai la route
  };


  return (
    <div className="card-theme p-3 rounded-lg shadow-sm hover:shadow-md transition-all duration-150 max-w-xs">
      <h3 className="text-lg font-semibold mb-2">Azioni rapide</h3>
      <div className="border-b border-gray-200 dark:border-gray-700 mb-3" />
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={apriNuovoTask}
          className="bg-button-oggi rounded-lg px-3 py-2 text-sm text-left"
          title="Nuovo Task"
        >
          <div className="font-medium flex items-center gap-2">
            <FontAwesomeIcon icon={faPlus} /> Nuovo Task
          </div>
          <div className="opacity-70 text-xs">Crea rapidamente un task</div>
        </button>

        <button
          onClick={apriNuovoProgetto}
          className="bg-task rounded-lg px-3 py-2 text-sm text-left"
          title="Nuovo Progetto"
        >
          <div className="font-medium flex items-center gap-2">
            <FontAwesomeIcon icon={faFolderOpen} /> Nuovo Progetto
          </div>
          <div className="opacity-70 text-xs">Crea un progetto</div>
        </button>

        <button
          onClick={() => navigate("/calendario")}
          className="bg-task-modal rounded-lg px-3 py-2 text-sm text-left"
          title="Calendario"
        >
          <div className="font-medium flex items-center gap-2">
            <FontAwesomeIcon icon={faCalendarAlt} /> Calendario
          </div>
          <div className="opacity-70 text-xs">Apri il calendario</div>
        </button>

        <button
          onClick={apriNotifiche}
          className="bg-button-oggi rounded-lg px-3 py-2 text-sm text-left"
          title="Notifiche"
        >
          <div className="font-medium flex items-center gap-2">
            <FontAwesomeIcon icon={faBell} /> Notifiche
          </div>
          <div className="opacity-70 text-xs">Mostra pannello notifiche</div>
        </button>
      </div>
    </div>
  );
}
