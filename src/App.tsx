/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Camera,
  Clock,
  Globe,
  Heart,
  Layers,
  Plus,
  QrCode,
  Search,
  Share2,
  ShoppingBag,
  Sparkles,
  X,
} from 'lucide-react';
import { INITIAL_SHARED_CATALOG } from './data/catalog';
import {
  AppDomain,
  CartItemInput,
  CurrencyCode,
  filterCatalogProducts,
  formatCurrency,
  MarketplaceProduct,
  matchesMaterialCategory,
  MATERIAL_CATEGORY_OPTIONS,
  MaterialCategoryFilter,
  MAX_RECENTLY_VIEWED_ITEMS,
  ProductVariant,
  recordRecentlyViewedProduct,
  resolveRecentlyViewedProducts,
} from './utils/marketplaceLogic';
import { ProductArtwork } from './components/ProductArtwork';
import { FashionTryOnModal } from './components/FashionTryOnModal';
import { FurnitureARModal } from './components/FurnitureARModal';
import { CheckoutDrawer } from './components/CheckoutDrawer';
import { CreatorStudioModal } from './components/CreatorStudioModal';
import { AskStylistModal } from './components/AskStylistModal';
import { ShareExperienceModal } from './components/ShareExperienceModal';

type CatalogFilter = 'all' | 'fashion' | 'furniture' | 'wishlist';

const RECENTLY_VIEWED_STORAGE_KEY = 'unity_recently_viewed_ids';

export default function App() {
  const [catalog, setCatalog] = useState<MarketplaceProduct[]>(INITIAL_SHARED_CATALOG);
  const [activeFilter, setActiveFilter] = useState<CatalogFilter>('all');
  const [activeMaterialFilter, setActiveMaterialFilter] =
    useState<MaterialCategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currency, setCurrency] = useState<CurrencyCode>('KES');
  const [selectedVariants, setSelectedVariants] = useState<Record<string, ProductVariant>>(() => {
    const initial: Record<string, ProductVariant> = {};
    for (const item of INITIAL_SHARED_CATALOG) {
      initial[item.id] = item.variants[0];
    }
    return initial;
  });

  // Active WebAR, Stylist & Share Modal States
  const [activeFashionTryOn, setActiveFashionTryOn] = useState<MarketplaceProduct | null>(null);
  const [activeFurnitureAR, setActiveFurnitureAR] = useState<MarketplaceProduct | null>(null);
  const [activeStylistProduct, setActiveStylistProduct] = useState<MarketplaceProduct | null>(
    null,
  );
  const [shareTarget, setShareTarget] = useState<{
    product: MarketplaceProduct;
    variant: ProductVariant;
    selectedSize?: string;
    companionCount?: number;
    sourceContext: 'product-card' | 'fashion-tryon-ar' | 'furniture-room-ar';
  } | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [isCreatorStudioOpen, setIsCreatorStudioOpen] = useState<boolean>(false);
  const [qrEventBannerOpen, setQrEventBannerOpen] = useState<boolean>(false);

  // Wishlist, Recently Viewed (last 5 interacted products) & Shared Cart State
  const [wishlistIds, setWishlistIds] = useState<string[]>(['kibera-denim-trench']);
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>(() => {
    try {
      const saved = window.localStorage.getItem(RECENTLY_VIEWED_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.slice(0, MAX_RECENTLY_VIEWED_ITEMS);
        }
      }
    } catch (_err) {
      // Fallback to default seed below
    }
    return ['kibera-denim-trench', 'aberdare-bamboo-chair'];
  });

  const handleRecordProductInteraction = (productId: string) => {
    setRecentlyViewedIds((prev) => {
      const next = recordRecentlyViewedProduct(prev, productId, MAX_RECENTLY_VIEWED_ITEMS);
      try {
        window.localStorage.setItem(RECENTLY_VIEWED_STORAGE_KEY, JSON.stringify(next));
      } catch (_err) {
        // Ignore storage quota errors
      }
      return next;
    });
  };

  const handleClearRecentlyViewed = () => {
    setRecentlyViewedIds([]);
    try {
      window.localStorage.setItem(RECENTLY_VIEWED_STORAGE_KEY, JSON.stringify([]));
    } catch (_err) {
      // Ignore storage errors
    }
  };

  const [cartItems, setCartItems] = useState<CartItemInput[]>([
    {
      productId: 'kibera-denim-trench',
      paybillCode: '111111#KIBERATRENCH',
      name: 'Kibera Upcycled Indigo & Kitenge Architectural Coat',
      domain: 'fashion',
      unitPriceKes: 22500,
      weightKg: 1.35,
      quantity: 1,
      variantName: 'Raw Indigo & Terracotta Kitenge',
      selectedSize: 'M',
    },
  ]);

  // Analytics tracker helper
  const trackAnalyticsEvent = (eventType: string, metadata?: Record<string, unknown>) => {
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType, metadata }),
    }).catch(() => {});
  };

  // Support shared deep-link query params (?ar=fashion&product=...&variant=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const arMode = params.get('ar');
    const productIdParam = params.get('product');
    const variantIdParam = params.get('variant');

    if (productIdParam) {
      const matchedProduct = catalog.find((p) => p.id === productIdParam);
      if (matchedProduct) {
        handleRecordProductInteraction(matchedProduct.id);
        if (variantIdParam) {
          const matchedVariant = matchedProduct.variants.find((v) => v.id === variantIdParam);
          if (matchedVariant) {
            setSelectedVariants((prev) => ({
              ...prev,
              [matchedProduct.id]: matchedVariant,
            }));
          }
        }
        if (matchedProduct.domain === 'fashion') {
          setActiveFashionTryOn(matchedProduct);
        } else {
          setActiveFurnitureAR(matchedProduct);
        }
        return;
      }
    }

    if (arMode === 'fashion') {
      const firstFashion = catalog.find((p) => p.domain === 'fashion');
      if (firstFashion) {
        handleRecordProductInteraction(firstFashion.id);
        setActiveFashionTryOn(firstFashion);
      }
    } else if (arMode === 'furniture') {
      const firstFurniture = catalog.find((p) => p.domain === 'furniture');
      if (firstFurniture) {
        handleRecordProductInteraction(firstFurniture.id);
        setActiveFurnitureAR(firstFurniture);
      }
    }
  }, []);

  const handleToggleWishlist = (productId: string) => {
    handleRecordProductInteraction(productId);
    setWishlistIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId],
    );
  };

  const handleAddToCart = (params: {
    product: MarketplaceProduct;
    variant: ProductVariant;
    selectedSize?: string;
    isDepositOnly?: boolean;
  }) => {
    const { product, variant, selectedSize, isDepositOnly } = params;
    handleRecordProductInteraction(product.id);
    const unitPriceKes = product.priceKes + variant.priceDeltaKes;

    setCartItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          item.productId === product.id &&
          item.variantName === variant.name &&
          item.selectedSize === selectedSize &&
          Boolean(item.isDepositOnly) === Boolean(isDepositOnly),
      );
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1,
        };
        return updated;
      }
      return [
        ...prev,
        {
          productId: product.id,
          paybillCode: product.paybillCode,
          name: product.name,
          domain: product.domain,
          unitPriceKes,
          weightKg: product.weightKg,
          quantity: 1,
          variantName: variant.name,
          selectedSize,
          isDepositOnly,
        },
      ];
    });

    trackAnalyticsEvent('add_to_cart', {
      productId: product.id,
      domain: product.domain,
      variant: variant.name,
    });
  };

  const handleAddSceneToCart = (
    sceneEntries: Array<{
      product: MarketplaceProduct;
      variant: ProductVariant;
      isDepositOnly: boolean;
    }>,
  ) => {
    sceneEntries.forEach((entry) => {
      handleAddToCart({
        product: entry.product,
        variant: entry.variant,
        isDepositOnly: entry.isDepositOnly,
      });
    });
    setIsCheckoutOpen(true);
  };

  const handleUpdateQuantity = (index: number, delta: number) => {
    setCartItems((prev) => {
      const updated = [...prev];
      const nextQty = updated[index].quantity + delta;
      if (nextQty <= 0) {
        return updated.filter((_, idx) => idx !== index);
      }
      updated[index] = { ...updated[index], quantity: nextQty };
      return updated;
    });
  };

  const handleToggleItemDeposit = (index: number) => {
    setCartItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        isDepositOnly: !updated[index].isDepositOnly,
      };
      return updated;
    });
  };

  const handleRemoveCartItem = (index: number) => {
    setCartItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handlePublishCreatorProduct = (newProd: MarketplaceProduct) => {
    setCatalog((prev) => [newProd, ...prev]);
    setSelectedVariants((prev) => ({
      ...prev,
      [newProd.id]: newProd.variants[0],
    }));
    handleRecordProductInteraction(newProd.id);
    setActiveFilter(newProd.domain);
    trackAnalyticsEvent('creator_publish', { productId: newProd.id, domain: newProd.domain });
  };

  const filteredProducts = filterCatalogProducts({
    catalog,
    domainFilter: activeFilter,
    materialFilter: activeMaterialFilter,
    wishlistIds,
    searchQuery,
  });

  const recentlyViewedProducts = resolveRecentlyViewedProducts(
    catalog,
    recentlyViewedIds,
    MAX_RECENTLY_VIEWED_ITEMS,
  );

  const fashionProducts = catalog.filter((p) => p.domain === 'fashion');
  const furnitureProducts = catalog.filter((p) => p.domain === 'furniture');
  const totalBagCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0B0E] text-[#F4F3EF]">
      {/* Top Bar Contract: Strictly 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-6 lg:px-10 py-4 bg-[#0B0B0E]/95 border-b border-white/10">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveFilter('all');
          }}
          className="text-lg font-bold tracking-tight text-[#F4F3EF] font-display whitespace-nowrap shrink-0"
        >
          Unity Art Collective
        </a>

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-[#A1A09A]"
        >
          <a
            href="#catalog-section"
            onClick={() => setActiveFilter('all')}
            className="hover:text-[#F4F3EF] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Shared Catalog
          </a>
          <a
            href="#catalog-section"
            onClick={() => setActiveFilter('fashion')}
            className="hover:text-[#F4F3EF] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Fashion Try-On
          </a>
          <a
            href="#catalog-section"
            onClick={() => setActiveFilter('furniture')}
            className="hover:text-[#F4F3EF] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Spatial Home AR
          </a>
          <a
            href="#provenance-section"
            className="hover:text-[#F4F3EF] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Nairobi Hub
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setIsCheckoutOpen(true)}
            className="px-4 py-2 text-xs font-semibold bg-[#D97736] text-[#0B0B0E] rounded-lg hover:bg-[#EA8A47] transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Bag & Checkout ({totalBagCount})</span>
          </button>
        </div>
      </header>

      <main id="top" className="flex-1">
        {/* SECTION 1: EDITORIAL HERO & DUAL WEBAR EXPERIENCE LAUNCHER */}
        <section className="max-w-[1360px] mx-auto px-6 lg:px-10 pt-8 pb-14 border-b border-white/10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
            {/* Left Column: Positioning, Dual-App Switcher & Primary Launch */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="text-xs text-[#A1A09A] flex flex-wrap items-center gap-2">
                  <span className="text-[#D4AF37] font-medium">
                    Unity Art Collective
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Made in Nairobi, Designed for the World</span>
                  <span aria-hidden="true">·</span>
                  <span>WebAR Commerce</span>
                </div>

                <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#F4F3EF] leading-[1.08]">
                  Try East African Upcycled Fashion & Place Nairobi Bamboo Architecture in Your
                  Space.
                </h1>

                <p className="text-base text-[#A1A09A] max-w-[64ch] leading-relaxed">
                  Two zero-friction WebAR product experiences powered by one shared Nairobi artisan
                  catalog. Calibrate garment drape on your body or place full-scale laminated
                  highland bamboo furniture and BIPV solar partitions in your room — with instant
                  M-PESA Paybill 000000 and international Paystack settlement.
                </p>
              </div>

              {/* Dual App Launcher Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* App 01 Card */}
                <div className="p-5 rounded-2xl bg-[#131319] border border-white/10 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <div className="text-xs font-mono-tabular text-[#D97736]">
                      01. AR VIRTUAL TRY-ON
                    </div>
                    <h2 className="text-base font-semibold text-white">
                      Fashion, Apparel & Recycled Brass
                    </h2>
                    <p className="text-xs text-[#A1A09A] leading-relaxed">
                      “Try before you buy — East African and upcycled fashion, fitted to you,
                      anywhere.” Pose calibration, size drape mapping & Gemini stylist.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const heroFashion = fashionProducts[0];
                      if (heroFashion) {
                        trackAnalyticsEvent('try_on_start', { productId: heroFashion.id });
                        setActiveFashionTryOn(heroFashion);
                      }
                    }}
                    className="w-full py-2.5 px-4 text-xs font-semibold bg-[#D97736] text-[#0B0B0E] rounded-xl hover:bg-[#EA8A47] transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Launch Fashion Try-On Studio
                  </button>
                </div>

                {/* App 02 Card */}
                <div className="p-5 rounded-2xl bg-[#131319] border border-white/10 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <div className="text-xs font-mono-tabular text-[#D4AF37]">
                      02. SPATIAL ROOM VISUALIZER
                    </div>
                    <h2 className="text-base font-semibold text-white">
                      Bamboo Furniture & BIPV Materials
                    </h2>
                    <p className="text-xs text-[#A1A09A] leading-relaxed">
                      “See it in your space — bamboo furniture, sustainable materials, and custom
                      pieces from Nairobi.” Multi-piece room placement & 50% custom deposits.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const heroFurniture = furnitureProducts[0];
                      if (heroFurniture) {
                        trackAnalyticsEvent('room_placement', { productId: heroFurniture.id });
                        setActiveFurnitureAR(heroFurniture);
                      }
                    }}
                    className="w-full py-2.5 px-4 text-xs font-semibold bg-[#F4F3EF] text-[#0B0B0E] rounded-xl hover:bg-white transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <Box className="w-3.5 h-3.5" />
                    Launch 3D Room Visualizer
                  </button>
                </div>
              </div>

              {/* Workspace Toolbar: Currency Toggle, Creator Studio & Event QR Mode */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#A1A09A]">Display Currency:</span>
                  <div className="flex items-center bg-[#15151C] p-1 rounded-lg border border-white/10">
                    {(['KES', 'USD'] as CurrencyCode[]).map((curr) => (
                      <button
                        key={curr}
                        type="button"
                        onClick={() => setCurrency(curr)}
                        className={`px-3 py-1 text-xs font-mono-tabular rounded-md transition-colors whitespace-nowrap ${
                          currency === curr
                            ? 'bg-[#D97736] text-[#0B0B0E] font-semibold'
                            : 'text-[#A1A09A] hover:text-white'
                        }`}
                      >
                        {curr === 'KES' ? 'KES (Kenya Shilling)' : 'USD (Global)'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQrEventBannerOpen((v) => !v)}
                    className="px-3 py-1.5 text-xs font-medium bg-[#15151C] text-[#E4E2DD] border border-white/15 rounded-lg hover:border-white/35 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <QrCode className="w-3.5 h-3.5 text-[#D4AF37]" />
                    Art After Dark QR Demo
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCreatorStudioOpen(true)}
                    className="px-3 py-1.5 text-xs font-medium bg-[#15151C] text-[#D97736] border border-[#D97736]/40 rounded-lg hover:bg-[#D97736]/10 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Creator Onboarding Studio
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: High-Contrast Studio Campaign Visual */}
            <div className="lg:col-span-5 flex flex-col">
              <div className="relative flex-1 min-h-[360px] rounded-2xl overflow-hidden border border-white/10 bg-[#121216] flex flex-col justify-between">
                <ProductArtwork preset="hero-campaign" className="w-full h-full flex-1" />
                <div className="p-4 bg-gradient-to-t from-black/95 via-black/80 to-transparent flex items-center justify-between gap-3 border-t border-white/10">
                  <div className="text-xs text-[#E4E2DD]">
                    <span className="font-semibold text-white">Unity Shared Asset Pipeline</span>
                    <span aria-hidden="true"> · </span>
                    <span className="text-[#A1A09A]">
                      3D &amp; Image Storage · Offline-Ready Catalog
                    </span>
                  </div>
                  <span className="text-xs font-mono-tabular text-[#D4AF37] shrink-0">
                    PAYBILL 000000
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Optional Art After Dark Showroom QR Banner */}
          {qrEventBannerOpen && (
            <div className="mt-6 p-4 rounded-xl bg-[#14141B] border border-[#D4AF37]/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1 text-xs">
                <div className="font-semibold text-[#D4AF37]">
                  Art After Dark & Nairobi Showroom QR Activation Mode
                </div>
                <p className="text-[#A1A09A]">
                  Event guests scanning physical QR tags on garments or bamboo furniture pieces
                  launch straight into pre-calibrated WebAR overlays without app-store downloads.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveFashionTryOn(fashionProducts[1] || fashionProducts[0])}
                  className="px-3 py-1.5 text-xs font-medium bg-[#D97736] text-[#0B0B0E] rounded-lg whitespace-nowrap"
                >
                  Simulate Jewelry QR Scan
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setActiveFurnitureAR(furnitureProducts[1] || furnitureProducts[0])
                  }
                  className="px-3 py-1.5 text-xs font-medium bg-[#F4F3EF] text-[#0B0B0E] rounded-lg whitespace-nowrap"
                >
                  Simulate Table Showroom QR
                </button>
              </div>
            </div>
          )}
        </section>

        {/* SECTION 2: SHARED MARKETPLACE CATALOG & WEBAR LAUNCH GRID */}
        <section
          id="catalog-section"
          className="max-w-[1360px] mx-auto px-6 lg:px-10 py-14 border-b border-white/10"
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
              <div className="text-xs text-[#A1A09A]">
                <span>Shared Nairobi Production Catalog</span>
                <span aria-hidden="true"> · </span>
                <span>Direct Artisan-to-Global Distribution</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#F4F3EF] mt-1">
                WebAR-Enabled Collections
              </h2>
            </div>

            {/* Interactive Filter Tabs (Functional Segmented Buttons) */}
            <div
              role="tablist"
              aria-label="Filter Shared Marketplace Catalog"
              className="flex flex-wrap items-center gap-1.5 p-1 bg-[#14141A] rounded-xl border border-white/10"
            >
              <button
                role="tab"
                aria-selected={activeFilter === 'all'}
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  activeFilter === 'all'
                    ? 'bg-[#F4F3EF] text-[#0B0B0E]'
                    : 'text-[#A1A09A] hover:text-white'
                }`}
              >
                All Shared Catalog ({catalog.length})
              </button>
              <button
                role="tab"
                aria-selected={activeFilter === 'fashion'}
                type="button"
                onClick={() => setActiveFilter('fashion')}
                className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  activeFilter === 'fashion'
                    ? 'bg-[#D97736] text-[#0B0B0E]'
                    : 'text-[#A1A09A] hover:text-white'
                }`}
              >
                01. Fashion & Accessories ({fashionProducts.length})
              </button>
              <button
                role="tab"
                aria-selected={activeFilter === 'furniture'}
                type="button"
                onClick={() => setActiveFilter('furniture')}
                className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  activeFilter === 'furniture'
                    ? 'bg-[#D4AF37] text-[#0B0B0E]'
                    : 'text-[#A1A09A] hover:text-white'
                }`}
              >
                02. Bamboo & Spatial Home ({furnitureProducts.length})
              </button>
              <button
                role="tab"
                aria-selected={activeFilter === 'wishlist'}
                type="button"
                onClick={() => setActiveFilter('wishlist')}
                className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  activeFilter === 'wishlist'
                    ? 'bg-[#F4F3EF] text-[#0B0B0E]'
                    : 'text-[#A1A09A] hover:text-white'
                }`}
              >
                Saved Looks ({wishlistIds.length})
              </button>
            </div>
          </div>

          {/* Marketplace Search Bar & Quick Material / Creator Discovery Controls */}
          <div className="mb-8 p-4 rounded-2xl bg-[#121217] border border-white/10 space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <label htmlFor="marketplace-search-input" className="sr-only">
                  Search products by name, creator, or material type
                </label>
                <Search
                  aria-hidden="true"
                  className="w-4 h-4 text-[#A1A09A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                />
                <input
                  id="marketplace-search-input"
                  type="text"
                  role="searchbox"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by product name, Nairobi creator, or material (e.g. upcycled denim, highland bamboo, brass, BIPV solar)..."
                  className="w-full pl-10 pr-24 py-2.5 bg-[#0B0B0E] border border-white/15 rounded-xl text-xs sm:text-sm text-[#F4F3EF] placeholder:text-[#71717A] focus:outline-none focus:border-[#D97736] transition-colors"
                />
                {searchQuery.trim().length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search query"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-xs font-medium bg-[#1B1B24] text-[#E4E2DD] rounded-lg hover:bg-white/15 flex items-center gap-1 whitespace-nowrap"
                  >
                    <X className="w-3 h-3" />
                    Clear
                  </button>
                )}
              </div>

              <div className="text-xs font-mono-tabular text-[#A1A09A] shrink-0 px-1 flex items-center">
                Showing {filteredProducts.length} of {catalog.length} pieces
              </div>
            </div>

            {/* Material Category Filter Bar (Refines results beyond main domain tabs) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-white/10">
              <div
                role="group"
                aria-label="Filter Catalog by Material Category"
                className="flex flex-wrap items-center gap-1.5"
              >
                <span className="text-xs text-[#A1A09A] mr-1.5">Material Category:</span>
                {MATERIAL_CATEGORY_OPTIONS.map((option) => {
                  const isActiveMaterial = activeMaterialFilter === option.id;
                  const countInDomain = catalog.filter((item) => {
                    if (activeFilter === 'fashion' && item.domain !== 'fashion') return false;
                    if (activeFilter === 'furniture' && item.domain !== 'furniture') return false;
                    if (activeFilter === 'wishlist' && !wishlistIds.includes(item.id)) return false;
                    return matchesMaterialCategory(item, option.id);
                  }).length;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={isActiveMaterial}
                      onClick={() => setActiveMaterialFilter(option.id)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                        isActiveMaterial
                          ? 'bg-[#D97736] text-[#0B0B0E] border-[#D97736] font-semibold'
                          : 'bg-[#181820] text-[#E4E2DD] border-white/10 hover:border-white/30'
                      }`}
                    >
                      {option.label} ({countInDomain})
                    </button>
                  );
                })}
              </div>

              {(activeMaterialFilter !== 'all' ||
                activeFilter !== 'all' ||
                searchQuery.trim().length > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveFilter('all');
                    setActiveMaterialFilter('all');
                    setSearchQuery('');
                  }}
                  className="text-xs text-[#D4AF37] hover:underline whitespace-nowrap shrink-0 self-start sm:self-auto"
                >
                  Reset All Filters
                </button>
              )}
            </div>
          </div>

          {/* 3-Column Uniform Product Grid */}
          {filteredProducts.length === 0 ? (
            <div className="p-12 rounded-2xl bg-[#121217] border border-white/10 text-center space-y-3">
              <p className="text-sm text-[#E4E2DD] font-medium">
                {searchQuery.trim() || activeMaterialFilter !== 'all'
                  ? `No Nairobi catalog pieces matched your active filters (${
                      activeMaterialFilter !== 'all' ? activeMaterialFilter : 'All Materials'
                    }${searchQuery.trim() ? ` · "${searchQuery}"` : ''}).`
                  : 'No saved looks in this filter view yet.'}
              </p>
              <p className="text-xs text-[#A1A09A]">
                Try switching the Material Category or domain tab, or reset filters below.
              </p>
              <div className="flex items-center justify-center gap-3 pt-1">
                {(searchQuery.trim() || activeMaterialFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setActiveMaterialFilter('all');
                    }}
                    className="px-4 py-2 text-xs font-semibold bg-[#D97736] text-[#0B0B0E] rounded-lg hover:bg-[#EA8A47] transition-colors whitespace-nowrap"
                  >
                    Clear Material & Search Filters
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setActiveMaterialFilter('all');
                    setActiveFilter('all');
                  }}
                  className="px-4 py-2 text-xs font-semibold bg-[#F4F3EF] text-[#0B0B0E] rounded-lg hover:bg-white transition-colors whitespace-nowrap"
                >
                  View All Nairobi Pieces
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
              {filteredProducts.map((product) => {
                const currentVariant = selectedVariants[product.id] || product.variants[0];
                const effectivePriceKes = product.priceKes + currentVariant.priceDeltaKes;
                const isSaved = wishlistIds.includes(product.id);

                return (
                  <article
                    key={product.id}
                    className="group rounded-2xl bg-[#121217] border border-white/10 overflow-hidden flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5"
                  >
                    <div>
                      {/* Card Media Area (65% height proportion) */}
                      <div className="relative aspect-[4/3] w-full bg-[#141418] border-b border-white/10 overflow-hidden">
                        <ProductArtwork
                          preset={product.artworkPreset}
                          primaryHex={currentVariant.swatchHex}
                          secondaryHex={currentVariant.secondaryHex}
                          label={product.name}
                          className="w-full h-full"
                        />

                        {/* Clean Top Bar on Card: Unboxed Kicker + Share & Wishlist Buttons */}
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                          <span className="text-xs font-mono-tabular text-[#E4E2DD] bg-black/70 px-2.5 py-1 rounded">
                            {product.domain === 'fashion'
                              ? 'APP 01 · VIRTUAL TRY-ON'
                              : `APP 02 · ${product.dimensionsCm?.width}×${product.dimensionsCm?.depth}×${product.dimensionsCm?.height} CM`}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                handleRecordProductInteraction(product.id);
                                trackAnalyticsEvent('share_button_click', {
                                  productId: product.id,
                                  variantId: currentVariant.id,
                                  source: 'product-card',
                                });
                                setShareTarget({
                                  product,
                                  variant: currentVariant,
                                  selectedSize:
                                    product.domain === 'fashion'
                                      ? product.availableSizes?.[0] === 'ONE-SIZE'
                                        ? 'ONE-SIZE'
                                        : 'M'
                                      : undefined,
                                  sourceContext: 'product-card',
                                });
                              }}
                              aria-label={`Share ${product.name}`}
                              className="px-2.5 py-1.5 rounded-lg bg-black/75 text-[#F4F3EF] hover:bg-black border border-white/15 transition-colors flex items-center gap-1.5 text-xs font-medium whitespace-nowrap"
                            >
                              <Share2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                              <span>Share</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleWishlist(product.id)}
                              aria-label={
                                isSaved
                                  ? `Remove ${product.name} from Saved Looks`
                                  : `Save ${product.name} to Wishlist`
                              }
                              className={`p-2 rounded-lg transition-colors ${
                                isSaved
                                  ? 'bg-[#D97736] text-[#0B0B0E]'
                                  : 'bg-black/70 text-white hover:bg-black'
                              }`}
                            >
                              <Heart className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Card Body: Unboxed Metadata with · Separators */}
                      <div className="p-5 space-y-3">
                        <div className="text-xs text-[#A1A09A] flex flex-wrap items-center gap-1.5">
                          <span className="uppercase tracking-wider">{product.category}</span>
                          <span aria-hidden="true">·</span>
                          <span>{product.originLocation}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-tabular text-[#D4AF37]">
                            {product.paybillCode}
                          </span>
                        </div>

                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-base font-semibold text-[#F4F3EF] leading-snug">
                            {product.name}
                          </h3>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-mono-tabular font-semibold text-[#F4F3EF]">
                              {formatCurrency(effectivePriceKes, currency)}
                            </div>
                            <div className="text-[11px] font-mono-tabular text-[#A1A09A]">
                              {formatCurrency(
                                effectivePriceKes,
                                currency === 'KES' ? 'USD' : 'KES',
                              )}
                            </div>
                          </div>
                        </div>

                        <p className="text-xs text-[#A1A09A] leading-relaxed">
                          {product.materialComposition}
                        </p>

                        <div className="text-xs text-[#E4E2DD]/80 pt-1 border-t border-white/10">
                          <span>{product.creatorName}</span>
                          <span aria-hidden="true"> · </span>
                          <span className="text-[#A1A09A]">{product.sustainabilityMetric}</span>
                        </div>

                        {/* Interactive Variant Swatch Selector */}
                        <div className="pt-1 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            {product.variants.map((variant) => {
                              const isSelected = currentVariant.id === variant.id;
                              return (
                                <button
                                  key={variant.id}
                                  type="button"
                                  onClick={() => {
                                    handleRecordProductInteraction(product.id);
                                    setSelectedVariants((prev) => ({
                                      ...prev,
                                      [product.id]: variant,
                                    }));
                                  }}
                                  aria-label={`Select ${variant.name} for ${product.name}`}
                                  className={`w-6 h-6 rounded-full border-2 transition-transform ${
                                    isSelected
                                      ? 'border-white scale-110'
                                      : 'border-white/20 hover:border-white/60'
                                  }`}
                                  style={{ backgroundColor: variant.swatchHex }}
                                />
                              );
                            })}
                          </div>
                          <span className="text-xs text-[#A1A09A] truncate max-w-[180px]">
                            {currentVariant.name}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer Actions: WebAR Launch + Ask Stylist + Quick Add */}
                    <div className="px-5 pb-5 pt-2 flex flex-wrap items-center gap-2">
                      {product.domain === 'fashion' ? (
                        <button
                          type="button"
                          onClick={() => {
                            handleRecordProductInteraction(product.id);
                            trackAnalyticsEvent('try_on_start', { productId: product.id });
                            setActiveFashionTryOn(product);
                          }}
                          className="flex-1 py-2.5 px-3 text-xs font-semibold bg-[#D97736] text-[#0B0B0E] rounded-xl hover:bg-[#EA8A47] transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                        >
                          <Camera className="w-3.5 h-3.5 shrink-0" />
                          <span>Try On in WebAR</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            handleRecordProductInteraction(product.id);
                            trackAnalyticsEvent('room_placement', { productId: product.id });
                            setActiveFurnitureAR(product);
                          }}
                          className="flex-1 py-2.5 px-3 text-xs font-semibold bg-[#D4AF37] text-[#0B0B0E] rounded-xl hover:bg-[#E5C148] transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                        >
                          <Box className="w-3.5 h-3.5 shrink-0" />
                          <span>Place in My Room</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          handleRecordProductInteraction(product.id);
                          trackAnalyticsEvent('ask_stylist_open', {
                            productId: product.id,
                            domain: product.domain,
                          });
                          setActiveStylistProduct(product);
                        }}
                        aria-label={`Ask Stylist about ${product.name}`}
                        className="py-2.5 px-3 text-xs font-medium bg-[#181822] text-[#D4AF37] border border-[#D4AF37]/40 rounded-xl hover:bg-[#D4AF37]/15 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
                      >
                        <Sparkles className="w-3.5 h-3.5 shrink-0" />
                        <span>Ask Stylist</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleAddToCart({
                            product,
                            variant: currentVariant,
                            selectedSize:
                              product.domain === 'fashion'
                                ? product.availableSizes?.[0] === 'ONE-SIZE'
                                  ? 'ONE-SIZE'
                                  : 'M'
                                : undefined,
                          })
                        }
                        aria-label={`Add ${product.name} to Bag`}
                        className="py-2.5 px-3 text-xs font-medium bg-[#1B1B24] text-[#F4F3EF] border border-white/15 rounded-xl hover:bg-white/10 transition-colors whitespace-nowrap shrink-0"
                      >
                        Add to Bag
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* RECENTLY VIEWED SECTION: Stores & Displays Last 5 Interacted Products */}
          <div
            id="recently-viewed-section"
            aria-label="Recently Viewed Products"
            className="mt-12 pt-8 border-t border-white/10 space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-[#D4AF37] shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-[#F4F3EF]">Recently Viewed</h3>
                    <span className="text-xs font-mono-tabular text-[#D97736]">
                      ({recentlyViewedProducts.length} of {MAX_RECENTLY_VIEWED_ITEMS} max)
                    </span>
                  </div>
                  <p className="text-xs text-[#A1A09A]">
                    Your last {MAX_RECENTLY_VIEWED_ITEMS} interacted Nairobi fashion & spatial home
                    pieces — pick up your exploration journey right where you left off.
                  </p>
                </div>
              </div>

              {recentlyViewedProducts.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearRecentlyViewed}
                  className="text-xs text-[#A1A09A] hover:text-white underline underline-offset-4 whitespace-nowrap self-start sm:self-auto"
                >
                  Clear Recently Viewed
                </button>
              )}
            </div>

            {recentlyViewedProducts.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#121217] border border-white/10 text-xs text-[#A1A09A] flex items-center justify-between gap-4">
                <span>
                  Your exploration history is currently empty. Interact with any piece above (try on
                  in WebAR, switch finishes, or ask the stylist) to track up to 5 recent items here.
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {recentlyViewedProducts.map((recentProd, index) => {
                  const recentVariant =
                    selectedVariants[recentProd.id] || recentProd.variants[0];
                  const recentPriceKes = recentProd.priceKes + recentVariant.priceDeltaKes;

                  return (
                    <div
                      key={recentProd.id}
                      data-testid={`recently-viewed-card-${recentProd.id}`}
                      className="p-3.5 rounded-xl bg-[#121217] border border-white/10 hover:border-white/25 transition-colors flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-2.5">
                        <div className="relative aspect-[16/10] w-full rounded-lg overflow-hidden bg-[#16161D] border border-white/10">
                          <ProductArtwork
                            preset={recentProd.artworkPreset}
                            primaryHex={recentVariant.swatchHex}
                            secondaryHex={recentVariant.secondaryHex}
                            label={recentProd.name}
                            enable3DPreviewToggle={false}
                            className="w-full h-full"
                          />
                          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 text-[10px] font-mono-tabular bg-black/75 text-[#D4AF37] rounded">
                            #{index + 1} RECENT
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="text-[11px] text-[#A1A09A] truncate">
                            {recentProd.creatorName} · {recentVariant.name}
                          </div>
                          <h4 className="text-xs font-semibold text-[#F4F3EF] line-clamp-1">
                            {recentProd.name}
                          </h4>
                          <div className="text-xs font-mono-tabular text-[#D97736] font-medium">
                            {formatCurrency(recentPriceKes, currency)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 pt-1 border-t border-white/10">
                        <button
                          type="button"
                          onClick={() => {
                            handleRecordProductInteraction(recentProd.id);
                            if (recentProd.domain === 'fashion') {
                              trackAnalyticsEvent('try_on_start', {
                                productId: recentProd.id,
                                source: 'recently-viewed',
                              });
                              setActiveFashionTryOn(recentProd);
                            } else {
                              trackAnalyticsEvent('room_placement', {
                                productId: recentProd.id,
                                source: 'recently-viewed',
                              });
                              setActiveFurnitureAR(recentProd);
                            }
                          }}
                          className="flex-1 py-1.5 px-2.5 text-[11px] font-semibold bg-[#1B1B24] text-[#F4F3EF] border border-white/15 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center gap-1 whitespace-nowrap"
                        >
                          {recentProd.domain === 'fashion' ? (
                            <>
                              <Camera className="w-3 h-3 text-[#D97736] shrink-0" />
                              <span>Try On</span>
                            </>
                          ) : (
                            <>
                              <Box className="w-3 h-3 text-[#D4AF37] shrink-0" />
                              <span>3D Room</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            handleRecordProductInteraction(recentProd.id);
                            setActiveStylistProduct(recentProd);
                          }}
                          aria-label={`Ask Stylist about recently viewed ${recentProd.name}`}
                          className="p-1.5 rounded-lg bg-[#181822] text-[#D4AF37] border border-[#D4AF37]/35 hover:bg-[#D4AF37]/15 transition-colors shrink-0"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* SECTION 3: NAIROBI MANUFACTURING, SHARED ARCHITECTURE & GLOBAL CHECKOUT PROOF */}
        <section
          id="provenance-section"
          className="max-w-[1360px] mx-auto px-6 lg:px-10 py-14"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 space-y-3">
              <div className="text-xs text-[#D4AF37] font-mono-tabular">
                03. SHARED INFRASTRUCTURE & PROVENANCE
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#F4F3EF]">
                Coordinated Nairobi Production with Global WebAR Distribution
              </h2>
              <p className="text-sm text-[#A1A09A] leading-relaxed">
                Unity Art Collective (under Unity Art Collective) unites fashion
                upcyclers, recycled-brass smiths, and highland bamboo engineers on one shared
                marketplace backend — eliminating native app-store friction while settling both
                Kenya M-PESA and international cards cleanly.
              </p>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="p-5 rounded-2xl bg-[#121217] border border-white/10 space-y-2">
                <div className="text-xs font-mono-tabular text-[#D97736]">
                  01 · WEBAR-FIRST ARCHITECTURE
                </div>
                <h3 className="text-base font-semibold text-white">
                  Three.js + Edge Object Storage
                </h3>
                <p className="text-xs text-[#A1A09A] leading-relaxed">
                  Progressive PWA caching, mobile Safari /
                  Android Chrome camera overlays, and Meta Ray-Ban optical HUD compatibility.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#121217] border border-white/10 space-y-2">
                <div className="text-xs font-mono-tabular text-[#D4AF37]">
                  02 · PROVEN PAYMENT RAILS
                </div>
                <h3 className="text-base font-semibold text-white">
                  Paybill 000000 + Paystack Global
                </h3>
                <p className="text-xs text-[#A1A09A] leading-relaxed">
                  Structured M-PESA references (e.g. 111111#ITEMNAME) for instant Kenyan checkout,
                  plus Paystack Kenya (2.9% local cards, 3.8% international & Apple Pay) and 50%
                  custom furniture deposits.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#121217] border border-white/10 space-y-2">
                <div className="text-xs font-mono-tabular text-[#D97736]">
                  03 · SUSTAINABLE NAIROBI MATERIALS
                </div>
                <h3 className="text-base font-semibold text-white">
                  Upcycled Textiles, Highland Bamboo & BIPV
                </h3>
                <p className="text-xs text-[#A1A09A] leading-relaxed">
                  Every product card documents carbon sequestration, diverted post-consumer denim
                  weight, regenerative Yushania alpina bamboo culms, or semi-transparent BIPV solar
                  glazing output.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#121217] border border-white/10 space-y-2">
                <div className="text-xs font-mono-tabular text-[#D4AF37]">
                  04 · PRIVACY & KENYA DPA COMPLIANCE
                </div>
                <h3 className="text-base font-semibold text-white">
                  Ephemeral On-Device Camera Frames
                </h3>
                <p className="text-xs text-[#A1A09A] leading-relaxed">
                  Camera permissions are disclosed upfront. Video frames for body pose estimation
                  and room plane detection are processed in real-time and never stored on remote
                  servers.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Editorial Footer */}
      <footer className="border-t border-white/10 px-6 lg:px-10 py-8 text-xs text-[#A1A09A]">
        <div className="max-w-[1360px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="font-semibold text-[#F4F3EF]">Unity Art Collective</span>
            <span aria-hidden="true"> · </span>
            <span>Unity Art Collective · Nairobi, Kenya</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <span>M-PESA Paybill 000000 (Ref: 111111#ITEM)</span>
            <span aria-hidden="true">·</span>
            <span>Paystack Global Settlement</span>
            <span aria-hidden="true">·</span>
            <span>Kenya Data Protection Act Compliant</span>
          </div>
        </div>
      </footer>

      {/* APP 1 MODAL: AR VIRTUAL TRY-ON FOR FASHION, APPAREL & ACCESSORIES */}
      {activeFashionTryOn && (
        <FashionTryOnModal
          product={activeFashionTryOn}
          initialVariant={
            selectedVariants[activeFashionTryOn.id] || activeFashionTryOn.variants[0]
          }
          allFashionProducts={fashionProducts}
          currency={currency}
          isWishlisted={wishlistIds.includes(activeFashionTryOn.id)}
          onToggleWishlist={handleToggleWishlist}
          onClose={() => setActiveFashionTryOn(null)}
          onAddToCart={({ product, variant, selectedSize }) => {
            handleAddToCart({ product, variant, selectedSize });
            setIsCheckoutOpen(true);
          }}
          onOpenShare={({ product, variant, selectedSize }) => {
            setShareTarget({
              product,
              variant,
              selectedSize,
              sourceContext: 'fashion-tryon-ar',
            });
          }}
          onTrackEvent={trackAnalyticsEvent}
        />
      )}

      {/* APP 2 MODAL: SPATIAL 3D ROOM VISUALIZER FOR BAMBOO FURNITURE & MATERIALS */}
      {activeFurnitureAR && (
        <FurnitureARModal
          product={activeFurnitureAR}
          initialVariant={
            selectedVariants[activeFurnitureAR.id] || activeFurnitureAR.variants[0]
          }
          allFurnitureProducts={furnitureProducts}
          currency={currency}
          onClose={() => setActiveFurnitureAR(null)}
          onAddSceneToCart={handleAddSceneToCart}
          onOpenShare={({ product, variant, companionCount }) => {
            setShareTarget({
              product,
              variant,
              companionCount,
              sourceContext: 'furniture-room-ar',
            });
          }}
          onTrackEvent={trackAnalyticsEvent}
        />
      )}

      {/* SHARED MARKETPLACE BAG & CHECKOUT DRAWER */}
      <CheckoutDrawer
        isOpen={isCheckoutOpen}
        items={cartItems}
        currency={currency}
        onToggleCurrency={setCurrency}
        onUpdateQuantity={handleUpdateQuantity}
        onToggleItemDeposit={handleToggleItemDeposit}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={() => setCartItems([])}
        onClose={() => setIsCheckoutOpen(false)}
      />

      {/* CREATOR / ARTISAN MAGIC-LINK ONBOARDING MODAL */}
      <CreatorStudioModal
        isOpen={isCreatorStudioOpen}
        onClose={() => setIsCreatorStudioOpen(false)}
        onPublishProduct={handlePublishCreatorProduct}
      />

      {/* ASK STYLIST & MATERIAL CARE GEMINI MODAL */}
      {activeStylistProduct && (
        <AskStylistModal
          product={activeStylistProduct}
          initialVariant={
            selectedVariants[activeStylistProduct.id] || activeStylistProduct.variants[0]
          }
          currency={currency}
          onClose={() => setActiveStylistProduct(null)}
          onOpenWebAR={(prod) => {
            if (prod.domain === 'fashion') {
              trackAnalyticsEvent('try_on_start', { productId: prod.id });
              setActiveFashionTryOn(prod);
            } else {
              trackAnalyticsEvent('room_placement', { productId: prod.id });
              setActiveFurnitureAR(prod);
            }
          }}
          onAddToCart={({ product, variant, selectedSize }) => {
            handleAddToCart({ product, variant, selectedSize });
          }}
          onTrackEvent={trackAnalyticsEvent}
        />
      )}

      {/* WEB SHARE API + WHATSAPP / INSTAGRAM STORIES / TIKTOK SHARE MODAL */}
      {shareTarget && (
        <ShareExperienceModal
          product={shareTarget.product}
          initialVariant={shareTarget.variant}
          currency={currency}
          selectedSize={shareTarget.selectedSize}
          companionCount={shareTarget.companionCount}
          sourceContext={shareTarget.sourceContext}
          onClose={() => setShareTarget(null)}
          onTrackEvent={trackAnalyticsEvent}
        />
      )}
    </div>
  );
}
