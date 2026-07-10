import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  FileImage,
  FileVideo,
  ImageIcon,
  Plus,
  Trash2,
  Play,
  Monitor,
  QrCode,
  RefreshCw,
  Clock,
  GripVertical,
  Film,
  Upload,
  AlertTriangle,
  Loader2,
  Copy,
  Check,
  ListVideo,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { DashboardLayout, DashboardPageHeader } from "@/components/base/dashboard-layout";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { EntityFormDialog, EntityField, EntityFormGrid } from "@/components/shared/EntityFormDialog";
import { SectionCard } from "@/components/ui/cards";
import { cn } from "@/lib/utils";
import { apiGet, apiPost, apiDelete, apiPatch } from "@/lib/api/client";
import { useAuth } from "@/context/AuthContext";

// ── Types ────────────────────────────────────────────────────────────────────

interface MediaAsset {
  id: string;
  filename: string;
  type: "image" | "video";
  sizeBytes: number;
  url: string;
  thumbnailUrl?: string;
  uploadedAt: string;
}

interface PlaylistItem {
  id: string;
  assetId: string;
  assetUrl: string;
  assetType: "image" | "video";
  assetFilename: string;
  durationSec: number;
  sortOrder: number;
}

interface Playlist {
  id: string;
  name: string;
  active: boolean;
  branchId?: string;
  branchName?: string;
  daypartEnabled: boolean;
  daypartStart?: string;
  daypartEnd?: string;
  items: PlaylistItem[];
  createdAt: string;
}

interface ScreenDevice {
  id: string;
  name: string;
  branchId?: string;
  branchName?: string;
  token: string;
  status: "online" | "offline" | "error";
  lastHeartbeatAt?: string;
  createdAt: string;
}

interface Branch {
  id: string;
  label: string;
}

interface PlaylistFormData {
  name: string;
  active: boolean;
  branchId: string;
  daypartEnabled: boolean;
  daypartStart: string;
  daypartEnd: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export default function LiveMenuDashboard() {
  const { api } = useAuth();
  const orgId = "default"; // FIXME: get from user context / route param

  // ── Shared state ─────────────────────────────────────────────────────────

  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Assets state ─────────────────────────────────────────────────────────

  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Playlists state ──────────────────────────────────────────────────────

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(true);
  const [playlistFormOpen, setPlaylistFormOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [playlistForm, setPlaylistForm] = useState<PlaylistFormData>({
    name: "",
    active: true,
    branchId: "",
    daypartEnabled: false,
    daypartStart: "08:00",
    daypartEnd: "22:00",
  });
  const [playlistSubmitting, setPlaylistSubmitting] = useState(false);
  const [expandedPlaylist, setExpandedPlaylist] = useState<string | null>(null);

  // Drag state for playlist item reorder
  const [dragItem, setDragItem] = useState<{
    playlistId: string;
    itemIndex: number;
  } | null>(null);
  const [dragOverItem, setDragOverItem] = useState<{
    playlistId: string;
    itemIndex: number;
  } | null>(null);

  // ── Screens state ───────────────────────────────────────────────────────

  const [screens, setScreens] = useState<ScreenDevice[]>([]);
  const [screensLoading, setScreensLoading] = useState(true);
  const [createScreenOpen, setCreateScreenOpen] = useState(false);
  const [newScreenName, setNewScreenName] = useState("");
  const [newScreenBranchId, setNewScreenBranchId] = useState("");
  const [newScreenCreated, setNewScreenCreated] = useState<ScreenDevice | null>(null);
  const [createScreenSubmitting, setCreateScreenSubmitting] = useState(false);
  const [regeneratingToken, setRegeneratingToken] = useState<string | null>(null);
  const [confirmDeleteScreen, setConfirmDeleteScreen] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [deleteAsset, setDeleteAsset] = useState<string | null>(null);

  const displayUrl = (token: string) =>
    `${window.location.origin}/display/${token}`;

  // ── Fetch helpers ────────────────────────────────────────────────────────

  const fetchAssets = useCallback(async () => {
    setAssetsLoading(true);
    try {
      const res = await apiGet<MediaAsset[]>(
        `/orgs/${orgId}/media`
      );
      if (res.ok && res.data) {
        setAssets(res.data);
      }
    } catch (err) {
      console.error("[LiveMenuDashboard] fetch assets error:", err);
      toast.error("Failed to load media assets");
    } finally {
      setAssetsLoading(false);
    }
  }, [orgId]);

  const fetchPlaylists = useCallback(async () => {
    setPlaylistsLoading(true);
    try {
      const res = await apiGet<Playlist[]>(
        `/orgs/${orgId}/playlists`
      );
      if (res.ok && res.data) {
        setPlaylists(res.data);
      }
    } catch (err) {
      console.error("[LiveMenuDashboard] fetch playlists error:", err);
      toast.error("Failed to load playlists");
    } finally {
      setPlaylistsLoading(false);
    }
  }, [orgId]);

  const fetchScreens = useCallback(async () => {
    setScreensLoading(true);
    try {
      const res = await apiGet<ScreenDevice[]>(
        `/orgs/${orgId}/screens`
      );
      if (res.ok && res.data) {
        setScreens(res.data);
      }
    } catch (err) {
      console.error("[LiveMenuDashboard] fetch screens error:", err);
      toast.error("Failed to load screens");
    } finally {
      setScreensLoading(false);
    }
  }, [orgId]);

  const fetchBranches = useCallback(async () => {
    try {
      const res = await apiGet<{ id: string; name: string }[]>(
        "/branches"
      );
      if (res.ok && res.data) {
        setBranches(
          res.data.map((b) => ({ id: b.id, label: b.name }))
        );
      }
    } catch {
      // Branches are optional; continue silently
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.allSettled([
      fetchAssets(),
      fetchPlaylists(),
      fetchScreens(),
      fetchBranches(),
    ]);
    setLoading(false);
  }, [fetchAssets, fetchPlaylists, fetchScreens, fetchBranches]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Asset handlers ───────────────────────────────────────────────────────

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/orgs/${orgId}/media/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });
      const json = await res.json();

      if (json.ok) {
        toast.success("Asset uploaded");
        fetchAssets();
      } else {
        toast.error(json.error?.message || "Upload failed");
      }
    } catch (err) {
      toast.error("Upload failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteAsset = async () => {
    if (!deleteAsset) return;
    try {
      const res = await apiDelete(`/orgs/${orgId}/media/${deleteAsset}`);
      if (res.ok) {
        toast.success("Asset deleted");
        setAssets((prev) => prev.filter((a) => a.id !== deleteAsset));
      } else {
        toast.error("Failed to delete asset");
      }
    } catch {
      toast.error("Failed to delete asset");
    } finally {
      setDeleteAsset(null);
    }
  };

  // ── Playlist handlers ───────────────────────────────────────────────────

  const openCreatePlaylist = () => {
    setEditingPlaylist(null);
    setPlaylistForm({
      name: "",
      active: true,
      branchId: "",
      daypartEnabled: false,
      daypartStart: "08:00",
      daypartEnd: "22:00",
    });
    setPlaylistFormOpen(true);
  };

  const openEditPlaylist = (playlist: Playlist) => {
    setEditingPlaylist(playlist);
    setPlaylistForm({
      name: playlist.name,
      active: playlist.active,
      branchId: playlist.branchId || "",
      daypartEnabled: playlist.daypartEnabled,
      daypartStart: playlist.daypartStart || "08:00",
      daypartEnd: playlist.daypartEnd || "22:00",
    });
    setPlaylistFormOpen(true);
  };

  const handleSavePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlaylistSubmitting(true);
    try {
      if (editingPlaylist) {
        const res = await apiPatch(
          `/orgs/${orgId}/playlists/${editingPlaylist.id}`,
          playlistForm
        );
        if (res.ok) {
          toast.success("Playlist updated");
          fetchPlaylists();
          setPlaylistFormOpen(false);
        } else {
          toast.error(res.error?.message || "Failed to update playlist");
        }
      } else {
        const res = await apiPost(
          `/orgs/${orgId}/playlists`,
          playlistForm
        );
        if (res.ok) {
          toast.success("Playlist created");
          fetchPlaylists();
          setPlaylistFormOpen(false);
        } else {
          toast.error(res.error?.message || "Failed to create playlist");
        }
      }
    } catch {
      toast.error("Failed to save playlist");
    } finally {
      setPlaylistSubmitting(false);
    }
  };

  const handleReorder = async (
    playlistId: string,
    itemIds: string[]
  ) => {
    try {
      await apiPost(`/orgs/${orgId}/playlists/reorder`, {
        playlistId,
        itemIds,
      });
      fetchPlaylists();
    } catch {
      toast.error("Failed to reorder items");
    }
  };

  // ── Screen handlers ────────────────────────────────────────────────────

  const handleCreateScreen = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateScreenSubmitting(true);
    try {
      const res = await apiPost<ScreenDevice>(`/orgs/${orgId}/screens`, {
        name: newScreenName,
        branchId: newScreenBranchId || undefined,
      });
      if (res.ok && res.data) {
        setNewScreenCreated(res.data);
        toast.success("Screen created");
        fetchScreens();
      } else {
        toast.error(res.error?.message || "Failed to create screen");
      }
    } catch {
      toast.error("Failed to create screen");
    } finally {
      setCreateScreenSubmitting(false);
    }
  };

  const handleRegenerateToken = async (screenId: string) => {
    setRegeneratingToken(screenId);
    try {
      const res = await apiPost<ScreenDevice>(
        `/orgs/${orgId}/screens/${screenId}/regenerate-token`
      );
      if (res.ok && res.data) {
        toast.success("Token regenerated");
        setScreens((prev) =>
          prev.map((s) =>
            s.id === screenId ? { ...s, token: res.data!.token } : s
          )
        );
      } else {
        toast.error(res.error?.message || "Failed to regenerate token");
      }
    } catch {
      toast.error("Failed to regenerate token");
    } finally {
      setRegeneratingToken(null);
    }
  };

  const handleDeleteScreen = async () => {
    if (!confirmDeleteScreen) return;
    try {
      const res = await apiDelete(
        `/orgs/${orgId}/screens/${confirmDeleteScreen}`
      );
      if (res.ok) {
        toast.success("Screen deleted");
        setScreens((prev) =>
          prev.filter((s) => s.id !== confirmDeleteScreen)
        );
      } else {
        toast.error(res.error?.message || "Failed to delete screen");
      }
    } catch {
      toast.error("Failed to delete screen");
    } finally {
      setConfirmDeleteScreen(null);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedToken(id);
      setTimeout(() => setCopiedToken(null), 2000);
    });
  };

  // ── Render: Assets Tab ─────────────────────────────────────────────────

  const renderAssetsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground">Media Assets</h2>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="mr-1.5 size-4 animate-spin" />
            ) : (
              <Upload className="mr-1.5 size-4" />
            )}
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </div>
      </div>

      {assetsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : assets.length === 0 ? (
        <EmptyState
          title="No media assets"
          description="Upload images or videos to use in your playlists."
          icon={<ImageIcon className="size-8" />}
          action={
            <Button
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-1.5 size-4" />
              Upload Asset
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="group relative overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary/40"
            >
              {/* Thumbnail */}
              <div className="aspect-video w-full overflow-hidden bg-muted">
                {asset.type === "image" ? (
                  <img
                    src={asset.thumbnailUrl || asset.url}
                    alt={asset.filename}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Film className="size-8 text-muted-foreground/40" />
                  </div>
                )}
              </div>

              {/* Overlay actions */}
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
                <Button
                  variant="secondary"
                  size="icon-sm"
                  className="size-8"
                  onClick={() => setDeleteAsset(asset.id)}
                  title="Delete asset"
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>

              {/* Info */}
              <div className="p-2">
                <p className="truncate text-xs font-medium text-foreground" title={asset.filename}>
                  {asset.type === "image" ? (
                    <FileImage className="mr-1 inline size-3 text-muted-foreground" />
                  ) : (
                    <FileVideo className="mr-1 inline size-3 text-muted-foreground" />
                  )}
                  {asset.filename}
                </p>
                <p className="mt-0.5 text-3xs text-muted-foreground">
                  {formatBytes(asset.sizeBytes)} &middot; {formatDate(asset.uploadedAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ── Render: Playlists Tab ──────────────────────────────────────────────

  const renderPlaylistItems = (playlist: Playlist) => {
    const isExpanded = expandedPlaylist === playlist.id;

    if (playlist.items.length === 0) {
      return (
        <p className="py-4 text-center text-xs text-muted-foreground">
          No items in this playlist
        </p>
      );
    }

    return (
      <div className="space-y-1">
        {playlist.items.map((item, idx) => (
          <div
            key={item.id}
            className={cn(
              "flex items-center gap-3 rounded-md border border-border/40 bg-muted/30 p-2 transition-colors",
              dragItem?.playlistId === playlist.id &&
                dragItem?.itemIndex === idx &&
                "opacity-50"
            )}
            draggable
            onDragStart={() =>
              setDragItem({ playlistId: playlist.id, itemIndex: idx })
            }
            onDragEnter={() =>
              setDragOverItem({ playlistId: playlist.id, itemIndex: idx })
            }
            onDragEnd={() => {
              if (dragItem && dragOverItem && dragItem.playlistId === dragOverItem.playlistId) {
                const items = [...playlist.items];
                const [moved] = items.splice(dragItem.itemIndex, 1);
                items.splice(dragOverItem.itemIndex, 0, moved);
                handleReorder(
                  playlist.id,
                  items.map((i) => i.id)
                );
              }
              setDragItem(null);
              setDragOverItem(null);
            }}
            onDragOver={(e) => e.preventDefault()}
          >
            <GripVertical className="size-3.5 shrink-0 text-muted-foreground/40 cursor-grab" />
            {item.assetType === "image" ? (
              <img
                src={item.assetUrl}
                alt=""
                className="size-9 shrink-0 rounded object-cover"
              />
            ) : (
              <div className="flex size-9 shrink-0 items-center justify-center rounded bg-muted">
                <Film className="size-4 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-foreground">
                {item.assetFilename}
              </p>
              <p className="text-3xs text-muted-foreground">
                {item.durationSec}s &middot; #{idx + 1}
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderPlaylistsTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground">Playlists</h2>
        <Button size="sm" onClick={openCreatePlaylist}>
          <Plus className="mr-1.5 size-4" />
          Create Playlist
        </Button>
      </div>

      {playlistsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : playlists.length === 0 ? (
        <EmptyState
          title="No playlists"
          description="Create your first playlist to schedule content on screens."
          icon={<ListVideo className="size-8" />}
          action={
            <Button size="sm" onClick={openCreatePlaylist}>
              <Plus className="mr-1.5 size-4" />
              Create Playlist
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {playlists.map((playlist) => (
            <SectionCard key={playlist.id} className="overflow-hidden">
              <div className="flex items-center justify-between p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-foreground">
                      {playlist.name}
                    </h3>
                    <Badge
                      variant={playlist.active ? "success" : "secondary"}
                      className="text-3xs"
                    >
                      {playlist.active ? "Active" : "Inactive"}
                    </Badge>
                    {playlist.branchName && (
                      <Badge variant="outline" className="text-3xs">
                        {playlist.branchName}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {playlist.items.length} items
                    {playlist.daypartEnabled &&
                      ` · Daypart: ${playlist.daypartStart}–${playlist.daypartEnd}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setExpandedPlaylist(
                        expandedPlaylist === playlist.id ? null : playlist.id
                      )
                    }
                  >
                    {expandedPlaylist === playlist.id ? "Collapse" : "Items"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditPlaylist(playlist)}
                  >
                    Edit
                  </Button>
                </div>
              </div>
              {expandedPlaylist === playlist.id && (
                <div className="border-t border-border/40 px-4 pb-4">
                  {renderPlaylistItems(playlist)}
                </div>
              )}
            </SectionCard>
          ))}
        </div>
      )}

      {/* Create/Edit Playlist Dialog */}
      <EntityFormDialog
        open={playlistFormOpen}
        title={editingPlaylist ? "Edit Playlist" : "Create Playlist"}
        submitLabel={editingPlaylist ? "Save Changes" : "Create Playlist"}
        submitting={playlistSubmitting}
        onSubmit={handleSavePlaylist}
        onOpenChange={setPlaylistFormOpen}
      >
        <EntityFormGrid>
          <EntityField label="Playlist Name" required htmlFor="pl-name">
            <Input
              id="pl-name"
              value={playlistForm.name}
              onChange={(e) =>
                setPlaylistForm((f) => ({ ...f, name: e.target.value }))
              }
              placeholder="e.g. Breakfast Menu"
              required
            />
          </EntityField>
          <EntityField label="Active">
            <Switch
              checked={playlistForm.active}
              onCheckedChange={(checked) =>
                setPlaylistForm((f) => ({ ...f, active: checked }))
              }
            />
          </EntityField>
          <EntityField label="Branch Assignment" htmlFor="pl-branch">
            <select
              id="pl-branch"
              value={playlistForm.branchId}
              onChange={(e) =>
                setPlaylistForm((f) => ({ ...f, branchId: e.target.value }))
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">All branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </EntityField>
          <EntityField label="Daypart Scheduling">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Switch
                  checked={playlistForm.daypartEnabled}
                  onCheckedChange={(checked) =>
                    setPlaylistForm((f) => ({
                      ...f,
                      daypartEnabled: checked,
                    }))
                  }
                />
                <span className="text-xs text-muted-foreground">
                  {playlistForm.daypartEnabled
                    ? "Enabled"
                    : "Show all day"}
                </span>
              </div>
              {playlistForm.daypartEnabled && (
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={playlistForm.daypartStart}
                    onChange={(e) =>
                      setPlaylistForm((f) => ({
                        ...f,
                        daypartStart: e.target.value,
                      }))
                    }
                    className="w-32"
                  />
                  <span className="text-xs text-muted-foreground">to</span>
                  <Input
                    type="time"
                    value={playlistForm.daypartEnd}
                    onChange={(e) =>
                      setPlaylistForm((f) => ({
                        ...f,
                        daypartEnd: e.target.value,
                      }))
                    }
                    className="w-32"
                  />
                </div>
              )}
            </div>
          </EntityField>
        </EntityFormGrid>
      </EntityFormDialog>
    </div>
  );

  // ── Render: Screens Tab ─────────────────────────────────────────────────

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-status-success";
      case "offline":
        return "bg-muted-foreground/40";
      case "error":
        return "bg-status-error";
      default:
        return "bg-muted-foreground/40";
    }
  };

  // Generate SVG QR code inline (simple dot pattern)
  const QrCodeSvg = ({ value, size = 120 }: { value: string; size?: number }) => {
    // Simple QR representation using the URL as a data URI
    // For real QR, we use a canvas-based approach
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`;
    return (
      <img
        src={qrUrl}
        alt="QR Code"
        width={size}
        height={size}
        className="rounded-lg"
        crossOrigin="anonymous"
        onError={(e) => {
          // Fallback if QR service is unavailable
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
    );
  };

  const renderScreensTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground">
          Screens{" "}
          <span className="font-normal text-muted-foreground">
            ({screens.length})
          </span>
        </h2>
        <Dialog
          open={createScreenOpen}
          onOpenChange={(open) => {
            setCreateScreenOpen(open);
            if (!open) setNewScreenCreated(null);
          }}
        >
          <DialogTrigger
            render={
              <Button size="sm">
                <Monitor className="mr-1.5 size-4" />
                Add Screen
              </Button>
            }
          />
          <DialogContent className="sm:max-w-md">
            {newScreenCreated ? (
              <>
                <DialogHeader>
                  <DialogTitle>Screen Created</DialogTitle>
                  <DialogDescription>
                    Pair this screen by entering the code or scanning the QR code.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center gap-4 py-4">
                  <QrCodeSvg
                    value={newScreenCreated.token}
                    size={160}
                  />
                  <div className="text-center">
                    <p className="mb-2 text-sm font-medium text-foreground">
                      Screen Token
                    </p>
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2">
                      <code className="text-xs font-mono text-foreground break-all">
                        {newScreenCreated.token}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="size-7 shrink-0"
                        onClick={() =>
                          copyToClipboard(
                            newScreenCreated.token,
                            "new-token"
                          )
                        }
                      >
                        {copiedToken === "new-token" ? (
                          <Check className="size-3.5 text-status-success" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Display URL:{" "}
                    <code className="text-3xs">
                      {displayUrl(newScreenCreated.token)}
                    </code>
                  </p>
                </div>
                <DialogFooter>
                  <Button onClick={() => setCreateScreenOpen(false)}>
                    Done
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <form onSubmit={handleCreateScreen}>
                <DialogHeader>
                  <DialogTitle>Add Screen</DialogTitle>
                  <DialogDescription>
                    Register a new display device. A unique token will be
                    generated automatically.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <EntityField label="Screen Name" required htmlFor="sc-name">
                    <Input
                      id="sc-name"
                      value={newScreenName}
                      onChange={(e) => setNewScreenName(e.target.value)}
                      placeholder="e.g. Lobby TV, Kitchen Display"
                      required
                    />
                  </EntityField>
                  <EntityField label="Branch" htmlFor="sc-branch">
                    <select
                      id="sc-branch"
                      value={newScreenBranchId}
                      onChange={(e) => setNewScreenBranchId(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">No branch</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                  </EntityField>
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={createScreenSubmitting || !newScreenName.trim()}
                  >
                    {createScreenSubmitting && (
                      <Loader2 className="mr-1.5 size-4 animate-spin" />
                    )}
                    Create Screen
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {screensLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : screens.length === 0 ? (
        <EmptyState
          title="No screens"
          description="Add your first screen to start displaying content."
          icon={<Monitor className="size-8" />}
          action={
            <Button
              size="sm"
              onClick={() => {
                setCreateScreenOpen(true);
              }}
            >
              <Monitor className="mr-1.5 size-4" />
              Add Screen
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {screens.map((screen) => (
            <SectionCard key={screen.id} className="overflow-hidden">
              <div className="flex items-start justify-between p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-block h-2 w-2 rounded-full",
                        getStatusColor(screen.status)
                      )}
                    />
                    <h3 className="text-sm font-medium text-foreground">
                      {screen.name}
                    </h3>
                    <Badge
                      variant={
                        screen.status === "online"
                          ? "success"
                          : screen.status === "error"
                            ? "destructive"
                            : "secondary"
                      }
                      className="text-3xs"
                    >
                      {screen.status}
                    </Badge>
                  </div>
                  {screen.branchName && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Branch: {screen.branchName}
                    </p>
                  )}
                  <p className="mt-1 text-3xs text-muted-foreground/60">
                    Created {formatDate(screen.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {/* Pairing info popover — simplified as collapsible section */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(
                        displayUrl(screen.token),
                        screen.id
                      )
                    }
                    title="Copy display URL"
                  >
                    {copiedToken === screen.id ? (
                      <Check className="size-3.5 text-status-success" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                    <span className="ml-1 text-xs">URL</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Regenerate token"
                    disabled={regeneratingToken === screen.id}
                    onClick={() => handleRegenerateToken(screen.id)}
                  >
                    {regeneratingToken === screen.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="size-3.5" />
                    )}
                    <span className="ml-1 text-xs">Token</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setConfirmDeleteScreen(screen.id)}
                    title="Delete screen"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
              {/* Token display */}
              <div className="border-t border-border/40 px-4 py-2">
                <div className="flex items-center gap-2">
                  <QrCode className="size-3.5 text-muted-foreground/60" />
                  <code className="truncate text-3xs text-muted-foreground font-mono">
                    {displayUrl(screen.token)}
                  </code>
                </div>
              </div>
            </SectionCard>
          ))}
        </div>
      )}

      {/* Confirm delete screen */}
      <ConfirmDialog
        open={!!confirmDeleteScreen}
        title="Delete Screen"
        desc="Are you sure you want to delete this screen? This action cannot be undone."
        confirmText="Delete"
        danger
        onConfirm={handleDeleteScreen}
        onClose={() => setConfirmDeleteScreen(null)}
      />
    </div>
  );

  // ── Confirm delete asset ─────────────────────────────────────────────

  return (
    <DashboardLayout>
      <DashboardPageHeader
        title="Live TV"
        subtitle="Manage digital signage — media assets, playlists, and screens."
      />

      {/* Delete asset confirmation */}
      <ConfirmDialog
        open={!!deleteAsset}
        title="Delete Asset"
        desc="Are you sure you want to delete this media asset? It will be removed from all playlists."
        confirmText="Delete"
        danger
        onConfirm={handleDeleteAsset}
        onClose={() => setDeleteAsset(null)}
      />

      {/* Regenerate token confirmation dialog */}
      <ConfirmDialog
        open={!!regeneratingToken}
        title="Regenerate Token"
        desc="Regenerating the token will disconnect any screens currently paired. Continue?"
        confirmText="Regenerate"
        danger
        onConfirm={() => {
          if (regeneratingToken) {
            const id = regeneratingToken;
            setRegeneratingToken(null);
            handleRegenerateToken(id);
          }
        }}
        onClose={() => setRegeneratingToken(null)}
      />

      <Tabs defaultValue="assets" className="mt-6">
        <TabsList>
          <TabsTrigger value="assets">
            <ImageIcon className="mr-1.5 size-4" />
            Assets
          </TabsTrigger>
          <TabsTrigger value="playlists">
            <Play className="mr-1.5 size-4" />
            Playlists
          </TabsTrigger>
          <TabsTrigger value="screens">
            <Monitor className="mr-1.5 size-4" />
            Screens
          </TabsTrigger>
        </TabsList>
        <TabsContent value="assets" className="mt-6">
          {renderAssetsTab()}
        </TabsContent>
        <TabsContent value="playlists" className="mt-6">
          {renderPlaylistsTab()}
        </TabsContent>
        <TabsContent value="screens" className="mt-6">
          {renderScreensTab()}
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
