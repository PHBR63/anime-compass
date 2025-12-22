import { motion, Variants, Transition } from "framer-motion";
import { ReactNode } from "react";

/**
 * Variantes de animação para transição de página
 * Usa fade + slide sutil para uma experiência fluida
 */
const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  in: {
    opacity: 1,
    y: 0,
  },
  out: {
    opacity: 0,
    y: -8,
  },
};

/**
 * Configuração da transição
 * Usa tween suave para movimento natural
 */
const pageTransition: Transition = {
  type: "tween",
  ease: [0.25, 0.1, 0.25, 1], // cubic-bezier easeInOut
  duration: 0.25,
};

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

/**
 * Componente de transição de página
 * Envolve o conteúdo da página com animação de entrada/saída
 */
export function PageTransition({ children, className = "" }: PageTransitionProps) {
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className={className}
    >
      {children}
    </motion.div>
  );
}
