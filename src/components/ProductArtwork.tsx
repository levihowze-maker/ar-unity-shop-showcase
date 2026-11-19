import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Box, Image as ImageIcon, RotateCw } from 'lucide-react';
import { getPreviewCameraFraming, MarketplaceProduct } from '../utils/marketplaceLogic';
import { buildProductPreviewModelGroup } from './ThreeSceneBuilders';

interface ProductArtworkProps {
  preset: MarketplaceProduct['artworkPreset'] | 'hero-campaign';
  primaryHex?: string;
  secondaryHex?: string;
  className?: string;
  label?: string;
  enable3DPreviewToggle?: boolean;
}

/**
 * High-contrast studio SVG artwork renderer with an interactive WebGL '3D Model Preview'
 * toggle for rotating 3D inspection of Nairobi upcycled fashion, recycled brass jewelry,
 * laminated highland bamboo furniture, and BIPV solar partitions prior to full AR launch.
 */
export const ProductArtwork: React.FC<ProductArtworkProps> = ({
  preset,
  primaryHex = '#D97736',
  secondaryHex = '#D4AF37',
  className = 'w-full h-full',
  label,
  enable3DPreviewToggle = true,
}) => {
  const [is3DPreviewActive, setIs3DPreviewActive] = useState<boolean>(false);
  const [webglError, setWebglError] = useState<boolean>(false);
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    isDragging: boolean;
    lastX: number;
    manualYawOffset: number;
  }>({
    isDragging: false,
    lastX: 0,
    manualYawOffset: 0,
  });

  useEffect(() => {
    if (!is3DPreviewActive || preset === 'hero-campaign') return;
    const container = canvasMountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer | null = null;
    let pmremGenerator: THREE.PMREMGenerator | null = null;
    let envTexture: THREE.Texture | null = null;
    let frameId = 0;

    try {
      const width = Math.max(container.clientWidth, 240);
      const height = Math.max(container.clientHeight, 180);

      const scene = new THREE.Scene();
      const framing = getPreviewCameraFraming(preset);
      const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 40);
      camera.position.set(...framing.cameraPos);
      camera.lookAt(...framing.lookAt);

      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.25;
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      container.innerHTML = '';
      container.appendChild(renderer.domElement);

      // Studio IBL + 3-Point Architectural Lighting
      pmremGenerator = new THREE.PMREMGenerator(renderer);
      envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = envTexture;

      const ambientLight = new THREE.AmbientLight(0xfff8eb, 0.65);
      const keyLight = new THREE.DirectionalLight(0xfff1d6, 2.3);
      keyLight.position.set(2.4, 3.8, 2.8);
      const fillLight = new THREE.DirectionalLight(0xc7d2fe, 0.9);
      fillLight.position.set(-2.4, 2.0, 1.4);
      const rimLight = new THREE.SpotLight(0xd97736, 1.8);
      rimLight.position.set(0, 3.2, -2.5);
      scene.add(ambientLight, keyLight, fillLight, rimLight);

      // Build 3D Model Group
      const modelGroup = buildProductPreviewModelGroup(preset, primaryHex, secondaryHex);
      scene.add(modelGroup);

      // Subtle turntable floor ring
      const ringGeo = new THREE.RingGeometry(0.46, 0.48, 48);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(secondaryHex),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.35,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.y = 0.015;
      scene.add(ringMesh);

      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (!renderer) return;
          const w = Math.max(entry.contentRect.width, 160);
          const h = Math.max(entry.contentRect.height, 120);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      });
      resizeObserver.observe(container);

      const clock = new THREE.Clock();
      const animate = () => {
        frameId = requestAnimationFrame(animate);
        const elapsed = clock.getElapsedTime();
        // Smooth continuous 360° turntable rotation + optional pointer drag offset
        modelGroup.rotation.y = elapsed * 0.65 + dragStateRef.current.manualYawOffset;
        renderer?.render(scene, camera);
      };
      animate();

      return () => {
        cancelAnimationFrame(frameId);
        resizeObserver.disconnect();
        scene.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const mesh = obj as THREE.Mesh;
            mesh.geometry?.dispose();
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((m) => m.dispose());
            } else {
              mesh.material?.dispose();
            }
          }
        });
        envTexture?.dispose();
        pmremGenerator?.dispose();
        renderer?.dispose();
        if (renderer?.domElement && renderer.domElement.parentNode === container) {
          container.removeChild(renderer.domElement);
        }
      };
    } catch (_err) {
      setWebglError(true);
      setIs3DPreviewActive(false);
      return undefined;
    }
  }, [is3DPreviewActive, preset, primaryHex, secondaryHex]);

  if (preset === 'hero-campaign') {
    return (
      <div className={`relative overflow-hidden bg-[#141318] select-none ${className}`}>
        <svg
          viewBox="65 20 670 500"
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full"
          role="img"
          aria-label="Unity Art Collective Nairobi Studio — Upcycled Fashion and Laminated Bamboo Furniture WebAR Preview"
        >
          <defs>
            <linearGradient id="heroBg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#17161B" />
              <stop offset="55%" stopColor="#0E0E12" />
              <stop offset="100%" stopColor="#1D1712" />
            </linearGradient>
            <radialGradient id="sunGlow" cx="0.72" cy="0.28" r="0.55">
              <stop offset="0%" stopColor="#D97736" stopOpacity="0.34" />
              <stop offset="50%" stopColor="#D4AF37" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#0B0B0E" stopOpacity="0" />
            </radialGradient>
            <pattern id="spatialGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="#F4F3EF"
                strokeWidth="0.6"
                strokeOpacity="0.07"
              />
            </pattern>
          </defs>

          <rect width="800" height="540" fill="url(#heroBg)" />
          <rect width="800" height="540" fill="url(#sunGlow)" />
          {/* Perspective architectural studio floor grid */}
          <polygon points="0,370 800,370 800,540 0,540" fill="#0B0B0E" fillOpacity="0.75" />
          <rect x="0" y="340" width="800" height="200" fill="url(#spatialGrid)" />
          <line x1="0" y1="370" x2="800" y2="370" stroke="#D97736" strokeOpacity="0.3" strokeWidth="1" />

          {/* Architectural Sunlit Arch in Nairobi Studio */}
          <path
            d="M 450,370 L 450,150 A 130,130 0 0,1 710,150 L 710,370 Z"
            fill="#1E1915"
            stroke="#D4AF37"
            strokeOpacity="0.28"
            strokeWidth="1.2"
          />

          {/* Left Zone: App 1 — Fashion Try-On Silhouette & AR Pose Calibration Frame */}
          <g transform="translate(95, 62)">
            {/* AR Bounding Frame */}
            <path d="M 0,24 L 0,0 L 24,0" fill="none" stroke="#D97736" strokeWidth="2" />
            <path d="M 246,0 L 270,0 L 270,24" fill="none" stroke="#D97736" strokeWidth="2" />
            <path d="M 0,346 L 0,370 L 24,370" fill="none" stroke="#D97736" strokeWidth="2" />
            <path d="M 246,370 L 270,370 L 270,346" fill="none" stroke="#D97736" strokeWidth="2" />

            {/* Pose Estimation Skeletal Lines */}
            <line x1="135" y1="54" x2="135" y2="195" stroke="#D4AF37" strokeOpacity="0.45" strokeDasharray="3 3" />
            <line x1="82" y1="96" x2="188" y2="96" stroke="#D4AF37" strokeOpacity="0.55" strokeWidth="1.5" />

            {/* Model Head & Neck */}
            <circle cx="135" cy="46" r="20" fill="#3B271E" stroke="#D4AF37" strokeWidth="1.2" />
            {/* Recycled Brass Torque Collar */}
            <path
              d="M 112,74 Q 135,90 158,74"
              fill="none"
              stroke="#D4AF37"
              strokeWidth="6"
              strokeLinecap="round"
            />
            {/* Upcycled Denim & Kitenge Architectural Trench Coat */}
            <path
              d="M 80,82 L 114,74 L 135,112 L 156,74 L 190,82 L 214,210 L 188,214 L 174,132 L 184,322 L 86,322 L 96,132 L 82,214 L 56,210 Z"
              fill="#1E293B"
              stroke="#94A3B8"
              strokeWidth="1.2"
            />
            {/* Kitenge Geometric Wax-Print Lapel & Panel */}
            <polygon points="114,74 135,112 135,322 96,322 102,130" fill="#D97736" fillOpacity="0.88" />
            <polygon points="135,145 176,145 182,245 135,245" fill="#CA8A04" fillOpacity="0.35" />
            {/* Pose Landmarks */}
            <circle cx="84" cy="94" r="4" fill="#D97736" />
            <circle cx="186" cy="94" r="4" fill="#D97736" />
            <circle cx="135" cy="175" r="4" fill="#D4AF37" />
            <text x="14" y="354" fill="#E4E2DD" fontSize="11" fontFamily="JetBrains Mono, monospace">
              APP 01 · TRY-ON DRAPE 94% FIT
            </text>
          </g>

          {/* Right Zone: App 2 — Spatial Bamboo Lounge Chair & Pendant with Plane Detection */}
          <g transform="translate(445, 76)">
            {/* Suspended Woven Bamboo Acoustic Pendant */}
            <line x1="135" y1="0" x2="135" y2="48" stroke="#D4AF37" strokeWidth="2" />
            <path
              d="M 85,88 C 85,48 185,48 185,88 Z"
              fill="#C88A4B"
              stroke="#F4F3EF"
              strokeOpacity="0.4"
              strokeWidth="1.2"
            />
            <ellipse cx="135" cy="88" rx="50" ry="10" fill="#FFF3D1" fillOpacity="0.65" />

            {/* Floor Plane LiDAR Ellipse */}
            <ellipse
              cx="135"
              cy="312"
              rx="118"
              ry="34"
              fill="#D97736"
              fillOpacity="0.1"
              stroke="#D97736"
              strokeWidth="1.5"
              strokeDasharray="6 4"
            />

            {/* Sculptural Laminated Highland Bamboo Lounge Chair */}
            <path
              d="M 78,162 L 172,148 L 162,242 L 68,254 Z"
              fill="#D4A359"
              stroke="#FDE68A"
              strokeWidth="1.2"
            />
            <line x1="86" y1="180" x2="166" y2="168" stroke="#451A03" strokeOpacity="0.45" strokeWidth="2" />
            <line x1="82" y1="202" x2="164" y2="190" stroke="#451A03" strokeOpacity="0.45" strokeWidth="2" />
            <line x1="78" y1="224" x2="160" y2="212" stroke="#451A03" strokeOpacity="0.45" strokeWidth="2" />
            <polygon
              points="68,254 162,242 208,266 112,282"
              fill="#E6DEC8"
              stroke="#B4532A"
              strokeWidth="1.5"
            />
            <path
              d="M 76,164 L 58,308 L 122,324"
              fill="none"
              stroke="#B87A3D"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M 164,244 L 202,266 L 192,316"
              fill="none"
              stroke="#D4A359"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <line x1="36" y1="338" x2="226" y2="338" stroke="#E4E2DD" strokeOpacity="0.7" strokeWidth="1" />
            <text x="64" y="356" fill="#E4E2DD" fontSize="11" fontFamily="JetBrains Mono, monospace">
              APP 02 · 68 × 76 × 72 CM
            </text>
          </g>
        </svg>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-[#141418] select-none ${className}`}>
      {/* 2D Studio SVG Illustration (visible when 3D Model Preview is off) */}
      {!is3DPreviewActive && (
        <svg
          viewBox="0 0 480 360"
          className="w-full h-full object-cover"
          role="img"
          aria-label={label || preset}
        >
          <defs>
            <radialGradient id={`studioGlow-${preset}`} cx="0.5" cy="0.42" r="0.6">
              <stop offset="0%" stopColor={primaryHex} stopOpacity="0.28" />
              <stop offset="60%" stopColor={secondaryHex} stopOpacity="0.08" />
              <stop offset="100%" stopColor="#0E0E12" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect width="480" height="360" fill="#121216" />
          <rect width="480" height="360" fill={`url(#studioGlow-${preset})`} />

          {/* Subtle Studio Plinth / Horizon */}
          <ellipse cx="240" cy="306" rx="145" ry="22" fill="#09090B" fillOpacity="0.75" />
          <ellipse
            cx="240"
            cy="306"
            rx="125"
            ry="16"
            fill="none"
            stroke={secondaryHex}
            strokeOpacity="0.22"
            strokeDasharray="4 4"
          />

          {preset === 'denim-trench' && (
            <g transform="translate(115, 34)">
              <path
                d="M 65,28 L 102,16 L 125,64 L 148,16 L 185,28 L 218,155 L 188,162 L 172,78 L 185,268 L 65,268 L 78,78 L 62,162 L 32,155 Z"
                fill={primaryHex}
                stroke="#E2E8F0"
                strokeOpacity="0.35"
                strokeWidth="1.5"
              />
              <polygon points="102,16 125,64 125,268 78,268 85,78" fill={secondaryHex} fillOpacity="0.85" />
              <rect x="72" y="138" width="106" height="14" rx="2" fill="#0F172A" stroke={secondaryHex} strokeWidth="1.2" />
              <rect x="116" y="135" width="18" height="20" rx="2" fill="none" stroke="#D4AF37" strokeWidth="2.5" />
            </g>
          )}

          {preset === 'brass-collar' && (
            <g transform="translate(100, 48)">
              <path
                d="M 56,115 C 56,42 224,42 224,115 C 224,174 168,205 140,205 C 112,205 56,174 56,115 Z"
                fill="none"
                stroke={primaryHex}
                strokeWidth="24"
                strokeLinecap="round"
              />
              <path
                d="M 74,112 C 74,58 206,58 206,112"
                fill="none"
                stroke={secondaryHex}
                strokeWidth="4"
                strokeDasharray="8 6"
              />
              <g transform="translate(15, 75)">
                <circle cx="20" cy="12" r="7" fill={primaryHex} />
                <polygon points="20,24 6,72 34,72" fill={secondaryHex} stroke={primaryHex} strokeWidth="2" />
              </g>
              <g transform="translate(225, 75)">
                <circle cx="20" cy="12" r="7" fill={primaryHex} />
                <polygon points="20,24 6,72 34,72" fill={secondaryHex} stroke={primaryHex} strokeWidth="2" />
              </g>
            </g>
          )}

          {preset === 'sailcloth-jacket' && (
            <g transform="translate(110, 45)">
              <path
                d="M 62,32 L 105,20 L 130,48 L 155,20 L 198,32 L 232,165 L 196,174 L 180,82 L 184,228 L 76,228 L 80,82 L 64,174 L 28,165 Z"
                fill={primaryHex}
                stroke={secondaryHex}
                strokeWidth="2"
              />
              <polygon points="62,32 198,32 182,88 78,88" fill={secondaryHex} fillOpacity="0.82" />
              <rect x="86" y="136" width="36" height="44" rx="3" fill={secondaryHex} stroke="#0B0B0E" strokeWidth="1.2" />
              <rect x="138" y="136" width="36" height="44" rx="3" fill={secondaryHex} stroke="#0B0B0E" strokeWidth="1.2" />
              <line x1="130" y1="48" x2="130" y2="228" stroke="#0B0B0E" strokeWidth="2.5" />
            </g>
          )}

          {preset === 'sisal-saddle-bag' && (
            <g transform="translate(120, 42)">
              <path
                d="M 48,118 C 48,12 192,12 192,118"
                fill="none"
                stroke={primaryHex}
                strokeWidth="12"
              />
              <path
                d="M 36,110 L 204,110 L 194,210 C 190,246 156,262 120,262 C 84,262 50,246 46,210 Z"
                fill={primaryHex}
                stroke="#E4E2DD"
                strokeOpacity="0.25"
                strokeWidth="1.5"
              />
              <path
                d="M 46,110 L 194,110 L 182,188 C 176,212 148,224 120,224 C 92,224 64,212 58,188 Z"
                fill={secondaryHex}
              />
              <rect x="108" y="198" width="24" height="36" rx="4" fill="#D4AF37" stroke="#0B0B0E" strokeWidth="2" />
            </g>
          )}

          {preset === 'bamboo-lounge-chair' && (
            <g transform="translate(105, 52)">
              <polygon
                points="64,44 196,28 182,148 52,164"
                fill={primaryHex}
                stroke="#FDE68A"
                strokeOpacity="0.4"
                strokeWidth="1.5"
              />
              <polygon
                points="52,164 182,148 238,182 104,204"
                fill={secondaryHex}
                stroke={primaryHex}
                strokeWidth="3"
              />
              <path
                d="M 60,46 L 38,244 L 122,262"
                fill="none"
                stroke={primaryHex}
                strokeWidth="11"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M 182,148 L 234,182 L 218,252"
                fill="none"
                stroke={primaryHex}
                strokeWidth="11"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          )}

          {preset === 'fluted-bamboo-table' && (
            <g transform="translate(68, 78)">
              <polygon
                points="20,76 140,36 328,68 208,114"
                fill={primaryHex}
                stroke={secondaryHex}
                strokeWidth="2"
              />
              <rect x="48" y="88" width="24" height="122" rx="6" fill={primaryHex} stroke="#0B0B0E" strokeWidth="1.5" />
              <rect x="188" y="108" width="26" height="126" rx="6" fill={primaryHex} stroke="#0B0B0E" strokeWidth="1.5" />
              <rect x="278" y="76" width="24" height="118" rx="6" fill={primaryHex} stroke="#0B0B0E" strokeWidth="1.5" />
              <line x1="60" y1="168" x2="290" y2="152" stroke={secondaryHex} strokeWidth="6" strokeLinecap="round" />
            </g>
          )}

          {preset === 'bamboo-pendant-dome' && (
            <g transform="translate(115, 20)">
              <line x1="125" y1="0" x2="125" y2="74" stroke={secondaryHex} strokeWidth="3" />
              <path
                d="M 28,185 C 28,68 222,68 222,185 Z"
                fill={primaryHex}
                stroke={secondaryHex}
                strokeWidth="2"
              />
              <path d="M 65,185 C 72,95 178,95 185,185" fill="none" stroke="#0B0B0E" strokeOpacity="0.35" strokeWidth="2" />
              <path d="M 98,185 C 102,88 148,88 152,185" fill="none" stroke="#0B0B0E" strokeOpacity="0.35" strokeWidth="2" />
              <ellipse cx="125" cy="185" rx="96" ry="20" fill={secondaryHex} fillOpacity="0.85" />
              <circle cx="125" cy="185" r="24" fill="#FFFBEB" />
            </g>
          )}

          {preset === 'solar-bipv-partition' && (
            <g transform="translate(115, 32)">
              <rect
                x="36"
                y="16"
                width="178"
                height="242"
                rx="4"
                fill="none"
                stroke={secondaryHex}
                strokeWidth="10"
              />
              {[0, 1, 2, 3, 4].map((idx) => (
                <g key={idx} transform={`translate(46, ${28 + idx * 45})`}>
                  <rect
                    x="0"
                    y="0"
                    width="158"
                    height="36"
                    fill={primaryHex}
                    fillOpacity="0.88"
                    stroke={secondaryHex}
                    strokeWidth="1.5"
                  />
                  <line x1="52" y1="0" x2="52" y2="36" stroke="#D4AF37" strokeOpacity="0.55" strokeWidth="1" />
                  <line x1="106" y1="0" x2="106" y2="36" stroke="#D4AF37" strokeOpacity="0.55" strokeWidth="1" />
                </g>
              ))}
              <rect x="22" y="256" width="206" height="22" rx="3" fill="#52525B" />
            </g>
          )}
        </svg>
      )}

      {/* WebGL 3D Model Preview Viewport (active when toggled on) */}
      {is3DPreviewActive && (
        <div
          ref={canvasMountRef}
          data-testid={`webgl-3d-preview-${preset}`}
          onPointerDown={(e) => {
            dragStateRef.current.isDragging = true;
            dragStateRef.current.lastX = e.clientX;
          }}
          onPointerMove={(e) => {
            if (!dragStateRef.current.isDragging) return;
            const deltaX = e.clientX - dragStateRef.current.lastX;
            dragStateRef.current.lastX = e.clientX;
            dragStateRef.current.manualYawOffset += deltaX * 0.012;
          }}
          onPointerUp={() => {
            dragStateRef.current.isDragging = false;
          }}
          onPointerLeave={() => {
            dragStateRef.current.isDragging = false;
          }}
          className="w-full h-full bg-gradient-to-b from-[#16161F] to-[#0B0B0F] cursor-grab active:cursor-grabbing"
        />
      )}

      {/* Bottom Overlay Bar: 3D Model Preview Toggle + WebGL Status Readout */}
      {enable3DPreviewToggle && !webglError && (
        <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between gap-2 pointer-events-none">
          {is3DPreviewActive ? (
            <span className="px-2 py-1 rounded bg-black/75 border border-white/10 text-[10px] font-mono-tabular text-[#D4AF37] flex items-center gap-1 whitespace-nowrap">
              <RotateCw className="w-2.5 h-2.5 animate-spin" />
              <span>WEBGL 360° · DRAG TO SPIN</span>
            </span>
          ) : (
            <span />
          )}

          <button
            type="button"
            aria-pressed={is3DPreviewActive}
            aria-label={`3D Model Preview for ${label || preset}`}
            onClick={(e) => {
              e.stopPropagation();
              setIs3DPreviewActive((prev) => !prev);
            }}
            className={`pointer-events-auto px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-md ${
              is3DPreviewActive
                ? 'bg-[#D97736] text-[#0B0B0E] border-[#D97736] font-semibold'
                : 'bg-black/80 text-[#F4F3EF] border-white/20 hover:bg-black hover:border-white/40'
            }`}
          >
            {is3DPreviewActive ? (
              <>
                <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                <span>3D Model Preview: On</span>
              </>
            ) : (
              <>
                <Box className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                <span>3D Model Preview</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
