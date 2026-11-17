// ─── AI Vision Description Service ──────────────────────────────────────────
// Generates high-conversion commercial product descriptions from images
// using the Gemini Vision API with failover chain and smart copywriting heuristic fallback.
// ─────────────────────────────────────────────────────────────────────────────

import { DEFAULT_GEMINI_KEYS, GEMINI_MODEL_CHAIN } from './catalogImportService';

const AI_CALL_TIMEOUT_MS = 14000;

const DESCRIPTION_SYSTEM_PROMPT = `Actúa como Director de Marketing y Copywriter Senior para JavrelStore, tienda líder de comercio electrónico de tecnología y consumo masivo.
Tu tarea es analizar la imagen del producto y redactar una descripción comercial altamente persuasiva, profesional, técnica y atractiva para el comprador.

Estructura de la respuesta:
- Redacta de 1 a 2 párrafos comerciales concisos y vendedores.
- Resalta la propuesta de valor, calidad de construcción, rendimiento o comodidad, y por qué es una compra inteligente.
- Menciona que incluye respaldo oficial, garantía de 12 meses y despacho nacional asegurado con JavrelStore.

REGLAS ABSOLUTAS:
1. NUNCA uses saludos, introducciones ni muletillas como 'Aquí tienes la descripción', 'En esta imagen vemos', 'Como modelo de lenguaje' o '¡Claro!'.
2. Escribe directamente el texto final listo para publicarse en la tienda.
3. Tono: Tecnológico, confiable, premium y persuasivo.`;

function getStoredGeminiKey() {
  try {
    return localStorage.getItem('javrelstore_gemini_api_key') || null;
  } catch {
    return null;
  }
}

function getAllKeys() {
  const stored = getStoredGeminiKey();
  const envKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) || null;
  return [stored, envKey, ...DEFAULT_GEMINI_KEYS].filter(Boolean);
}

/**
 * Generador heurístico de descripción comercial de alto impacto.
 * Se activa si los servicios externos de IA no responden o no tienen conexión,
 * garantizando que el usuario siempre reciba una redacción profesional y editable.
 */
export function generateSmartCommercialDescription(context = {}) {
  const name = String(context?.name || '').trim();
  const brand = String(context?.brand || '').trim();
  const category = String(context?.category || 'tecnología').toLowerCase();
  
  const brandPrefix = brand ? ` de la reconocida marca ${brand}` : '';
  const itemTitle = name || 'Dispositivo Tecnológico Inteligente';

  const categoryBenefits = {
    computadores: 'procesamiento de alta velocidad, arquitectura moderna optimizada para multitarea exigente y una pantalla de fidelidad visual sobresaliente',
    celulares: 'conectividad de última generación, captura fotográfica nítida y una autonomía energética prolongada para acompañarte durante toda la jornada',
    audio: 'acústica envolvente con graves definidos, claridad de frecuencias vocales y aislamiento acústico ideal para estudio o entretenimiento',
    accesorios: 'máxima compatibilidad, ergonomía avanzada y materiales de alta durabilidad diseñados para el uso continuo',
    gaming: 'tasa de refresco ultra fluida, tiempos de respuesta instantáneos y retroiluminación personalizable para una ventaja competitiva',
  };

  const benefitText = categoryBenefits[category] || 'máximo rendimiento, eficiencia y confiabilidad en cada tarea';

  return `${itemTitle}${brandPrefix} diseñado para ofrecer ${benefitText}. Fabricado con materiales de alta calidad y componentes de grado superior, garantiza una experiencia de usuario fluida, productiva y duradera. Incluye garantía oficial de 12 meses, soporte técnico especializado y despacho nacional inmediato protegido por JavrelStore.`;
}

async function callGeminiVision(apiKey, model, cleanBase64, mimeType, context = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_CALL_TIMEOUT_MS);
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    let promptText = 'Analiza visualmente este artículo y genera su descripción comercial vendedora y técnica.';
    if (context?.name || context?.brand) {
      promptText = `Analiza visualmente este producto "${context.name || ''}"${context.brand ? ` de marca ${context.brand}` : ''} (categoría: ${context.category || 'general'}). Redacta su descripción comercial persuasiva, profesional y vendedora destacando sus beneficios técnicos y la garantía de JavrelStore.`;
    }

    const body = {
      system_instruction: { parts: [{ text: DESCRIPTION_SYSTEM_PROMPT }] },
      contents: [
        {
          parts: [
            { inline_data: { mime_type: mimeType, data: cleanBase64 } },
            { text: promptText },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.65,
        maxOutputTokens: 512,
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!text) throw new Error('Empty response from model');
    return text.trim();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Genera la descripción comercial del producto analizando la imagen con IA Vision.
 * Limpia automáticamente encabezados Data URL, consulta en cascada a los modelos Gemini,
 * y en caso de error recurre de forma transparente al generador heurístico de JavrelStore.
 * 
 * @param {string} fileOrDataUrlOrBase64 - Imagen en Base64 o Data URL
 * @param {string} mimeType - Tipo MIME (default: 'image/webp')
 * @param {object} context - Metadatos opcionales { name, brand, category, specs }
 * @returns {Promise<string>} Descripción comercial generada
 */
export async function generateDescriptionFromImage(
  fileOrDataUrlOrBase64,
  mimeType = 'image/webp',
  context = {}
) {
  let cleanBase64 = '';
  let finalMime = mimeType;

  if (typeof fileOrDataUrlOrBase64 === 'string') {
    if (fileOrDataUrlOrBase64.startsWith('data:')) {
      const match = fileOrDataUrlOrBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        finalMime = match[1];
        cleanBase64 = match[2];
      }
    } else {
      cleanBase64 = fileOrDataUrlOrBase64;
    }
  }

  // Si no hay datos base64 válidos o es URL remota sin codificar, usar generador inteligente
  if (!cleanBase64 || cleanBase64.length < 20) {
    return generateSmartCommercialDescription(context);
  }

  const keys = getAllKeys();
  const models = [...GEMINI_MODEL_CHAIN];

  for (const model of models) {
    for (const key of keys) {
      try {
        const result = await callGeminiVision(key, model, cleanBase64, finalMime, context);
        if (result && result.length > 20) {
          return result;
        }
      } catch (err) {
        // Continuar con el siguiente modelo en la cadena de failover
      }
    }
  }

  // Respaldo de contingencia: generador inteligente de alta fidelidad
  return generateSmartCommercialDescription(context);
}
