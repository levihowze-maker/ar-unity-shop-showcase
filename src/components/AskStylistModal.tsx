import React, { useEffect, useState } from 'react';
import { Box, Camera, Check, ShieldCheck, ShoppingBag, Sparkles, X } from 'lucide-react';
import {
  CurrencyCode,
  formatCurrency,
  getStylistQuickPrompts,
  MarketplaceProduct,
  ProductVariant,
} from '../utils/marketplaceLogic';
import { ProductArtwork } from './ProductArtwork';

interface AskStylistModalProps {
  product: MarketplaceProduct;
  initialVariant: ProductVariant;
  currency: CurrencyCode;
  onClose: () => void;
  onOpenWebAR: (product: MarketplaceProduct) => void;
  onAddToCart: (params: {
    product: MarketplaceProduct;
    variant: ProductVariant;
    selectedSize?: string;
  }) => void;
  onTrackEvent: (eventType: string, metadata?: Record<string, unknown>) => void;
}

interface UnifiedGeminiRecommendation {
  headline: string;
  primaryAnalysis: string;
  stylingOrPairing: string;
  materialCareAndOrigin: string;
  source?: string;
}

function buildDefaultRecommendation(
  product: MarketplaceProduct,
  variant: ProductVariant,
): UnifiedGeminiRecommendation {
  if (product.domain === 'fashion') {
    return {
      headline: `Nairobi Stylist & Care Brief · ${variant.name}`,
      primaryAnalysis: `Tailored in Nairobi from ${product.materialComposition}. Structured shoulder geometry and balanced drape flatter both layered evening silhouettes and relaxed daytime wear.`,
      stylingOrPairing:
        'Pair with raw unbleached East African cotton trousers, monochrome linen layers, or hand-forged recycled brass cuffs for Art After Dark gallery openings.',
      materialCareAndOrigin: `Handcrafted at ${product.creatorStudio} (${product.sustainabilityMetric}). Spot-clean or cold hand-wash with neutral soap; air-dry in shade to preserve natural indigo and artisan weave integrity.`,
      source: 'curated',
    };
  }
  return {
    headline: `Material Care & Spatial Spec · ${variant.name}`,
    primaryAnalysis: `Position away from direct HVAC vents with 65 cm perimeter clearance to highlight the ${variant.name} finish (${product.dimensionsCm?.width}×${product.dimensionsCm?.depth}×${product.dimensionsCm?.height} cm).`,
    stylingOrPairing:
      'Anchor with warm 2700K–3000K architectural lighting, natural woven sisal floor runners, and raw travertine or volcanic stone accents.',
    materialCareAndOrigin: `Engineered at ${product.creatorStudio} (${product.sustainabilityMetric}). Dust with a dry microfiber cloth and refresh every 12 months with zero-VOC beeswax or cold-pressed tung oil.`,
    source: 'curated',
  };
}

export const AskStylistModal: React.FC<AskStylistModalProps> = ({
  product,
  initialVariant,
  currency,
  onClose,
  onOpenWebAR,
  onAddToCart,
  onTrackEvent,
}) => {
  const quickPrompts = getStylistQuickPrompts(product);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(initialVariant);
  const [selectedSize, setSelectedSize] = useState<string>(
    product.availableSizes?.[0] === 'ONE-SIZE' ? 'ONE-SIZE' : 'M',
  );
  const [userQuestion, setUserQuestion] = useState<string>(quickPrompts[0]);
  const [loading, setLoading] = useState<boolean>(false);
  const [recommendation, setRecommendation] = useState<UnifiedGeminiRecommendation>(() =>
    buildDefaultRecommendation(product, initialVariant),
  );
  const [addedFeedback, setAddedFeedback] = useState<boolean>(false);

  const fetchGeminiRecommendation = async (questionText: string, variant: ProductVariant) => {
    setLoading(true);
    onTrackEvent('ask_stylist_query', {
      productId: product.id,
      domain: product.domain,
      variantId: variant.id,
    });

    try {
      if (product.domain === 'fashion') {
        const res = await fetch('/api/gemini/stylist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productName: product.name,
            variantName: variant.name,
            materialComposition: product.materialComposition,
            heightCm: 174,
            weightKg: 68,
            recommendedSize: selectedSize,
            fitPreference: 'regular',
            occasionPrompt: questionText,
          }),
        });
        const data = await res.json();
        setRecommendation({
          headline: data.headline || `Nairobi Stylist & Care Brief · ${product.name}`,
          primaryAnalysis:
            data.drapeAnalysis ||
            `Tailored in Nairobi from ${product.materialComposition} with balanced drape across shoulders and torso.`,
          stylingOrPairing:
            data.pairingSuggestion ||
            'Pairs effortlessly with raw unbleached East African cotton silhouettes and hand-forged recycled brass cuffs.',
          materialCareAndOrigin:
            data.careAndOriginNote ||
            `Handcrafted at ${product.creatorStudio}. Spot-clean or cold hand-wash with neutral soap; air-dry in shade to preserve natural indigo and wax-print pigments.`,
          source: data.source,
        });
      } else {
        const res = await fetch('/api/gemini/spatial-advisor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productName: product.name,
            variantName: variant.name,
            materialComposition: product.materialComposition,
            dimensionsCm: product.dimensionsCm,
            companionPieces: [],
            roomQuestion: questionText,
          }),
        });
        const data = await res.json();
        setRecommendation({
          headline: data.headline || `Material Care & Spatial Spec · ${product.name}`,
          primaryAnalysis:
            data.spatialPlacementAdvice ||
            `Position away from direct HVAC vents with 65 cm perimeter clearance to showcase the ${variant.name} grain.`,
          stylingOrPairing:
            data.complementaryPairing ||
            'Combine with warm 2700K diffused lighting and natural woven sisal floor textures.',
          materialCareAndOrigin:
            data.materialSustainabilityStory ||
            `Crafted at ${product.creatorStudio} (${product.sustainabilityMetric}). Wipe with a dry microfiber cloth and refresh every 12 months with zero-VOC beeswax or tung oil.`,
          source: data.source,
        });
      }
    } catch (_err) {
      setRecommendation({
        headline: `Nairobi Artisan Styling & Care Guide · ${product.name}`,
        primaryAnalysis: product.description,
        stylingOrPairing:
          product.domain === 'fashion'
            ? 'Designed for layered East African gallery evenings and versatile global travel.'
            : 'Anchors warm contemporary interiors with authentic Kenyan bamboo and sisal textures.',
        materialCareAndOrigin: `${product.materialComposition} · ${product.sustainabilityMetric}. Handcrafted in ${product.originLocation}.`,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGeminiRecommendation(quickPrompts[0], selectedVariant);
  }, [product.id]);

  const effectivePriceKes = product.priceKes + selectedVariant.priceDeltaKes;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuestion.trim()) return;
    fetchGeminiRecommendation(userQuestion.trim(), selectedVariant);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Ask Stylist & Material Care Advisor: ${product.name}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto"
    >
      <div className="w-full max-w-2xl bg-[#111116] border border-white/15 rounded-2xl overflow-hidden text-[#F4F3EF] shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 bg-[#15151C] border-b border-white/10">
          <div className="flex items-center gap-2.5 min-w-0">
            <Sparkles className="w-4 h-4 text-[#D4AF37] shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-mono-tabular uppercase tracking-wider text-[#D4AF37]">
                Unity AI Stylist & Material Care Concierge
              </div>
              <h2 className="text-base font-semibold text-white truncate">{product.name}</h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Ask Stylist Modal"
            className="p-2 rounded-lg bg-[#1E1E28] text-[#E4E2DD] hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {/* Product Summary & Variant Selector Row */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center p-3.5 rounded-xl bg-[#16161E] border border-white/10">
            <div className="sm:col-span-4 aspect-[4/3] rounded-lg overflow-hidden border border-white/10">
              <ProductArtwork
                preset={product.artworkPreset}
                primaryHex={selectedVariant.swatchHex}
                secondaryHex={selectedVariant.secondaryHex}
                label={product.name}
                className="w-full h-full"
              />
            </div>

            <div className="sm:col-span-8 space-y-2">
              <div className="text-xs text-[#A1A09A]">
                <span>{product.creatorName}</span>
                <span aria-hidden="true"> · </span>
                <span>{product.creatorStudio}</span>
                <span aria-hidden="true"> · </span>
                <span className="font-mono-tabular text-[#D4AF37]">{product.paybillCode}</span>
              </div>

              <div className="text-sm font-semibold text-white">
                {selectedVariant.name} ·{' '}
                <span className="font-mono-tabular text-[#D97736]">
                  {formatCurrency(effectivePriceKes, currency)}
                </span>
              </div>

              <p className="text-xs text-[#A1A09A] leading-relaxed">
                {product.materialComposition}
              </p>

              {/* Variant Swatches */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs text-[#A1A09A]">Finish:</span>
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      setSelectedVariant(v);
                      fetchGeminiRecommendation(userQuestion, v);
                    }}
                    className={`px-2.5 py-1 text-xs rounded-lg border flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                      selectedVariant.id === v.id
                        ? 'bg-white/15 border-[#D97736] text-white font-medium'
                        : 'bg-[#111116] border-white/10 text-[#A1A09A] hover:text-white'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: v.swatchHex }}
                    />
                    <span>{v.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Inquiry Presets (Styling, Material Care, Sizing / Placement) */}
          <div className="space-y-2">
            <span className="block text-xs text-[#A1A09A]">
              Select a Topic or Ask a Custom Styling / Material Care Question:
            </span>
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((promptText, idx) => {
                const labels =
                  product.domain === 'fashion'
                    ? ['Styling & Occasions', 'Material Care & Wash', 'Sizing & Layering']
                    : ['Bamboo & Material Care', 'Room Lighting & Acoustics', 'Complementary Pieces'];
                const isSelected = userQuestion === promptText;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setUserQuestion(promptText);
                      fetchGeminiRecommendation(promptText, selectedVariant);
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                      isSelected
                        ? 'bg-[#D4AF37] text-[#0B0B0E] border-[#D4AF37] font-semibold'
                        : 'bg-[#181820] text-[#E4E2DD] border-white/10 hover:border-white/30'
                    }`}
                  >
                    {labels[idx]}
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleFormSubmit} className="flex flex-col sm:flex-row gap-2 pt-1">
              <label htmlFor="ask-stylist-custom-input" className="sr-only">
                Ask a styling or material care question
              </label>
              <input
                id="ask-stylist-custom-input"
                type="text"
                value={userQuestion}
                onChange={(e) => setUserQuestion(e.target.value)}
                placeholder="Ask about styling, climate suitability, stain/surface care, or Nairobi provenance..."
                className="flex-1 bg-[#0B0B0E] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#D97736]"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold bg-[#D97736] text-[#0B0B0E] rounded-xl hover:bg-[#EA8A47] transition-colors whitespace-nowrap shrink-0"
              >
                {loading ? 'Consulting Gemini...' : 'Ask Stylist'}
              </button>
            </form>
          </div>

          {/* Gemini Recommendation Output Card */}
          <div
            aria-live="polite"
            className="p-4 rounded-xl bg-[#16161E] border border-[#D4AF37]/35 space-y-3 text-xs"
          >
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
              <h3 className="text-sm font-semibold text-[#D4AF37]">{recommendation.headline}</h3>
              <span className="text-[11px] font-mono-tabular text-[#A1A09A] shrink-0">
                {loading ? 'Refreshing via Gemini...' : 'Nairobi Curator Brief'}
              </span>
            </div>

            <div className="space-y-2 leading-relaxed">
              <div>
                <span className="font-semibold text-white">
                  {product.domain === 'fashion'
                    ? 'Fit & Silhouette Analysis: '
                    : 'Spatial & Lighting Orientation: '}
                </span>
                <span className="text-[#E4E2DD]">{recommendation.primaryAnalysis}</span>
              </div>

              <div>
                <span className="font-semibold text-white">
                  {product.domain === 'fashion'
                    ? 'Wardrobe & Event Styling: '
                    : 'Interior & Acoustic Pairing: '}
                </span>
                <span className="text-[#E4E2DD]">{recommendation.stylingOrPairing}</span>
              </div>

              <div className="p-3 rounded-lg bg-[#0E0E13] border border-white/10 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#D97736] shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white">Material Care & Provenance: </span>
                  <span className="text-[#A1A09A]">{recommendation.materialCareAndOrigin}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer Actions: Launch WebAR or Add to Bag */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenWebAR(product);
              }}
              className="px-4 py-2.5 text-xs font-semibold bg-[#1B1B24] text-[#F4F3EF] border border-white/15 rounded-xl hover:bg-white/10 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              {product.domain === 'fashion' ? (
                <>
                  <Camera className="w-3.5 h-3.5 text-[#D97736]" />
                  Open in WebAR Virtual Try-On
                </>
              ) : (
                <>
                  <Box className="w-3.5 h-3.5 text-[#D4AF37]" />
                  Open in 3D Room Visualizer
                </>
              )}
            </button>

            <div className="flex items-center gap-2">
              {product.domain === 'fashion' &&
                product.availableSizes &&
                product.availableSizes[0] !== 'ONE-SIZE' && (
                  <select
                    aria-label="Select garment size"
                    value={selectedSize}
                    onChange={(e) => setSelectedSize(e.target.value)}
                    className="bg-[#181820] border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-mono-tabular"
                  >
                    {product.availableSizes.map((sz) => (
                      <option key={sz} value={sz}>
                        Size {sz}
                      </option>
                    ))}
                  </select>
                )}

              <button
                type="button"
                onClick={() => {
                  onAddToCart({
                    product,
                    variant: selectedVariant,
                    selectedSize: product.domain === 'fashion' ? selectedSize : undefined,
                  });
                  setAddedFeedback(true);
                  setTimeout(() => setAddedFeedback(false), 1800);
                }}
                className="px-4 py-2.5 text-xs font-semibold bg-[#D97736] text-[#0B0B0E] rounded-xl hover:bg-[#EA8A47] transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                {addedFeedback ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Added to Shared Bag
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-3.5 h-3.5" />
                    Add to Bag ({formatCurrency(effectivePriceKes, currency)})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
