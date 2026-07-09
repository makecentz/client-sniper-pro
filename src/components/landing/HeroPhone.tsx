import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";

const OUTREACH = [
  "Hi Joe — I saw your pizzeria",
  "on Google. Noticed you don't",
  "have a website yet. I put",
  "together a quick demo that",
  "shows your menu + hours.",
  "Want me to send it over?",
];

interface HeroPhoneProps {
  scrollProgress: React.MutableRefObject<number>;
}

export const HeroPhone = ({ scrollProgress }: HeroPhoneProps) => {
  const group = useRef<THREE.Group>(null);

  const { canvas, ctx, tex } = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 300;
    c.height = 600;
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return { canvas: c, ctx: c.getContext("2d")!, tex: t };
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    ctx.fillStyle = "#0b1220";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // status bar
    ctx.fillStyle = "#e5e7eb";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText("9:41", 18, 34);
    ctx.fillRect(240, 22, 40, 12);

    // header
    ctx.fillStyle = "#3b82f6";
    ctx.fillRect(0, 60, canvas.width, 60);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText("AI Outreach", 20, 98);

    // chat bubbles being typed
    let y = 150;
    const totalChars = Math.floor(t * 22) % 260;
    let charBudget = totalChars;
    for (let i = 0; i < OUTREACH.length; i++) {
      const line = OUTREACH[i];
      const shown = Math.min(line.length, Math.max(0, charBudget));
      if (shown <= 0) break;
      const text = line.substring(0, shown);
      const w = Math.min(240, ctx.measureText(text).width + 24);
      ctx.fillStyle = "#1f2a44";
      const bubbleH = 38;
      // rounded rect
      const x = 20;
      const r = 12;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + bubbleH - r);
      ctx.quadraticCurveTo(x + w, y + bubbleH, x + w - r, y + bubbleH);
      ctx.lineTo(x + r, y + bubbleH);
      ctx.quadraticCurveTo(x, y + bubbleH, x, y + bubbleH - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.fill();
      ctx.fillStyle = "#e5e7eb";
      ctx.font = "16px sans-serif";
      ctx.fillText(text, x + 12, y + 24);
      y += 48;
      charBudget -= line.length;
    }

    // Send button
    ctx.fillStyle = "#3b82f6";
    ctx.fillRect(20, canvas.height - 70, canvas.width - 40, 46);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText("Send with AI", canvas.width / 2 - 50, canvas.height - 40);

    tex.needsUpdate = true;

    if (group.current) {
      const rise = THREE.MathUtils.lerp(0, 0.4, Math.min(1, scrollProgress.current * 2));
      group.current.position.y = rise + Math.sin(t * 1.1) * 0.06 - 0.1;
      group.current.rotation.z = Math.sin(t * 0.5) * 0.05;
      group.current.rotation.y = -0.25 + Math.sin(t * 0.3) * 0.05;
    }
  });

  return (
    <group ref={group} position={[2.1, -0.1, 0.6]} rotation={[0, -0.25, 0]}>
      <RoundedBox args={[0.9, 1.8, 0.08]} radius={0.09} smoothness={4}>
        <meshStandardMaterial color="#111827" metalness={0.7} roughness={0.3} />
      </RoundedBox>
      <mesh position={[0, 0, 0.045]}>
        <planeGeometry args={[0.8, 1.7]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  );
};
