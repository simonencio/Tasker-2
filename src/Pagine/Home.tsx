import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supporto/supabaseClient";
import { DragDropContext, Droppable, Draggable,  type DropResult } from '@hello-pangea/dnd';
import { v4 as uuidv4 } from 'uuid';
// import WidgetB from '../components/WidgetB';

interface WidgetItem { id: string; type: string; }

export default function Home() {
  const [nome, setNome] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [widgets, setWidgets] = useState<WidgetItem[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const navigate = useNavigate();

  const oggi = new Date();
  const oggiStr = oggi.toLocaleDateString("it-IT", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  useEffect(() => {
    const fetchUserInfo = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!user || authError) {
        navigate("/login");
        return;
      }
      const { data } = await supabase
        .from("utenti")
        .select("nome, email")
        .eq("id", user.id)
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

  const handleDragEnd = (result: DropResult) => {
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
        <p className="text-sm">{oggiStr}</p>
        <h1 className="text-3xl font-bold">Buongiorno, {nome || email || "utente"} 👋</h1>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="home-widgets">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="grid gap-6"
            >
              {widgets.map((widget, index) => (
                <Draggable key={widget.id} draggableId={widget.id} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className="bg-white p-4 rounded shadow cursor-pointer"
                      onClick={() => {
                        if (widget.type === 'Progetti') {
                          navigate('/listaProgetti');
                        }
                      }}
                    >
                      {widget.type === 'Progetti' && (
                        <h3 className="text-xl font-semibold">Progetti</h3>
                      )}
                      {/* {widget.type === 'WidgetB' && <WidgetB />} */}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Widget Button & Picker */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {/* Add Widget Button */}
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-14 h-14 flex items-center justify-center text-2xl leading-none shadow-lg"
          onClick={() => setShowPicker(prev => !prev)}
        >
          +
        </button>

        {/* Widget Picker Modal */}
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
                  onClick={() => handleAddWidget('WidgetB')}
                  className="w-full text-left hover:bg-gray-100 px-2 py-1 rounded"
                >
                  Widget B
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
