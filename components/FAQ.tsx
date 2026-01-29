
import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp, Book, Calendar, ShoppingCart, Utensils, User, HelpCircle, ArrowLeft, Send, MessageCircle } from 'lucide-react';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

interface FAQCategory {
  title: string;
  icon: any;
  items: FAQItem[];
}

const FAQ_DATA: FAQCategory[] = [
  {
    title: "General",
    icon: Book,
    items: [
      { id: "g1", question: "¿Qué es Fresco?", answer: "Fresco es tu asistente de cocina inteligente. Te ayuda a planificar menús semanales basados en lo que tienes en tu despensa, ahorrando dinero y evitando el desperdicio alimentario." },
      { id: "g2", question: "¿Es gratis usar Fresco?", answer: "Sí, las funciones principales de planificación y gestión de stock son gratuitas. Algunas funciones avanzadas de IA requieren una clave API propia de Google AI Studio." },
      { id: "g3", question: "¿Necesito crear una cuenta?", answer: "Sí, para sincronizar tu despensa y planes entre diferentes dispositivos y asegurar que tus datos no se pierdan al limpiar el navegador." }
    ]
  },
  {
    title: "Planificación",
    icon: Calendar,
    items: [
      { id: "p1", question: "¿Cómo planifico mi semana de comidas?", answer: "Ve a la pestaña Calendario. Puedes añadir recetas manualmente pulsando en los huecos o usar el botón 'Plan IA' para que Fresco diseñe una propuesta basada en tus gustos." },
      { id: "p2", question: "¿Puedo modificar un plan ya creado?", answer: "¡Claro! Simplemente pulsa sobre cualquier comida ya planificada para cambiar la receta, ajustar los comensales o eliminarla." },
      { id: "p3", question: "¿La IA puede generar un plan completo?", answer: "Sí, el generador inteligente tiene en cuenta tus restricciones dietéticas y el stock actual para crear un menú coherente de 7 días." }
    ]
  },
  {
    title: "Lista de Compras",
    icon: ShoppingCart,
    items: [
      { id: "s1", question: "¿Cómo se genera la lista de compras?", answer: "Se genera automáticamente analizando los ingredientes que necesitas para tu plan semanal y restando los que ya tienes marcados en tu Despensa." },
      { id: "s2", question: "¿Puedo marcar productos como comprados?", answer: "Sí, en la pestaña Lista simplemente pulsa sobre el producto. Al terminar la compra, Fresco te preguntará si quieres añadir esos items al stock automáticamente." },
      { id: "s3", question: "¿Cómo funcionan las comparaciones de precios?", answer: "Fresco estima el coste de tu compra en diferentes supermercados (Mercadona, Carrefour, etc.) basándose en precios medios actualizados." }
    ]
  },
  {
    title: "Recetas",
    icon: Utensils,
    items: [
      { id: "r1", question: "¿De dónde vienen las recetas?", answer: "Contamos con una biblioteca base de recetas saludables y mediterráneas, pero también puedes importar tus propias recetas o generarlas con IA a partir de ingredientes sueltos." },
      { id: "r2", question: "¿Puedo guardar recetas favoritas?", answer: "Sí, usa el icono del corazón en cualquier receta para guardarla en tu panel de favoritos del Dashboard." },
      { id: "r3", question: "¿Las recetas se adaptan a mis restricciones dietéticas?", answer: "Totalmente. El filtro de biblioteca solo te mostrará opciones compatibles con lo que configuraste en tu perfil (vegano, sin gluten, etc.)." }
    ]
  },
  {
    title: "Cuenta y Perfil",
    icon: User,
    items: [
      { id: "u1", question: "¿Puedo cambiar mis preferencias dietéticas?", answer: "Sí, desde tu Perfil puedes actualizar tus preferencias y restricciones en cualquier momento para recalcular tus sugerencias." },
      { id: "u2", question: "¿Cómo cambio mi foto de perfil?", answer: "En Configuración -> Información Personal verás tu avatar actual. Pulsa el icono del lápiz para subir una nueva imagen." },
      { id: "u3", question: "¿Cómo elimino mi cuenta?", answer: "En la sección de Seguridad dentro de Configuración tienes la opción de 'Eliminar cuenta'. Ten en cuenta que esto borrará permanentemente todo tu historial." }
    ]
  }
];

export const FAQ: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredData = useMemo(() => {
    if (!searchTerm) return FAQ_DATA;
    const lower = searchTerm.toLowerCase();
    return FAQ_DATA.map(cat => ({
      ...cat,
      items: cat.items.filter(i => 
        i.question.toLowerCase().includes(lower) || 
        i.answer.toLowerCase().includes(lower)
      )
    })).filter(cat => cat.items.length > 0);
  }, [searchTerm]);

  const toggleItem = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in pb-40">
      {/* Header */}
      <header className="flex items-start gap-4 px-2">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors text-gray-900">
              <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="space-y-1">
              <h1 className="text-4xl font-black text-teal-900 tracking-tight leading-none">Ayuda</h1>
              <p className="text-gray-500 font-medium text-lg opacity-70">Resuelve tus dudas sobre el uso de Fresco</p>
          </div>
      </header>

      {/* Search Bar */}
      <div className="relative group px-2">
          <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-teal-600 transition-colors">
              <Search className="w-5 h-5" />
          </div>
          <input 
              type="text" 
              placeholder="Buscar en preguntas frecuentes..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-16 pl-14 pr-6 bg-white border-2 border-gray-50 rounded-[2rem] shadow-sm font-bold text-gray-800 outline-none focus:border-teal-500/20 transition-all placeholder:text-gray-300"
          />
      </div>

      {/* FAQ Content */}
      <div className="space-y-12">
        {filteredData.length === 0 ? (
          <div className="text-center py-20 opacity-30 space-y-4">
              <HelpCircle className="w-16 h-16 mx-auto" />
              <p className="font-bold">No hemos encontrado nada para esa búsqueda.</p>
          </div>
        ) : (
          filteredData.map((cat, catIdx) => (
            <section key={catIdx} className="space-y-6">
                <div className="flex items-center gap-3 px-4 text-teal-900">
                    <cat.icon className="w-6 h-6 text-teal-500" />
                    <h2 className="text-xl font-black">{cat.title} <span className="text-gray-300 font-bold text-sm ml-2">({cat.items.length} preguntas)</span></h2>
                </div>

                <div className="space-y-3 px-2">
                    {cat.items.map((item) => {
                      const isExpanded = expandedId === item.id;
                      return (
                        <div 
                          key={item.id} 
                          className={`bg-white rounded-[2rem] border-2 transition-all overflow-hidden ${isExpanded ? 'border-teal-100 shadow-lg' : 'border-gray-50 hover:border-teal-50'}`}
                        >
                            <button 
                              onClick={() => toggleItem(item.id)}
                              className="w-full px-8 py-6 flex items-center justify-between text-left group"
                            >
                                <span className={`font-black text-[15px] pr-4 transition-colors ${isExpanded ? 'text-teal-900' : 'text-gray-700'}`}>{item.question}</span>
                                {isExpanded ? <ChevronUp className="w-5 h-5 text-teal-500" /> : <ChevronDown className="w-5 h-5 text-gray-300" />}
                            </button>
                            
                            {isExpanded && (
                                <div className="px-8 pb-8 animate-fade-in">
                                    <p className="text-gray-500 font-medium leading-relaxed border-t border-gray-50 pt-6">
                                        {item.answer}
                                    </p>
                                </div>
                            )}
                        </div>
                      );
                    })}
                </div>
            </section>
          ))
        )}
      </div>

      {/* Need more help? */}
      <section className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100 text-center space-y-6 mx-2">
          <div className="space-y-2">
              <h3 className="text-2xl font-black text-teal-950">¿No encuentras lo que buscas?</h3>
              <p className="text-gray-500 font-medium leading-relaxed max-w-sm mx-auto">
                  Si tu pregunta no está aquí, no dudes en contactar con nuestro equipo de soporte.
              </p>
          </div>
          <div className="flex flex-col gap-3">
              <button className="w-full h-16 bg-[#147A74] text-white rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-[#0f605a] transition-all shadow-xl active:scale-[0.98]">
                  <MessageCircle className="w-5 h-5" />
                  Contactar Soporte
              </button>
              <button className="w-full h-16 bg-white border-2 border-gray-100 text-gray-900 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-gray-50 transition-all active:scale-[0.98]">
                  <Send className="w-5 h-5 text-gray-400" />
                  Enviar Sugerencia
              </button>
          </div>
      </section>
    </div>
  );
};
