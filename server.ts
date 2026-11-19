import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '2mb' }));

const PORT = 3000;

// Simple in-memory rate limiter for Gemini endpoints
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
function checkRateLimit(ip: string, maxPerMinute = 20): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > 60_000) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= maxPerMinute) {
    return false;
  }
  entry.count += 1;
  return true;
}

function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Analytics event store (in-memory for session metrics)
const analyticsEvents: Array<{
  eventType: string;
  productId?: string;
  domain?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}> = [
  { eventType: 'try_on_start', productId: 'kibera-denim-trench', domain: 'fashion', timestamp: new Date().toISOString() },
  { eventType: 'room_placement', productId: 'aberdare-bamboo-chair', domain: 'furniture', timestamp: new Date().toISOString() },
];

app.post('/api/analytics', (req, res) => {
  const { eventType, productId, domain, metadata } = req.body || {};
  if (typeof eventType === 'string') {
    analyticsEvents.push({
      eventType,
      productId,
      domain,
      metadata,
      timestamp: new Date().toISOString(),
    });
  }
  res.json({ ok: true, totalEvents: analyticsEvents.length });
});

app.get('/api/analytics/summary', (_req, res) => {
  res.json({
    totalEvents: analyticsEvents.length,
    recentEvents: analyticsEvents.slice(-15),
  });
});

// App 1: Server-side Gemini Style & Fit Advisor
app.post('/api/gemini/stylist', async (req, res) => {
  const clientIp = req.ip || 'local';
  if (!checkRateLimit(clientIp)) {
    res.status(429).json({ error: 'Rate limit exceeded. Please wait a moment.' });
    return;
  }

  const {
    productName,
    variantName,
    materialComposition,
    heightCm,
    weightKg,
    recommendedSize,
    fitPreference,
    occasionPrompt,
  } = req.body || {};

  const fallbackAdvice = {
    headline: `Nairobi Editorial Styling · Size ${recommendedSize || 'M'} (${fitPreference || 'Regular'} Fit)`,
    drapeAnalysis: `At ${heightCm || 172} cm and ${weightKg || 68} kg, the ${productName || 'garment'} in ${variantName || 'signature weave'} sits cleanly across the clavicle with balanced hem proportion. The ${materialComposition || 'upcycled East African textile'} softens by ~4% after 3 wears while holding its architectural lapel line.`,
    pairingSuggestion: `Pair with tapered raw-ecru trousers or hand-cast recycled brass cuffs for Art After Dark gallery evenings in Nairobi or transitional layering in London/New York.`,
    careAndOriginNote: `Handcrafted in Nairobi under Unity Art Collective. Cold hand-wash or airing preserves natural indigo and wax-resist pigments.`,
    source: 'unity-curator-engine',
  };

  const ai = getGenAIClient();
  if (!ai) {
    res.json(fallbackAdvice);
    return;
  }

  try {
    const prompt = `You are the Senior Fashion & Fit Stylist for Unity Art Collective in Nairobi, Kenya (Unity Art Collective).
A buyer is using our WebAR Virtual Try-On for:
- Product: ${productName} (${variantName})
- Material: ${materialComposition}
- Buyer calibration: ${heightCm} cm height, ${weightKg} kg weight, Recommended Size: ${recommendedSize}, Fit preference: ${fitPreference}
- Buyer question / occasion: ${occasionPrompt || 'General styling and drape check for local Nairobi events and global travel'}

Return a concise JSON object with keys:
- "headline": short editorial title (under 12 words)
- "drapeAnalysis": 2 sentences on how this garment or accessory drapes on their calibrated frame
- "pairingSuggestion": 1-2 sentences on how to style it with East African upcycled or contemporary wardrobe pieces
- "careAndOriginNote": 1 sentence highlighting its Nairobi artisan manufacturing and care`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const rawText = response.text;
    if (rawText) {
      const parsed = JSON.parse(rawText.trim());
      res.json({
        headline: parsed.headline || fallbackAdvice.headline,
        drapeAnalysis: parsed.drapeAnalysis || fallbackAdvice.drapeAnalysis,
        pairingSuggestion: parsed.pairingSuggestion || fallbackAdvice.pairingSuggestion,
        careAndOriginNote: parsed.careAndOriginNote || fallbackAdvice.careAndOriginNote,
        source: 'gemini-3.8-flash',
      });
      return;
    }
    res.json(fallbackAdvice);
  } catch (_err) {
    // Graceful fallback if Gemini quota is exhausted or network restricted
    res.json(fallbackAdvice);
  }
});

// App 2: Server-side Gemini Spatial Room & Sustainable Material Advisor
app.post('/api/gemini/spatial-advisor', async (req, res) => {
  const clientIp = req.ip || 'local';
  if (!checkRateLimit(clientIp)) {
    res.status(429).json({ error: 'Rate limit exceeded. Please wait a moment.' });
    return;
  }

  const {
    productName,
    variantName,
    materialComposition,
    dimensionsCm,
    companionPieces,
    roomQuestion,
  } = req.body || {};

  const fallbackSpatial = {
    headline: `Spatial & Acoustic Harmony · ${productName || 'Nairobi Bamboo Piece'}`,
    spatialPlacementAdvice: `With a footprint of ${dimensionsCm?.width || 68}×${dimensionsCm?.depth || 76}×${dimensionsCm?.height || 72} cm, allow at least 65 cm of circulation clearance around the perimeter. Positioning near indirect natural daylight highlights the ${variantName || 'laminated highland bamboo'} grain without UV bleaching.`,
    materialSustainabilityStory: `Engineered in Nairobi from 4-year regenerative Kenyan highland bamboo (Yushania alpina) and upcycled natural fibers (${materialComposition || 'zero-VOC finish'}). Tensile strength exceeds mild steel by weight while sequestering atmospheric carbon.`,
    complementaryPairing: companionPieces?.length
      ? `Your multi-piece scene with ${companionPieces.join(' + ')} creates a cohesive warm-modern East African architectural zone.`
      : `Combine with the Naivasha Woven Bamboo Acoustic Pendant Dome overhead to absorb mid-frequency room echo (NRC 0.65).`,
    source: 'unity-spatial-engine',
  };

  const ai = getGenAIClient();
  if (!ai) {
    res.json(fallbackSpatial);
    return;
  }

  try {
    const prompt = `You are the Architectural & Sustainable Materials Specialist for Unity Art Collective in Nairobi, Kenya (Unity Art Collective).
A customer is placing our Nairobi-manufactured piece in their room using WebAR:
- Primary Piece: ${productName} (${variantName})
- Material Composition: ${materialComposition}
- Dimensions: ${dimensionsCm?.width || 68}cm W x ${dimensionsCm?.depth || 76}cm D x ${dimensionsCm?.height || 72}cm H
- Companion pieces in scene: ${(companionPieces || []).join(', ') || 'None yet'}
- Customer inquiry: ${roomQuestion || 'How should I orient this piece for best lighting and acoustic balance?'}

Return a concise JSON object with keys:
- "headline": short architectural title (under 12 words)
- "spatialPlacementAdvice": 2 sentences on room flow, clearance, and lighting orientation
- "materialSustainabilityStory": 2 sentences on the Nairobi bamboo/upcycled material engineering and carbon footprint
- "complementaryPairing": 1 sentence on pairing with lighting, textiles, or companion pieces`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const rawText = response.text;
    if (rawText) {
      const parsed = JSON.parse(rawText.trim());
      res.json({
        headline: parsed.headline || fallbackSpatial.headline,
        spatialPlacementAdvice: parsed.spatialPlacementAdvice || fallbackSpatial.spatialPlacementAdvice,
        materialSustainabilityStory:
          parsed.materialSustainabilityStory || fallbackSpatial.materialSustainabilityStory,
        complementaryPairing: parsed.complementaryPairing || fallbackSpatial.complementaryPairing,
        source: 'gemini-3.8-flash',
      });
      return;
    }
    res.json(fallbackSpatial);
  } catch (_err) {
    res.json(fallbackSpatial);
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Unity Art Collective WebAR server listening on http://localhost:${PORT}`);
  });
}

startServer();
