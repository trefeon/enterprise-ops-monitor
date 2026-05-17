import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface Props {
  machineId: string
  currentLabel: string | null
  open: boolean
  onClose: () => void
  onSave: (id: string, label: string) => void
}

export function LabelEditDialog({ machineId, currentLabel, open, onClose, onSave }: Props) {
  const [value, setValue] = useState(currentLabel ?? "")

  useEffect(() => {
    if (open) setValue(currentLabel ?? "")
  }, [currentLabel, open])

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Label</DialogTitle>
        </DialogHeader>
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Enter a friendly label..."
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onSave(machineId, value); onClose() }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
