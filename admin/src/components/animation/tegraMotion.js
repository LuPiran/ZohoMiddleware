/** Curvas e variantes compartilhadas (paleta Tegra — azul / teal) */
export const teEase = [0.22, 1, 0.36, 1];

export const pageVariants = {
  initial: {
    opacity: 0,
    y: 18,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: -12,
  },
};

export const pageTransition = {
  duration: 0.42,
  ease: teEase,
};
