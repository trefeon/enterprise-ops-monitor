import type { ReactNode } from "react";
import { BaseCard } from "@/components/base";

export interface SectionCardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  children?: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function SectionCard({
  title,
  subtitle,
  right,
  children,
  className,
  noPadding = false,
}: SectionCardProps) {
  return (
    <BaseCard
      title={title}
      description={subtitle}
      actions={right}
      className={className}
      contentClassName={noPadding ? "p-0" : undefined}
    >
      {children}
    </BaseCard>
  );
}

export default SectionCard;
