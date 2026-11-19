import * as THREE from 'three';
import { MarketplaceProduct, ProductVariant } from '../utils/marketplaceLogic';

/**
 * Generates a tileable procedural weave/bamboo grain bump & albedo CanvasTexture
 * with SRGBColorSpace and zero external 404 dependencies.
 */
export function createProceduralSurfaceTexture(
  primaryHex: string,
  secondaryHex: string,
  style: 'weave' | 'bamboo' | 'solar',
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = primaryHex;
    ctx.fillRect(0, 0, 256, 256);

    if (style === 'weave') {
      ctx.strokeStyle = secondaryHex;
      ctx.globalAlpha = 0.28;
      ctx.lineWidth = 4;
      for (let i = 0; i < 256; i += 16) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 256);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(256, i);
        ctx.stroke();
      }
    } else if (style === 'bamboo') {
      ctx.fillStyle = secondaryHex;
      ctx.globalAlpha = 0.22;
      for (let i = 0; i < 256; i += 12) {
        ctx.fillRect(i, 0, 4, 256);
      }
      // Bamboo node ring
      ctx.globalAlpha = 0.35;
      ctx.fillRect(0, 120, 256, 5);
    } else if (style === 'solar') {
      ctx.strokeStyle = '#D4AF37';
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 2;
      for (let x = 32; x < 256; x += 64) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 256);
        ctx.stroke();
      }
      for (let y = 32; y < 256; y += 64) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(256, y);
        ctx.stroke();
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/**
 * Builds a soft radial contact shadow disc grounded at y = 0.015 to prevent floating.
 */
export function createContactShadowDisc(radius = 0.85): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 62);
    grad.addColorStop(0, 'rgba(0,0,0,0.65)');
    grad.addColorStop(0.6, 'rgba(0,0,0,0.25)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  const tex = new THREE.CanvasTexture(canvas);
  const geo = new THREE.CircleGeometry(radius, 32);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    opacity: 0.75,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.012;
  return mesh;
}

/**
 * APP 1: Builds a multi-part 3D articulated mannequin + East African garment/accessory try-on group.
 * Pivoted at y = 0 with 6-10 distinct parts and varied PBR roughness/metalness.
 */
export function buildFashionTryOnGroup(
  product: MarketplaceProduct,
  variant: ProductVariant,
  drapeScale = 1.0,
  showPoseSkeleton = true,
): THREE.Group {
  const root = new THREE.Group();
  root.add(createContactShadowDisc(0.75));

  // 1. Articulated Sculptural Studio Mannequin Base (Warm Obsidian Bronze)
  const mannequinMat = new THREE.MeshStandardMaterial({
    color: 0x2a2421,
    roughness: 0.55,
    metalness: 0.2,
  });

  // Pedestal base
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.42, 0.08, 32), mannequinMat);
  plinth.position.y = 0.04;
  root.add(plinth);

  // Legs / Lower Column
  const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.065, 0.88, 20), mannequinMat);
  leftLeg.position.set(-0.12, 0.52, 0);
  const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.065, 0.88, 20), mannequinMat);
  rightLeg.position.set(0.12, 0.52, 0);
  root.add(leftLeg, rightLeg);

  // Torso
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.16, 0.64, 28), mannequinMat);
  torso.scale.set(1, 1, 0.68);
  torso.position.y = 1.24;
  root.add(torso);

  // Neck & Sculpted Head
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.14, 20), mannequinMat);
  neck.position.y = 1.62;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 28, 24), mannequinMat);
  head.scale.set(0.86, 1.15, 0.92);
  head.position.y = 1.81;
  root.add(neck, head);

  // Pose Estimation Skeletal Nodes (Glowing AR calibration points)
  if (showPoseSkeleton) {
    const jointMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const jointCoords: Array<[number, number, number]> = [
      [0, 1.81, 0.13], // Nose/Face anchor
      [-0.12, 1.78, 0.05], // Left Ear
      [0.12, 1.78, 0.05], // Right Ear
      [-0.28 * drapeScale, 1.5, 0.04], // Left Shoulder
      [0.28 * drapeScale, 1.5, 0.04], // Right Shoulder
      [0, 1.48, 0.16], // Clavicle Notch
      [-0.22 * drapeScale, 1.05, 0.1], // Left Hip
      [0.22 * drapeScale, 1.05, 0.1], // Right Hip
    ];
    for (const [x, y, z] of jointCoords) {
      const node = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 12), jointMat);
      node.position.set(x, y, z);
      root.add(node);
    }
  }

  // 2. Garment / Accessory 3D Procedural Overlay Group
  const garmentGroup = new THREE.Group();
  const fabricTex = createProceduralSurfaceTexture(variant.swatchHex, variant.secondaryHex, 'weave');

  const primaryMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: fabricTex,
    roughness: variant.roughness,
    metalness: variant.metalness,
    sheen: 0.45,
    sheenColor: new THREE.Color(variant.secondaryHex),
    side: THREE.DoubleSide,
  });

  const accentMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(variant.secondaryHex),
    roughness: Math.max(0.15, variant.roughness - 0.25),
    metalness: Math.min(0.95, variant.metalness + 0.25),
    side: THREE.DoubleSide,
  });

  const brassMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(variant.swatchHex),
    roughness: 0.2,
    metalness: 0.92,
    clearcoat: 0.4,
  });

  if (product.artworkPreset === 'brass-collar') {
    // Hand-forged Recycled Brass Torque Collar + Geometric Drop Earrings
    const torque = new THREE.Mesh(
      new THREE.TorusGeometry(0.19, 0.026, 20, 48, Math.PI * 1.65),
      brassMat,
    );
    torque.rotation.x = Math.PI / 2 + 0.22;
    torque.rotation.z = -Math.PI * 0.32;
    torque.position.set(0, 1.55, 0.02);
    garmentGroup.add(torque);

    // Pectoral Hammered Bib Plate
    const bib = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.29, 0.08, 32, 1, true, -Math.PI * 0.4, Math.PI * 0.8),
      accentMat,
    );
    bib.position.set(0, 1.46, 0.02);
    garmentGroup.add(bib);

    // Left & Right Geometric Earrings
    [-0.135, 0.135].forEach((earX) => {
      const stud = new THREE.Mesh(new THREE.SphereGeometry(0.018, 16, 16), brassMat);
      stud.position.set(earX, 1.76, 0.02);
      const pendant = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.09, 4), accentMat);
      pendant.position.set(earX, 1.69, 0.02);
      garmentGroup.add(stud, pendant);
    });
  } else if (product.artworkPreset === 'sisal-saddle-bag') {
    // Crossbody Leather & Woven Sisal Saddle Bag
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.018, 12, 48), primaryMat);
    strap.scale.set(0.65, 1.35, 0.55);
    strap.rotation.z = 0.55;
    strap.position.set(0.02, 1.22, 0.02);
    garmentGroup.add(strap);

    const bagBody = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.11), primaryMat);
    bagBody.position.set(0.24, 0.92, 0.12);
    const sisalFlap = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.14, 0.12), accentMat);
    sisalFlap.position.set(0.24, 0.95, 0.125);
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.13), brassMat);
    buckle.position.set(0.24, 0.88, 0.125);
    garmentGroup.add(bagBody, sisalFlap, buckle);
  } else if (product.artworkPreset === 'sailcloth-jacket') {
    // Cropped Lamu Sailcloth & Bamboo Utility Jacket
    const bodyShell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.24, 0.56, 32, 1, true),
      primaryMat,
    );
    bodyShell.scale.set(1.06 * drapeScale, 1, 0.76 * drapeScale);
    bodyShell.position.y = 1.28;
    garmentGroup.add(bodyShell);

    // Shoulder Yoke & Collar
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.1, 24, 1, true), accentMat);
    collar.position.y = 1.58;
    garmentGroup.add(collar);

    // Left & Right Tailored Sleeves
    [-1, 1].forEach((dir) => {
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.52, 20), primaryMat);
      sleeve.rotation.z = dir * 0.24;
      sleeve.position.set(dir * 0.31 * drapeScale, 1.26, 0);
      garmentGroup.add(sleeve);

      // Cargo Pocket
      const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.13, 0.04), accentMat);
      pocket.position.set(dir * 0.12 * drapeScale, 1.22, 0.18 * drapeScale);
      garmentGroup.add(pocket);
    });
  } else {
    // Default: Kibera Upcycled Raw Denim & Kitenge Architectural Trench Coat
    const coatShell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.34, 1.05, 32, 1, true),
      primaryMat,
    );
    coatShell.scale.set(1.05 * drapeScale, 1, 0.75 * drapeScale);
    coatShell.position.y = 1.04;
    garmentGroup.add(coatShell);

    // Kitenge Asymmetric Lapels
    const leftLapel = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.48, 0.025), accentMat);
    leftLapel.rotation.z = -0.15;
    leftLapel.position.set(-0.09 * drapeScale, 1.32, 0.19 * drapeScale);
    const rightLapel = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.48, 0.025), primaryMat);
    rightLapel.rotation.z = 0.15;
    rightLapel.position.set(0.09 * drapeScale, 1.32, 0.185 * drapeScale);
    garmentGroup.add(leftLapel, rightLapel);

    // Structured Sleeves
    [-1, 1].forEach((dir) => {
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.56, 20), primaryMat);
      sleeve.rotation.z = dir * 0.22;
      sleeve.position.set(dir * 0.31 * drapeScale, 1.26, 0);
      garmentGroup.add(sleeve);
    });

    // Waist Belt & Recycled Brass Buckle
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.245, 0.245, 0.055, 32), accentMat);
    belt.scale.set(1.06 * drapeScale, 1, 0.77 * drapeScale);
    belt.position.y = 1.12;
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.04), brassMat);
    buckle.position.set(0, 1.12, 0.195 * drapeScale);
    garmentGroup.add(belt, buckle);
  }

  root.add(garmentGroup);
  return root;
}

/**
 * APP 2: Builds a composite 5-12 part 3D procedural Furniture / Sustainable Material model
 * grounded at y = 0 with authentic Nairobi highland bamboo, woven sisal, and BIPV solar materials.
 */
export function buildFurnitureModelGroup(
  product: MarketplaceProduct,
  variant: ProductVariant,
): THREE.Group {
  const group = new THREE.Group();
  const bambooTex = createProceduralSurfaceTexture(
    variant.swatchHex,
    variant.secondaryHex,
    product.artworkPreset === 'solar-bipv-partition' ? 'solar' : 'bamboo',
  );

  bambooTex.repeat.set(2, 2);
  const sisalWeaveTex = createProceduralSurfaceTexture(
    variant.secondaryHex,
    variant.swatchHex,
    'weave',
  );
  sisalWeaveTex.repeat.set(4, 4);

  const primaryMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: bambooTex,
    roughness: variant.roughness,
    metalness: variant.metalness,
  });

  const secondaryMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: sisalWeaveTex,
    roughness: Math.min(0.92, variant.roughness + 0.3),
    metalness: 0.04,
  });

  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.22,
    metalness: 0.88,
  });

  group.add(createContactShadowDisc(0.95));

  if (product.artworkPreset === 'bamboo-lounge-chair') {
    // Aberdare Laminated Highland Bamboo Lounge Chair (8 parts)
    // Left & Right Steam-Bent Cantilever Side Sleds
    [-0.3, 0.3].forEach((sideX) => {
      const baseRunner = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.72), primaryMat);
      baseRunner.position.set(sideX, 0.02, 0);
      const frontLeg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.42, 0.05), primaryMat);
      frontLeg.rotation.x = -0.15;
      frontLeg.position.set(sideX, 0.22, 0.28);
      const armrest = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.035, 0.66), primaryMat);
      armrest.position.set(sideX, 0.52, -0.02);
      const backStile = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.72, 0.05), primaryMat);
      backStile.rotation.x = -0.26;
      backStile.position.set(sideX, 0.38, -0.26);
      group.add(baseRunner, frontLeg, armrest, backStile);
    });

    // Woven Sisal Seat Cushion & Backrest
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.07, 0.56), secondaryMat);
    seat.rotation.x = -0.08;
    seat.position.set(0, 0.36, 0.04);
    const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.44, 0.06), secondaryMat);
    backrest.rotation.x = -0.26;
    backrest.position.set(0, 0.58, -0.24);

    // Brass Stretcher Dowel
    const dowel = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.64, 16), brassMat);
    dowel.rotation.z = Math.PI / 2;
    dowel.position.set(0, 0.18, 0.28);

    group.add(seat, backrest, dowel);
  } else if (product.artworkPreset === 'fluted-bamboo-table') {
    // Rift Valley Fluted Bamboo Architectural Dining Table (9 parts)
    const tabletop = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.06, 0.88), primaryMat);
    tabletop.position.set(0, 0.73, 0);
    group.add(tabletop);

    // 4 Fluted Cylindrical Columns + Brass Foot Ferrules
    const legOffsets: Array<[number, number]> = [
      [-0.68, -0.3],
      [0.68, -0.3],
      [-0.68, 0.3],
      [0.68, 0.3],
    ];
    for (const [lx, lz] of legOffsets) {
      const column = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.05, 0.64, 24), primaryMat);
      column.position.set(lx, 0.38, lz);
      const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.06, 20), brassMat);
      ferrule.position.set(lx, 0.03, lz);
      group.add(column, ferrule);
    }

    // Central Trestle Stretcher
    const stretcher = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.045, 0.06), secondaryMat);
    stretcher.position.set(0, 0.22, 0);
    group.add(stretcher);
  } else if (product.artworkPreset === 'bamboo-pendant-dome') {
    // Naivasha Woven Bamboo Acoustic Pendant Dome displayed on an architectural floor stand / ceiling drop
    const basePlinth = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.05, 28), secondaryMat);
    basePlinth.position.y = 0.025;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.45, 16), brassMat);
    stem.position.set(0, 0.75, 0);

    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.58),
      primaryMat,
    );
    dome.position.set(0, 1.12, 0);

    // Inner Acoustic Diffuser Core
    const diffuser = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.22, 0.18, 24),
      new THREE.MeshStandardMaterial({
        color: 0xfff3d1,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.65,
        roughness: 0.3,
      }),
    );
    diffuser.position.set(0, 1.15, 0);
    group.add(basePlinth, stem, dome, diffuser);
  } else {
    // Kilimani Solar BIPV Louvered Room & Facade Partition (10 parts)
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.1, 0.28), secondaryMat);
    plinth.position.set(0, 0.05, 0);
    const leftPost = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.55, 0.08), secondaryMat);
    leftPost.position.set(-0.54, 0.85, 0);
    const rightPost = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.55, 0.08), secondaryMat);
    rightPost.position.set(0.54, 0.85, 0);
    const topHeader = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.06, 0.08), secondaryMat);
    topHeader.position.set(0, 1.62, 0);
    group.add(plinth, leftPost, rightPost, topHeader);

    // 5 Rotatable Semi-Transparent BIPV Solar Glazing Louvres
    const solarGlassMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(variant.swatchHex),
      map: bambooTex,
      roughness: 0.15,
      metalness: 0.6,
      transmission: 0.35,
      transparent: true,
      opacity: 0.9,
    });

    for (let i = 0; i < 5; i++) {
      const louvre = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.22, 0.025), solarGlassMat);
      louvre.rotation.x = 0.22;
      louvre.position.set(0, 0.3 + i * 0.27, 0);
      group.add(louvre);
    }
  }

  return group;
}

/**
 * Builds a standalone 3D model group for the rotating WebGL '3D Model Preview' inside ProductArtwork,
 * using the active preset and primary/secondary variant hex colors.
 */
export function buildProductPreviewModelGroup(
  preset: MarketplaceProduct['artworkPreset'],
  primaryHex: string,
  secondaryHex: string,
): THREE.Group {
  const isFashion =
    preset === 'denim-trench' ||
    preset === 'brass-collar' ||
    preset === 'sailcloth-jacket' ||
    preset === 'sisal-saddle-bag';

  const syntheticVariant: ProductVariant = {
    id: 'preview-variant',
    name: 'Preview Finish',
    swatchHex: primaryHex,
    secondaryHex,
    materialFinish: 'Nairobi Studio Finish',
    priceDeltaKes: 0,
    roughness: preset === 'brass-collar' ? 0.22 : isFashion ? 0.68 : 0.42,
    metalness: preset === 'brass-collar' ? 0.88 : 0.12,
  };

  const syntheticProduct: MarketplaceProduct = {
    id: `preview-${preset}`,
    paybillCode: '111111#PREVIEW',
    name: preset,
    domain: isFashion ? 'fashion' : 'furniture',
    category: 'Preview',
    creatorName: 'Unity Art Collective',
    creatorStudio: 'Nairobi Studio',
    originLocation: 'Nairobi, Kenya',
    priceKes: 0,
    weightKg: 1,
    leadTimeDays: '48h',
    sustainabilityMetric: 'Sustainable',
    materialComposition: 'Nairobi Artisan Material',
    description: '',
    artworkPreset: preset,
    variants: [syntheticVariant],
  };

  if (isFashion) {
    return buildFashionTryOnGroup(syntheticProduct, syntheticVariant, 1.0, false);
  }
  return buildFurnitureModelGroup(syntheticProduct, syntheticVariant);
}

