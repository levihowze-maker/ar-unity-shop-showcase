/**
 * Pure business logic for Unity Art Collective (Unity Art Collective)
 * Shared Marketplace, AR Fashion Virtual Try-On Calibration, AR Spatial Room Planning,
 * and M-PESA Paybill 000000 + Paystack Kenya Global Checkout calculations.
 */

export type AppDomain = 'fashion' | 'furniture';

export type FitPreference = 'tailored' | 'regular' | 'oversized';

export type GarmentTrackMode = 'upper-body' | 'full-body' | 'accessory-face-torso';

export type ShippingRegion = 'nairobi-pickup' | 'nairobi-courier' | 'east-africa' | 'eu-uk' | 'north-america';

export type PaymentRail = 'mpesa-paybill' | 'paystack-kenya-card' | 'paystack-intl-card' | 'paystack-apple-pay';

export type CurrencyCode = 'KES' | 'USD';

export interface ProductDimensionsCm {
  width: number;
  depth: number;
  height: number;
}

export interface ProductVariant {
  id: string;
  name: string;
  swatchHex: string;
  secondaryHex: string;
  materialFinish: string;
  priceDeltaKes: number;
  roughness: number;
  metalness: number;
}

export interface MarketplaceProduct {
  id: string;
  paybillCode: string; // e.g. "111111#KIBERA"
  name: string;
  domain: AppDomain;
  category: string;
  creatorName: string;
  creatorStudio: string;
  originLocation: string;
  priceKes: number;
  weightKg: number;
  leadTimeDays: string;
  sustainabilityMetric: string;
  materialComposition: string;
  description: string;
  arTrackMode?: GarmentTrackMode;
  dimensionsCm?: ProductDimensionsCm;
  availableSizes?: string[];
  variants: ProductVariant[];
  artworkPreset:
    | 'denim-trench'
    | 'brass-collar'
    | 'sailcloth-jacket'
    | 'sisal-saddle-bag'
    | 'bamboo-lounge-chair'
    | 'fluted-bamboo-table'
    | 'bamboo-pendant-dome'
    | 'solar-bipv-partition';
}

export interface FitCalibrationInput {
  heightCm: number;
  weightKg: number;
  fitPreference: FitPreference;
  trackMode: GarmentTrackMode;
}

export interface FitCalibrationResult {
  recommendedSize: 'XS' | 'S' | 'M' | 'L' | 'XL' | 'ONE-SIZE';
  shoulderWidthCm: number;
  chestCircumferenceCm: number;
  garmentDrapeScale: number;
  fitConfidencePercent: number;
  drapeGuidance: string;
}

export interface CartItemInput {
  productId: string;
  paybillCode: string;
  name: string;
  domain: AppDomain;
  unitPriceKes: number;
  weightKg: number;
  quantity: number;
  variantName: string;
  selectedSize?: string;
  isDepositOnly?: boolean; // 50% custom furniture deposit option
}

export interface CheckoutBreakdown {
  subtotalKes: number;
  depositAppliedKes: number;
  payableMerchandiseKes: number;
  workshopTicketKes: number;
  shippingFreightKes: number;
  estimatedDutiesKes: number;
  paymentGatewayFeeKes: number;
  totalDueKes: number;
  totalDueUsd: number;
  creatorPayoutKes: number; // 80% to creator/manufacturer
  unityCommissionKes: number; // 20% marketplace commission
  structuredPaybillAccount: string; // e.g. 111111#KIBERATRENCH
  paybillNumber: string; // 000000
  kcbMonthlyInstallmentKes: number; // 6-month KCB green design installment
}

export const KES_PER_USD = 129.5;
export const UNITY_PAYBILL_NUMBER = '000000';
export const UNITY_ACCOUNT_PREFIX = '111111';
export const WORKSHOP_TICKET_PRICE_KES = 3500;

/**
 * Converts KES amount to USD rounded to 2 decimal places.
 */
export function convertKesToUsd(amountKes: number): number {
  if (!Number.isFinite(amountKes) || amountKes <= 0) return 0;
  return Math.round((amountKes / KES_PER_USD) * 100) / 100;
}

/**
 * Formats a currency value in either KES or USD.
 */
export function formatCurrency(amountKes: number, currency: CurrencyCode): string {
  if (currency === 'USD') {
    const usd = convertKesToUsd(amountKes);
    return `$${usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `KES ${Math.round(amountKes).toLocaleString('en-KE')}`;
}

/**
 * Generates the structured M-PESA Paybill 000000 account reference (e.g. 111111#KIBERA)
 */
export function buildPaybillReference(codes: string[]): string {
  const cleaned = codes
    .map((c) => c.replace(/^111111#/, '').replace(/[^A-Z0-9]/gi, '').toUpperCase())
    .filter(Boolean);

  if (cleaned.length === 0) {
    return `${UNITY_ACCOUNT_PREFIX}#UNITYART`;
  }
  if (cleaned.length === 1) {
    return `${UNITY_ACCOUNT_PREFIX}#${cleaned[0].slice(0, 12)}`;
  }
  return `${UNITY_ACCOUNT_PREFIX}#${cleaned[0].slice(0, 7)}+${cleaned.length - 1}`;
}

/**
 * Calculates body measurements, recommended garment size, and 3D drape scale
 * for the AR Virtual Try-On experience.
 */
export function calculateFitCalibration(input: FitCalibrationInput): FitCalibrationResult {
  const clampedHeight = Math.max(140, Math.min(215, input.heightCm));
  const clampedWeight = Math.max(38, Math.min(150, input.weightKg));

  if (input.trackMode === 'accessory-face-torso') {
    return {
      recommendedSize: 'ONE-SIZE',
      shoulderWidthCm: Math.round((clampedHeight * 0.235 + clampedWeight * 0.04) * 10) / 10,
      chestCircumferenceCm: Math.round(clampedHeight * 0.45 + clampedWeight * 0.32),
      garmentDrapeScale: 1.0,
      fitConfidencePercent: 97,
      drapeGuidance:
        'Adjustable hand-forged collar & strap geometry calibrated to your clavicle and shoulder span.',
    };
  }

  // Estimate body mass index & frame index for size mapping
  const heightM = clampedHeight / 100;
  const bmi = clampedWeight / (heightM * heightM);
  const frameScore = (clampedHeight - 150) * 0.45 + (clampedWeight - 45) * 0.65;

  const sizes: Array<'XS' | 'S' | 'M' | 'L' | 'XL'> = ['XS', 'S', 'M', 'L', 'XL'];
  let baseIndex = 2; // M default
  if (frameScore < 13) baseIndex = 0;
  else if (frameScore < 22) baseIndex = 1;
  else if (frameScore < 34) baseIndex = 2;
  else if (frameScore < 46) baseIndex = 3;
  else baseIndex = 4;

  if (input.fitPreference === 'tailored' && baseIndex > 0 && bmi < 26) {
    baseIndex -= 1;
  } else if (input.fitPreference === 'oversized' && baseIndex < 4) {
    baseIndex += 1;
  }

  const recommendedSize = sizes[baseIndex];
  const shoulderWidthCm = Math.round((clampedHeight * 0.228 + clampedWeight * 0.055) * 10) / 10;
  const chestCircumferenceCm = Math.round(clampedHeight * 0.44 + clampedWeight * 0.35);

  const preferenceScaleMap: Record<FitPreference, number> = {
    tailored: 0.95,
    regular: 1.0,
    oversized: 1.08,
  };
  const garmentDrapeScale =
    Math.round(((clampedHeight / 172) * 0.5 + (clampedWeight / 68) * 0.5) * preferenceScaleMap[input.fitPreference] * 100) /
    100;

  const drapeDescriptions: Record<FitPreference, string> = {
    tailored: `Close architectural shoulder line (${shoulderWidthCm} cm) with structured waist suppression on 420g/m² upcycled weave.`,
    regular: `Balanced Nairobi studio drape across ${chestCircumferenceCm} cm chest with natural movement and breathable silhouette.`,
    oversized: `Relaxed runway drop-shoulder drape (+8% volume) showcasing full artisan textile pattern and layered movement.`,
  };

  return {
    recommendedSize,
    shoulderWidthCm,
    chestCircumferenceCm,
    garmentDrapeScale: Math.max(0.82, Math.min(1.24, garmentDrapeScale)),
    fitConfidencePercent: 94,
    drapeGuidance: drapeDescriptions[input.fitPreference],
  };
}

/**
 * Calculates full checkout totals, Paybill 000000 reference, Paystack gateway fees,
 * international freight/duties, custom furniture 50% deposits, and 80/20 creator payout split.
 */
export function calculateCheckoutBreakdown(params: {
  items: CartItemInput[];
  shippingRegion: ShippingRegion;
  paymentRail: PaymentRail;
  includeWorkshopTicket: boolean;
}): CheckoutBreakdown {
  const { items, shippingRegion, paymentRail, includeWorkshopTicket } = params;

  let subtotalKes = 0;
  let payableMerchandiseKes = 0;
  let totalWeightKg = 0;
  const codes: string[] = [];

  for (const item of items) {
    const lineTotal = item.unitPriceKes * item.quantity;
    subtotalKes += lineTotal;
    const isDeposit = Boolean(item.isDepositOnly && item.domain === 'furniture');
    payableMerchandiseKes += isDeposit ? Math.round(lineTotal * 0.5) : lineTotal;
    totalWeightKg += item.weightKg * item.quantity;
    codes.push(item.paybillCode);
  }

  const depositAppliedKes = subtotalKes - payableMerchandiseKes;
  const workshopTicketKes = includeWorkshopTicket ? WORKSHOP_TICKET_PRICE_KES : 0;

  let shippingFreightKes = 0;
  let estimatedDutiesKes = 0;

  if (items.length > 0) {
    switch (shippingRegion) {
      case 'nairobi-pickup':
        shippingFreightKes = 0;
        estimatedDutiesKes = 0;
        break;
      case 'nairobi-courier':
        shippingFreightKes = totalWeightKg > 15 ? 2400 : 650;
        estimatedDutiesKes = 0;
        break;
      case 'east-africa':
        shippingFreightKes = Math.round(1800 + totalWeightKg * 420);
        estimatedDutiesKes = Math.round(subtotalKes * 0.04);
        break;
      case 'eu-uk':
        shippingFreightKes = Math.round(5200 + totalWeightKg * 1150);
        estimatedDutiesKes = Math.round(subtotalKes * 0.08);
        break;
      case 'north-america':
        shippingFreightKes = Math.round(6400 + totalWeightKg * 1350);
        estimatedDutiesKes = Math.round(subtotalKes * 0.07);
        break;
    }
  }

  const baseBeforeGateway =
    payableMerchandiseKes + workshopTicketKes + shippingFreightKes + estimatedDutiesKes;

  // Paystack local card: 2.9%, international card / Apple Pay: 3.8%, M-PESA Paybill 000000: 0% surcharge
  let gatewayRate = 0;
  if (paymentRail === 'paystack-kenya-card') gatewayRate = 0.029;
  else if (paymentRail === 'paystack-intl-card' || paymentRail === 'paystack-apple-pay') {
    gatewayRate = 0.038;
  }

  const paymentGatewayFeeKes = Math.round(baseBeforeGateway * gatewayRate);
  const totalDueKes = baseBeforeGateway + paymentGatewayFeeKes;
  const totalDueUsd = convertKesToUsd(totalDueKes);

  // 20% Unity Art Collective commission model; 80% directly to Nairobi creator/workshop
  const unityCommissionKes = Math.round(payableMerchandiseKes * 0.2);
  const creatorPayoutKes = payableMerchandiseKes - unityCommissionKes;

  // KCB 6-month financing estimate (for furniture/sustainable material orders)
  const kcbMonthlyInstallmentKes = totalDueKes > 0 ? Math.round((totalDueKes * 1.045) / 6) : 0;

  return {
    subtotalKes,
    depositAppliedKes,
    payableMerchandiseKes,
    workshopTicketKes,
    shippingFreightKes,
    estimatedDutiesKes,
    paymentGatewayFeeKes,
    totalDueKes,
    totalDueUsd,
    creatorPayoutKes,
    unityCommissionKes,
    structuredPaybillAccount: buildPaybillReference(codes),
    paybillNumber: UNITY_PAYBILL_NUMBER,
    kcbMonthlyInstallmentKes,
  };
}

/**
 * Calculates spatial footprint and imperial/metric dimensions for App 2 (Spatial Home AR).
 */
export function calculateSpatialSceneMetrics(
  placedItems: Array<{ dimensionsCm: ProductDimensionsCm; scale: number }>,
  roomWidthCm = 420,
  roomDepthCm = 380,
): {
  totalFootprintSqMeters: number;
  roomUtilizationPercent: number;
  fitsInRoom: boolean;
  primaryDimensionsImperial: string;
} {
  if (placedItems.length === 0) {
    return {
      totalFootprintSqMeters: 0,
      roomUtilizationPercent: 0,
      fitsInRoom: true,
      primaryDimensionsImperial: '0" × 0" × 0"',
    };
  }

  let totalAreaCm2 = 0;
  for (const item of placedItems) {
    const w = item.dimensionsCm.width * item.scale;
    const d = item.dimensionsCm.depth * item.scale;
    totalAreaCm2 += w * d;
  }

  const roomAreaCm2 = Math.max(1000, roomWidthCm * roomDepthCm);
  const totalFootprintSqMeters = Math.round((totalAreaCm2 / 10000) * 100) / 100;
  const roomUtilizationPercent = Math.min(100, Math.round((totalAreaCm2 / roomAreaCm2) * 100));

  const first = placedItems[0];
  const wIn = Math.round((first.dimensionsCm.width * first.scale) / 2.54);
  const dIn = Math.round((first.dimensionsCm.depth * first.scale) / 2.54);
  const hIn = Math.round((first.dimensionsCm.height * first.scale) / 2.54);

  return {
    totalFootprintSqMeters,
    roomUtilizationPercent,
    fitsInRoom: roomUtilizationPercent <= 78,
    primaryDimensionsImperial: `${wIn}" W × ${dIn}" D × ${hIn}" H`,
  };
}

export type MaterialCategoryFilter =
  | 'all'
  | 'Upcycled'
  | 'Highland Bamboo'
  | 'Recycled Brass'
  | 'Sisal'
  | 'BIPV Solar';

export const MATERIAL_CATEGORY_OPTIONS: Array<{
  id: MaterialCategoryFilter;
  label: string;
}> = [
  { id: 'all', label: 'All Materials' },
  { id: 'Upcycled', label: 'Upcycled' },
  { id: 'Highland Bamboo', label: 'Highland Bamboo' },
  { id: 'Recycled Brass', label: 'Recycled Brass' },
  { id: 'Sisal', label: 'Sisal' },
  { id: 'BIPV Solar', label: 'BIPV Solar' },
];

/**
 * Checks whether a marketplace product belongs to a specific material category filter.
 */
export function matchesMaterialCategory(
  item: MarketplaceProduct,
  materialFilter: MaterialCategoryFilter,
): boolean {
  if (!materialFilter || materialFilter === 'all') return true;

  const variantText = item.variants.map((v) => `${v.name} ${v.materialFinish}`).join(' ');
  const haystack = [
    item.name,
    item.materialComposition,
    item.sustainabilityMetric,
    item.description,
    item.category,
    variantText,
  ]
    .join(' ')
    .toLowerCase();

  switch (materialFilter) {
    case 'Upcycled':
      return (
        haystack.includes('upcycled') ||
        haystack.includes('reclaimed') ||
        haystack.includes('salvaged')
      );
    case 'Highland Bamboo':
      return haystack.includes('highland bamboo') || haystack.includes('bamboo');
    case 'Recycled Brass':
      return haystack.includes('recycled brass') || haystack.includes('brass');
    case 'Sisal':
      return haystack.includes('sisal');
    case 'BIPV Solar':
      return haystack.includes('bipv') || haystack.includes('photovoltaic');
    default:
      return true;
  }
}

/**
 * Filters the shared marketplace catalog by domain/wishlist tab, dedicated material category filter,
 * and multi-keyword search query across product name, creator, studio, material type, and Paybill code.
 */
export function filterCatalogProducts(params: {
  catalog: MarketplaceProduct[];
  domainFilter: 'all' | 'fashion' | 'furniture' | 'wishlist';
  materialFilter?: MaterialCategoryFilter;
  wishlistIds: string[];
  searchQuery: string;
}): MarketplaceProduct[] {
  const {
    catalog,
    domainFilter,
    materialFilter = 'all',
    wishlistIds,
    searchQuery,
  } = params;
  const tokens = searchQuery
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return catalog.filter((item) => {
    if (domainFilter === 'fashion' && item.domain !== 'fashion') return false;
    if (domainFilter === 'furniture' && item.domain !== 'furniture') return false;
    if (domainFilter === 'wishlist' && !wishlistIds.includes(item.id)) return false;

    if (!matchesMaterialCategory(item, materialFilter)) return false;

    if (tokens.length === 0) return true;

    const variantText = item.variants
      .map((v) => `${v.name} ${v.materialFinish}`)
      .join(' ');

    const searchableText = [
      item.name,
      item.creatorName,
      item.creatorStudio,
      item.materialComposition,
      item.sustainabilityMetric,
      item.category,
      item.originLocation,
      item.paybillCode,
      variantText,
    ]
      .join(' ')
      .toLowerCase();

    return tokens.every((token) => searchableText.includes(token));
  });
}

/**
 * Generates tailored styling and material care quick-prompts for a product card's Ask Stylist modal.
 */
export function getStylistQuickPrompts(product: MarketplaceProduct): string[] {
  if (product.domain === 'fashion') {
    return [
      `How should I style the ${product.name} for Art After Dark in Nairobi or global travel?`,
      `What is the recommended material care routine for ${product.materialComposition}?`,
      `Which size and fit preference works best for layering this piece?`,
    ];
  }
  return [
    `What is the long-term material care and climate maintenance for ${product.materialComposition}?`,
    `How should I orient the ${product.name} for optimal room lighting and acoustic balance?`,
    `Which companion Nairobi pieces pair best with this in a living or dining space?`,
  ];
}

export interface ShareableARPackage {
  arExperienceUrl: string;
  shareTitle: string;
  shareText: string;
  whatsappShareUrl: string;
  instagramStoryCaption: string;
  tiktokCaption: string;
}

/**
 * Builds a structured Web Share API & social channel package (WhatsApp, Instagram Stories, TikTok)
 * containing the current product, selected variant, and deep-linked WebAR experience URL.
 */
export function buildShareableARPackage(params: {
  baseUrl: string;
  product: MarketplaceProduct;
  variant: ProductVariant;
  selectedSize?: string;
  companionCount?: number;
}): ShareableARPackage {
  const { baseUrl, product, variant, selectedSize, companionCount = 0 } = params;
  const cleanBase = (baseUrl || 'https://unitycollective.art').replace(/\/+$/, '').split('?')[0];

  const queryParams = new URLSearchParams();
  queryParams.set('ar', product.domain);
  queryParams.set('product', product.id);
  queryParams.set('variant', variant.id);
  if (selectedSize) {
    queryParams.set('size', selectedSize);
  }

  const arExperienceUrl = `${cleanBase}/?${queryParams.toString()}`;
  const effectivePriceKes = product.priceKes + variant.priceDeltaKes;
  const priceLabel = formatCurrency(effectivePriceKes, 'KES');

  const actionPhrase =
    product.domain === 'fashion'
      ? `Try on in 3D WebAR${selectedSize ? ` (Calibrated Fit: ${selectedSize})` : ''}`
      : `Visualize at 1:1 scale in your room${
          companionCount > 0 ? ` (+${companionCount} companion pieces)` : ''
        }`;

  const shareTitle = `${product.name} (${variant.name}) · Unity Art Collective WebAR`;

  const shareText = `${product.name} — ${variant.name} (${priceLabel}) by ${product.creatorName} (${product.creatorStudio}, ${product.originLocation}). ${actionPhrase} · M-PESA Paybill ${UNITY_PAYBILL_NUMBER} Ref ${product.paybillCode}.`;

  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    `${shareText}\n\nLaunch WebAR Experience: ${arExperienceUrl}`,
  )}`;

  const instagramStoryCaption = `@unitycollective.art · ${product.name} in ${variant.name} (${product.originLocation}) · ${actionPhrase} · Link: ${arExperienceUrl}`;

  const tiktokCaption = `${product.name} (${variant.name}) handcrafted in ${product.originLocation} by ${product.creatorName}. ${actionPhrase}: ${arExperienceUrl} #UnityArtCollective #MadeInNairobi #WebAR #SustainableDesign`;

  return {
    arExperienceUrl,
    shareTitle,
    shareText,
    whatsappShareUrl,
    instagramStoryCaption,
    tiktokCaption,
  };
}

export const MAX_RECENTLY_VIEWED_ITEMS = 5;

/**
 * Records a user interaction with a product by moving its ID to the front of the list,
 * deduplicating any prior occurrence, and capping the history at maxItems (default 5).
 */
export function recordRecentlyViewedProduct(
  currentIds: string[],
  productId: string,
  maxItems: number = MAX_RECENTLY_VIEWED_ITEMS,
): string[] {
  const cleanId = productId.trim();
  if (!cleanId) return currentIds.slice(0, maxItems);

  const filtered = currentIds.filter((id) => id !== cleanId);
  return [cleanId, ...filtered].slice(0, Math.max(1, maxItems));
}

/**
 * Resolves an ordered list of recently viewed product IDs into full MarketplaceProduct items
 * from the active catalog, preserving most-recent-first order up to maxItems (default 5).
 */
export function resolveRecentlyViewedProducts(
  catalog: MarketplaceProduct[],
  recentIds: string[],
  maxItems: number = MAX_RECENTLY_VIEWED_ITEMS,
): MarketplaceProduct[] {
  const byId = new Map<string, MarketplaceProduct>();
  for (const item of catalog) {
    byId.set(item.id, item);
  }

  const resolved: MarketplaceProduct[] = [];
  for (const id of recentIds) {
    const found = byId.get(id);
    if (found && !resolved.some((p) => p.id === found.id)) {
      resolved.push(found);
      if (resolved.length >= maxItems) break;
    }
  }
  return resolved;
}

/**
 * Determines whether an artwork preset belongs to the App 1 (Fashion) domain.
 */
export function isFashionPreset(preset: MarketplaceProduct['artworkPreset']): boolean {
  return (
    preset === 'denim-trench' ||
    preset === 'brass-collar' ||
    preset === 'sailcloth-jacket' ||
    preset === 'sisal-saddle-bag'
  );
}

/**
 * Computes optimal WebGL camera framing (position and lookAt target) for the 3D Model Preview
 * turntable inside ProductArtwork based on the product's artwork preset.
 */
export function getPreviewCameraFraming(preset: MarketplaceProduct['artworkPreset']): {
  cameraPos: [number, number, number];
  lookAt: [number, number, number];
} {
  switch (preset) {
    case 'brass-collar':
      return { cameraPos: [0, 1.62, 1.15], lookAt: [0, 1.54, 0] };
    case 'sisal-saddle-bag':
      return { cameraPos: [0, 1.25, 1.75], lookAt: [0.06, 1.12, 0] };
    case 'sailcloth-jacket':
      return { cameraPos: [0, 1.38, 1.95], lookAt: [0, 1.28, 0] };
    case 'denim-trench':
      return { cameraPos: [0, 1.26, 2.3], lookAt: [0, 1.08, 0] };
    case 'bamboo-lounge-chair':
      return { cameraPos: [0, 0.78, 1.78], lookAt: [0, 0.36, 0] };
    case 'fluted-bamboo-table':
      return { cameraPos: [0, 0.96, 2.42], lookAt: [0, 0.42, 0] };
    case 'bamboo-pendant-dome':
      return { cameraPos: [0, 0.98, 2.22], lookAt: [0, 0.78, 0] };
    case 'solar-bipv-partition':
    default:
      return { cameraPos: [0, 1.08, 2.52], lookAt: [0, 0.82, 0] };
  }
}
