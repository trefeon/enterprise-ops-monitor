import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface BaseFileUploadControlProps {
  id: string;
  accept?: string;
  disabled?: boolean;
  label?: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
}

export function BaseFileUploadControl({
  id,
  accept,
  disabled,
  label = "Upload file",
  onChange,
}: BaseFileUploadControlProps) {
  return (
    <>
      <input id={id} type="file" accept={accept} disabled={disabled} onChange={onChange} className="sr-only" />
      <Button type="button" variant="outline" disabled={disabled} onClick={() => document.getElementById(id)?.click()}>
        <Upload data-icon="inline-start" />
        {label}
      </Button>
    </>
  );
}
