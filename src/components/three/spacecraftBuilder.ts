import * as THREE from 'three';
import type { MissionDesign } from '../../engine/types';
import { createMliFoilBumpTexture, createSolarPanelTexture } from './proceduralTextures';

export interface SpacecraftAssemblyHandles {
  root: THREE.Group;
  parts: {
    bus: THREE.Group;
    propulsion: THREE.Group;
    solarLeft: THREE.Group;
    solarRight: THREE.Group;
    dish: THREE.Group;
    payloadBay: THREE.Group;
    plume: THREE.Mesh;
  };
  setExplodedFactor: (factor: number) => void;
  setThrusterActive: (active: boolean) => void;
}

/**
 * Builds a multi-part composite procedural 3D spacecraft model reflecting the live MissionDesign.
 * Uses 8-12 distinct sub-assemblies with varied roughness/metalness, LatheGeometry nozzles/dishes,
 * and TubeGeometry booms.
 */
export function buildProceduralSpacecraft(
  mission: MissionDesign,
  maxAnisotropy: number = 4
): SpacecraftAssemblyHandles {
  const root = new THREE.Group();
  const mliBump = createMliFoilBumpTexture(maxAnisotropy);
  const solarTex = createSolarPanelTexture(maxAnisotropy);

  const goldMliMat = new THREE.MeshStandardMaterial({
    color: 0xd9a441,
    roughness: 0.36,
    metalness: 0.86,
    bumpMap: mliBump,
    bumpScale: 0.035,
  });

  const titaniumMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.3,
    metalness: 0.88,
  });

  const carbonMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.78,
    metalness: 0.16,
  });

  const whiteThermalMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.52,
    metalness: 0.12,
  });

  const solarMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: solarTex,
    roughness: 0.15,
    metalness: 0.28,
    clearcoat: 0.85,
    clearcoatRoughness: 0.1,
  });

  const thrusterMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.42,
    metalness: 0.85,
    side: THREE.DoubleSide,
  });

  // 1. Primary Spacecraft Bus
  const bus = new THREE.Group();
  const isCrewed = mission.missionType === 'Crewed Mission';
  const isTelescope = mission.missionType === 'Space Telescope';
  const isRover = mission.missionType === 'Rover' || mission.missionType === 'Lander';

  if (isCrewed) {
    // Conical crew capsule + cylindrical service module
    const capsuleGeo = new THREE.CylinderGeometry(0.45, 0.95, 1.05, 24);
    const capsule = new THREE.Mesh(capsuleGeo, whiteThermalMat);
    capsule.position.y = 0.95;
    bus.add(capsule);

    const heatShieldGeo = new THREE.CylinderGeometry(0.95, 0.85, 0.18, 24);
    const heatShield = new THREE.Mesh(heatShieldGeo, carbonMat);
    heatShield.position.y = 0.35;
    bus.add(heatShield);

    const serviceGeo = new THREE.CylinderGeometry(0.82, 0.82, 1.15, 24);
    const service = new THREE.Mesh(serviceGeo, titaniumMat);
    service.position.y = -0.32;
    bus.add(service);
  } else {
    // Octagonal planetary / observatory core wrapped in gold MLI + carbon structural rings
    const coreGeo = new THREE.CylinderGeometry(0.75, 0.75, 1.35, 8);
    const core = new THREE.Mesh(coreGeo, goldMliMat);
    core.castShadow = true;
    core.receiveShadow = true;
    bus.add(core);

    const topRing = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.12, 8), carbonMat);
    topRing.position.y = 0.7;
    bus.add(topRing);

    const botRing = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.12, 8), carbonMat);
    botRing.position.y = -0.7;
    bus.add(botRing);

    // Side avionics louvers
    for (let i = 0; i < 4; i++) {
      const louver = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.65, 0.08), titaniumMat);
      const angle = (i * Math.PI) / 2 + Math.PI / 4;
      louver.position.set(Math.cos(angle) * 0.74, 0, Math.sin(angle) * 0.74);
      louver.rotation.y = -angle + Math.PI / 2;
      bus.add(louver);
    }
  }
  root.add(bus);

  // 2. Propulsion Module (LatheGeometry Bell Nozzle + Propellant Tanks + Plume)
  const propulsion = new THREE.Group();
  const nozzlePoints = [
    new THREE.Vector2(0.08, 0),
    new THREE.Vector2(0.11, -0.08),
    new THREE.Vector2(0.18, -0.25),
    new THREE.Vector2(0.32, -0.58),
    new THREE.Vector2(0.36, -0.68),
  ];
  const nozzleGeo = new THREE.LatheGeometry(nozzlePoints, 24);
  const nozzle = new THREE.Mesh(nozzleGeo, thrusterMat);
  nozzle.position.y = -0.78;
  propulsion.add(nozzle);

  // Spherical propellant tanks scaled subtly by propellant mass
  const tankRadius = THREE.MathUtils.clamp(0.18 + (mission.spacecraft.propellantMassKg / 5000) * 0.14, 0.18, 0.34);
  const tankGeo = new THREE.SphereGeometry(tankRadius, 18, 14);
  for (let i = 0; i < 2; i++) {
    const tank = new THREE.Mesh(tankGeo, titaniumMat);
    tank.position.set(i === 0 ? 0.42 : -0.42, -0.82, 0);
    propulsion.add(tank);
  }

  // Thruster Plume (hidden unless active)
  const isIon = mission.spacecraft.propulsionId === 'ion-gridded' || mission.spacecraft.propulsionId === 'hall-electric';
  const plumeMat = new THREE.MeshBasicMaterial({
    color: isIon ? 0x38bdf8 : 0xfbbf24,
    transparent: true,
    opacity: 0.75,
  });
  const plume = new THREE.Mesh(new THREE.ConeGeometry(0.24, 1.35, 16), plumeMat);
  plume.rotation.x = Math.PI;
  plume.position.y = -2.1;
  plume.visible = false;
  propulsion.add(plume);
  root.add(propulsion);

  // 3. Power System: Solar Wings OR RTG Nuclear Fins
  const solarLeft = new THREE.Group();
  const solarRight = new THREE.Group();
  const isRtg = mission.spacecraft.powerId === 'rtg-nuclear';

  if (isRtg) {
    const rtgBodyMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.68, metalness: 0.55 });
    for (const side of [-1, 1]) {
      const grp = side < 0 ? solarLeft : solarRight;
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.95, 12), rtgBodyMat);
      cyl.rotation.z = side * (Math.PI / 2.8);
      cyl.position.set(side * 1.15, -0.25, 0);
      grp.add(cyl);
      for (let f = 0; f < 4; f++) {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.02, 0.36), titaniumMat);
        fin.position.set(side * 1.15, -0.25, 0);
        fin.rotation.x = (f * Math.PI) / 4;
        fin.rotation.z = side * (Math.PI / 2.8);
        grp.add(fin);
      }
    }
  } else {
    const wingLen = THREE.MathUtils.clamp(1.2 + (mission.spacecraft.solarPanelAreaM2 / 30) * 1.8, 1.2, 3.2);
    const wingWidth = 0.78;
    const armMat = titaniumMat;

    for (const side of [-1, 1]) {
      const grp = side < 0 ? solarLeft : solarRight;
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8), armMat);
      strut.rotation.z = Math.PI / 2;
      strut.position.set(side * 0.92, 0.1, 0);
      grp.add(strut);

      const frame = new THREE.Mesh(new THREE.BoxGeometry(wingLen, 0.04, wingWidth), carbonMat);
      frame.position.set(side * (1.15 + wingLen / 2), 0.1, 0);
      grp.add(frame);

      const cells = new THREE.Mesh(new THREE.BoxGeometry(wingLen - 0.06, 0.048, wingWidth - 0.06), solarMat);
      cells.position.copy(frame.position);
      grp.add(cells);
    }
  }
  root.add(solarLeft, solarRight);

  // 4. High-Gain Parabolic Dish (LatheGeometry + Feed Struts)
  const dish = new THREE.Group();
  const dishCurve: THREE.Vector2[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    dishCurve.push(new THREE.Vector2(t * 0.65, t * t * 0.22));
  }
  const dishMesh = new THREE.Mesh(new THREE.LatheGeometry(dishCurve, 24), whiteThermalMat);
  dishMesh.material.side = THREE.DoubleSide;
  dishMesh.position.set(0, 0.92, 0);
  dish.add(dishMesh);

  const feedHorn = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.28, 12), titaniumMat);
  feedHorn.position.set(0, 1.25, 0);
  dish.add(feedHorn);

  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3;
    const legCurve = new THREE.LineCurve3(
      new THREE.Vector3(Math.cos(a) * 0.45, 1.02, Math.sin(a) * 0.45),
      new THREE.Vector3(0, 1.32, 0)
    );
    const leg = new THREE.Mesh(new THREE.TubeGeometry(legCurve, 4, 0.015, 6, false), carbonMat);
    dish.add(leg);
  }
  if (isCrewed) {
    dish.position.set(0.65, 0.2, 0.5);
    dish.scale.setScalar(0.55);
  }
  root.add(dish);

  // 5. Payload Bay Modules (based on missionType & selectedPayloadIds)
  const payloadBay = new THREE.Group();

  if (isTelescope) {
    const baffle = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.62, 1.5, 16, 1, true), carbonMat);
    baffle.material.side = THREE.DoubleSide;
    baffle.position.set(0, 1.45, 0);
    payloadBay.add(baffle);
    const mirror = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.06, 6), goldMliMat);
    mirror.position.set(0, 0.85, 0);
    payloadBay.add(mirror);
  }

  if (isRover) {
    const deck = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.22, 0.85), whiteThermalMat);
    deck.position.set(0, -0.35, 0.92);
    payloadBay.add(deck);
    for (const wx of [-0.45, 0, 0.45]) {
      for (const wz of [0.65, 1.25]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 12), titaniumMat);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(wx, -0.52, wz);
        payloadBay.add(wheel);
      }
    }
  }

  if (mission.selectedPayloadIds.includes('pay-hirise')) {
    const lensBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.55, 16), carbonMat);
    lensBarrel.rotation.x = Math.PI / 2;
    lensBarrel.position.set(0, 0.18, 0.88);
    payloadBay.add(lensBarrel);
    const glass = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 0.04, 16),
      new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, roughness: 0.08, metalness: 0.1, clearcoat: 1 })
    );
    glass.rotation.x = Math.PI / 2;
    glass.position.set(0, 0.18, 1.15);
    payloadBay.add(glass);
  }

  if (mission.selectedPayloadIds.includes('pay-mag')) {
    const boomCurve = new THREE.LineCurve3(new THREE.Vector3(0, 0.2, -0.75), new THREE.Vector3(0, 0.45, -2.35));
    const boom = new THREE.Mesh(new THREE.TubeGeometry(boomCurve, 6, 0.025, 8, false), titaniumMat);
    payloadBay.add(boom);
    const sensor = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.18), goldMliMat);
    sensor.position.set(0, 0.45, -2.38);
    payloadBay.add(sensor);
  }

  if (mission.selectedPayloadIds.includes('pay-sar')) {
    const sarPanel = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.95, 1.35), titaniumMat);
    sarPanel.position.set(0, -0.1, 0.88);
    payloadBay.add(sarPanel);
  }

  root.add(payloadBay);

  const setExplodedFactor = (factor: number) => {
    const f = THREE.MathUtils.clamp(factor, 0, 1);
    propulsion.position.y = -f * 0.95;
    dish.position.y = f * 0.85;
    solarLeft.position.x = -f * 0.75;
    solarRight.position.x = f * 0.75;
    payloadBay.position.z = f * 0.65;
  };

  const setThrusterActive = (active: boolean) => {
    plume.visible = active;
  };

  return {
    root,
    parts: { bus, propulsion, solarLeft, solarRight, dish, payloadBay, plume },
    setExplodedFactor,
    setThrusterActive,
  };
}
