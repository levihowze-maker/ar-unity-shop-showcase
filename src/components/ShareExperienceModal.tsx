import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  MessageCircle,
  Share2,
  Smartphone,
  Sparkles,
  Video,
  X,
} from 'lucide-react';
import {
  buildShareableARPackage,
  CurrencyCode,
  formatCurrency,
  MarketplaceProduct,
  ProductVariant,
  UNITY_PAYBILL_NUMBER,
} from '../utils/marketplaceLogic';
import { ProductArtwork } from './ProductArtwork';

interface ShareExperienceModalProps {
  product: MarketplaceProduct;
  initialVariant: ProductVariant;
  currency: CurrencyCode;
  selectedSize?: string;
  companionCount?: number;
  sourceContext: 'product-card' | 'fashion-tryon-ar' | 'furniture-room-ar';
  onClose: () => void;
  onTrackEvent: (eventType: string, metadata?: Record<string, unknown>) => void;
}

type ShareChannel = 'web-share' | 'whatsapp' | 'instagram-stories' | 'tiktok';

/**
 * Renders a branded 9:16 vertical social story / TikTok card onto an HTML5 Canvas
 * so it can be shared directly as an image file via navigator.share({ files })
 * or downloaded for Instagram Stories / TikTok.
 */
function renderBrandedStoryCanvas(
  canvas: HTMLCanvasElement,
  product: MarketplaceProduct,
  variant: ProductVariant,
  currency: CurrencyCode,
  arUrl: string,
  selectedSize?: string,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = 540;
  const h = 960;
  canvas.width = w;
  canvas.height = h;

  // Deep obsidian editorial background
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#0B0B0E');
  grad.addColorStop(0.55, '#13131A');
  grad.addColorStop(1, '#09090C');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Subtle top & bottom framing borders
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, w - 48, h - 48);

  // Top Header Kicker
  ctx.fillStyle = '#D4AF37';
  ctx.font = '600 13px "JetBrains Mono", monospace';
  ctx.fillText('UNITY ART COLLECTIVE · NAIROBI WEBAR', 48, 66);

  ctx.fillStyle = '#A1A09A';
  ctx.font = '500 12px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    product.domain === 'fashion'
      ? '01. AR VIRTUAL TRY-ON · EAST AFRICAN FASHION'
      : '02. SPATIAL 3D ROOM AR · BAMBOO & SUSTAINABLE MATERIALS',
    48,
    90,
  );

  // Center Visual Showcase Stage
  ctx.fillStyle = '#171721';
  ctx.fillRect(48, 120, w - 96, 390);
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.strokeRect(48, 120, w - 96, 390);

  // Radial glow inside stage using variant swatch color
  const stageGlow = ctx.createRadialGradient(w / 2, 315, 20, w / 2, 315, 190);
  stageGlow.addColorStop(0, variant.swatchHex);
  stageGlow.addColorStop(1, 'rgba(23, 23, 33, 0)');
  ctx.save();
  ctx.globalAlpha = 0.32;
  ctx.fillStyle = stageGlow;
  ctx.fillRect(48, 120, w - 96, 390);
  ctx.restore();

  // Architectural geometric silhouette representing the piece & variant
  ctx.save();
  ctx.translate(w / 2, 315);
  ctx.fillStyle = variant.swatchHex;
  ctx.strokeStyle = variant.secondaryHex;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(-95, -110, 190, 220, 18);
  ctx.fill();
  ctx.stroke();

  // Inner accent detail
  ctx.fillStyle = variant.secondaryHex;
  ctx.fillRect(-55, -20, 110, 28);
  ctx.restore();

  // Swatch & Origin Tag inside stage
  ctx.fillStyle = '#F4F3EF';
  ctx.font = '600 13px "JetBrains Mono", monospace';
  ctx.fillText(`FINISH: ${variant.name.toUpperCase()}`, 68, 485);

  // Product Title & Metadata
  ctx.fillStyle = '#F4F3EF';
  ctx.font = '700 24px "Bricolage Grotesque", sans-serif';
  const words = product.name.split(' ');
  let line = '';
  let y = 558;
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > w - 96) {
      ctx.fillText(line, 48, y);
      line = word;
      y += 32;
    } else {
      line = testLine;
    }
  }
  if (line) {
    ctx.fillText(line, 48, y);
    y += 34;
  }

  // Creator & Studio
  ctx.fillStyle = '#D97736';
  ctx.font = '600 15px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`${product.creatorName} · ${product.creatorStudio} (${product.originLocation})`, 48, y);
  y += 28;

  // Material Composition
  ctx.fillStyle = '#A1A09A';
  ctx.font = '400 13px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(product.materialComposition.slice(0, 66), 48, y);
  y += 42;

  // Price & M-PESA Paybill Box
  ctx.fillStyle = '#14141C';
  ctx.fillRect(48, y, w - 96, 86);
  ctx.strokeStyle = 'rgba(217, 119, 54, 0.45)';
  ctx.strokeRect(48, y, w - 96, 86);

  const effectivePriceKes = product.priceKes + variant.priceDeltaKes;
  ctx.fillStyle = '#F4F3EF';
  ctx.font = '700 20px "JetBrains Mono", monospace';
  ctx.fillText(
    `${formatCurrency(effectivePriceKes, currency)}${
      selectedSize ? ` · FIT SIZE ${selectedSize}` : ''
    }`,
    68,
    y + 36,
  );

  ctx.fillStyle = '#D4AF37';
  ctx.font = '500 13px "JetBrains Mono", monospace';
  ctx.fillText(
    `M-PESA PAYBILL ${UNITY_PAYBILL_NUMBER} · REF ${product.paybillCode}`,
    68,
    y + 64,
  );

  // Bottom WebAR Callout Footer
  ctx.fillStyle = '#A1A09A';
  ctx.font = '500 12px "JetBrains Mono", monospace';
  ctx.fillText('TRY ON / PLACE IN 3D WEBAR:', 48, h - 78);

  ctx.fillStyle = '#F4F3EF';
  ctx.font = '500 12px "JetBrains Mono", monospace';
  ctx.fillText(arUrl.slice(0, 56), 48, h - 54);
}

export const ShareExperienceModal: React.FC<ShareExperienceModalProps> = ({
  product,
  initialVariant,
  currency,
  selectedSize,
  companionCount = 0,
  sourceContext,
  onClose,
  onTrackEvent,
}) => {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(initialVariant);
  const [statusBanner, setStatusBanner] = useState<{
    channel: ShareChannel;
    message: string;
  } | null>(null);
  const [linkCopied, setLinkCopied] = useState<boolean>(false);
  const storyCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const baseUrl =
    typeof window !== 'undefined' ? window.location.origin : 'https://unitycollective.art';

  const sharePkg = buildShareableARPackage({
    baseUrl,
    product,
    variant: selectedVariant,
    selectedSize,
    companionCount,
  });

  useEffect(() => {
    if (storyCanvasRef.current) {
      renderBrandedStoryCanvas(
        storyCanvasRef.current,
        product,
        selectedVariant,
        currency,
        sharePkg.arExperienceUrl,
        selectedSize,
      );
    }
  }, [product, selectedVariant, currency, sharePkg.arExperienceUrl, selectedSize]);

  const copyTextSafely = async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_err) {
      // Fallback below
    }
    return false;
  };

  const buildCanvasFile = async (): Promise<File | null> => {
    const canvas = storyCanvasRef.current;
    if (!canvas || typeof canvas.toBlob !== 'function') return null;
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve(null);
          return;
        }
        const file = new File([blob], `unity-webar-${product.id}-${selectedVariant.id}.png`, {
          type: 'image/png',
        });
        resolve(file);
      }, 'image/png');
    });
  };

  /**
   * Invokes the browser's Web Share API (navigator.share) for the selected social channel
   * or native share sheet, with graceful fallback when running in desktop/headless browsers.
   */
  const handleChannelShare = async (channel: ShareChannel) => {
    onTrackEvent('share_ar_experience', {
      productId: product.id,
      variantId: selectedVariant.id,
      channel,
      sourceContext,
    });

    const channelText =
      channel === 'instagram-stories'
        ? sharePkg.instagramStoryCaption
        : channel === 'tiktok'
          ? sharePkg.tiktokCaption
          : sharePkg.shareText;

    // 1. Attempt Web Share API first (with 9:16 story frame file for Instagram Stories / TikTok when supported)
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        if (channel === 'instagram-stories' || channel === 'tiktok') {
          const storyFile = await buildCanvasFile();
          if (
            storyFile &&
            typeof navigator.canShare === 'function' &&
            navigator.canShare({ files: [storyFile] })
          ) {
            await navigator.share({
              title: sharePkg.shareTitle,
              text: channelText,
              url: sharePkg.arExperienceUrl,
              files: [storyFile],
            });
            setStatusBanner({
              channel,
              message: `Shared ${product.name} (${selectedVariant.name}) 9:16 Story Frame & WebAR link via Web Share API.`,
            });
            return;
          }
        }

        await navigator.share({
          title: sharePkg.shareTitle,
          text: channelText,
          url: sharePkg.arExperienceUrl,
        });
        setStatusBanner({
          channel,
          message: `Shared ${product.name} (${selectedVariant.name}) & WebAR link via Web Share API.`,
        });
        return;
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        // Continue to channel-specific fallback below if Web Share API is blocked in iframe/desktop
      }
    }

    // 2. Graceful fallback when Web Share API is unavailable or restricted in desktop/iframe
    await copyTextSafely(`${channelText}\n${sharePkg.arExperienceUrl}`);

    if (channel === 'whatsapp') {
      setStatusBanner({
        channel: 'whatsapp',
        message: `WhatsApp WebAR message & link copied! Ready to send for ${product.name} (${selectedVariant.name}).`,
      });
    } else if (channel === 'instagram-stories') {
      setStatusBanner({
        channel: 'instagram-stories',
        message: `Instagram Stories 9:16 frame & @unitycollective.art WebAR sticker link prepared and copied to clipboard.`,
      });
    } else if (channel === 'tiktok') {
      setStatusBanner({
        channel: 'tiktok',
        message: `TikTok WebAR caption, hashtags & deep link copied! Ready to paste into your TikTok post or bio.`,
      });
    } else {
      setStatusBanner({
        channel: 'web-share',
        message: `Web Share payload & AR deep link copied to clipboard for ${product.name} (${selectedVariant.name}).`,
      });
    }
  };

  const handleDownloadStoryFrame = () => {
    const canvas = storyCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `unity-webar-${product.id}-${selectedVariant.id}.png`;
    a.click();
    onTrackEvent('download_story_frame', {
      productId: product.id,
      variantId: selectedVariant.id,
    });
    setStatusBanner({
      channel: 'instagram-stories',
      message: 'Downloaded 9:16 Branded Story Card PNG for Instagram Stories & TikTok.',
    });
  };

  const handleCopyDeepLink = async () => {
    await copyTextSafely(sharePkg.arExperienceUrl);
    setLinkCopied(true);
    onTrackEvent('copy_ar_link', {
      productId: product.id,
      variantId: selectedVariant.id,
    });
    setTimeout(() => setLinkCopied(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Share WebAR Experience: ${product.name}`}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 overflow-y-auto"
    >
      <div className="w-full max-w-2xl bg-[#111116] border border-white/15 rounded-2xl overflow-hidden text-[#F4F3EF] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 bg-[#15151C] border-b border-white/10">
          <div className="flex items-center gap-2.5 min-w-0">
            <Share2 className="w-4 h-4 text-[#D97736] shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-mono-tabular uppercase tracking-wider text-[#D4AF37]">
                Web Share API · WhatsApp · Instagram Stories · TikTok
              </div>
              <h2 className="text-base font-semibold text-white truncate">
                Share {product.name}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Share Modal"
            className="p-2 rounded-lg bg-[#1E1E28] text-[#E4E2DD] hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[84vh] overflow-y-auto">
          {/* Product + Active Variant + 9:16 Story Card Preview */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center p-4 rounded-xl bg-[#16161E] border border-white/10">
            {/* Left: Branded 9:16 Story Frame Canvas Preview */}
            <div className="md:col-span-4 flex flex-col items-center space-y-2">
              <div className="w-36 aspect-[9/16] rounded-xl overflow-hidden border border-white/15 bg-[#0B0B0E] shadow-lg">
                <canvas
                  ref={storyCanvasRef}
                  aria-label="Branded 9:16 Instagram Story and TikTok WebAR Card Preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={handleDownloadStoryFrame}
                className="text-[11px] font-medium text-[#D4AF37] hover:underline flex items-center gap-1 whitespace-nowrap"
              >
                <Download className="w-3 h-3" />
                Save 9:16 Story PNG
              </button>
            </div>

            {/* Right: Product & Variant Selector + Share Summary */}
            <div className="md:col-span-8 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-16 h-12 rounded-lg overflow-hidden border border-white/10 shrink-0">
                  <ProductArtwork
                    preset={product.artworkPreset}
                    primaryHex={selectedVariant.swatchHex}
                    secondaryHex={selectedVariant.secondaryHex}
                    label={product.name}
                    enable3DPreviewToggle={false}
                    className="w-full h-full"
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-[#A1A09A]">
                    <span>{product.creatorName}</span>
                    <span aria-hidden="true"> · </span>
                    <span>{product.originLocation}</span>
                  </div>
                  <div className="text-sm font-semibold text-white truncate">{product.name}</div>
                  <div className="text-xs font-mono-tabular text-[#D97736]">
                    {selectedVariant.name} ·{' '}
                    {formatCurrency(product.priceKes + selectedVariant.priceDeltaKes, currency)}
                  </div>
                </div>
              </div>

              {/* Switch Variant Before Sharing */}
              <div className="space-y-1.5 pt-1 border-t border-white/10">
                <span className="block text-xs text-[#A1A09A]">
                  Included Variant in Shared WebAR Link:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {product.variants.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariant(v)}
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

              {/* Deep Link Copy Box */}
              <div className="space-y-1 pt-1">
                <label
                  htmlFor="share-webar-url-input"
                  className="block text-xs text-[#A1A09A]"
                >
                  Direct WebAR Experience Link (auto-loads product, variant & AR view):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="share-webar-url-input"
                    type="text"
                    readOnly
                    value={sharePkg.arExperienceUrl}
                    className="flex-1 bg-[#0B0B0E] border border-white/15 rounded-xl px-3 py-2 text-xs font-mono-tabular text-[#E4E2DD] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyDeepLink}
                    className="px-3.5 py-2 text-xs font-semibold bg-[#1E1E28] text-[#F4F3EF] border border-white/15 rounded-xl hover:bg-white/10 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    {linkCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy Link
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Primary Native Web Share API Button + Direct Social Channels */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => handleChannelShare('web-share')}
              className="w-full py-3 px-4 text-xs sm:text-sm font-semibold bg-[#D97736] text-[#0B0B0E] rounded-xl hover:bg-[#EA8A47] transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Share2 className="w-4 h-4 shrink-0" />
              <span>Share via Native Web Share API (Product, Variant & AR Link)</span>
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* WhatsApp Direct Share */}
              <button
                type="button"
                onClick={() => handleChannelShare('whatsapp')}
                className="p-3 rounded-xl bg-[#16161E] border border-white/15 hover:border-emerald-400/50 transition-colors flex flex-col justify-between gap-2 text-left"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                    WhatsApp
                  </span>
                  <ExternalLink className="w-3 h-3 text-[#A1A09A]" />
                </div>
                <p className="text-[11px] text-[#A1A09A] leading-snug">
                  Share product, variant price, Paybill {UNITY_PAYBILL_NUMBER} ref & WebAR link to
                  WhatsApp.
                </p>
              </button>

              {/* Instagram Stories Share */}
              <button
                type="button"
                onClick={() => handleChannelShare('instagram-stories')}
                className="p-3 rounded-xl bg-[#16161E] border border-white/15 hover:border-[#D97736]/60 transition-colors flex flex-col justify-between gap-2 text-left"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-[#D97736]" />
                    Instagram Stories
                  </span>
                  <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                </div>
                <p className="text-[11px] text-[#A1A09A] leading-snug">
                  Share 9:16 branded story frame & @unitycollective.art WebAR link sticker via Web
                  Share API.
                </p>
              </button>

              {/* TikTok Share */}
              <button
                type="button"
                onClick={() => handleChannelShare('tiktok')}
                className="p-3 rounded-xl bg-[#16161E] border border-white/15 hover:border-[#D4AF37]/60 transition-colors flex flex-col justify-between gap-2 text-left"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-[#D4AF37]" />
                    TikTok
                  </span>
                  <Share2 className="w-3 h-3 text-[#A1A09A]" />
                </div>
                <p className="text-[11px] text-[#A1A09A] leading-snug">
                  Share 9:16 look card, Nairobi artisan caption & WebAR try-on link to TikTok.
                </p>
              </button>
            </div>
          </div>

          {/* Live Status Feedback Banner */}
          {statusBanner && (
            <div
              role="status"
              aria-live="polite"
              className="p-3.5 rounded-xl bg-[#14221A] border border-emerald-500/40 text-xs text-emerald-200 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{statusBanner.message}</span>
              </div>
              {statusBanner.channel === 'whatsapp' && (
                <a
                  href={sharePkg.whatsappShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 rounded-lg bg-emerald-500 text-[#0B0B0E] font-semibold whitespace-nowrap shrink-0"
                >
                  Open WhatsApp
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
