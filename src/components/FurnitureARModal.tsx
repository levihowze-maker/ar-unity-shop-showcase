import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Layers,
  Plus,
  Ruler,
  Share2,
  ShoppingBag,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import {
  calculateSpatialSceneMetrics,
  CurrencyCode,
  formatCurrency,
  MarketplaceProduct,
  ProductVariant,
} from '../utils/marketplaceLogic';
import { buildFurnitureModelGroup } from './ThreeSceneBuilders';

interface FurnitureARModalProps {
  product: MarketplaceProduct;
  initialVariant?: ProductVariant;
  allFurnitureProducts: MarketplaceProduct[];
  currency: CurrencyCode;
  onClose: () => void;
  onAddSceneToCart: (
    items: Array<{
      product: MarketplaceProduct;
      variant: ProductVariant;
      isDepositOnly: boolean;
    }>,
  ) => void;
  onOpenShare: (params: {
    product: MarketplaceProduct;
    variant: ProductVariant;
    companionCount?: number;
  }) => void;
  onTrackEvent: (eventType: string, metadata?: Record<string, unknown>) => void;
}

interface SpatialAdvisorResponse {
  headline: string;
  spatialPlacementAdvice: string;
  materialSustainabilityStory: string;
  complementaryPairing: string;
}

export const FurnitureARModal: React.FC<FurnitureARModalProps> = ({
  product,
  initialVariant,
  allFurnitureProducts,
  currency,
  onClose,
  onAddSceneToCart,
  onOpenShare,
  onTrackEvent,
}) => {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(
    initialVariant || product.variants[0],
  );
  const [companionIds, setCompanionIds] = useState<string[]>([]);
  const [rotationDeg, setRotationDeg] = useState<number>(24);
  const [scaleMultiplier, setScaleMultiplier] = useState<number>(1.0);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetZ, setOffsetZ] = useState<number>(0);
  const [showDimensions, setShowDimensions] = useState<boolean>(true);
  const [showLidarGrid, setShowLidarGrid] = useState<boolean>(true);
  const [lightingPreset, setLightingPreset] = useState<'golden-hour' | 'daylight' | 'evening'>(
    'golden-hour',
  );
  const [depositOnlyMode, setDepositOnlyMode] = useState<boolean>(false);
  const [controlsCollapsed, setControlsCollapsed] = useState<boolean>(false);
  const [activeDockTab, setActiveDockTab] = useState<
    'placement' | 'materials' | 'multi-object' | 'advisor'
  >('placement');
  const [sceneSavedSuccess, setSceneSavedSuccess] = useState<boolean>(false);

  // Live Camera Room AR state
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraNotice, setCameraNotice] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Server-side Gemini Spatial & Material Sustainability Advisor
  const [roomQuestion, setRoomQuestion] = useState<string>(
    'How should I position this piece for natural daylight and acoustic warmth?',
  );
  const [advisorLoading, setAdvisorLoading] = useState<boolean>(false);
  const [advisorData, setAdvisorData] = useState<SpatialAdvisorResponse | null>(null);

  const companionProducts = allFurnitureProducts.filter((p) => companionIds.includes(p.id));

  const placedMetricsInput = [
    {
      dimensionsCm: product.dimensionsCm || { width: 70, depth: 75, height: 72 },
      scale: scaleMultiplier,
    },
    ...companionProducts.map((cp) => ({
      dimensionsCm: cp.dimensionsCm || { width: 65, depth: 65, height: 65 },
      scale: 1.0,
    })),
  ];
  const spatialMetrics = calculateSpatialSceneMetrics(placedMetricsInput);

  // Stable Three.js refs
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const sceneStateRef = useRef<{
    product: MarketplaceProduct;
    variant: ProductVariant;
    companions: MarketplaceProduct[];
    rotationRad: number;
    scale: number;
    offsetX: number;
    offsetZ: number;
    showLidarGrid: boolean;
    lightingPreset: 'golden-hour' | 'daylight' | 'evening';
    needsRebuild: boolean;
  }>({
    product,
    variant: selectedVariant,
    companions: companionProducts,
    rotationRad: (rotationDeg * Math.PI) / 180,
    scale: scaleMultiplier,
    offsetX,
    offsetZ,
    showLidarGrid,
    lightingPreset,
    needsRebuild: true,
  });

  useEffect(() => {
    sceneStateRef.current.product = product;
    sceneStateRef.current.variant = selectedVariant;
    sceneStateRef.current.companions = companionProducts;
    sceneStateRef.current.needsRebuild = true;
  }, [product, selectedVariant, companionIds.join(',')]);

  useEffect(() => {
    sceneStateRef.current.rotationRad = (rotationDeg * Math.PI) / 180;
    sceneStateRef.current.scale = scaleMultiplier;
    sceneStateRef.current.offsetX = offsetX;
    sceneStateRef.current.offsetZ = offsetZ;
    sceneStateRef.current.showLidarGrid = showLidarGrid;
    sceneStateRef.current.lightingPreset = lightingPreset;
  }, [rotationDeg, scaleMultiplier, offsetX, offsetZ, showLidarGrid, lightingPreset]);

  // Initialize Three.js Room Scene once
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const isHeadless =
      navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);

    const width = container.clientWidth || 1024;
    const height = container.clientHeight || 640;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 60);
    camera.position.set(0, 1.55, 3.45);
    camera.lookAt(0, 0.12, 0);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isHeadless,
        alpha: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true,
      });
    } catch (_e) {
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Architectural Studio Floor & LiDAR Plane Detection Grid
    const floorGeo = new THREE.PlaneGeometry(8, 8);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x16161a,
      roughness: 0.72,
      metalness: 0.08,
      transparent: true,
      opacity: 0.88,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.y = 0;
    scene.add(floorMesh);

    const gridHelper = new THREE.GridHelper(5.5, 22, 0xd97736, 0x3f3f46);
    gridHelper.position.y = 0.014;
    scene.add(gridHelper);

    // LiDAR Surface Reticle Ring
    const reticleGeo = new THREE.RingGeometry(0.68, 0.72, 48);
    reticleGeo.rotateX(-Math.PI / 2);
    const reticleMat = new THREE.MeshBasicMaterial({
      color: 0xd4af37,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
    });
    const reticleRing = new THREE.Mesh(reticleGeo, reticleMat);
    reticleRing.position.y = 0.018;
    scene.add(reticleRing);

    // Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xffedd5, 0x1e293b, 0.95);
    scene.add(hemiLight);

    const sunKeyLight = new THREE.DirectionalLight(0xfde68a, 2.0);
    sunKeyLight.position.set(3.2, 4.5, 2.6);
    scene.add(sunKeyLight);

    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.65);
    fillLight.position.set(-3.0, 2.5, -2.0);
    scene.add(fillLight);

    const furnitureStage = new THREE.Group();
    scene.add(furnitureStage);

    let primaryFurnitureGroup = new THREE.Group();

    const rebuildSceneModels = () => {
      while (furnitureStage.children.length > 0) {
        furnitureStage.remove(furnitureStage.children[0]);
      }
      const st = sceneStateRef.current;
      primaryFurnitureGroup = buildFurnitureModelGroup(st.product, st.variant);
      furnitureStage.add(primaryFurnitureGroup);

      st.companions.forEach((comp, idx) => {
        const compGroup = buildFurnitureModelGroup(comp, comp.variants[0]);
        const angle = idx === 0 ? -0.35 : 0.35;
        compGroup.position.set(idx === 0 ? -1.25 : 1.25, 0, -0.35);
        compGroup.rotation.y = angle;
        furnitureStage.add(compGroup);
      });

      st.needsRebuild = false;
    };

    rebuildSceneModels();
    renderer.compile(scene, camera);

    const clock = new THREE.Clock();
    let animId = 0;
    let lastRenderTime = 0;

    const animate = (now: number) => {
      animId = requestAnimationFrame(animate);
      if (isHeadless && now - lastRenderTime < 66) return;
      lastRenderTime = now;

      const dt = Math.min(clock.getDelta(), 0.1);
      const st = sceneStateRef.current;

      if (st.needsRebuild) {
        rebuildSceneModels();
      }

      const damp = 1 - Math.exp(-7 * dt);
      primaryFurnitureGroup.rotation.y = THREE.MathUtils.lerp(
        primaryFurnitureGroup.rotation.y,
        st.rotationRad,
        damp,
      );
      primaryFurnitureGroup.scale.setScalar(
        THREE.MathUtils.lerp(primaryFurnitureGroup.scale.x, st.scale, damp),
      );
      primaryFurnitureGroup.position.x = THREE.MathUtils.lerp(
        primaryFurnitureGroup.position.x,
        st.offsetX,
        damp,
      );
      primaryFurnitureGroup.position.z = THREE.MathUtils.lerp(
        primaryFurnitureGroup.position.z,
        st.offsetZ,
        damp,
      );

      reticleRing.position.x = primaryFurnitureGroup.position.x;
      reticleRing.position.z = primaryFurnitureGroup.position.z;
      gridHelper.visible = st.showLidarGrid;
      reticleRing.visible = st.showLidarGrid;

      if (st.lightingPreset === 'golden-hour') {
        sunKeyLight.color.setHex(0xfde68a);
        sunKeyLight.intensity = 1.35;
        hemiLight.intensity = 0.65;
      } else if (st.lightingPreset === 'daylight') {
        sunKeyLight.color.setHex(0xffffff);
        sunKeyLight.intensity = 1.55;
        hemiLight.intensity = 0.85;
      } else {
        sunKeyLight.color.setHex(0xf97316);
        sunKeyLight.intensity = 0.9;
        hemiLight.intensity = 0.35;
      }

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 1024;
      const h = container.clientHeight || 640;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const handleToggleRoomCamera = async () => {
    if (cameraActive) {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
      setCameraActive(false);
      setCameraNotice(null);
      return;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraNotice(
          'Room camera feed unavailable in headless browser — active in 3D Architectural Room Planner.',
        );
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      mediaStreamRef.current = stream;
      setCameraActive(true);
      setCameraNotice('Live Room Plane Detection active · Camera stream stays on device');
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (_err) {
      setCameraNotice(
        'Camera permission declined or unavailable — using 3D Architectural Room Planner view.',
      );
      setCameraActive(false);
    }
  };

  const handleAskSpatialAdvisor = async () => {
    setAdvisorLoading(true);
    try {
      const response = await fetch('/api/gemini/spatial-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: product.name,
          variantName: selectedVariant.name,
          materialComposition: product.materialComposition,
          dimensionsCm: product.dimensionsCm,
          companionPieces: companionProducts.map((c) => c.name),
          roomQuestion,
        }),
      });
      const data = await response.json();
      setAdvisorData(data);
    } catch (_err) {
      setAdvisorData({
        headline: `Nairobi Bamboo & Spatial Spec · ${product.name}`,
        spatialPlacementAdvice:
          'Allow 65 cm perimeter walk clearance and orient laminated bamboo grain toward indirect natural light.',
        materialSustainabilityStory: product.sustainabilityMetric,
        complementaryPairing:
          'Pairs seamlessly with the Naivasha Woven Bamboo Acoustic Pendant Dome.',
      });
    } finally {
      setAdvisorLoading(false);
    }
  };

  const toggleCompanionPiece = (compId: string) => {
    setCompanionIds((prev) =>
      prev.includes(compId) ? prev.filter((id) => id !== compId) : [...prev, compId],
    );
  };

  const primaryPriceKes = product.priceKes + selectedVariant.priceDeltaKes;
  const companionsTotalKes = companionProducts.reduce((acc, c) => acc + c.priceKes, 0);
  const totalSceneKes = primaryPriceKes + companionsTotalKes;
  const effectivePayableKes = depositOnlyMode ? Math.round(totalSceneKes * 0.5) : totalSceneKes;

  const dims = product.dimensionsCm || { width: 68, depth: 76, height: 72 };
  const scaledW = Math.round(dims.width * scaleMultiplier);
  const scaledD = Math.round(dims.depth * scaleMultiplier);
  const scaledH = Math.round(dims.height * scaleMultiplier);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`WebAR Spatial Room Visualizer: ${product.name}`}
      className="fixed inset-0 z-50 flex flex-col bg-[#08080B] text-[#F4F3EF]"
    >
      {/* Top Bar */}
      <div className="relative z-20 flex items-center justify-between gap-4 px-5 py-3.5 bg-[#0D0D11] border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs font-mono-tabular uppercase tracking-wider text-[#D4AF37] shrink-0">
            02. Spatial Room WebAR
          </span>
          <span aria-hidden="true" className="text-white/25">
            ·
          </span>
          <h2 className="text-base font-semibold truncate">{product.name}</h2>
          <span aria-hidden="true" className="hidden md:inline text-white/25">
            ·
          </span>
          <span className="hidden md:inline text-xs text-[#A1A09A] whitespace-nowrap">
            {product.leadTimeDays} · Approximate Real-World Scale
          </span>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleToggleRoomCamera}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors flex items-center gap-2 whitespace-nowrap ${
              cameraActive
                ? 'bg-[#D97736] text-[#0B0B0E] border-[#D97736]'
                : 'bg-[#16161C] text-[#F4F3EF] border-white/15 hover:border-white/35'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            {cameraActive ? 'Live Room AR On' : 'Scan Room Camera'}
          </button>

          <button
            type="button"
            onClick={() => setShowDimensions((d) => !d)}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              showDimensions
                ? 'bg-[#D4AF37] text-[#0B0B0E] border-[#D4AF37]'
                : 'bg-[#16161C] text-[#F4F3EF] border-white/15'
            }`}
          >
            <Ruler className="w-3.5 h-3.5" />
            Dimensions
          </button>

          <button
            type="button"
            onClick={() => {
              setSceneSavedSuccess(true);
              onTrackEvent('save_room_scene', {
                productId: product.id,
                variantId: selectedVariant.id,
                companions: companionIds,
              });
              onOpenShare({
                product,
                variant: selectedVariant,
                companionCount: companionIds.length,
              });
            }}
            aria-label={`Share ${product.name} Spatial Room AR`}
            className="px-3.5 py-2 text-xs font-medium rounded-lg bg-[#16161C] text-[#F4F3EF] border border-white/15 hover:border-white/35 flex items-center gap-1.5 whitespace-nowrap"
          >
            <Share2 className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>{sceneSavedSuccess ? 'Shared Room' : 'Share'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Spatial Room AR"
            className="p-2 rounded-lg bg-[#16161C] text-[#E4E2DD] border border-white/15 hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Central Unobstructed 3D Spatial Viewport */}
      <div className="relative flex-1 w-full overflow-hidden bg-[#09090D]">
        {cameraActive && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover opacity-65"
          />
        )}

        <div
          ref={canvasMountRef}
          data-testid="furniture-spatial-canvas"
          className="absolute inset-0 w-full h-full"
        />

        {/* Top-Left Minimal Spec & Dimension Callout Overlay */}
        <div className="relative z-10 pointer-events-none p-5 flex flex-wrap items-start justify-between gap-4">
          <div className="pointer-events-auto bg-[#0D0D11]/90 border border-white/10 rounded-xl px-4 py-3 max-w-sm">
            <div className="text-xs text-[#A1A09A]">
              <span>{product.creatorStudio}</span>
              <span aria-hidden="true"> · </span>
              <span>{product.originLocation}</span>
            </div>
            <div className="mt-1 text-sm font-medium text-white">
              {selectedVariant.name} ·{' '}
              <span className="font-mono-tabular text-[#D4AF37]">
                {formatCurrency(totalSceneKes, currency)}
              </span>
            </div>
            <p className="mt-1 text-xs text-[#A1A09A]">{product.sustainabilityMetric}</p>
            {cameraNotice && (
              <p className="mt-2 text-xs text-[#D4AF37] border-t border-white/10 pt-1.5">
                {cameraNotice}
              </p>
            )}
          </div>

          {showDimensions && (
            <div className="pointer-events-auto bg-[#0D0D11]/90 border border-[#D4AF37]/40 rounded-xl px-4 py-3 text-xs font-mono-tabular space-y-1">
              <div className="text-[#D4AF37] font-semibold">
                METRIC: {scaledW} cm W × {scaledD} cm D × {scaledH} cm H
              </div>
              <div className="text-[#E4E2DD]">
                IMPERIAL: {spatialMetrics.primaryDimensionsImperial}
              </div>
              <div className="text-[#A1A09A]">
                SCENE FOOTPRINT: {spatialMetrics.totalFootprintSqMeters} m² (
                {1 + companionProducts.length} piece{companionProducts.length > 0 ? 's' : ''}) ·{' '}
                {spatialMetrics.fitsInRoom ? 'Fits Standard Room' : 'Large Architectural Span'}
              </div>
            </div>
          )}
        </div>

        {/* Unified Collapsible Bottom Control Dock */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[94vw] max-w-[960px]">
          <div className="flex justify-center mb-1.5">
            <button
              type="button"
              onClick={() => setControlsCollapsed((c) => !c)}
              className="px-3.5 py-1.5 text-xs font-medium bg-[#121217] text-[#E4E2DD] border border-white/15 rounded-t-lg flex items-center gap-1.5 hover:border-white/35 transition-colors whitespace-nowrap"
            >
              {controlsCollapsed ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  Show Spatial Controls
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  Hide Controls (Inspect Room)
                </>
              )}
            </button>
          </div>

          {!controlsCollapsed && (
            <div className="bg-[#111116] border border-white/15 rounded-2xl p-4 shadow-2xl">
              {/* Dock Tabs + Primary Add to Cart / Deposit CTA */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-white/10">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveDockTab('placement')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                      activeDockTab === 'placement'
                        ? 'bg-[#F4F3EF] text-[#0B0B0E]'
                        : 'bg-[#1A1A22] text-[#A1A09A] hover:text-white'
                    }`}
                  >
                    1. Floor Placement & Scale
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDockTab('materials')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                      activeDockTab === 'materials'
                        ? 'bg-[#F4F3EF] text-[#0B0B0E]'
                        : 'bg-[#1A1A22] text-[#A1A09A] hover:text-white'
                    }`}
                  >
                    2. Bamboo & Material Finishes
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDockTab('multi-object')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                      activeDockTab === 'multi-object'
                        ? 'bg-[#F4F3EF] text-[#0B0B0E]'
                        : 'bg-[#1A1A22] text-[#A1A09A] hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    3. Multi-Piece Scene ({1 + companionProducts.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveDockTab('advisor');
                      if (!advisorData) handleAskSpatialAdvisor();
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                      activeDockTab === 'advisor'
                        ? 'bg-[#D4AF37] text-[#0B0B0E]'
                        : 'bg-[#1A1A22] text-[#E4E2DD] hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    4. AI Material & Space Advisor
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDepositOnlyMode((d) => !d)}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                      depositOnlyMode
                        ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37]'
                        : 'bg-[#1A1A22] border-white/15 text-[#A1A09A] hover:text-white'
                    }`}
                  >
                    {depositOnlyMode ? '50% Custom Deposit Active' : 'Pay 50% Deposit Option'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onAddSceneToCart([
                        {
                          product,
                          variant: selectedVariant,
                          isDepositOnly: depositOnlyMode,
                        },
                        ...companionProducts.map((cp) => ({
                          product: cp,
                          variant: cp.variants[0],
                          isDepositOnly: depositOnlyMode,
                        })),
                      ]);
                      onClose();
                    }}
                    className="px-4 py-2 text-xs font-semibold bg-[#D97736] text-[#0B0B0E] rounded-lg hover:bg-[#EA8A47] transition-colors flex items-center gap-2 whitespace-nowrap"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    {depositOnlyMode ? 'Book Custom Build (50% Deposit: ' : 'Add Room Scene to Bag ('}
                    {formatCurrency(effectivePayableKes, currency)})
                  </button>
                </div>
              </div>

              {/* TAB 1: PLACEMENT, ROTATION & SCALE */}
              {activeDockTab === 'placement' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  <div>
                    <label
                      htmlFor="spatial-rotate-slider"
                      className="block text-xs text-[#A1A09A] mb-1"
                    >
                      Rotate in Room:{' '}
                      <span className="font-mono-tabular text-white">{rotationDeg}°</span>
                    </label>
                    <input
                      id="spatial-rotate-slider"
                      type="range"
                      min={-180}
                      max={180}
                      value={rotationDeg}
                      onChange={(e) => setRotationDeg(Number(e.target.value))}
                      className="w-full accent-[#D97736]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="spatial-position-slider"
                      className="block text-xs text-[#A1A09A] mb-1"
                    >
                      Floor Position X:{' '}
                      <span className="font-mono-tabular text-white">
                        {Math.round(offsetX * 100)} cm
                      </span>
                    </label>
                    <input
                      id="spatial-position-slider"
                      type="range"
                      min={-1.2}
                      max={1.2}
                      step={0.05}
                      value={offsetX}
                      onChange={(e) => setOffsetX(Number(e.target.value))}
                      className="w-full accent-[#D97736]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="spatial-depth-slider"
                      className="block text-xs text-[#A1A09A] mb-1"
                    >
                      Floor Depth Z:{' '}
                      <span className="font-mono-tabular text-white">
                        {Math.round(offsetZ * 100)} cm
                      </span>
                    </label>
                    <input
                      id="spatial-depth-slider"
                      type="range"
                      min={-0.9}
                      max={0.9}
                      step={0.05}
                      value={offsetZ}
                      onChange={(e) => setOffsetZ(Number(e.target.value))}
                      className="w-full accent-[#D97736]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="spatial-scale-slider"
                      className="block text-xs text-[#A1A09A] mb-1"
                    >
                      Scale Calibration:{' '}
                      <span className="font-mono-tabular text-white">
                        {Math.round(scaleMultiplier * 100)}%
                      </span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="spatial-scale-slider"
                        type="range"
                        min={0.85}
                        max={1.15}
                        step={0.05}
                        value={scaleMultiplier}
                        onChange={(e) => setScaleMultiplier(Number(e.target.value))}
                        className="flex-1 accent-[#D4AF37]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLidarGrid((g) => !g)}
                        className="px-2.5 py-1 text-xs bg-[#1A1A22] border border-white/15 rounded hover:border-white/35 whitespace-nowrap"
                      >
                        {showLidarGrid ? 'Hide Grid' : 'Show Grid'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: MATERIALS & LIGHTING */}
              {activeDockTab === 'materials' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div>
                    <span className="block text-xs text-[#A1A09A] mb-1.5">
                      Nairobi Highland Bamboo & Sustainable Material Swatches
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {product.variants.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => {
                            setSelectedVariant(v);
                            onTrackEvent('variant_switch', {
                              productId: product.id,
                              variantId: v.id,
                            });
                          }}
                          className={`px-3 py-1.5 text-xs rounded-lg border flex items-center gap-2 transition-colors ${
                            selectedVariant.id === v.id
                              ? 'bg-white/15 border-[#D4AF37] text-white'
                              : 'bg-[#1A1A22] border-white/10 text-[#A1A09A] hover:text-white'
                          }`}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0"
                            style={{ backgroundColor: v.swatchHex }}
                          />
                          <span>{v.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="block text-xs text-[#A1A09A] mb-1.5">
                      Ambient Room Lighting Simulation
                    </span>
                    <div className="flex items-center gap-2">
                      {(
                        [
                          { id: 'golden-hour', label: 'Nairobi Golden Hour' },
                          { id: 'daylight', label: 'Gallery Daylight' },
                          { id: 'evening', label: 'Art After Dark Warm' },
                        ] as const
                      ).map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setLightingPreset(preset.id)}
                          className={`px-3 py-1.5 text-xs rounded-lg border flex items-center gap-1.5 whitespace-nowrap ${
                            lightingPreset === preset.id
                              ? 'bg-[#D4AF37] text-[#0B0B0E] border-[#D4AF37] font-medium'
                              : 'bg-[#1A1A22] text-[#A1A09A] border-white/10 hover:text-white'
                          }`}
                        >
                          <Sun className="w-3.5 h-3.5" />
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: MULTI-OBJECT ROOM COMPOSER */}
              {activeDockTab === 'multi-object' && (
                <div>
                  <span className="block text-xs text-[#A1A09A] mb-2">
                    Combine Complementary Nairobi Pieces in Your Room Scene (Table + Chairs + Lighting)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {allFurnitureProducts
                      .filter((p) => p.id !== product.id)
                      .map((comp) => {
                        const isAdded = companionIds.includes(comp.id);
                        return (
                          <button
                            key={comp.id}
                            type="button"
                            onClick={() => toggleCompanionPiece(comp.id)}
                            className={`p-2.5 rounded-xl border text-left transition-colors flex items-center justify-between gap-2 ${
                              isAdded
                                ? 'bg-[#D97736]/20 border-[#D97736] text-white'
                                : 'bg-[#1A1A22] border-white/10 text-[#A1A09A] hover:text-white'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-white truncate">
                                {comp.name}
                              </div>
                              <div className="text-xs font-mono-tabular text-[#D4AF37]">
                                +{formatCurrency(comp.priceKes, currency)}
                              </div>
                            </div>
                            <span className="p-1.5 rounded-lg bg-white/10 shrink-0">
                              {isAdded ? (
                                <Check className="w-3.5 h-3.5 text-[#D97736]" />
                              ) : (
                                <Plus className="w-3.5 h-3.5" />
                              )}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* TAB 4: SERVER-SIDE GEMINI SPATIAL & SUSTAINABLE MATERIAL ADVISOR */}
              {activeDockTab === 'advisor' && (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <label htmlFor="spatial-advisor-input" className="sr-only">
                      Ask about bamboo sourcing, BIPV solar output, or room layout
                    </label>
                    <input
                      id="spatial-advisor-input"
                      type="text"
                      value={roomQuestion}
                      onChange={(e) => setRoomQuestion(e.target.value)}
                      placeholder="Ask about bamboo culm durability, acoustic absorption, or shipping..."
                      className="flex-1 bg-[#1A1A22] border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                    <button
                      type="button"
                      onClick={handleAskSpatialAdvisor}
                      disabled={advisorLoading}
                      className="px-4 py-1.5 text-xs font-medium bg-[#D4AF37] text-[#0B0B0E] rounded-lg hover:bg-[#E5C148] transition-colors whitespace-nowrap"
                    >
                      {advisorLoading ? 'Analyzing Room Spec...' : 'Ask Material Specialist'}
                    </button>
                  </div>

                  {advisorData && (
                    <div className="bg-[#181820] border border-white/10 rounded-xl p-3.5 text-xs space-y-1.5">
                      <div className="font-semibold text-[#D4AF37]">{advisorData.headline}</div>
                      <p className="text-[#E4E2DD] leading-relaxed">
                        {advisorData.spatialPlacementAdvice}
                      </p>
                      <p className="text-[#A1A09A] leading-relaxed">
                        <strong className="text-white">Material Provenance:</strong>{' '}
                        {advisorData.materialSustainabilityStory}
                      </p>
                      <p className="text-[#A1A09A]">
                        <strong className="text-white">Curated Pairing:</strong>{' '}
                        {advisorData.complementaryPairing}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
