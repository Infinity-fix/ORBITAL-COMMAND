import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { MissionDesign } from '../../engine/types';
import { buildProceduralSpacecraft, type SpacecraftAssemblyHandles } from './spacecraftBuilder';
import { afterDraw, detectSoftwareWebGL, disposeObject3D } from './threeUtils';

interface SpacecraftViewport3DProps {
  mission: MissionDesign;
  heightClass?: string;
}

export function SpacecraftViewport3D({ mission, heightClass = 'h-[440px]' }: SpacecraftViewport3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [explodedTarget, setExplodedTarget] = useState(0);
  const [thrusterTest, setThrusterTest] = useState(false);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [cameraPreset, setCameraPreset] = useState<'hero' | 'top' | 'side'>('hero');

  const missionRef = useRef(mission);
  missionRef.current = mission;
  const explodedTargetRef = useRef(explodedTarget);
  explodedTargetRef.current = explodedTarget;
  const thrusterTestRef = useRef(thrusterTest);
  thrusterTestRef.current = thrusterTest;
  const presetRef = useRef<{ pos: THREE.Vector3; target: THREE.Vector3; active: boolean }>({
    pos: new THREE.Vector3(4.6, 3.2, 5.2),
    target: new THREE.Vector3(0, -0.45, 0),
    active: false,
  });

  const handlesRef = useRef<SpacecraftAssemblyHandles | null>(null);
  const requestRenderRef = useRef<() => void>(() => {});
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

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
    renderer.setSize(container.clientWidth || 640, container.clientHeight || 420);
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070b14);
    scene.fog = new THREE.FogExp2(0x070b14, 0.018);
    sceneRef.current = scene;

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(
      45,
      (container.clientWidth || 640) / (container.clientHeight || 420),
      0.1,
      200
    );
    camera.position.set(4.6, 3.2, 5.2);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, -0.45, 0);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 2.2;
    controls.maxDistance = 14;

    // 3-point warm/cool aerospace lighting
    const hemi = new THREE.HemisphereLight(0x93c5fd, 0x0f172a, 0.65);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff1d6, 2.2);
    keyLight.position.set(6, 7, 5);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.bias = -0.0005;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.15);
    rimLight.position.set(-6, 3, -5);
    scene.add(rimLight);

    // Subtle reference turntable grid + contact grounding ring
    const grid = new THREE.GridHelper(12, 24, 0x1e293b, 0x0f172a);
    grid.position.y = -2.25;
    scene.add(grid);

    // Subtle starfield backdrop (InstancedMesh)
    const starCount = 160;
    const starGeo = new THREE.SphereGeometry(0.04, 6, 6);
    const starMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 });
    const stars = new THREE.InstancedMesh(starGeo, starMat, starCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < starCount; i++) {
      const r = 30 + (i % 7) * 5;
      const theta = i * 2.39996;
      const phi = Math.acos(1 - (2 * (i + 0.5)) / starCount);
      dummy.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      );
      dummy.updateMatrix();
      stars.setMatrixAt(i, dummy.matrix);
    }
    stars.computeBoundingSphere();
    scene.add(stars);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const initialAssembly = buildProceduralSpacecraft(missionRef.current, maxAniso);
    handlesRef.current = initialAssembly;
    scene.add(initialAssembly.root);

    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let currentExploded = 0;
    let lastTime = performance.now();
    let disposed = false;

    const requestRender = () => {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        if (disposed) return;
        renderDirty = false;
        const now = performance.now();
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;

        const targetEx = explodedTargetRef.current;
        if (Math.abs(currentExploded - targetEx) > 0.002) {
          currentExploded = THREE.MathUtils.damp(currentExploded, targetEx, 7, dt);
          handlesRef.current?.setExplodedFactor(currentExploded);
          renderDirty = true;
        }

        if (presetRef.current.active) {
          const alpha = 1 - Math.exp(-7 * dt);
          camera.position.lerp(presetRef.current.pos, alpha);
          controls.target.lerp(presetRef.current.target, alpha);
          if (
            camera.position.distanceTo(presetRef.current.pos) < 0.04 &&
            controls.target.distanceTo(presetRef.current.target) < 0.04
          ) {
            camera.position.copy(presetRef.current.pos);
            controls.target.copy(presetRef.current.target);
            presetRef.current.active = false;
          } else {
            renderDirty = true;
          }
        }

        if (thrusterTestRef.current && handlesRef.current) {
          const s = 0.85 + Math.sin(now * 0.02) * 0.15;
          handlesRef.current.parts.plume.scale.set(1, s, 1);
          renderDirty = true;
        }

        controls.update();
        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          if (renderDirty && !disposed) requestRender();
        };

        if (isSoftwareGl) {
          afterDraw(renderer, (id) => {
            frameId = id;
          }, done);
        } else {
          done();
        }
      });
    };

    requestRenderRef.current = requestRender;

    controls.addEventListener('start', () => {
      presetRef.current.active = false;
    });
    controls.addEventListener('change', requestRender);

    const onResize = () => {
      if (!container || disposed) return;
      const w = container.clientWidth || 640;
      const h = container.clientHeight || 420;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }
    requestRender();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      ro.disconnect();
      controls.dispose();
      disposeObject3D(scene);
      renderer.dispose();
    };
  }, []);

  // Rebuild spacecraft geometry whenever configuration changes
  useEffect(() => {
    const scene = sceneRef.current;
    const renderer = rendererRef.current;
    if (!scene || !renderer) return;

    if (handlesRef.current) {
      scene.remove(handlesRef.current.root);
      disposeObject3D(handlesRef.current.root);
    }

    const next = buildProceduralSpacecraft(mission, renderer.capabilities.getMaxAnisotropy());
    next.setExplodedFactor(explodedTargetRef.current);
    next.setThrusterActive(thrusterTestRef.current);
    handlesRef.current = next;
    scene.add(next.root);
    requestRenderRef.current();
  }, [
    mission.missionType,
    mission.spacecraft.structureId,
    mission.spacecraft.powerId,
    mission.spacecraft.propulsionId,
    mission.spacecraft.solarPanelAreaM2,
    mission.spacecraft.propellantMassKg,
    mission.selectedPayloadIds,
  ]);

  useEffect(() => {
    handlesRef.current?.setThrusterActive(thrusterTest);
    requestRenderRef.current();
  }, [thrusterTest]);

  useEffect(() => {
    requestRenderRef.current();
  }, [explodedTarget]);

  const applyCameraPreset = (preset: 'hero' | 'top' | 'side') => {
    setCameraPreset(preset);
    if (preset === 'hero') {
      presetRef.current = {
        pos: new THREE.Vector3(4.6, 3.2, 5.2),
        target: new THREE.Vector3(0, -0.45, 0),
        active: true,
      };
    }
    if (preset === 'top') {
      presetRef.current = {
        pos: new THREE.Vector3(0.01, 6.8, 0.2),
        target: new THREE.Vector3(0, 0, -0.25),
        active: true,
      };
    }
    if (preset === 'side') {
      presetRef.current = {
        pos: new THREE.Vector3(6.2, 0.2, 0.2),
        target: new THREE.Vector3(0, -0.45, 0),
        active: true,
      };
    }
    requestRenderRef.current();
  };

  return (
    <div className={`relative w-full ${heightClass} rounded-lg border border-slate-800 bg-[#070b14] overflow-hidden`}>
      <div ref={mountRef} className="w-full h-full" data-testid="spacecraft-3d-canvas" />

      <div className="pointer-events-none absolute top-3 left-3 flex items-center gap-3 text-xs text-slate-300 bg-[#0b1120]/90 border border-slate-800 px-3 py-1.5 rounded">
        <span className="font-display font-semibold text-cyan-300">{mission.missionType} Assembly</span>
        <span aria-hidden="true" className="text-slate-600">·</span>
        <span className="font-mono tabular-nums">Drag to orbit · Scroll to zoom</span>
      </div>

      <div className="pointer-events-auto absolute bottom-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 max-w-[94%]">
        <button
          type="button"
          onClick={() => setDockCollapsed((v) => !v)}
          className="px-3 py-1 text-[11px] font-medium text-slate-300 bg-[#0d1424]/95 border border-slate-700 rounded hover:border-cyan-500/60 transition-colors whitespace-nowrap"
        >
          {dockCollapsed ? 'Show Inspector Controls' : 'Hide Controls'}
        </button>

        {!dockCollapsed && (
          <div className="flex flex-wrap items-center justify-center gap-3 px-4 py-2 rounded-lg bg-[#0b1120]/95 border border-slate-700/80 text-xs">
            <label className="flex items-center gap-2 text-slate-300 whitespace-nowrap">
              <span>Exploded</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(explodedTarget * 100)}
                onChange={(e) => setExplodedTarget(Number(e.target.value) / 100)}
                className="w-24 accent-cyan-400"
              />
            </label>

            <button
              type="button"
              onClick={() => setThrusterTest((v) => !v)}
              className={`px-2.5 py-1 rounded border text-xs font-medium transition-colors whitespace-nowrap ${
                thrusterTest
                  ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
              }`}
            >
              {thrusterTest ? 'Stop Burn Test' : 'Test Thruster'}
            </button>

            <div className="flex items-center gap-1 border-l border-slate-800 pl-3">
              {(['hero', 'top', 'side'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => applyCameraPreset(p)}
                  className={`px-2 py-1 rounded text-xs capitalize whitespace-nowrap ${
                    cameraPreset === p
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  {p === 'hero' ? '3/4 View' : p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
