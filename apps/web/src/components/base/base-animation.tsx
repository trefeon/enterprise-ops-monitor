import type { ReactNode } from "react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  type HTMLMotionProps,
  type Transition,
} from "framer-motion";
import { cn } from "@/lib/utils";

type BaseMotionDirection = "up" | "down" | "left" | "right";

interface BaseDirectionalMotion {
  direction?: BaseMotionDirection;
  offset?: number;
  transition?: Transition;
}

const defaultTransition: Transition = { duration: 0.22, ease: [0.16, 1, 0.3, 1] };

function getInitialOffset(direction: BaseMotionDirection = "up", offset = 10) {
  if (direction === "down") return { opacity: 0, y: -offset };
  if (direction === "left") return { opacity: 0, x: offset };
  if (direction === "right") return { opacity: 0, x: -offset };
  return { opacity: 0, y: offset };
}

export function BaseMotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

export function BaseFadeIn({ className, ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className={cn(className)}
      {...props}
    />
  );
}

export function BaseScaleIn({ className, ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={cn(className)}
      {...props}
    />
  );
}

export function BaseSlideIn({
  className,
  direction = "up",
  offset = 10,
  transition = defaultTransition,
  ...props
}: HTMLMotionProps<"div"> & BaseDirectionalMotion) {
  return (
    <motion.div
      initial={getInitialOffset(direction, offset)}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={transition}
      className={cn(className)}
      {...props}
    />
  );
}

export function BaseAnimatedSection({
  className,
  direction = "down",
  offset = 10,
  transition = defaultTransition,
  ...props
}: HTMLMotionProps<"section"> & BaseDirectionalMotion) {
  return (
    <motion.section
      initial={getInitialOffset(direction, offset)}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={transition}
      className={cn(className)}
      {...props}
    />
  );
}

export function BaseAnimatedForm({
  className,
  direction = "up",
  offset = 8,
  transition = { duration: 0.16, ease: "easeOut" },
  ...props
}: HTMLMotionProps<"form"> & BaseDirectionalMotion) {
  return (
    <motion.form
      initial={getInitialOffset(direction, offset)}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={transition}
      className={cn(className)}
      {...props}
    />
  );
}

export function BaseAnimatedList({ children, className }: { children: ReactNode; className?: string }) {
  return <BaseFadeIn className={className}>{children}</BaseFadeIn>;
}

export function BaseAnimatedPanel({ children, className }: { children: ReactNode; className?: string }) {
  return <BaseScaleIn className={className}>{children}</BaseScaleIn>;
}

export function BasePageTransition({ children }: { children: ReactNode }) {
  return <BaseSlideIn>{children}</BaseSlideIn>;
}

export function BaseRouteTransition({
  children,
  transitionKey,
}: {
  children: ReactNode;
  transitionKey: string;
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={transitionKey}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
