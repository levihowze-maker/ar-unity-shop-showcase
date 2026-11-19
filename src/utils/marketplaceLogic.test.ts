import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPaybillReference,
  buildShareableARPackage,
  calculateCheckoutBreakdown,
  calculateFitCalibration,
  calculateSpatialSceneMetrics,
  convertKesToUsd,
  filterCatalogProducts,
  getPreviewCameraFraming,
  getStylistQuickPrompts,
  isFashionPreset,
  type MarketplaceProduct,
  MAX_RECENTLY_VIEWED_ITEMS,
  recordRecentlyViewedProduct,
  resolveRecentlyViewedProducts,
  UNITY_PAYBILL_NUMBER,
} from './marketplaceLogic.ts';

test('buildPaybillReference formats structured M-PESA Paybill 000000 references', () => {
  assert.equal(buildPaybillReference(['111111#KIBERA-TRENCH']), '111111#KIBERATRENCH');
  assert.equal(
    buildPaybillReference(['111111#KIBERA', '111111#ABERDARE']),
    '111111#KIBERA+1',
  );
  assert.equal(buildPaybillReference([]), '111111#UNITYART');
});

test('calculateFitCalibration computes size, shoulder width, and drape scale accurately', () => {
  const regularResult = calculateFitCalibration({
    heightCm: 174,
    weightKg: 68,
    fitPreference: 'regular',
    trackMode: 'full-body',
  });
  assert.equal(regularResult.recommendedSize, 'M');
  assert.ok(regularResult.shoulderWidthCm > 40 && regularResult.shoulderWidthCm < 46);
  assert.ok(regularResult.garmentDrapeScale >= 0.95 && regularResult.garmentDrapeScale <= 1.05);

  const oversizedResult = calculateFitCalibration({
    heightCm: 174,
    weightKg: 68,
    fitPreference: 'oversized',
    trackMode: 'full-body',
  });
  assert.equal(oversizedResult.recommendedSize, 'L');
  assert.ok(oversizedResult.garmentDrapeScale > regularResult.garmentDrapeScale);

  const accessoryResult = calculateFitCalibration({
    heightCm: 165,
    weightKg: 58,
    fitPreference: 'tailored',
    trackMode: 'accessory-face-torso',
  });
  assert.equal(accessoryResult.recommendedSize, 'ONE-SIZE');
  assert.equal(accessoryResult.garmentDrapeScale, 1.0);
});

test('calculateCheckoutBreakdown handles M-PESA Paybill 000000, Paystack 3.8% intl fee, and 50% furniture deposit', () => {
  const mpesaCart = calculateCheckoutBreakdown({
    items: [
      {
        productId: 'kibera-trench',
        paybillCode: '111111#KIBERA',
        name: 'Kibera Upcycled Denim Trench',
        domain: 'fashion',
        unitPriceKes: 18500,
        weightKg: 1.4,
        quantity: 1,
        variantName: 'Indigo Kitenge Weave',
      },
    ],
    shippingRegion: 'nairobi-pickup',
    paymentRail: 'mpesa-paybill',
    includeWorkshopTicket: false,
  });

  assert.equal(mpesaCart.paybillNumber, UNITY_PAYBILL_NUMBER);
  assert.equal(mpesaCart.structuredPaybillAccount, '111111#KIBERA');
  assert.equal(mpesaCart.subtotalKes, 18500);
  assert.equal(mpesaCart.paymentGatewayFeeKes, 0);
  assert.equal(mpesaCart.totalDueKes, 18500);
  assert.equal(mpesaCart.unityCommissionKes, 3700); // 20%
  assert.equal(mpesaCart.creatorPayoutKes, 14800); // 80%

  // International Paystack card (3.8%) + 50% deposit on furniture + Workshop upsell
  const intlFurnitureDeposit = calculateCheckoutBreakdown({
    items: [
      {
        productId: 'rift-table',
        paybillCode: '111111#RIFTTABLE',
        name: 'Rift Fluted Bamboo Dining Table',
        domain: 'furniture',
        unitPriceKes: 84000,
        weightKg: 32,
        quantity: 1,
        variantName: 'Carbonized Amber Bamboo',
        isDepositOnly: true,
      },
    ],
    shippingRegion: 'eu-uk',
    paymentRail: 'paystack-intl-card',
    includeWorkshopTicket: true,
  });

  assert.equal(intlFurnitureDeposit.subtotalKes, 84000);
  assert.equal(intlFurnitureDeposit.payableMerchandiseKes, 42000); // 50% deposit
  assert.equal(intlFurnitureDeposit.depositAppliedKes, 42000);
  assert.equal(intlFurnitureDeposit.workshopTicketKes, 3500);
  assert.ok(intlFurnitureDeposit.shippingFreightKes > 30000);
  assert.ok(intlFurnitureDeposit.paymentGatewayFeeKes > 0);
  assert.equal(intlFurnitureDeposit.totalDueUsd, convertKesToUsd(intlFurnitureDeposit.totalDueKes));
});

test('calculateSpatialSceneMetrics computes room footprint and imperial dimensions', () => {
  const metrics = calculateSpatialSceneMetrics(
    [
      { dimensionsCm: { width: 210, depth: 95, height: 75 }, scale: 1.0 },
      { dimensionsCm: { width: 68, depth: 76, height: 72 }, scale: 1.0 },
    ],
    420,
    380,
  );
  assert.ok(metrics.totalFootprintSqMeters > 2.4 && metrics.totalFootprintSqMeters < 2.6);
  assert.equal(metrics.fitsInRoom, true);
  assert.match(metrics.primaryDimensionsImperial, /83" W × 37" D × 30" H/);
});

test('filterCatalogProducts matches by product name, creator, material type, and domain filter', () => {
  const sampleCatalog: MarketplaceProduct[] = [
    {
      id: 'kibera-denim-trench',
      paybillCode: '111111#KIBERATRENCH',
      name: 'Kibera Upcycled Indigo & Kitenge Architectural Coat',
      domain: 'fashion',
      category: 'Outerwear',
      creatorName: 'Demo Creator Zephyr',
      creatorStudio: 'Demo Studio 1',
      originLocation: 'Nairobi, Kenya',
      priceKes: 22500,
      weightKg: 1.35,
      leadTimeDays: '48h',
      sustainabilityMetric: 'Zero-dye water cycle',
      materialComposition: '70% Upcycled Heavy Raw Denim · 30% Kitenge Cotton',
      description: 'Coat',
      artworkPreset: 'denim-trench',
      variants: [
        {
          id: 'v1',
          name: 'Raw Indigo',
          swatchHex: '#1E293B',
          secondaryHex: '#D97736',
          materialFinish: 'Selvedge Denim',
          priceDeltaKes: 0,
          roughness: 0.78,
          metalness: 0.08,
        },
      ],
    },
    {
      id: 'aberdare-bamboo-chair',
      paybillCode: '111111#ABERDARECHAIR',
      name: 'Aberdare Laminated Highland Bamboo Lounge Chair',
      domain: 'furniture',
      category: 'Seating',
      creatorName: 'Demo Creator 5',
      creatorStudio: 'Demo Studio 5',
      originLocation: 'Nairobi, Kenya',
      priceKes: 48500,
      weightKg: 14.5,
      leadTimeDays: '5-7 Days',
      sustainabilityMetric: 'Carbon-negative',
      materialComposition: 'Cross-Laminated Kenyan Highland Bamboo · Hand-Spun Sisal Webbing',
      description: 'Chair',
      artworkPreset: 'bamboo-lounge-chair',
      variants: [
        {
          id: 'v2',
          name: 'Honey Bamboo',
          swatchHex: '#D4A359',
          secondaryHex: '#E6DEC8',
          materialFinish: 'Beeswax Bamboo',
          priceDeltaKes: 0,
          roughness: 0.42,
          metalness: 0.08,
        },
      ],
    },
  ];

  // Search by creator name
  const byCreator = filterCatalogProducts({
    catalog: sampleCatalog,
    domainFilter: 'all',
    wishlistIds: [],
    searchQuery: 'Zephyr',
  });
  assert.equal(byCreator.length, 1);
  assert.equal(byCreator[0].id, 'kibera-denim-trench');

  // Search by material type (multi-token)
  const byMaterial = filterCatalogProducts({
    catalog: sampleCatalog,
    domainFilter: 'all',
    wishlistIds: [],
    searchQuery: 'highland bamboo sisal',
  });
  assert.equal(byMaterial.length, 1);
  assert.equal(byMaterial[0].id, 'aberdare-bamboo-chair');

  // Domain filter combined with search
  const domainMismatch = filterCatalogProducts({
    catalog: sampleCatalog,
    domainFilter: 'fashion',
    wishlistIds: [],
    searchQuery: 'bamboo',
  });
  assert.equal(domainMismatch.length, 0);

  // Material category filter ('Upcycled', 'Highland Bamboo', 'Sisal', 'Recycled Brass')
  const upcycledOnly = filterCatalogProducts({
    catalog: sampleCatalog,
    domainFilter: 'all',
    materialFilter: 'Upcycled',
    wishlistIds: [],
    searchQuery: '',
  });
  assert.equal(upcycledOnly.length, 1);
  assert.equal(upcycledOnly[0].id, 'kibera-denim-trench');

  const sisalOnly = filterCatalogProducts({
    catalog: sampleCatalog,
    domainFilter: 'all',
    materialFilter: 'Sisal',
    wishlistIds: [],
    searchQuery: '',
  });
  assert.equal(sisalOnly.length, 1);
  assert.equal(sisalOnly[0].id, 'aberdare-bamboo-chair');

  const brassEmptyOnSample = filterCatalogProducts({
    catalog: sampleCatalog,
    domainFilter: 'all',
    materialFilter: 'Recycled Brass',
    wishlistIds: [],
    searchQuery: '',
  });
  assert.equal(brassEmptyOnSample.length, 0);

  const fashionPrompts = getStylistQuickPrompts(sampleCatalog[0]);
  assert.equal(fashionPrompts.length, 3);
  assert.match(fashionPrompts[0], /Art After Dark/i);
  assert.match(fashionPrompts[1], /material care/i);

  const furniturePrompts = getStylistQuickPrompts(sampleCatalog[1]);
  assert.equal(furniturePrompts.length, 3);
  assert.match(furniturePrompts[0], /material care/i);

  const sharePkg = buildShareableARPackage({
    baseUrl: 'https://unitycollective.art/',
    product: sampleCatalog[0],
    variant: sampleCatalog[0].variants[0],
    selectedSize: 'M',
  });
  assert.equal(
    sharePkg.arExperienceUrl,
    'https://unitycollective.art/?ar=fashion&product=kibera-denim-trench&variant=v1&size=M',
  );
  assert.match(sharePkg.shareTitle, /Kibera Upcycled Indigo/i);
  assert.match(sharePkg.shareText, /111111#KIBERATRENCH/);
  assert.match(sharePkg.whatsappShareUrl, /https:\/\/api\.whatsapp\.com\/send\?text=/);
  assert.match(sharePkg.instagramStoryCaption, /@unitycollective\.art/);
  assert.match(sharePkg.tiktokCaption, /#UnityArtCollective/);

  // Recently Viewed tracking (deduplication, most-recent first, capped at 5)
  let recentIds: string[] = [];
  for (const id of ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']) {
    recentIds = recordRecentlyViewedProduct(recentIds, id);
  }
  assert.equal(recentIds.length, MAX_RECENTLY_VIEWED_ITEMS);
  assert.deepEqual(recentIds, ['p6', 'p5', 'p4', 'p3', 'p2']);

  // Re-interacting with 'p3' moves it to index 0 without duplicating
  recentIds = recordRecentlyViewedProduct(recentIds, 'p3');
  assert.equal(recentIds.length, 5);
  assert.deepEqual(recentIds, ['p3', 'p6', 'p5', 'p4', 'p2']);

  const resolvedRecent = resolveRecentlyViewedProducts(sampleCatalog, [
    'aberdare-bamboo-chair',
    'unknown-id',
    'kibera-denim-trench',
  ]);
  assert.equal(resolvedRecent.length, 2);
  assert.equal(resolvedRecent[0].id, 'aberdare-bamboo-chair');
  assert.equal(resolvedRecent[1].id, 'kibera-denim-trench');

  assert.equal(isFashionPreset('brass-collar'), true);
  assert.equal(isFashionPreset('bamboo-lounge-chair'), false);
  const collarFraming = getPreviewCameraFraming('brass-collar');
  assert.equal(collarFraming.cameraPos.length, 3);
  assert.ok(collarFraming.cameraPos[1] > 1.4);
});


