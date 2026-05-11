import { motion } from "framer-motion";

/**
 * Menu do react-select com entrada suave (Framer Motion).
 */
export function TegraAnimatedMenu(props) {
  const { children, innerProps, innerRef, getStyles } = props;

  return (
    <motion.div
      ref={innerRef}
      {...innerProps}
      style={getStyles ? getStyles("menu", props) : innerProps?.style}
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
