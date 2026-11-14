import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import type { EnvironmentId, RemotePlayer3DState } from '../../engine/types';
import { AstronautModel } from './AstronautModel';

const _remoteTargetVec = new THREE.Vector3();

function RemoteAstronaut({ player }: { player: RemotePlayer3DState }) {
  const groupRef = useRef<THREE.Group>(null);
  const smoothPos = useRef(new THREE.Vector3(player.x, player.y, player.z));
  const smoothYaw = useRef(player.yaw);

  useFrame((_, dt) => {
    const k = 1 - Math.exp(-12 * Math.min(0.05, dt));
    _remoteTargetVec.set(player.x, player.y, player.z);
    smoothPos.current.lerp(_remoteTargetVec, k);

    let diff = player.yaw - smoothYaw.current;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    smoothYaw.current += diff * k;

    if (groupRef.current) {
      groupRef.current.position.copy(smoothPos.current);
      groupRef.current.rotation.y = smoothYaw.current;
    }
  });

  return (
    <group ref={groupRef} position={[player.x, player.y, player.z]} rotation={[0, player.yaw, 0]}>
      {!player.inVehicle && (
        <AstronautModel
          customization={player.customization}
          animState={player.animState}
          equippedItem={player.equippedItem}
          flashlightOn={player.flashlightOn}
          isZeroG={player.environmentId === 'orbital-eva'}
        />
      )}
      <Html position={[0, 2.2, 0]} center>
        <div className="pointer-events-none px-2 py-0.5 rounded bg-[#070b14]/90 border border-emerald-500/60 text-[10px] font-mono text-emerald-200 whitespace-nowrap">
          {player.name} · {player.role.split(' ')[0]}
        </div>
      </Html>
    </group>
  );
}

export function MultiplayerCharacterSync({
  remotePlayers,
  currentEnvironment,
}: {
  remotePlayers: Record<string, RemotePlayer3DState>;
  currentEnvironment: EnvironmentId;
}) {
  const peers = Object.values(remotePlayers).filter(
    (p) => p.environmentId === currentEnvironment && Date.now() - p.updatedAt < 15000
  );

  return (
    <>
      {peers.map((p) => (
        <RemoteAstronaut key={p.memberId} player={p} />
      ))}
    </>
  );
}
