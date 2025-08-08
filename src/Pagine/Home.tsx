import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supporto/supabaseClient";
import { DragDropContext, Droppable, Draggable,  type DropResult } from '@hello-pangea/dnd';
import { v4 as uuidv4 } from 'uuid';
import ProgettiWidget from "../Componenti/ProgettiWidget";
import TaskWidget from '../Componenti/TaskWidget';
// import WidgetB from '../components/WidgetB';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

interface WidgetItem { id: string; type: string; }

export default function Home() {
  const [nome, setNome] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [widgets, setWidgets] = useState<WidgetItem[]>(() => {
    const stored = localStorage.getItem('home_widgets');
    return stored ? JSON.parse(stored) : [];
  });
  const [showPicker, setShowPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const navigate = useNavigate();

  // Persist widgets
  useEffect(() => {
    localStorage.setItem('home_widgets', JSON.stringify(widgets));
  }, [widgets]);

  useEffect(() => {
    const fetchUserInfo = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!user || authError) {
        navigate('/login');
        return;
      }
      const { data } = await supabase
        .from('utenti')
        .select('nome, email')
        .eq('id', user.id)
        .maybeSingle();
      if (data) {
        setNome(data.nome ?? null);
        setEmail(data.email ?? null);
      }
      setLoading(false);
    };
    fetchUserInfo();
  }, [navigate]);

  const handleAddWidget = (type: string) => {
    setWidgets(prev => [...prev, { id: uuidv4(), type }]);
    setShowPicker(false);
  };

  const handleRemoveWidget = (id: string) => {
    setWidgets(prev => prev.filter(w => w.id !== id));
  };

  const handleDragEnd = (result: DropResult) => {
    setIsDragging(false);
    if (!result.destination) return;
    const reordered = Array.from(widgets);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setWidgets(reordered);
  };

  if (loading) return <div className="p-6"></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 relative">
      <div className="text-center space-y-1">
        <p className="text-sm">
          {new Date().toLocaleDateString('it-IT', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
          })}
        </p>
        <h1 className="text-3xl font-bold">
          Buongiorno, {nome || email || 'utente'} 👋
        </h1>
      </div>

      <DragDropContext
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
      >
        <Droppable droppableId="home-widgets">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 ${isDragging ? 'transition-none' : 'transition-all'}`}
            >
              {widgets.map((widget, index) => (
                <Draggable key={widget.id} draggableId={widget.id} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className="relative cursor-move"
                    >
                      {/* Close button */}
                      <button
                        onClick={() => handleRemoveWidget(widget.id)}
                        className="absolute top-1 right-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        aria-label="Chiudi widget"
                      >
                        <FontAwesomeIcon icon={faTimes} />
                      </button>
                      {/* Widget Content */}
                      {widget.type === 'Progetti' && <ProgettiWidget />}
                      {widget.type === 'Task'     && <TaskWidget />}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-14 h-14 flex items-center justify-center text-2xl leading-none shadow-lg"
          onClick={() => setShowPicker(prev => !prev)}
        >
          +
        </button>

        {showPicker && (
          <div className="absolute bottom-16 right-0 bg-white rounded-lg p-4 w-48 shadow-lg">
            <h2 className="text-lg font-bold mb-2">Aggiungi widget</h2>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => handleAddWidget('Progetti')}
                  className="w-full text-left hover:bg-gray-100 px-2 py-1 rounded"
                >
                  Progetti
                </button>
              </li>
              <li>
                <button
                    onClick={() => handleAddWidget('Task')}
                    className="w-full text-left hover:bg-gray-100 px-2 py-1 rounded"
                >
                    Task
                </button>
              </li>
            </ul>
            <button
              onClick={() => setShowPicker(false)}
              className="mt-3 w-full text-center text-red-600 hover:bg-red-100 px-2 py-1 rounded"
            >
              Annulla
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
