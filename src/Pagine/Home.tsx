import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supporto/supabaseClient";
import {
  DndContext, closestCenter, MouseSensor, TouchSensor, KeyboardSensor,
  useSensor, useSensors, MeasuringStrategy, MeasuringFrequency, DragOverlay
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, arrayMove, rectSortingStrategy,
  sortableKeyboardCoordinates
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { v4 as uuidv4 } from 'uuid';

import WidgetModello from "../Componenti/WidgetModelloAttivita";
import QuickActionsWidget from "../Componenti/QuickActionWidget";
import MetricheWidget from "../Componenti/MetricheWidget";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faPlus } from '@fortawesome/free-solid-svg-icons';

interface WidgetItem { id: string; type: string; }

function lockAllTileSizes() {
  const els = Array.from(document.querySelectorAll<HTMLElement>('[data-widget-id]'));
  for (const el of els) {
    const r = el.getBoundingClientRect();
    const w = `${r.width}px`;
    const h = `${r.height}px`;
    // congela tutte le dimensioni
    el.style.width = w;
    el.style.minWidth = w;
    el.style.maxWidth = w;
    el.style.height = h;
    el.style.minHeight = h;
    el.style.maxHeight = h;
    el.style.boxSizing = 'border-box';
    // evita che flex/grid comprimano
    (el.style as any).flexShrink = '0';
    (el.style as any).flexGrow = '0';
  }
  // funzione di sblocco
  return () => {
    for (const el of els) {
      el.style.width = '';
      el.style.minWidth = '';
      el.style.maxWidth = '';
      el.style.height = '';
      el.style.minHeight = '';
      el.style.maxHeight = '';
      el.style.boxSizing = '';
      (el.style as any).flexShrink = '';
      (el.style as any).flexGrow = '';
    }
  };
}

function lockGridTracks(grid: HTMLElement | null) {
  if (!grid) return () => { };
  const cs = getComputedStyle(grid);
  // misuro i track risolti in pixel (es: "384px 384px 384px 384px")
  const cols = cs.gridTemplateColumns;
  const rows = cs.gridAutoRows; // di solito "auto"
  // congelo i track
  const prevCols = grid.style.gridTemplateColumns;
  const prevRows = grid.style.gridAutoRows;
  grid.style.gridTemplateColumns = cols;
  if (rows) grid.style.gridAutoRows = rows;

  return () => {
    grid.style.gridTemplateColumns = prevCols;
    grid.style.gridAutoRows = prevRows;
  };
}

export default function Home() {
  const [nome, setNome] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [widgets, setWidgets] = useState<WidgetItem[]>(() => {
    try {
      const raw = localStorage.getItem('home_widgets');
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch { /* ignore */ }
    // default sicuro
    return [
      { id: uuidv4(), type: 'Task' },
      { id: uuidv4(), type: 'Progetti' },
      { id: uuidv4(), type: 'Azioni' },
    ];
  });


  const [showPicker, setShowPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [spans, setSpans] = useState<Record<string, 1 | 2>>({});
  // helper per aggiornare lo span di un widget
  const setWidgetSpan = (id: string, span: 1 | 2) =>
    setSpans(prev => (prev[id] === span ? prev : { ...prev, [id]: span }));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeRect, setActiveRect] = useState<{ w: number; h: number } | null>(null);

  const unlockRef = useRef<null | (() => void)>(null);

  const gridRef = useRef<HTMLDivElement | null>(null);
  const gridUnlockRef = useRef<null | (() => void)>(null);

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

  const handleDragStart = (event: any) => {
    setIsDragging(true);
    document.body.classList.add('dragging');

    // 🔒 congela i track della griglia
    gridUnlockRef.current = lockGridTracks(gridRef.current);
    // 🔒 congela le dimensioni di tutte le card
    unlockRef.current = lockAllTileSizes();

    const id = event?.active?.id as string | undefined;
    if (id) {
      setActiveId(id);
      const el = document.querySelector<HTMLElement>(`[data-widget-id="${id}"]`);
      if (el) {
        const r = el.getBoundingClientRect();
        setActiveRect({ w: r.width, h: r.height });
      }
    }
  };

  const handleDragEnd = (event: any) => {
    setIsDragging(false);
    document.body.classList.remove('dragging');

    // sblocca i track
    gridUnlockRef.current?.();
    gridUnlockRef.current = null;
    // sblocca le dimensioni
    unlockRef.current?.();
    unlockRef.current = null;

    setActiveId(null);
    setActiveRect(null);
    // Reorder
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = widgets.findIndex(w => w.id === active.id);
    const newIndex = widgets.findIndex(w => w.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    setWidgets(items => arrayMove(items, oldIndex, newIndex));
  };

  const handleDragCancel = () => {
    setIsDragging(false);
    document.body.classList.remove('dragging');
    // sblocca i track
    gridUnlockRef.current?.();
    gridUnlockRef.current = null;
    // sblocca le dimensioni
    unlockRef.current?.();
    unlockRef.current = null;

    setActiveId(null);
    setActiveRect(null);
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
        onDragCancel={handleDragCancel}
        autoScroll={false}
        measuring={{ droppable: { strategy: MeasuringStrategy.WhileDragging } }}
      >
        <SortableContext items={widgets.map(w => w.id)} strategy={rectSortingStrategy} >
          <div ref={gridRef} className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4
              gap-6 items-start auto-rows-auto transition-none`}>
            {widgets.map((widget) => {
              // span dinamico: 1 col se 1 card, 2 col se 2–4 card
              const span = spans[widget.id] ?? 1; // default 1 finché il widget non notifica

              return (
                <SortableWidget
                  key={widget.id}
                  id={widget.id}
                  className={`${span === 2 ? 'sm:col-span-2' : 'sm:col-span-1'} col-span-1`}
                >
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
                  {widget.type === 'Progetti' && (
                    <WidgetModello
                      resource="progetti"
                      widgetKey={widget.id}
                      onSpanChange={(s) => setWidgetSpan(widget.id, s)}
                    />
                  )}
                  {widget.type === 'Task' && (
                    <WidgetModello
                      resource="tasks"
                      widgetKey={widget.id}
                      onSpanChange={(s) => setWidgetSpan(widget.id, s)}
                    />
                  )}
                  {widget.type === 'Azioni' && <QuickActionsWidget />}
                  {widget.type === 'Metriche' && <MetricheWidget userId={userId ?? undefined} />}
                </SortableWidget>
              );
            })}
          </div>
        </SortableContext>
        <DragOverlay dropAnimation={null}>
          {activeId ? (
            <div
              className="card-theme rounded-2xl shadow-sm"
              style={{
                width: activeRect?.w ?? undefined,
                height: activeRect?.h ?? undefined
              }}
            >
              {(() => {
                const w = widgets.find(x => x.id === activeId);
                if (!w) return null;
                // stesso contenuto del map qui sotto
                if (w.type === 'Progetti') {
                  return <WidgetModello resource="progetti" widgetKey={w.id} onSpanChange={() => { }} />;
                }
                if (w.type === 'Task') {
                  return <WidgetModello resource="tasks" widgetKey={w.id} onSpanChange={() => { }} />;
                }
                if (w.type === 'Azioni') return <QuickActionsWidget />;
                if (w.type === 'Metriche') return <MetricheWidget userId={userId ?? undefined} />;
                return null;
              })()}
            </div>
          ) : null}
        </DragOverlay>


      </DndContext>

      {/* Picker "aggiungi widget" */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-14 h-14 flex items-center justify-center text-2xl leading-none shadow-lg"
          onClick={() => setShowPicker(prev => !prev)}
        >
          <FontAwesomeIcon icon={faPlus} />
        </button>

        {showPicker && (
          <div
            className="absolute bottom-16 right-0 dropdown-panel p-4 w-64 rounded-xl shadow-xl animate-scale-fade"
          /* dropdown-panel gestisce già bg/colore/border per light & dark */
          >
            <h2 className="text-sm font-semibold mb-2 opacity-80">Aggiungi widget</h2>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => handleAddWidget('Progetti')}
                  className="dropdown-button hover-bg-theme rounded-md"
                >
                  Progetti
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleAddWidget('Task')}
                  className="dropdown-button hover-bg-theme rounded-md"
                >
                  Task
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleAddWidget('Metriche')}
                  className="dropdown-button hover-bg-theme rounded-md"
                >
                  Metriche (settimanali)
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleAddWidget('Azioni')}
                  className="dropdown-button hover-bg-theme rounded-md"
                >
                  Azioni rapide
                </button>
              </li>
            </ul>

            <button
              onClick={() => setShowPicker(false)}
              className="mt-3 w-full dropdown-button rounded-md text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
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
function SortableWidget({ id, className, children }: {
  id: string; className?: string; children: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    animateLayoutChanges: () => false
  });

  const ref = useRef<HTMLDivElement | null>(null);
  const [originalSize, setOriginalSize] = useState<{ w: number; h: number } | null>(null);

  const combinedRef = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    ref.current = node;

    // Cattura dimensioni immediatamente quando il nodo viene montato
    if (node && !originalSize) {
      const r = node.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        setOriginalSize({ w: r.width, h: r.height });
      }
    }
  };

  // Aggiorna le dimensioni quando necessario (ma non durante il drag)
  useEffect(() => {
    if (!isDragging && ref.current) {
      const r = ref.current.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        setOriginalSize({ w: r.width, h: r.height });
      }
    }
  }, [isDragging, className]); // Re-calcola quando cambia la classe (span)

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : (transition ?? 'transform 200ms ease'),
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0 : 1,
    boxSizing: 'border-box',
    // 🔄 prima avevi: contain: 'paint'
    contain: isDragging ? 'paint' : 'none',   // ✅ abilita solo durante il drag
    isolation: 'isolate',
    willChange: 'transform',
    ...(isDragging && originalSize ? {
      width: originalSize.w,
      height: originalSize.h,
      minWidth: originalSize.w,
      minHeight: originalSize.h,
      maxWidth: originalSize.w,
      maxHeight: originalSize.h,
      position: 'relative',
      flexShrink: 0,
      flexGrow: 0
    } : {})
  };
  return (
    <div
      ref={combinedRef}
      style={style}
      {...attributes}
      {...listeners}
      data-widget-id={id}
      className={`relative cursor-move widget-tile ${className ?? ''} ${isDragging ? 'dragging-item' : ''}`}
    >
      {children}
    </div>
  );
}
