import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supporto/supabaseClient";
import {
  DndContext, closestCenter, MouseSensor, TouchSensor, KeyboardSensor,
  useSensor, useSensors
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, arrayMove, rectSortingStrategy,
  sortableKeyboardCoordinates
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { v4 as uuidv4 } from 'uuid';

import ProgettiWidget from "../Componenti/ProgettiWidget";
import TaskWidget from '../Componenti/TaskWidget';
import QuickActionsWidget from "../Componenti/QuickActionWidget";
import MetricheWidget from "../Componenti/MetricheWidget";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

interface WidgetItem { id: string; type: string; }

export default function Home() {
  const [nome, setNome] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [widgets, setWidgets] = useState<WidgetItem[]>(() => {
    const stored = localStorage.getItem('home_widgets');
    if (stored) return JSON.parse(stored);
    // default alla prima apertura
    return [
      { id: uuidv4(), type: 'Task' },
      { id: uuidv4(), type: 'Progetti' },
      { id: uuidv4(), type: 'Azioni' },
    ];
  });

  const [showPicker, setShowPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const navigate = useNavigate();

  // Persist widgets
  useEffect(() => {
    localStorage.setItem('home_widgets', JSON.stringify(widgets));
  }, [widgets]);

  // Sessione utente
  useEffect(() => {
    const fetchUserInfo = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!user || authError) {
        navigate('/login');
        return;
      }
      setUserId(user.id);
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

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = () => setIsDragging(true);

  const handleDragEnd = (event: any) => {
    setIsDragging(false);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = widgets.findIndex(w => w.id === active.id);
    const newIndex = widgets.findIndex(w => w.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    setWidgets(items => arrayMove(items, oldIndex, newIndex));
  };

  if (loading) return <div className="p-6" />;

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

      {/* Drag & Drop in griglia */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setIsDragging(false)}
      >
        <SortableContext items={widgets.map(w => w.id)} strategy={rectSortingStrategy}>
          <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 ${isDragging ? 'transition-none' : 'transition-all'}`}>
            {widgets.map((widget) => (
              <SortableWidget key={widget.id} id={widget.id}>
                {/* Close button */}
                <button
                  onClick={() => handleRemoveWidget(widget.id)}
                  onPointerDown={(e) => e.stopPropagation()} // evita trascinamento al click del close
                  className="absolute top-1 right-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  aria-label="Chiudi widget"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>

                {/* Widget Content */}
                {widget.type === 'Progetti' && <ProgettiWidget />}
                {widget.type === 'Task' && <TaskWidget />}
                {widget.type === 'Azioni' && <QuickActionsWidget />}
                {widget.type === 'Metriche' && <MetricheWidget userId={userId ?? undefined} />}
              </SortableWidget>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Picker "aggiungi widget" */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-14 h-14 flex items-center justify-center text-2xl leading-none shadow-lg"
          onClick={() => setShowPicker(prev => !prev)}
        >
          +
        </button>

        {showPicker && (
          <div className="absolute bottom-16 right-0 bg-white dark:bg-[#1f2937] rounded-lg p-4 w-48 shadow-lg">
            <h2 className="text-lg font-bold mb-2">Aggiungi widget</h2>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => handleAddWidget('Progetti')}
                  className="w-full text-left hover:bg-gray-100 dark:hover:bg-gray-800 px-2 py-1 rounded"
                >
                  Progetti
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleAddWidget('Task')}
                  className="w-full text-left hover:bg-gray-100 dark:hover:bg-gray-800 px-2 py-1 rounded"
                >
                  Task
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleAddWidget('Metriche')}
                  className="w-full text-left hover:bg-gray-100 dark:hover:bg-gray-800 px-2 py-1 rounded"
                >
                  Metriche (settimanali)
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleAddWidget('Azioni')}
                  className="w-full text-left hover:bg-gray-100 dark:hover:bg-gray-800 px-2 py-1 rounded"
                >
                  Azioni rapide
                </button>
              </li>
            </ul>
            <button
              onClick={() => setShowPicker(false)}
              className="mt-3 w-full text-center text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 px-2 py-1 rounded"
            >
              Annulla
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Wrapper ordinabile per un widget */
function SortableWidget({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 as any : 'auto'
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative cursor-move"
    >
      {children}
    </div>
  );
}
