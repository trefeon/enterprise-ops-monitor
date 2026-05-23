import { type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { BaseRouteTransition } from "@/components/base";

interface PageTransitionProps {
  children: ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();

  return (
    <BaseRouteTransition transitionKey={location.pathname}>{children}</BaseRouteTransition>
  );
}
