import type { ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"

interface StatCardProps {
  title: string
  value: ReactNode
  icon?: ReactNode
  subtext?: ReactNode
  className?: string
  onClick?: () => void
}

export function StatCard({ title, value, icon, subtext, className, onClick }: StatCardProps) {
  return (
    <Card
      className={`${onClick ? "cursor-pointer transition-shadow hover:shadow-md" : ""} ${className ?? ""}`}
      onClick={onClick}
    >
      <CardContent className="flex flex-col gap-2 pt-4">
        <div className="flex items-start justify-between gap-3">
          <span className="text-xs font-medium text-muted-foreground">{title}</span>
          {icon && <span className="shrink-0 text-muted-foreground">{icon}</span>}
        </div>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
      </CardContent>
    </Card>
  )
}
