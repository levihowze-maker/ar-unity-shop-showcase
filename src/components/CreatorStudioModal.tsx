import React, { useState } from 'react';
import { Check, PlusCircle, Sparkles, X } from 'lucide-react';
import { AppDomain, MarketplaceProduct } from '../utils/marketplaceLogic';

interface CreatorStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublishProduct: (newProduct: MarketplaceProduct) => void;
}

export const CreatorStudioModal: React.FC<CreatorStudioModalProps> = ({
  isOpen,
  onClose,
  onPublishProduct,
}) => {
  const [creatorEmail, setCreatorEmail] = useState<string>('artisan@example.com');
  const [productName, setProductName] = useState<string>('');
  const [domain, setDomain] = useState<AppDomain>('fashion');
  const [creatorName, setCreatorName] = useState<string>('');
  const [creatorStudio, setCreatorStudio] = useState<string>('Nairobi Artisan Collective');
  const [priceKes, setPriceKes] = useState<string>('19500');
  const [materialComposition, setMaterialComposition] = useState<string>(
    'Upcycled Kenyan Cotton Denim & Hand-carved Bone Accents',
  );
  const [sustainabilityMetric, setSustainabilityMetric] = useState<string>(
    '2.8 kg diverted textile waste · Solar-powered Nairobi workshop',
  );
  const [widthCm, setWidthCm] = useState<string>('74');
  const [depthCm, setDepthCm] = useState<string>('78');
  const [heightCm, setHeightCm] = useState<string>('75');
  const [primarySwatchHex, setPrimarySwatchHex] = useState<string>('#2563EB');
  const [secondarySwatchHex, setSecondarySwatchHex] = useState<string>('#D97736');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!productName.trim()) {
      setErrorMsg('Please enter a product title for the shared catalog.');
      return;
    }
    if (!creatorName.trim()) {
      setErrorMsg('Please enter the Nairobi creator or workshop name.');
      return;
    }
    const parsedPrice = Number(priceKes);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 500) {
      setErrorMsg('Please enter a valid price in KES (minimum KES 500).');
      return;
    }

    const codeSuffix = productName
      .replace(/[^A-Za-z0-9]/g, '')
      .toUpperCase()
      .slice(0, 10);

    const newProduct: MarketplaceProduct = {
      id: `custom-${Date.now()}`,
      paybillCode: `111111#${codeSuffix || 'NAIROBI'}`,
      name: productName.trim(),
      domain,
      category:
        domain === 'fashion' ? 'Upcycled Runway & Apparel' : 'Custom Bamboo & Spatial Design',
      creatorName: creatorName.trim(),
      creatorStudio: creatorStudio.trim() || 'Unity Art Collective · Nairobi',
      originLocation: 'Nairobi, Kenya',
      priceKes: parsedPrice,
      weightKg: domain === 'fashion' ? 1.1 : 16.5,
      leadTimeDays: domain === 'fashion' ? 'In Stock · Ships in 48h' : 'Made-to-Order · 7 Days',
      sustainabilityMetric: sustainabilityMetric.trim(),
      materialComposition: materialComposition.trim(),
      description: `Published via Unity Art Collective Creator Studio in Nairobi. Configured for instant WebAR ${
        domain === 'fashion' ? 'body & drape try-on' : 'room surface placement'
      } and global Paystack + M-PESA Paybill 000000 checkout.`,
      arTrackMode: domain === 'fashion' ? 'full-body' : undefined,
      availableSizes: domain === 'fashion' ? ['XS', 'S', 'M', 'L', 'XL'] : undefined,
      dimensionsCm:
        domain === 'furniture'
          ? {
              width: Number(widthCm) || 74,
              depth: Number(depthCm) || 78,
              height: Number(heightCm) || 75,
            }
          : undefined,
      artworkPreset: domain === 'fashion' ? 'denim-trench' : 'bamboo-lounge-chair',
      variants: [
        {
          id: `var-1-${Date.now()}`,
          name: 'Signature Nairobi Studio Edition',
          swatchHex: primarySwatchHex,
          secondaryHex: secondarySwatchHex,
          materialFinish: materialComposition.trim(),
          priceDeltaKes: 0,
          roughness: 0.55,
          metalness: 0.12,
        },
      ],
    };

    onPublishProduct(newProduct);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Creator & Seller WebAR Asset Publisher"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto"
    >
      <div className="w-full max-w-2xl bg-[#111116] border border-white/15 rounded-2xl p-6 text-[#F4F3EF] space-y-5">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <span className="text-xs font-mono-tabular uppercase tracking-wider text-[#D97736]">
              Creator & Workshop Onboarding · Magic-Link Session Verified
            </span>
            <h2 className="text-xl font-semibold mt-1">
              Publish Nairobi Piece to Shared WebAR Marketplace
            </h2>
            <p className="text-xs text-[#A1A09A] mt-0.5">
              Generates 3D WebAR try-on / room placement assets and assigns a structured Paybill
              000000 product code.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Creator Studio"
            className="p-2 rounded-lg bg-[#1A1A22] text-[#E4E2DD] hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#A1A09A] mb-1" htmlFor="creator-app-domain">
                Target WebAR Application
              </label>
              <select
                id="creator-app-domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value as AppDomain)}
                className="w-full bg-[#181820] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white"
              >
                <option value="fashion">
                  App 01 · AR Virtual Try-On (Fashion, Apparel & Jewelry)
                </option>
                <option value="furniture">
                  App 02 · Spatial Room AR (Bamboo Furniture & Sustainable Materials)
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-[#A1A09A] mb-1" htmlFor="creator-magic-email">
                Creator Magic-Link Account
              </label>
              <input
                id="creator-magic-email"
                type="email"
                value={creatorEmail}
                onChange={(e) => setCreatorEmail(e.target.value)}
                className="w-full bg-[#181820] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white font-mono-tabular"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#A1A09A] mb-1" htmlFor="creator-product-title">
                Product Name *
              </label>
              <input
                id="creator-product-title"
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g. Mathare Upcycled Patchwork Bomber"
                className="w-full bg-[#181820] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-[#A1A09A] mb-1" htmlFor="creator-artisan-name">
                Designer / Artisan Name *
              </label>
              <input
                id="creator-artisan-name"
                type="text"
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                placeholder="e.g. Your studio name"
                className="w-full bg-[#181820] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-[#A1A09A] mb-1" htmlFor="creator-price-kes">
                Price (KES) *
              </label>
              <input
                id="creator-price-kes"
                type="number"
                value={priceKes}
                onChange={(e) => setPriceKes(e.target.value)}
                className="w-full bg-[#181820] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white font-mono-tabular"
              />
            </div>

            <div>
              <label className="block text-xs text-[#A1A09A] mb-1" htmlFor="creator-primary-hex">
                Primary Material Swatch
              </label>
              <input
                id="creator-primary-hex"
                type="color"
                value={primarySwatchHex}
                onChange={(e) => setPrimarySwatchHex(e.target.value)}
                className="w-full h-9 bg-[#181820] border border-white/15 rounded-xl px-2 py-1"
              />
            </div>

            <div>
              <label className="block text-xs text-[#A1A09A] mb-1" htmlFor="creator-secondary-hex">
                Accent Trim Swatch
              </label>
              <input
                id="creator-secondary-hex"
                type="color"
                value={secondarySwatchHex}
                onChange={(e) => setSecondarySwatchHex(e.target.value)}
                className="w-full h-9 bg-[#181820] border border-white/15 rounded-xl px-2 py-1"
              />
            </div>
          </div>

          {domain === 'furniture' && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-[#A1A09A] mb-1" htmlFor="creator-width-cm">
                  Width (cm)
                </label>
                <input
                  id="creator-width-cm"
                  type="number"
                  value={widthCm}
                  onChange={(e) => setWidthCm(e.target.value)}
                  className="w-full bg-[#181820] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white font-mono-tabular"
                />
              </div>
              <div>
                <label className="block text-xs text-[#A1A09A] mb-1" htmlFor="creator-depth-cm">
                  Depth (cm)
                </label>
                <input
                  id="creator-depth-cm"
                  type="number"
                  value={depthCm}
                  onChange={(e) => setDepthCm(e.target.value)}
                  className="w-full bg-[#181820] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white font-mono-tabular"
                />
              </div>
              <div>
                <label className="block text-xs text-[#A1A09A] mb-1" htmlFor="creator-height-cm">
                  Height (cm)
                </label>
                <input
                  id="creator-height-cm"
                  type="number"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  className="w-full bg-[#181820] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white font-mono-tabular"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs text-[#A1A09A] mb-1" htmlFor="creator-materials">
              Material Provenance & Sourcing (Nairobi / East Africa)
            </label>
            <input
              id="creator-materials"
              type="text"
              value={materialComposition}
              onChange={(e) => setMaterialComposition(e.target.value)}
              className="w-full bg-[#181820] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white"
            />
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-red-950/80 border border-red-500/60 text-red-200 text-xs"
            >
              {errorMsg}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium bg-[#1A1A22] text-[#A1A09A] rounded-lg hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-semibold bg-[#D97736] text-[#0B0B0E] rounded-lg hover:bg-[#EA8A47] transition-colors flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Generate WebAR Assets & Publish to Catalog
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
