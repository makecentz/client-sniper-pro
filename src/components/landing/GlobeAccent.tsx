import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const Globe = () => {
  const group = useRef<THREE.Group>(null);

  const pins = useMemo(() => {
    const arr: THREE.Vector3[] = [];
    for (let i = 0; i < 40; i++) {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const r = 1.6;
      arr.push(
        new THREE.Vector3(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi),
        ),
      );
    }
    return arr;
  }, []);

  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y = state.clock.elapsedTime * 0.15;
      group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.1;
    }
  });

  return (
    <group ref={group}>
      <mesh>
        <sphereGeometry args={[1.55, 48, 48]} />
        <meshBasicMaterial color="#3b82f6" wireframe transparent opacity={0.35} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshStandardMaterial color="#0b1220" transparent opacity={0.6} />
      </mesh>
      {pins.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshBasicMaterial color="#60a5fa" />
        </mesh>
      ))}
    </group>
  );
};

export const GlobeAccent = () => {
  return (
    <div className="pointer-events-none absolute inset-0 opacity-70">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 5], fov: 40 }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[3, 3, 3]} intensity={0.6} />
        <Suspense fallback={null}>
          <Globe />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default GlobeAccent;
