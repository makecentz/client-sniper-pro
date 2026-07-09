import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";

const makeScreenTexture = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 320;
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  return { canvas, ctx: canvas.getContext("2d")!, tex };
};

interface HeroLaptopProps {
  scrollProgress: React.MutableRefObject<number>;
}

export const HeroLaptop = ({ scrollProgress }: HeroLaptopProps) => {
  const group = useRef<THREE.Group>(null);
  const lid = useRef<THREE.Group>(null);

  const { canvas, ctx, tex } = useMemo(makeScreenTexture, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    // Animated dashboard on screen
    ctx.fillStyle = "#0b1220";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // top bar
    ctx.fillStyle = "#111c31";
    ctx.fillRect(0, 0, canvas.width, 34);
    ctx.fillStyle = "#3b82f6";
    ctx.fillRect(14, 10, 90, 14);
    ctx.fillStyle = "#1f2a44";
    ctx.fillRect(120, 12, 60, 10);
    ctx.fillRect(190, 12, 60, 10);
    ctx.fillRect(260, 12, 60, 10);

    // sidebar
    ctx.fillStyle = "#0f1a2e";
    ctx.fillRect(0, 34, 90, canvas.height - 34);
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i === 1 ? "#1e3a8a" : "#182338";
      ctx.fillRect(10, 60 + i * 34, 70, 22);
    }

    // KPI cards
    const kpiY = 50;
    for (let i = 0; i < 3; i++) {
      const x = 110 + i * 130;
      ctx.fillStyle = "#111c31";
      ctx.fillRect(x, kpiY, 115, 60);
      ctx.fillStyle = "#3b82f6";
      const barH = 30 + Math.sin(t * 2 + i) * 12;
      ctx.fillRect(x + 10, kpiY + 55 - barH, 10, barH);
      ctx.fillStyle = "#60a5fa";
      ctx.fillRect(x + 26, kpiY + 12, 60, 8);
      ctx.fillStyle = "#1f2a44";
      ctx.fillRect(x + 26, kpiY + 26, 40, 6);
    }

    // Leads list with scrolling shimmer
    const listY = 130;
    const shift = (t * 30) % 40;
    for (let i = 0; i < 5; i++) {
      const y = listY + i * 34 - shift;
      if (y < listY - 20 || y > canvas.height - 10) continue;
      ctx.fillStyle = "#111c31";
      ctx.fillRect(110, y, 375, 28);
      ctx.fillStyle = i % 2 === 0 ? "#ef4444" : "#3b82f6";
      ctx.beginPath();
      ctx.arc(124, y + 14, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e5e7eb";
      ctx.fillRect(140, y + 8, 120, 5);
      ctx.fillStyle = "#475569";
      ctx.fillRect(140, y + 17, 90, 4);
      ctx.fillStyle = "#1e3a8a";
      ctx.fillRect(400, y + 10, 70, 10);
    }

    // AI score dial
    const cx = 430;
    const cy = 260;
    const r = 32;
    const progress = (Math.sin(t * 0.7) * 0.5 + 0.5) * Math.PI * 2;
    ctx.strokeStyle = "#1f2a44";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + progress);
    ctx.stroke();

    tex.needsUpdate = true;

    // Lid open animation tied to scroll
    if (lid.current) {
      const open = THREE.MathUtils.lerp(-Math.PI * 0.15, -Math.PI * 0.5, Math.min(1, scrollProgress.current * 1.5));
      lid.current.rotation.x = open;
    }
    if (group.current) {
      group.current.position.y = Math.sin(t * 0.9) * 0.08 - 0.2;
      group.current.rotation.y = Math.sin(t * 0.4) * 0.1 - 0.1;
    }
  });

  return (
    <group ref={group} position={[0, -0.2, 0]}>
      {/* Base */}
      <RoundedBox args={[3.2, 0.14, 2.2]} radius={0.06} smoothness={4} castShadow>
        <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.35} />
      </RoundedBox>
      {/* Trackpad */}
      <mesh position={[0, 0.075, 0.5]}>
        <boxGeometry args={[1.2, 0.01, 0.7]} />
        <meshStandardMaterial color="#0f172a" metalness={0.4} roughness={0.5} />
      </mesh>
      {/* Keyboard hint */}
      <mesh position={[0, 0.075, -0.4]}>
        <boxGeometry args={[2.6, 0.01, 1]} />
        <meshStandardMaterial color="#111827" metalness={0.3} roughness={0.6} />
      </mesh>

      {/* Lid hinge */}
      <group ref={lid} position={[0, 0.07, -1.05]}>
        <group position={[0, 1.05, 0]}>
          <RoundedBox args={[3.2, 2.1, 0.1]} radius={0.05} smoothness={4}>
            <meshStandardMaterial color="#0f172a" metalness={0.5} roughness={0.4} />
          </RoundedBox>
          {/* Screen */}
          <mesh position={[0, 0, 0.055]}>
            <planeGeometry args={[3.0, 1.9]} />
            <meshBasicMaterial map={tex} toneMapped={false} />
          </mesh>
        </group>
      </group>
    </group>
  );
};
