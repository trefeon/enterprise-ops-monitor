import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface BaseTabItem {
  value: string;
  label: ReactNode;
  content: ReactNode;
  disabled?: boolean;
}

export function BaseTabs({
  value,
  defaultValue,
  onValueChange,
  items,
}: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  items: BaseTabItem[];
}) {
  return (
    <Tabs value={value} defaultValue={defaultValue ?? items[0]?.value} onValueChange={onValueChange}>
      <TabsList>
        {items.map((item) => (
          <TabsTrigger key={item.value} value={item.value} disabled={item.disabled}>
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {items.map((item) => (
        <TabsContent key={item.value} value={item.value}>
          {item.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
