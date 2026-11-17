import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Bot,
  User,
  ShoppingBag,
  ExternalLink,
  Zap,
  RotateCcw,
  Mic,
  MicOff,
} from 'lucide-react';
import { formatCurrency, buildWhatsAppUrl } from '../services/storeService';
import { catalogImportService, GEMINI_MODEL_CHAIN } from '../services/catalogImportService';

export const StoreChatbot = ({ products = [], config = {}, onQuickView, onAddToCart }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const initialWelcome = {
    id: 'msg-welcome',
    sender: 'bot',
    text: `¡Hola! 👋 Soy el Asistente Inteligente de **JavrelStore**.\n\nEstoy aquí para ayudarte a encontrar el producto ideal, consultar precios y especificaciones técnicas, verificar disponibilidad o guiarte paso a paso con pagos por QR, Nequi o transferencia bancaria.\n\n¿En qué te puedo asesorar hoy?`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };

  const [messages, setMessages] = useState([initialWelcome]);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);
  const baseTextRef = useRef('');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  // Inicialización de SpeechRecognition (Dictado por Voz Speech-to-Text en Español sin duplicación)
  useEffect(() => {
    const SpeechRecognition =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'es-CO'; // Español Colombia

        recognition.onresult = (event) => {
          // Reconstruir la sesión completa de dictado sin concatenar repetidamente sobre el estado
          let sessionTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            sessionTranscript += event.results[i][0].transcript;
          }

          const base = baseTextRef.current ? baseTextRef.current.trim() : '';
          const fullText = base ? `${base} ${sessionTranscript.trim()}` : sessionTranscript.trim();

          setInputMessage(fullText);

          // Ajustar altura del textarea dinámicamente
          if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
          }
        };

        recognition.onerror = (err) => {
          console.warn('[SpeechRecognition] Error o micrófono bloqueado:', err.error);
          setIsListening(false);
          baseTextRef.current = '';
        };

        recognition.onend = () => {
          setIsListening(false);
          baseTextRef.current = '';
        };

        recognitionRef.current = recognition;
      } catch (err) {
        console.warn('SpeechRecognition no pudo inicializarse:', err);
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert(
        'Tu navegador no soporta reconocimiento de voz nativo (Speech-to-Text). Te recomendamos usar Google Chrome o Microsoft Edge.'
      );
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListening(false);
      baseTextRef.current = '';
    } else {
      try {
        baseTextRef.current = inputMessage.trim();
        recognitionRef.current.start();
        setIsListening(true);
        setTimeout(() => textareaRef.current?.focus(), 100);
      } catch (err) {
        console.warn('Error iniciando dictado:', err);
      }
    }
  };

  // Preguntas frecuentes sugeridas
  const quickPrompts = [
    '💳 ¿Cómo pagar por QR o Nequi?',
    '💻 Recomiéndame un computador',
    '📱 ¿Qué celulares tienen disponibles?',
    '🚚 ¿Cómo funcionan los envíos y garantías?',
  ];

  // Motor Inteligente Heurístico Offline (Garantía de respuesta en cualquier condición)
  const generateLocalResponse = (query) => {
    const q = query.toLowerCase();

    // 1. Seguridad, Confiabilidad y Legitimidad de JavrelStore
    if (/segur|confia|estafa|legal|verdad|real|sitio|pagina|web|autentic|original/i.test(q)) {
      return {
        text: `🔒 **JavrelStore es una Plataforma 100% Segura y Confiable:**\n\n• **Empresa Legal:** Estamos legalmente constituidos en Colombia con NIT **901.482.910-4** y sede comercial oficial.\n• **Garantía Directa:** Todos los productos nuevos cuentan con **1 año de garantía oficial**.\n• **Pagos Protegidos:** Canales oficiales a nombre de **${config.paymentTitular || 'JavrelStore S.A.S'}** (Bancolombia, Nequi y pasarela QR cifrada).\n• **Envíos Asegurados:** Despachos a nivel nacional con guía de rastreo inmediata (24-48h). Puedes verificar o coordinar tu pedido directamente con un asesor por WhatsApp al **+${config.whatsappNumber || '573122174851'}**.`,
      };
    }

    // 1.1 Promociones, Ofertas, Días de Descuento y Campañas
    if (/promo|descuent|oferta|rebaja|dia|días|black|aniversario|combo|ganga|liquidac/i.test(q)) {
      return {
        text: `🔥 **Promociones y Descuentos en JavrelStore:**\n\n• **Días de Promoción:** Tenemos **Fin de Semana Gamer** (Viernes a Domingo) con descuentos de hasta el 25% en periféricos y componentes seleccionados.\n• **Campaña Actual:** Consulta el banner superior de la tienda para conocer el evento vigente (**${config.activeCampaign?.title || 'Black Friday Tecnológico'}** con cupones activos).\n• **Envíos Gratis:** En compras seleccionadas con despacho inmediato a toda Colombia.\n• **Combos Especiales:** Descuentos adicionales pagando directamente por Nequi o Bancolombia QR. ¡Pregúntanos por la referencia que deseas!`,
      };
    }

    // 2. Pagos, transferencias o QR
    if (/pago|pagar|nequi|bancolombia|qr|transferencia|cuenta|titular|daviplata/i.test(q)) {
      return {
        text: `💳 **Medios de Pago Oficiales en JavrelStore:**\n\n• **Código QR y Nequi / Daviplata:** al número **${config.paymentNequiPhone || '3122174851'}**.\n• **Bancolombia Cuenta de Ahorros:** **${config.paymentBankAccount || '829-000123-45'}**.\n• **Titular:** **${config.paymentTitular || 'JavrelStore S.A.S'}**.\n\nPuedes agregar productos al carrito y adjuntar tu comprobante de pago o enviarlo por WhatsApp para despacho inmediato.`,
      };
    }

    // 3. Sistema POS, mostrador y facturación
    if (/pos|caja|factura|dian|mostrador|recibo|tirilla/i.test(q)) {
      return {
        text: `🖥️ **Sistema POS y Facturación JavrelStore:**\n\nContamos con un módulo de Punto de Venta (POS) integrado para ventas en mostrador, emisión de tirillas térmicas, facturación electrónica y control de inventario en tiempo real con lector de código de barras.`,
      };
    }

    // 4. Envíos y garantías
    if (/envio|envío|despacho|tiempo|demora|garantia|garantía|devoluc|ciudad/i.test(q)) {
      return {
        text: `📦 **Envíos Nacionales Rápidos:** Despachamos a toda Colombia (Bogotá, Medellín, Cali, Barranquilla y demás municipios) en 24 a 48 horas con transportadoras aliadas y guía asegurada.\n\n🛡️ **Garantía Oficial:** Cada artículo tiene respaldo de 1 año contra defectos de fábrica.`,
      };
    }

    // 5. Soporte técnico o licencias
    if (/soporte|tecnico|técnico|licencia|software|windows|office|mantenimiento/i.test(q)) {
      return {
        text: `🔧 **Soporte Técnico y Licencias Originales:**\n\nBrindamos servicio técnico certificado en ensamble gamer, mantenimiento preventivo/correctivo y licencias 100% originales de Windows y Office con activación garantizada. Contáctanos por WhatsApp para cotizaciones de soporte.`,
      };
    }

    // 6. Búsqueda de productos en el catálogo
    let matchedProducts = [];
    if (/computador|laptop|portatil|macbook|pc|gamer|torre/i.test(q)) {
      matchedProducts = products.filter((p) => p.category === 'computadores' || p.category === 'gamer').slice(0, 3);
    } else if (/celular|smartphone|iphone|samsung|xiaomi|motorola/i.test(q)) {
      matchedProducts = products.filter((p) => p.category === 'celulares').slice(0, 3);
    } else if (/consola|playstation|ps5|xbox|nintendo|switch/i.test(q)) {
      matchedProducts = products.filter((p) => p.category === 'consolas').slice(0, 3);
    } else if (/accesorio|cargador|cable|mouse|teclado|fuente|ram|gpu/i.test(q)) {
      matchedProducts = products.filter((p) => p.category === 'accesorios' || p.category === 'gamer').slice(0, 3);
    } else if (/audio|audifono|parlante|bocina|soundbar/i.test(q)) {
      matchedProducts = products.filter((p) => p.category === 'audio').slice(0, 3);
    } else {
      // Coincidencia por nombre o marca
      const words = q.split(' ').filter((w) => w.length > 3);
      matchedProducts = products
        .filter((p) => words.some((w) => String(p?.name || '').toLowerCase().includes(w) || String(p?.brand || '').toLowerCase().includes(w)))
        .slice(0, 3);
    }

    if (matchedProducts.length > 0) {
      return {
        text: `¡Por supuesto! En **JavrelStore** tenemos excelentes opciones disponibles para entrega inmediata:`,
        recommendedProducts: matchedProducts,
      };
    }

    // Respuesta contextual si preguntan por catálogo general
    return {
      text: `En **JavrelStore** somos especialistas en tecnología prémium: computadores de alto rendimiento, portátiles, zona gamer, consolas (PS5, Xbox, Switch), celulares originales, accesorios y soporte técnico.\n\n¿Buscas alguna referencia o especificación en particular? También puedes escribirnos por WhatsApp al **+${config.whatsappNumber || '573122174851'}** para atención inmediata.`,
    };
  };

  // Enviar mensaje con Failover de Gemini IA a motor local
  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    setInputMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListening(false);
      baseTextRef.current = '';
    }
    setHasInteracted(true);

    const userMsg = {
      id: 'usr-' + Date.now(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    let botResponse = null;

    // Función auxiliar para llamar a la IA de Gemini con AbortController individual
    const queryGeminiWithTimeout = async () => {
      const candidateKeys = catalogImportService.getAllCandidateKeys();
      if (!candidateKeys || candidateKeys.length === 0) return null;

      const catalogSummary = products
        .slice(0, 20)
        .map((p) => `- ${p.name} (Ref: ${p.reference || p.id}, Marca: ${p.brand}, Precio: $${formatCurrency(p.price)}, Categoría: ${p.category})`)
        .join('\n');

      const systemPrompt = `
Eres el Asistente Virtual Oficial e Inteligente de "JavrelStore" (Colombia).
Tu rol es brindar asesoría comercial certera, amable y profesional sobre tecnología, computadores, zona gamer, consolas, celulares, medios de pago y políticas de la empresa.

CONOCIMIENTO INSTITUCIONAL Y DE SEGURIDAD (CRÍTICO):
- ¿Esta página o tienda es segura?: SÍ, JavrelStore es una plataforma de e-commerce 100% segura y legalmente registrada en Colombia (NIT: 901.482.910-4). Cuenta con pasarelas de pago cifradas, punto de venta y cuentas oficiales a nombre de "${config.paymentTitular || 'JavrelStore S.A.S'}".
- Promociones: Días de descuento de Viernes a Domingo ("Finde Gamer"), combos promocionales y campañas activas en el banner.
- Medios de pago: Código QR y billeteras móviles (Nequi / Daviplata al ${config.paymentNequiPhone || '3122174851'}), Transferencia Bancolombia Ahorros (${config.paymentBankAccount || '829-000123-45'}), y Caja POS en mostrador.
- Envíos: Despachos asegurados a todo el territorio nacional de Colombia en 24 a 48 horas con número de guía de rastreo.
- Garantía: 1 año de garantía oficial directa contra cualquier defecto de fábrica.
- Soporte: Atención personalizada por WhatsApp oficial al +${config.whatsappNumber || '573122174851'}.

CATÁLOGO REAL EN STOCK:
${catalogSummary}

REGLAS DE RESPUESTA:
1. Responde DIRECTAMENTE y con precisión a lo que el cliente te pregunta. Si pregunta por promociones o días de descuento, explícalo detalladamente. Si pregunta si la página es segura, responde explicando la seguridad, NIT y garantías de JavrelStore. Si pregunta por un producto, indica disponibilidad y precio en COP.
2. NUNCA des respuestas evasivas.
3. Usa Markdown elegante con negritas y viñetas para máxima legibilidad.
4. Mantén tus respuestas entre 35 y 100 palabras.
5. Pregunta del cliente: "${text}"
`;

      const requestBody = {
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 500 },
      };

      // Probar las llaves y modelos con límite estricto y conmutación rápida
      for (const key of candidateKeys.slice(0, 2)) {
        for (const model of GEMINI_MODEL_CHAIN) {
          try {
            const controller = new AbortController();
            const fetchTimeout = setTimeout(() => controller.abort(), 3500);

            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
            const res = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestBody),
              signal: controller.signal,
            });

            clearTimeout(fetchTimeout);

            if (res.ok) {
              const data = await res.json();
              const candidate = data?.candidates?.[0];
              const parts = candidate?.content?.parts || [];
              const replyPart = parts.find((p) => p.text && !p.thought) || parts[parts.length - 1] || parts[0];
              const reply = replyPart?.text;

              if (reply && reply.trim().length > 5) {
                const matching = products
                  .filter((p) => reply.toLowerCase().includes(String(p?.name || '').toLowerCase().slice(0, 15)))
                  .slice(0, 2);

                return {
                  text: reply.trim(),
                  recommendedProducts: matching,
                };
              }
            }
          } catch {
            // Continúa con el siguiente intento rápido
          }
        }
      }
      return null;
    };

    // 1. Ejecutar con Timeout Global de 6 segundos garantizado
    try {
      const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => resolve(null), 6000)
      );

      botResponse = await Promise.race([queryGeminiWithTimeout(), timeoutPromise]);
    } catch (e) {
      console.warn('Aviso procesando IA de chat:', e);
    }

    // 2. Si falló la API o se agotó el timeout de 6s, aplicar el Motor Heurístico Contextual de inmediato
    if (!botResponse) {
      botResponse = generateLocalResponse(text);
    }

    try {
      setMessages((prev) => [
        ...prev,
        {
          id: 'bot-' + Date.now(),
          sender: 'bot',
          text: botResponse.text,
          recommendedProducts: botResponse.recommendedProducts || [],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Botón Flotante Reubicado (Separado del botón ScrollToTop para evitar colisión) */}
      <div className="fixed bottom-20 right-5 sm:right-6 z-40 flex items-center">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="group flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-[#0A6CFF] to-[#0052FF] text-white shadow-xl shadow-blue-500/35 hover:shadow-blue-500/55 hover:scale-105 active:scale-95 transition-all duration-300 border border-white/30 cursor-pointer"
            aria-label="Abrir Asistente JavrelStore"
          >
            <div className="relative">
              <Bot className="w-5 h-5 text-white" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-[#0A6CFF] animate-pulse" />
            </div>
            <span className="text-xs font-bold tracking-tight hidden sm:inline">
              Soporte JavrelStore
            </span>
            <span className="sm:hidden text-xs font-bold">Asistente</span>
          </button>
        )}
      </div>

      {/* Ventana de Chat Flotante Responsive - Rediseño Claro (Azul y Blanco con Glassmorphism) */}
      {isOpen && (
        <div className="fixed inset-x-3 bottom-3 sm:inset-auto sm:bottom-6 sm:right-6 z-50 w-auto sm:w-[390px] h-[560px] max-h-[85vh] bg-white/95 backdrop-blur-2xl border border-slate-200/90 rounded-3xl shadow-2xl shadow-slate-400/25 flex flex-col overflow-hidden text-slate-800 animate-scaleUp">
          {/* Header del Chat Estilo Corporativo Claro */}
          <div className="px-4 py-3.5 bg-slate-50/95 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#0A6CFF] to-[#0052FF] p-0.5 flex items-center justify-center shadow-md shadow-blue-500/20">
                <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
                  <Bot className="w-5 h-5 text-[#0A6CFF]" />
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
              </div>
              <div>
                <h4 className="font-display font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                  JavrelStore Bot
                  <span className="text-[9px] font-mono-code font-bold uppercase px-1.5 py-0.2 rounded bg-blue-50 text-[#0A6CFF] border border-blue-200">
                    IA OFICIAL
                  </span>
                </h4>
                <p className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  En línea • Soporte, Precios & Pedidos
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setMessages([initialWelcome])}
                className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                title="Reiniciar conversación"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                title="Cerrar chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Historial de Mensajes */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs no-scrollbar bg-slate-50/40">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} transition-all`}
              >
                <div
                  className={`max-w-[85%] p-3.5 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-[#0A6CFF] to-[#0052FF] text-white rounded-br-xs shadow-md shadow-blue-500/20 font-medium'
                      : 'bg-white text-slate-800 border border-slate-200/90 rounded-bl-xs shadow-xs font-normal'
                  }`}
                >
                  {msg.text}

                  {/* Fichas de Productos Recomendados */}
                  {msg.recommendedProducts && msg.recommendedProducts.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-2">
                      <span className="text-[10px] font-mono-code uppercase font-bold text-[#0A6CFF] block">
                        Recomendados en Catálogo:
                      </span>
                      {msg.recommendedProducts.map((prod) => (
                        <div
                          key={prod.id}
                          className="flex items-center justify-between gap-2.5 p-2 rounded-xl bg-slate-50 hover:bg-blue-50/40 border border-slate-200/90 transition-colors shadow-2xs"
                        >
                          <img
                            src={prod.image}
                            alt={prod.name}
                            className="w-10 h-10 object-contain rounded-lg bg-white p-1 border border-slate-200"
                            onError={(e) => {
                              e.target.src = '/zafra/logo-menu.webp';
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-[11px] text-slate-900 truncate">
                              {prod.name}
                            </p>
                            <p className="font-mono-code font-bold text-[#0A6CFF] text-[11px]">
                              {formatCurrency(prod.price)}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              onAddToCart(prod);
                              setIsOpen(false);
                            }}
                            className="p-2 rounded-xl bg-[#0A6CFF] hover:bg-blue-600 text-white shadow-xs transition-colors cursor-pointer"
                            title="Añadir al carrito"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-[9px] text-slate-400 mt-1 px-1 font-mono-code">
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-slate-600 bg-white border border-slate-200/90 p-3 rounded-2xl max-w-[75%] shadow-xs animate-pulse">
                <Sparkles className="w-3.5 h-3.5 text-[#0A6CFF] animate-spin" />
                <span className="text-[11px] font-medium">Consultando catálogo JavrelStore...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Preguntas Frecuentes Rápidas */}
          {!hasInteracted && (
            <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 flex gap-1.5 overflow-x-auto no-scrollbar flex-shrink-0">
              {quickPrompts.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(q)}
                  className="flex-shrink-0 text-[10px] font-semibold bg-white hover:bg-blue-50 text-slate-700 hover:text-[#0A6CFF] border border-slate-200 hover:border-blue-300 px-3 py-1.5 rounded-full transition-colors whitespace-nowrap cursor-pointer shadow-2xs"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Indicador de Dictado por Voz en Tiempo Real */}
          {isListening && (
            <div className="px-3.5 py-1.5 bg-rose-50 border-t border-rose-200/80 flex items-center justify-between text-[11px] text-rose-700 font-semibold animate-fadeIn flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                </span>
                <span>🎙️ Escuchando dictado en español... Di tu mensaje</span>
              </div>
              <button
                type="button"
                onClick={toggleListening}
                className="text-[10px] text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer"
              >
                Pausar
              </button>
            </div>
          )}

          {/* Input de Mensaje Flexible con Auto-Scroll y Botón de Micrófono */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-white border-t border-slate-200/90 flex items-end gap-2 flex-shrink-0"
          >
            {/* Contenedor Estable del Input Translúcido */}
            <div className="flex-1 flex items-end gap-1.5 bg-slate-50 hover:bg-white focus-within:bg-white border border-slate-200 focus-within:border-[#0A6CFF] focus-within:ring-2 focus-within:ring-blue-500/15 rounded-2xl px-3 py-1.5 transition-all shadow-2xs min-h-[42px] max-h-32">
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputMessage}
                onChange={(e) => {
                  setInputMessage(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Pregunta por precios, referencias o asesoría..."
                className="flex-1 bg-transparent text-xs text-slate-900 placeholder-slate-400 outline-none resize-none max-h-28 overflow-y-auto leading-relaxed py-1 px-0.5 font-medium"
              />

              {/* Botón de Entrada por Micrófono (Speech-to-Text) */}
              <button
                type="button"
                onClick={toggleListening}
                className={`p-1.5 rounded-xl transition-all cursor-pointer flex-shrink-0 mb-0.5 ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse ring-2 ring-rose-300 shadow-md shadow-rose-500/25'
                    : 'text-slate-400 hover:text-[#0A6CFF] hover:bg-blue-50'
                }`}
                title={isListening ? 'Detener dictado por voz' : 'Dictar por voz en español (Speech-to-Text)'}
              >
                {isListening ? (
                  <MicOff className="w-4 h-4 animate-bounce" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
            </div>

            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="p-2.5 rounded-2xl bg-gradient-to-r from-[#0A6CFF] to-[#0052FF] text-white hover:opacity-95 active:scale-95 disabled:opacity-40 transition-all flex items-center justify-center shadow-md shadow-blue-500/25 cursor-pointer flex-shrink-0 h-[42px] w-[42px]"
              title="Enviar consulta"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
