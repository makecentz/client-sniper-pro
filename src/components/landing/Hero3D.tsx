import { Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { HeroLaptop } from "./HeroLaptop";
import { HeroPhone } from "./HeroPhone";
import { LeadParticles } from "./LeadParticles";

const Rig = ({ mouse }: { mouse: React.MutableRefObject<{ x: number; y: number }> }) => {
  useFrame((state) => {
    const target = new THREE.Vector3(
      mouse.current.x * 0.6,
      1 + mouse.current.y * 0.3,
      6.5,
    );
    state.camera.position.lerp(target, 0.05);
    state.camera.lookAt(0, 0, 0);
  });
  return null;
};

export const Hero3D = () => {
  const mouse = useRef({ x: 0, y: 0 });
  const scrollProgress = useRef(0);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const onScroll = () => {
      const h = window.innerHeight;
      scrollProgress.current = Math.max(0, Math.min(1, window.scrollY / h));
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div className="relative aspect-[4/3] w-full">
      <div className="absolute -inset-6 rounded-3xl bg-gradient-to-tr from-primary/30 via-primary/10 to-transparent blur-3xl" />
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ position: [0, 1, 7], fov: 40 }}
        className="!absolute inset-0"
        gl={{ alpha: true, antialias: true }}
        style={{ background: "transparent" }}
      >
        <color attach="background" args={["#00000000"]} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[4, 6, 5]} intensity={0.9} castShadow />
        <directionalLight position={[-4, 3, -2]} intensity={0.3} color="#3b82f6" />
        <Suspense fallback={null}>
          <HeroLaptop scrollProgress={scrollProgress} />
          <HeroPhone scrollProgress={scrollProgress} />
          <LeadParticles />
          <ContactShadows position={[0, -1.05, 0]} opacity={0.3} scale={10} blur={2.4} far={3} />
          <Environment preset="city" />
        </Suspense>
        <Rig mouse={mouse} />
      </Canvas>
    </div>
  );
};

export default Hero3D;
