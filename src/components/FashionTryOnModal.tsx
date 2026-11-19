import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Columns2,
  Eye,
  Heart,
  Share2,
  ShoppingBag,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import {
  calculateFitCalibration,
  CurrencyCode,
  FitPreference,
  formatCurrency,
  GarmentTrackMode,
  MarketplaceProduct,
  ProductVariant,
} from '../utils/marketplaceLogic';
import { buildFashionTryOnGroup } from './ThreeSceneBuilders';

interface FashionTryOnModalProps {
  product: MarketplaceProduct;
  initialVariant?: ProductVariant;
  allFashionProducts: MarketplaceProduct[];
  currency: CurrencyCode;
  isWishlisted: boolean;
  onToggleWishlist: (productId: string) => void;
  onClose: () => void;
  onAddToCart: (params: {
    product: MarketplaceProduct;
    variant: ProductVariant;
    selectedSize: string;
  }) => void;
  onOpenShare: (params: {
    product: MarketplaceProduct;
    variant: ProductVariant;
    selectedSize?: string;
  }) => void;
  onTrackEvent: (eventType: string, metadata?: Record<string, unknown>) => void;
}

interface StylistAdvice {
  headline: string;
  drapeAnalysis: string;
  pairingSuggestion: string;
  careAndOriginNote: string;
}

export const FashionTryOnModal: React.FC<FashionTryOnModalProps> = ({
  product,
  initialVariant,
  allFashionProducts,
  currency,
  isWishlisted,
  onToggleWishlist,
  onClose,
  onAddToCart,
  onOpenShare,
  onTrackEvent,
}) => {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(
    initialVariant || product.variants[0],
  );
  const [trackMode, setTrackMode] = useState<GarmentTrackMode>(
    product.arTrackMode || 'full-body',
  );
  const [heightCm, setHeightCm] = useState<number>(174);
  const [weightKg, setWeightKg] = useState<number>(68);
  const [fitPreference, setFitPreference] = useState<FitPreference>('regular');
  const [rotationDeg, setRotationDeg] = useState<number>(18);
  const [showPoseSkeleton, setShowPoseSkeleton] = useState<boolean>(true);
  const [lowLightSimulation, setLowLightSimulation] = useState<boolean>(false);
  const [opticalGlassesHud, setOpticalGlassesHud] = useState<boolean>(false);
  const [compareProduct, setCompareProduct] = useState<MarketplaceProduct | null>(null);
  const [controlsCollapsed, setControlsCollapsed] = useState<boolean>(false);
  const [activeDockTab, setActiveDockTab] = useState<'fit' | 'variants' | 'stylist' | 'share'>('fit');

  // Camera WebAR state
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraNotice, setCameraNotice] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Gemini Stylist state
  const [occasionPrompt, setOccasionPrompt] = useState<string>(
    'Art After Dark gallery opening in Nairobi & global travel',
  );
  const [stylistLoading, setStylistLoading] = useState<boolean>(false);
  const [stylistAdvice, setStylistAdvice] = useState<StylistAdvice | null>(null);

  // Share Story preview state
  const [storySharedSuccess, setStorySharedSuccess] = useState<boolean>(false);

  const calibration = calculateFitCalibration({
    heightCm,
    weightKg,
    fitPreference,
    trackMode,
  });

  // Refs for stable Three.js lifecycle
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const sceneStateRef = useRef<{
    product: MarketplaceProduct;
    variant: ProductVariant;
    drapeScale: number;
    showPoseSkeleton: boolean;
    rotationRad: number;
    trackMode: GarmentTrackMode;
    lowLightSimulation: boolean;
    compareProduct: MarketplaceProduct | null;
    needsRebuild: boolean;
  }>({
    product,
    variant: selectedVariant,
    drapeScale: calibration.garmentDrapeScale,
    showPoseSkeleton,
    rotationRad: (rotationDeg * Math.PI) / 180,
    trackMode,
    lowLightSimulation,
    compareProduct,
    needsRebuild: true,
  });

  useEffect(() => {
    sceneStateRef.current.product = product;
    sceneStateRef.current.variant = selectedVariant;
    sceneStateRef.current.drapeScale = calibration.garmentDrapeScale;
    sceneStateRef.current.showPoseSkeleton = showPoseSkeleton;
    sceneStateRef.current.compareProduct = compareProduct;
    sceneStateRef.current.needsRebuild = true;
  }, [product, selectedVariant, calibration.garmentDrapeScale, showPoseSkeleton, compareProduct]);

  useEffect(() => {
    sceneStateRef.current.rotationRad = (rotationDeg * Math.PI) / 180;
    sceneStateRef.current.trackMode = trackMode;
    sceneStateRef.current.lowLightSimulation = lowLightSimulation;
  }, [rotationDeg, trackMode, lowLightSimulation]);

  // Mount Three.js WebGLRenderer once
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const isHeadless =
      navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);

    const width = container.clientWidth || 960;
    const height = container.clientHeight || 600;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 50);
    camera.position.set(0, 1.15, 3.45);
    camera.lookAt(0, 0.92, 0);

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
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Studio 3-point warm/cool lighting
    const hemiLight = new THREE.HemisphereLight(0xfef3c7, 0x1e293b, 0.9);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffbeb, 1.85);
    keyLight.position.set(2.5, 3.8, 3.2);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xd97736, 1.1);
    rimLight.position.set(-2.5, 2.2, -2.0);
    scene.add(rimLight);

    // Subtle AR calibration floor ring
    const ringGeo = new THREE.RingGeometry(0.52, 0.55, 48);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xd97736,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
    });
    const floorRing = new THREE.Mesh(ringGeo, ringMat);
    floorRing.position.y = 0.015;
    scene.add(floorRing);

    const stageGroup = new THREE.Group();
    scene.add(stageGroup);

    const rebuildModels = () => {
      while (stageGroup.children.length > 0) {
        stageGroup.remove(stageGroup.children[0]);
      }
      const st = sceneStateRef.current;
      const primaryActor = buildFashionTryOnGroup(
        st.product,
        st.variant,
        st.drapeScale,
        st.showPoseSkeleton,
      );

      if (st.compareProduct) {
        primaryActor.position.x = -0.46;
        const secondActor = buildFashionTryOnGroup(
          st.compareProduct,
          st.compareProduct.variants[0],
          st.drapeScale,
          st.showPoseSkeleton,
        );
        secondActor.position.x = 0.46;
        stageGroup.add(primaryActor, secondActor);
      } else {
        primaryActor.position.x = 0;
        stageGroup.add(primaryActor);
      }
      st.needsRebuild = false;
    };

    rebuildModels();
    renderer.compile(scene, camera);

    const clock = new THREE.Clock();
    let animId = 0;
    let lastRenderTime = 0;

    const targetCamPos = new THREE.Vector3(0, 1.15, 3.45);
    const targetLookAt = new THREE.Vector3(0, 0.92, 0);
    const currentLookAt = new THREE.Vector3(0, 0.92, 0);

    const animate = (now: number) => {
      animId = requestAnimationFrame(animate);
      if (isHeadless && now - lastRenderTime < 66) return;
      lastRenderTime = now;

      const dt = Math.min(clock.getDelta(), 0.1);
      const st = sceneStateRef.current;

      if (st.needsRebuild) {
        rebuildModels();
      }

      // Adjust camera framing based on tracking mode so model sits cleanly above the bottom dock
      if (st.trackMode === 'accessory-face-torso') {
        targetCamPos.set(0, 1.58, st.compareProduct ? 2.4 : 1.75);
        targetLookAt.set(0, 1.48, 0);
      } else if (st.trackMode === 'upper-body') {
        targetCamPos.set(0, 1.34, st.compareProduct ? 2.75 : 2.35);
        targetLookAt.set(0, 1.16, 0);
      } else {
        targetCamPos.set(0, 1.15, st.compareProduct ? 3.65 : 3.45);
        targetLookAt.set(0, 0.92, 0);
      }

      const dampFactor = 1 - Math.exp(-6 * dt);
      camera.position.lerp(targetCamPos, dampFactor);
      currentLookAt.lerp(targetLookAt, dampFactor);
      camera.lookAt(currentLookAt);

      // Smooth turntable rotation
      stageGroup.children.forEach((actor) => {
        actor.rotation.y = THREE.MathUtils.lerp(actor.rotation.y, st.rotationRad, dampFactor);
      });

      // Lighting intensity adjustment for low-light warning simulation
      keyLight.intensity = st.lowLightSimulation ? 0.35 : 1.85;
      hemiLight.intensity = st.lowLightSimulation ? 0.25 : 0.9;

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 960;
      const h = container.clientHeight || 600;
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

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const handleToggleCamera = async () => {
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
          'Camera hardware not detected in this browser environment — active in 3D Pose & Garment Calibration Studio.',
        );
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      mediaStreamRef.current = stream;
      setCameraActive(true);
      setCameraNotice('Live WebAR Camera active · Processed locally on device (Kenya DPA compliant)');
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (_err) {
      setCameraNotice(
        'Camera permission declined or unavailable — showing interactive 3D Pose & Drape Calibration Studio.',
      );
      setCameraActive(false);
    }
  };

  const handleAskStylist = async () => {
    setStylistLoading(true);
    try {
      const response = await fetch('/api/gemini/stylist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: product.name,
          variantName: selectedVariant.name,
          materialComposition: product.materialComposition,
          heightCm,
          weightKg,
          recommendedSize: calibration.recommendedSize,
          fitPreference,
          occasionPrompt,
        }),
      });
      const data = await response.json();
      setStylistAdvice(data);
    } catch (_e) {
      setStylistAdvice({
        headline: `Nairobi Studio Fit · Size ${calibration.recommendedSize}`,
        drapeAnalysis: calibration.drapeGuidance,
        pairingSuggestion:
          'Layer over crisp unbleached cotton or pair with hand-forged Kenyan brass cuffs.',
        careAndOriginNote: 'Crafted in Nairobi under Unity Art Collective.',
      });
    } finally {
      setStylistLoading(false);
    }
  };

  const currentPriceKes = product.priceKes + selectedVariant.priceDeltaKes;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`WebAR Virtual Try-On: ${product.name}`}
      className="fixed inset-0 z-50 flex flex-col bg-[#08080A] text-[#F4F3EF]"
    >
      {/* Top Bar over WebAR Viewport */}
      <div className="relative z-20 flex items-center justify-between gap-4 px-5 py-3.5 bg-[#0D0D11] border-b border-white/10">
        <div className="flex items-center gap-4 min-w-0">
          <span className="text-xs font-mono-tabular uppercase tracking-wider text-[#D97736] shrink-0">
            01. WebAR Virtual Try-On
          </span>
          <span aria-hidden="true" className="text-white/25">
            ·
          </span>
          <h2 className="text-base font-semibold truncate">{product.name}</h2>
          <span aria-hidden="true" className="hidden md:inline text-white/25">
            ·
          </span>
          <span className="hidden md:inline text-xs text-[#A1A09A] whitespace-nowrap">
            {product.originLocation} · Approximation for Fit & Drape
          </span>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleToggleCamera}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors flex items-center gap-2 whitespace-nowrap ${
              cameraActive
                ? 'bg-[#D97736] text-[#0B0B0E] border-[#D97736]'
                : 'bg-[#16161C] text-[#F4F3EF] border-white/15 hover:border-white/35'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            {cameraActive ? 'Live Camera On' : 'Enable Camera AR'}
          </button>

          <button
            type="button"
            onClick={() => setOpticalGlassesHud((v) => !v)}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors flex items-center gap-2 whitespace-nowrap ${
              opticalGlassesHud
                ? 'bg-[#D4AF37] text-[#0B0B0E] border-[#D4AF37]'
                : 'bg-[#16161C] text-[#F4F3EF] border-white/15 hover:border-white/35'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Ray-Ban Optical HUD
          </button>

          <button
            type="button"
            onClick={() => onToggleWishlist(product.id)}
            aria-label={isWishlisted ? 'Remove Look from Wishlist' : 'Save Look to Wishlist'}
            className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              isWishlisted
                ? 'bg-[#D97736]/20 text-[#D97736] border-[#D97736]'
                : 'bg-[#16161C] text-[#F4F3EF] border-white/15 hover:border-white/35'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            {isWishlisted ? 'Saved Look' : 'Save Look'}
          </button>

          <button
            type="button"
            onClick={() =>
              onOpenShare({
                product,
                variant: selectedVariant,
                selectedSize: calibration.recommendedSize,
              })
            }
            aria-label={`Share ${product.name} WebAR Try-On`}
            className="px-3.5 py-2 text-xs font-medium rounded-lg bg-[#16161C] text-[#F4F3EF] border border-white/15 hover:border-white/35 transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <Share2 className="w-3.5 h-3.5 text-[#D97736]" />
            <span>Share</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Virtual Try-On"
            className="p-2 rounded-lg bg-[#16161C] text-[#E4E2DD] border border-white/15 hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Central Unobstructed 3D / WebAR Viewport */}
      <div className="relative flex-1 w-full overflow-hidden bg-[#070709]">
        {/* Optional Live Camera Video Layer */}
        {cameraActive && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover opacity-65"
          />
        )}

        {/* Dedicated Isolated Three.js Canvas Container */}
        <div
          ref={canvasMountRef}
          data-testid="fashion-tryon-canvas"
          className="absolute inset-0 w-full h-full"
        />

        {/* Minimal Top-Left Spec Readout (Leaves Center 100% Unobstructed) */}
        <div className="relative z-10 pointer-events-none p-5 flex flex-wrap items-start justify-between gap-4">
          <div className="pointer-events-auto bg-[#0D0D11]/90 border border-white/10 rounded-xl px-4 py-3 max-w-sm">
            <div className="text-xs text-[#A1A09A]">
              <span>{product.creatorStudio}</span>
              <span aria-hidden="true"> · </span>
              <span className="font-mono-tabular text-[#D4AF37]">
                Size {calibration.recommendedSize}
              </span>
            </div>
            <div className="mt-1 text-sm font-medium text-[#F4F3EF]">
              {selectedVariant.name} ·{' '}
              <span className="font-mono-tabular text-[#D97736]">
                {formatCurrency(currentPriceKes, currency)}
              </span>
            </div>
            <p className="mt-1 text-xs text-[#A1A09A] leading-relaxed">
              {calibration.drapeGuidance}
            </p>
            {cameraNotice && (
              <p className="mt-2 text-xs text-[#D4AF37] border-t border-white/10 pt-1.5">
                {cameraNotice}
              </p>
            )}
          </div>

          {/* Optical Glasses Display Mode Overlay or Low-Light Warning */}
          <div className="pointer-events-auto flex flex-col items-end gap-2">
            {lowLightSimulation && (
              <div className="bg-[#7C2D12] border border-[#F97316] text-[#FFEDD5] px-3.5 py-2 rounded-lg text-xs font-medium">
                Low ambient lighting detected — increase room light for sharper pose tracking.
              </div>
            )}
            {opticalGlassesHud && (
              <div className="bg-black border border-[#10B981]/60 text-[#10B981] font-mono-tabular px-4 py-3 rounded-xl text-xs max-w-xs">
                <div>RAY-BAN META DISPLAY HUD · 640×400 OPTICAL</div>
                <div className="mt-1">
                  ITEM: {product.paybillCode} · FIT: {calibration.recommendedSize} (
                  {calibration.fitConfidencePercent}%)
                </div>
                <div className="mt-0.5">
                  PAYBILL 000000 · {formatCurrency(currentPriceKes, currency)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Unified Collapsible Bottom Control Dock (Zero Side-Panel Occlusion) */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[94vw] max-w-[940px]">
          <div className="flex justify-center mb-1.5">
            <button
              type="button"
              onClick={() => setControlsCollapsed((c) => !c)}
              className="px-3.5 py-1.5 text-xs font-medium bg-[#121217] text-[#E4E2DD] border border-white/15 rounded-t-lg flex items-center gap-1.5 hover:border-white/35 transition-colors whitespace-nowrap"
            >
              {controlsCollapsed ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  Show Try-On Controls
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  Hide Controls (Full AR View)
                </>
              )}
            </button>
          </div>

          {!controlsCollapsed && (
            <div className="bg-[#111116] border border-white/15 rounded-2xl p-4 shadow-2xl">
              {/* Dock Navigation Tabs + Primary Add to Bag CTA */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-white/10">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveDockTab('fit')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                      activeDockTab === 'fit'
                        ? 'bg-[#F4F3EF] text-[#0B0B0E]'
                        : 'bg-[#1A1A22] text-[#A1A09A] hover:text-white'
                    }`}
                  >
                    1. Body Calibration & Fit ({calibration.recommendedSize})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDockTab('variants')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                      activeDockTab === 'variants'
                        ? 'bg-[#F4F3EF] text-[#0B0B0E]'
                        : 'bg-[#1A1A22] text-[#A1A09A] hover:text-white'
                    }`}
                  >
                    2. Swatches & Side-by-Side
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveDockTab('stylist');
                      if (!stylistAdvice) handleAskStylist();
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                      activeDockTab === 'stylist'
                        ? 'bg-[#D97736] text-[#0B0B0E]'
                        : 'bg-[#1A1A22] text-[#E4E2DD] hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    3. AI Stylist & Fit Advice
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDockTab('share')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                      activeDockTab === 'share'
                        ? 'bg-[#F4F3EF] text-[#0B0B0E]'
                        : 'bg-[#1A1A22] text-[#A1A09A] hover:text-white'
                    }`}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    4. Story Frame
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onAddToCart({
                      product,
                      variant: selectedVariant,
                      selectedSize: calibration.recommendedSize,
                    });
                    onClose();
                  }}
                  className="px-4 py-2 text-xs font-semibold bg-[#D97736] text-[#0B0B0E] rounded-lg hover:bg-[#EA8A47] transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  Looks Good · Add Size {calibration.recommendedSize} to Bag (
                  {formatCurrency(currentPriceKes, currency)})
                </button>
              </div>

              {/* TAB 1: BODY CALIBRATION & TRACKING MODES */}
              {activeDockTab === 'fit' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  <div>
                    <label
                      htmlFor="tryon-height-slider"
                      className="block text-xs text-[#A1A09A] mb-1"
                    >
                      Height Calibration:{' '}
                      <span className="font-mono-tabular text-white">{heightCm} cm</span>
                    </label>
                    <input
                      id="tryon-height-slider"
                      type="range"
                      min={148}
                      max={204}
                      value={heightCm}
                      onChange={(e) => setHeightCm(Number(e.target.value))}
                      className="w-full accent-[#D97736]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="tryon-weight-slider"
                      className="block text-xs text-[#A1A09A] mb-1"
                    >
                      Weight Calibration:{' '}
                      <span className="font-mono-tabular text-white">{weightKg} kg</span>
                    </label>
                    <input
                      id="tryon-weight-slider"
                      type="range"
                      min={44}
                      max={130}
                      value={weightKg}
                      onChange={(e) => setWeightKg(Number(e.target.value))}
                      className="w-full accent-[#D97736]"
                    />
                  </div>

                  <div>
                    <span className="block text-xs text-[#A1A09A] mb-1">Drape Preference</span>
                    <div className="flex items-center gap-1 bg-[#1A1A22] p-1 rounded-lg">
                      {(['tailored', 'regular', 'oversized'] as FitPreference[]).map((pref) => (
                        <button
                          key={pref}
                          type="button"
                          onClick={() => setFitPreference(pref)}
                          className={`flex-1 py-1 text-xs font-medium rounded capitalize transition-colors ${
                            fitPreference === pref
                              ? 'bg-[#D97736] text-[#0B0B0E]'
                              : 'text-[#A1A09A] hover:text-white'
                          }`}
                        >
                          {pref}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="tryon-angle-slider"
                      className="block text-xs text-[#A1A09A] mb-1"
                    >
                      Pose Angle & Tracking:{' '}
                      <span className="font-mono-tabular text-white">{rotationDeg}°</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="tryon-angle-slider"
                        type="range"
                        min={-75}
                        max={75}
                        value={rotationDeg}
                        onChange={(e) => setRotationDeg(Number(e.target.value))}
                        className="flex-1 accent-[#D4AF37]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPoseSkeleton((s) => !s)}
                        className="px-2.5 py-1 text-xs bg-[#1A1A22] border border-white/15 rounded hover:border-white/35 whitespace-nowrap"
                      >
                        {showPoseSkeleton ? 'Hide Joints' : 'Show Joints'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: SWATCHES, TRACKING ZONE & SIDE-BY-SIDE COMPARISON */}
              {activeDockTab === 'variants' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  <div>
                    <span className="block text-xs text-[#A1A09A] mb-1.5">
                      Nairobi Textile / Metal Variant
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
                              ? 'bg-white/15 border-[#D97736] text-white'
                              : 'bg-[#1A1A22] border-white/10 text-[#A1A09A] hover:text-white'
                          }`}
                        >
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: v.swatchHex }}
                          />
                          <span className="truncate max-w-[140px]">{v.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="block text-xs text-[#A1A09A] mb-1.5">
                      Camera Framing & Pose Mode
                    </span>
                    <div className="flex items-center gap-1.5">
                      {(
                        [
                          { id: 'upper-body', label: 'Upper Body' },
                          { id: 'full-body', label: 'Full Body' },
                          { id: 'accessory-face-torso', label: 'Face / Collar' },
                        ] as Array<{ id: GarmentTrackMode; label: string }>
                      ).map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setTrackMode(m.id)}
                          className={`px-2.5 py-1.5 text-xs rounded-lg border whitespace-nowrap ${
                            trackMode === m.id
                              ? 'bg-[#D4AF37] text-[#0B0B0E] border-[#D4AF37] font-medium'
                              : 'bg-[#1A1A22] text-[#A1A09A] border-white/10'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="block text-xs text-[#A1A09A] mb-1.5">
                      Side-by-Side Comparison & Lighting
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (compareProduct) {
                            setCompareProduct(null);
                          } else {
                            const other =
                              allFashionProducts.find((p) => p.id !== product.id) || null;
                            setCompareProduct(other);
                          }
                        }}
                        className={`px-3 py-1.5 text-xs rounded-lg border flex items-center gap-1.5 whitespace-nowrap ${
                          compareProduct
                            ? 'bg-[#D97736] text-[#0B0B0E] border-[#D97736] font-medium'
                            : 'bg-[#1A1A22] text-[#E4E2DD] border-white/15'
                        }`}
                      >
                        <Columns2 className="w-3.5 h-3.5" />
                        {compareProduct ? 'Exit Split Compare' : 'Compare 2 Items'}
                      </button>

                      <button
                        type="button"
                        onClick={() => setLowLightSimulation((l) => !l)}
                        className="px-3 py-1.5 text-xs rounded-lg border bg-[#1A1A22] text-[#A1A09A] border-white/15 hover:text-white flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <Sun className="w-3.5 h-3.5" />
                        {lowLightSimulation ? 'Restore Studio Light' : 'Test Low Light'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: SERVER-SIDE GEMINI STYLIST & FIT ADVISOR */}
              {activeDockTab === 'stylist' && (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <label htmlFor="stylist-occasion-input" className="sr-only">
                      Styling Occasion or Fit Question
                    </label>
                    <input
                      id="stylist-occasion-input"
                      type="text"
                      value={occasionPrompt}
                      onChange={(e) => setOccasionPrompt(e.target.value)}
                      placeholder="Ask about styling for Nairobi events, climate, or layering..."
                      className="flex-1 bg-[#1A1A22] border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                    <button
                      type="button"
                      onClick={handleAskStylist}
                      disabled={stylistLoading}
                      className="px-4 py-1.5 text-xs font-medium bg-[#D4AF37] text-[#0B0B0E] rounded-lg hover:bg-[#E5C148] transition-colors whitespace-nowrap"
                    >
                      {stylistLoading ? 'Consulting Nairobi Stylist...' : 'Refresh Styling Advice'}
                    </button>
                  </div>

                  {stylistAdvice && (
                    <div className="bg-[#181820] border border-white/10 rounded-xl p-3.5 text-xs space-y-1.5">
                      <div className="font-semibold text-[#D4AF37]">{stylistAdvice.headline}</div>
                      <p className="text-[#E4E2DD] leading-relaxed">{stylistAdvice.drapeAnalysis}</p>
                      <p className="text-[#A1A09A] leading-relaxed">
                        <strong className="text-white">Styling Pairing:</strong>{' '}
                        {stylistAdvice.pairingSuggestion}
                      </p>
                      <p className="text-[#A1A09A]">
                        <strong className="text-white">Origin & Care:</strong>{' '}
                        {stylistAdvice.careAndOriginNote}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: ONE-CLICK WEB SHARE API · WHATSAPP, INSTAGRAM STORIES & TIKTOK */}
              {activeDockTab === 'share' && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#181820] border border-white/10 rounded-xl p-3.5">
                  <div className="text-xs space-y-1">
                    <div className="font-semibold text-white">
                      Share {product.name} ({selectedVariant.name}) · Web Share API
                    </div>
                    <p className="text-[#A1A09A]">
                      Share current product, variant ({selectedVariant.name}), calibrated fit (
                      {calibration.recommendedSize}), and direct WebAR link to WhatsApp, Instagram
                      Stories, and TikTok.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setStorySharedSuccess(true);
                        onTrackEvent('share_look', {
                          productId: product.id,
                          variantId: selectedVariant.id,
                        });
                        onOpenShare({
                          product,
                          variant: selectedVariant,
                          selectedSize: calibration.recommendedSize,
                        });
                      }}
                      className="px-4 py-2 text-xs font-semibold bg-[#D97736] text-[#0B0B0E] rounded-lg hover:bg-[#EA8A47] transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>
                        {storySharedSuccess
                          ? 'Share Sheet Opened (WhatsApp · IG · TikTok)'
                          : 'Share to WhatsApp, IG Stories & TikTok'}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
