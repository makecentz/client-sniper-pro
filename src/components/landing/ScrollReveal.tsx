import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  as?: "div" | "section";
  id?: string;
}

export const ScrollReveal = ({
  children,
  className,
  delay = 0,
  y = 40,
  as = "div",
  id,
}: ScrollRevealProps) => {
  const reduced = useReducedMotion();
  const MotionTag = as === "section" ? motion.section : motion.div;

  return (
    <MotionTag
      id={id}
      className={className}
      initial={reduced ? false : { opacity: 0, y }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </MotionTag>
  );
};
