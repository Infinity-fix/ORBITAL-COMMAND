import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { DESTINATIONS } from '../../engine/catalog';
import type { DestinationId, MissionDesign } from '../../engine/types';
import { createPlanetTexture } from './proceduralTextures';
import { buildProceduralSpacecraft, type SpacecraftAssemblyHandles } from './spacecraftBuilder';
import { afterDraw, detectSoftwareWebGL, disposeObject3D } from './threeUtils';

interface SolarSystemViewport3DProps {
  mission: MissionDesign;
  heightClass?: string;
  tourMode?: boolean;
  progressOverride?: number | null;
  onSelectBody?: (id: DestinationId) => void;
}

interface BodyNode {
  id: DestinationId;
  name: string;
  mesh: THREE.Mesh;
  orbitRadius: number;
  baseAngle: number;
  angularSpeed: number;
}

export function SolarSystemViewport3D({
  mission,
  heightClass = 'h-[540px]',
  tourMode = false,
  progressOverride = null,
  onSelectBody,
}: SolarSystemViewport3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [playing, setPlaying] = useState(true);
  const [speedMult, setSpeedMult] = useState(1);
  const [timelinePct, setTimelinePct] = useState(32);
  const [cameraFocus, setCameraFocus] = useState<'system' | 'earth' | 'target' | 'craft'>('system');
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [inspectedBody, setInspectedBody] = useState<string | null>(null);

  const missionRef = useRef(mission);
  missionRef.current = mission;
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const speedRef = useRef(speedMult);
  speedRef.current = speedMult;
  const timelineRef = useRef(timelinePct / 100);
  const progressOverrideRef = useRef(progressOverride);
  progressOverrideRef.current = progressOverride;
  const tourModeRef = useRef(tourMode);
  tourModeRef.current = tourMode;
  const focusRef = useRef(cameraFocus);
  focusRef.current = cameraFocus;
  const onSelectBodyRef = useRef(onSelectBody);
  onSelectBodyRef.current = onSelectBody;

  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const spacecraftRef = useRef<SpacecraftAssemblyHandles | null>(null);
  const transferCurveRef = useRef<THREE.QuadraticBezierCurve3 | null>(null);
  const transferLineRef = useRef<THREE.Line | null>(null);
  const departureMarkerRef = useRef<THREE.Mesh | null>(null);
  const arrivalMarkerRef = useRef<THREE.Mesh | null>(null);
  const bodyNodesRef = useRef<BodyNode[]>([]);
  const cameraSnapRef = useRef<{ active: boolean }>({ active: false });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(container.clientWidth || 960, container.clientHeight || 540);
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050811);
    scene.fog = new THREE.FogExp2(0x050811, 0.0055);
    sceneRef.current = scene;

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(
      48,
      (container.clientWidth || 960) / (container.clientHeight || 540),
      0.1,
      450
    );
    camera.position.set(0, 33, 46);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, -1, 0);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 3;
    controls.maxDistance = 120;
    controls.enabled = !tourModeRef.current;

    // Warm Sun + Cool Deep-Space Fill
    const hemi = new THREE.HemisphereLight(0x93c5fd, 0x090d16, 0.45);
    scene.add(hemi);

    const sunLight = new THREE.PointLight(0xfff1d0, 3.2, 220, 0.4);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);

    const rimDir = new THREE.DirectionalLight(0x38bdf8, 0.55);
    rimDir.position.set(-30, 25, -35);
    scene.add(rimDir);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    // Starfield (InstancedMesh)
    const starCount = 380;
    const starGeo = new THREE.SphereGeometry(0.11, 5, 5);
    const starMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 });
    const stars = new THREE.InstancedMesh(starGeo, starMat, starCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < starCount; i++) {
      const r = 95 + (i % 9) * 11;
      const theta = i * 2.39996;
      const phi = Math.acos(1 - (2 * (i + 0.5)) / starCount);
      dummy.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      );
      const s = 0.6 + (i % 4) * 0.28;
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      stars.setMatrixAt(i, dummy.matrix);
    }
    stars.computeBoundingSphere();
    scene.add(stars);

    // Sun Core + Soft Radial Corona Sprite
    const sunTex = createPlanetTexture('sun', maxAniso);
    const sunMesh = new THREE.Mesh(
      new THREE.SphereGeometry(3.1, 32, 24),
      new THREE.MeshBasicMaterial({ map: sunTex, fog: false })
    );
    scene.add(sunMesh);

    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 256;
    glowCanvas.height = 256;
    const glowCtx = glowCanvas.getContext('2d')!;
    const grad = glowCtx.createRadialGradient(128, 128, 18, 128, 128, 128);
    grad.addColorStop(0, 'rgba(255, 245, 190, 0.9)');
    grad.addColorStop(0.32, 'rgba(251, 191, 36, 0.42)');
    grad.addColorStop(0.7, 'rgba(245, 158, 11, 0.12)');
    grad.addColorStop(1, 'rgba(245, 158, 11, 0)');
    glowCtx.fillStyle = grad;
    glowCtx.fillRect(0, 0, 256, 256);
    const glowTex = new THREE.CanvasTexture(glowCanvas);
    glowTex.colorSpace = THREE.SRGBColorSpace;
    const corona = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      })
    );
    corona.scale.set(11.5, 11.5, 1);
    scene.add(corona);

    // Build Planetary Bodies & Orbits
    const nodes: BodyNode[] = [];
    const raycastTargets: THREE.Object3D[] = [];
    const planetDefs: Array<{
      id: DestinationId;
      texKey: string;
      angle: number;
      speed: number;
    }> = [
      { id: 'venus', texKey: 'venus', angle: 2.15, speed: 0.14 },
      { id: 'leo', texKey: 'earth', angle: 0.15, speed: 0.09 },
      { id: 'mars', texKey: 'mars', angle: -0.75, speed: 0.055 },
      { id: 'ceres', texKey: 'ceres', angle: -2.15, speed: 0.03 },
      { id: 'jupiter', texKey: 'jupiter', angle: 3.35, speed: 0.018 },
    ];

    for (const def of planetDefs) {
      const spec = DESTINATIONS.find((d) => d.id === def.id)!;
      const tex = createPlanetTexture(def.texKey, maxAniso);
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.72,
        metalness: 0.05,
      });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(spec.visualRadiusScene, 28, 22), mat);
      mesh.userData.bodyId = spec.id;
      mesh.userData.bodyName = def.id === 'leo' ? 'Earth (LEO / GEO)' : spec.name;
      mesh.position.set(
        Math.cos(def.angle) * spec.visualDistanceScene,
        0,
        Math.sin(def.angle) * spec.visualDistanceScene
      );
      scene.add(mesh);
      raycastTargets.push(mesh);

      if (spec.atmosphereColorHex) {
        const atmo = new THREE.Mesh(
          new THREE.SphereGeometry(spec.visualRadiusScene * 1.08, 24, 18),
          new THREE.MeshBasicMaterial({
            color: spec.atmosphereColorHex,
            transparent: true,
            opacity: 0.16,
            depthWrite: false,
            side: THREE.BackSide,
          })
        );
        mesh.add(atmo);
      }

      // Orbit Ring
      const pts: THREE.Vector3[] = [];
      for (let s = 0; s <= 96; s++) {
        const a = (s / 96) * Math.PI * 2;
        pts.push(
          new THREE.Vector3(
            Math.cos(a) * spec.visualDistanceScene,
            0,
            Math.sin(a) * spec.visualDistanceScene
          )
        );
      }
      const orbitLine = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({
          color: def.id === 'leo' ? 0x3b82f6 : 0x334155,
          transparent: true,
          opacity: 0.55,
        })
      );
      scene.add(orbitLine);

      nodes.push({
        id: spec.id,
        name: mesh.userData.bodyName,
        mesh,
        orbitRadius: spec.visualDistanceScene,
        baseAngle: def.angle,
        angularSpeed: def.speed,
      });
    }

    // Moon orbiting Earth
    const earthNode = nodes.find((n) => n.id === 'leo')!;
    const moonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 20, 16),
      new THREE.MeshStandardMaterial({
        map: createPlanetTexture('moon', maxAniso),
        roughness: 0.85,
        metalness: 0.02,
      })
    );
    moonMesh.position.set(3.2, 0.2, 0);
    moonMesh.userData.bodyId = 'moon';
    moonMesh.userData.bodyName = 'The Moon (Luna)';
    earthNode.mesh.add(moonMesh);
    raycastTargets.push(moonMesh);

    bodyNodesRef.current = nodes;

    // Spacecraft on trajectory
    const craft = buildProceduralSpacecraft(missionRef.current, maxAniso);
    craft.root.scale.setScalar(0.55);
    scene.add(craft.root);
    spacecraftRef.current = craft;

    // Transfer Trajectory & Markers
    const depMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 14, 14),
      new THREE.MeshBasicMaterial({ color: 0x06b6d4 })
    );
    const arrMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 14, 14),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b })
    );
    scene.add(depMarker, arrMarker);
    departureMarkerRef.current = depMarker;
    arrivalMarkerRef.current = arrMarker;

    const rebuildTransferPath = (destId: DestinationId) => {
      if (transferLineRef.current) {
        scene.remove(transferLineRef.current);
        transferLineRef.current.geometry.dispose();
        (transferLineRef.current.material as THREE.Material).dispose();
      }
      const earthPos = earthNode.mesh.position.clone();
      let targetPos = new THREE.Vector3(24, 0, 0);

      if (destId === 'leo' || destId === 'geo') {
        const ringR = destId === 'leo' ? 1.9 : 2.8;
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i <= 48; i++) {
          const a = (i / 48) * Math.PI * 2;
          pts.push(new THREE.Vector3(earthPos.x + Math.cos(a) * ringR, 0.25, earthPos.z + Math.sin(a) * ringR));
        }
        const curve = new THREE.QuadraticBezierCurve3(
          pts[0],
          new THREE.Vector3(earthPos.x, 0.4, earthPos.z + ringR),
          pts[24]
        );
        transferCurveRef.current = curve;
        const line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(pts),
          new THREE.LineBasicMaterial({ color: 0x22d3ee })
        );
        scene.add(line);
        transferLineRef.current = line;
        depMarker.position.copy(pts[0]);
        arrMarker.position.copy(pts[24]);
        return;
      }

      if (destId === 'moon') {
        const moonWorld = new THREE.Vector3();
        moonMesh.getWorldPosition(moonWorld);
        targetPos.copy(moonWorld);
      } else if (destId === 'sun-earth-l2') {
        targetPos.copy(earthPos).multiplyScalar(1.16);
      } else {
        const targetNode = nodes.find((n) => n.id === destId);
        if (targetNode) {
          targetPos.copy(targetNode.mesh.position);
        }
      }

      const mid = earthPos.clone().add(targetPos).multiplyScalar(0.5);
      // Add prograde curvature offset perpendicular to chord
      const chord = targetPos.clone().sub(earthPos);
      const perp = new THREE.Vector3(-chord.z, 1.8, chord.x).normalize().multiplyScalar(chord.length() * 0.28);
      mid.add(perp);

      const curve = new THREE.QuadraticBezierCurve3(earthPos, mid, targetPos);
      transferCurveRef.current = curve;

      const curvePts = curve.getPoints(64);
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(curvePts),
        new THREE.LineBasicMaterial({ color: 0x22d3ee })
      );
      scene.add(line);
      transferLineRef.current = line;

      depMarker.position.copy(earthPos);
      arrMarker.position.copy(targetPos);
    };

    rebuildTransferPath(missionRef.current.destinationId);

    // Raycaster for planet inspection
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const onPointerDown = (ev: PointerEvent) => {
      if (tourModeRef.current) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(raycastTargets, false);
      if (hits.length > 0) {
        const hitObj = hits[0].object;
        const bId = hitObj.userData.bodyId as DestinationId | undefined;
        const bName = hitObj.userData.bodyName as string | undefined;
        if (bName) setInspectedBody(bName);
        if (bId && onSelectBodyRef.current) {
          onSelectBodyRef.current(bId);
        }
      }
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    controls.addEventListener('start', () => {
      cameraSnapRef.current.active = false;
    });

    const onResize = () => {
      if (!container || disposed) return;
      const w = container.clientWidth || 960;
      const h = container.clientHeight || 540;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    // Pre-allocated scratch vectors for zero-GC tick loop
    const _craftPos = new THREE.Vector3();
    const _craftNext = new THREE.Vector3();
    const _camTarget = new THREE.Vector3();
    const _camDesired = new THREE.Vector3();

    let frameId = 0;
    let simTime = 0;
    let lastNow = performance.now();
    let lastDest = missionRef.current.destinationId;
    let disposed = false;

    const tick = () => {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min((now - lastNow) / 1000, 0.05);
      lastNow = now;

      if (lastDest !== missionRef.current.destinationId) {
        lastDest = missionRef.current.destinationId;
        rebuildTransferPath(lastDest);
      }

      if (playingRef.current) {
        simTime += dt * speedRef.current;
        // Slowly advance planetary orbits
        for (const n of nodes) {
          const a = n.baseAngle + simTime * n.angularSpeed * 0.25;
          n.mesh.position.set(Math.cos(a) * n.orbitRadius, 0, Math.sin(a) * n.orbitRadius);
          n.mesh.rotation.y += dt * 0.25;
        }
        moonMesh.position.set(Math.cos(simTime * 0.8) * 3.1, 0.15, Math.sin(simTime * 0.8) * 3.1);

        if (progressOverrideRef.current === null) {
          timelineRef.current = (timelineRef.current + dt * 0.055 * speedRef.current) % 1;
        }
        rebuildTransferPath(lastDest);
      }

      const activeT =
        progressOverrideRef.current !== null
          ? THREE.MathUtils.clamp(progressOverrideRef.current, 0, 1)
          : timelineRef.current;

      if (transferCurveRef.current && spacecraftRef.current) {
        transferCurveRef.current.getPoint(activeT, _craftPos);
        transferCurveRef.current.getPoint(Math.min(1, activeT + 0.01), _craftNext);
        spacecraftRef.current.root.position.copy(_craftPos);
        spacecraftRef.current.root.lookAt(_craftNext);
        spacecraftRef.current.setThrusterActive(activeT < 0.08 || activeT > 0.92);
      }

      if (tourModeRef.current) {
        const tourAngle = simTime * 0.14;
        const camX = Math.cos(tourAngle) * 39;
        const camZ = Math.sin(tourAngle) * 39;
        camera.position.set(camX, 18 + Math.sin(tourAngle * 0.5) * 3.5, camZ);
        // Shift lookAt along camera-left (-R) so the solar system frames on the right away from hero text
        const rightX = Math.sin(tourAngle);
        const rightZ = -Math.cos(tourAngle);
        camera.lookAt(-rightX * 9.5, -0.5, -rightZ * 9.5);
      } else if (cameraSnapRef.current.active) {
        if (focusRef.current === 'system') {
          _camTarget.set(0, -1, 0);
          _camDesired.set(0, 33, 46);
        } else if (focusRef.current === 'earth') {
          _camTarget.copy(earthNode.mesh.position);
          _camDesired.copy(earthNode.mesh.position).add(new THREE.Vector3(6, 4, 6));
        } else if (focusRef.current === 'target') {
          const targetNode = nodes.find((n) => n.id === lastDest) ?? earthNode;
          _camTarget.copy(targetNode.mesh.position);
          _camDesired.copy(targetNode.mesh.position).add(new THREE.Vector3(6, 3.5, 6));
        } else {
          _camTarget.copy(_craftPos);
          _camDesired.copy(_craftPos).add(new THREE.Vector3(3.5, 2.2, 3.5));
        }
        const dampAlpha = 1 - Math.exp(-5 * dt);
        controls.target.lerp(_camTarget, dampAlpha);
        camera.position.lerp(_camDesired, dampAlpha);
        if (camera.position.distanceTo(_camDesired) < 0.12) {
          cameraSnapRef.current.active = false;
        }
      }

      if (!tourModeRef.current) {
        controls.update();
      }
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(renderer, (id) => {
          frameId = id;
        }, tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }
    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      controls.dispose();
      disposeObject3D(scene);
      renderer.dispose();
    };
  }, []);

  // Rebuild spacecraft mesh inside solar system when mission hardware changes
  useEffect(() => {
    const scene = sceneRef.current;
    const renderer = rendererRef.current;
    if (!scene || !renderer) return;

    if (spacecraftRef.current) {
      scene.remove(spacecraftRef.current.root);
      disposeObject3D(spacecraftRef.current.root);
    }
    const nextCraft = buildProceduralSpacecraft(mission, renderer.capabilities.getMaxAnisotropy());
    nextCraft.root.scale.setScalar(0.55);
    scene.add(nextCraft.root);
    spacecraftRef.current = nextCraft;
  }, [mission.missionType, mission.spacecraft.powerId, mission.selectedPayloadIds]);

  const handleScrub = (pct: number) => {
    setTimelinePct(pct);
    timelineRef.current = pct / 100;
    setPlaying(false);
  };

  const handleFocus = (focus: 'system' | 'earth' | 'target' | 'craft') => {
    setCameraFocus(focus);
    cameraSnapRef.current.active = true;
  };

  return (
    <div className={`relative w-full ${heightClass} rounded-lg border border-slate-800 bg-[#050811] overflow-hidden`}>
      <div ref={mountRef} className="w-full h-full" data-testid="solar-system-3d-canvas" />

      {!tourMode && (
        <>
          <div className="pointer-events-none absolute top-3 left-3 flex flex-wrap items-center gap-3 text-xs text-slate-200 bg-[#0a101e]/92 border border-slate-800 px-3 py-1.5 rounded">
            <span className="font-display font-semibold text-cyan-300">3D Heliocentric & Transfer View</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="text-slate-400">
              {inspectedBody ? `Inspected: ${inspectedBody}` : 'Click any planet to inspect'}
            </span>
          </div>

          <div className="pointer-events-auto absolute bottom-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 max-w-[95%]">
            <button
              type="button"
              onClick={() => setDockCollapsed((v) => !v)}
              className="px-3 py-1 text-[11px] font-medium text-slate-300 bg-[#0d1424]/95 border border-slate-700 rounded hover:border-cyan-500/60 transition-colors whitespace-nowrap"
            >
              {dockCollapsed ? 'Show 3D Controls' : 'Hide Controls'}
            </button>

            {!dockCollapsed && (
              <div className="flex flex-wrap items-center justify-center gap-3 px-4 py-2 rounded-lg bg-[#0a101e]/95 border border-slate-700/80 text-xs">
                <button
                  type="button"
                  onClick={() => setPlaying((p) => !p)}
                  className="px-3 py-1 rounded bg-cyan-500/20 border border-cyan-500/50 text-cyan-200 font-medium hover:bg-cyan-500/30 whitespace-nowrap"
                >
                  {playing ? 'Pause' : 'Play'}
                </button>

                <div className="flex items-center gap-1">
                  {[1, 5, 15].map((sp) => (
                    <button
                      key={sp}
                      type="button"
                      onClick={() => setSpeedMult(sp)}
                      className={`px-2 py-1 rounded font-mono tabular-nums whitespace-nowrap ${
                        speedMult === sp
                          ? 'bg-slate-700 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {sp}x
                    </button>
                  ))}
                </div>

                <label className="flex items-center gap-2 text-slate-300 whitespace-nowrap">
                  <span>Trajectory</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={progressOverride !== null ? Math.round(progressOverride * 100) : timelinePct}
                    onChange={(e) => handleScrub(Number(e.target.value))}
                    className="w-24 accent-cyan-400"
                  />
                </label>

                <div className="flex items-center gap-1 border-l border-slate-800 pl-3">
                  {(
                    [
                      ['system', 'Solar System'],
                      ['earth', 'Earth'],
                      ['target', 'Target'],
                      ['craft', 'Spacecraft'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleFocus(id)}
                      className={`px-2.5 py-1 rounded whitespace-nowrap ${
                        cameraFocus === id
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'text-slate-400 hover:text-slate-200 border border-transparent'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
