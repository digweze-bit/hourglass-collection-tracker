import { useState, useRef, useCallback } from "react";
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const MAX_DIMENSION = 1400;
const JPEG_QUALITY = 0.82;

function getDefaultCrop(width: number, height: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 100 }, width / height, width, height),
    width,
    height,
  );
}

function cropImageToDataUrl(
  image: HTMLImageElement,
  pixelCrop: PixelCrop,
): string {
  const canvas = document.createElement("canvas");
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  const cropW = Math.round(pixelCrop.width * scaleX);
  const cropH = Math.round(pixelCrop.height * scaleY);

  let outW = cropW;
  let outH = cropH;
  if (outW > MAX_DIMENSION || outH > MAX_DIMENSION) {
    if (outW > outH) {
      outH = Math.round((outH * MAX_DIMENSION) / outW);
      outW = MAX_DIMENSION;
    } else {
      outW = Math.round((outW * MAX_DIMENSION) / outH);
      outH = MAX_DIMENSION;
    }
  }

  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.drawImage(
    image,
    Math.round(pixelCrop.x * scaleX),
    Math.round(pixelCrop.y * scaleY),
    cropW,
    cropH,
    0,
    0,
    outW,
    outH,
  );

  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

interface ImageCropDialogProps {
  src: string | null;
  onConfirm: (dataUrl: string) => void;
  onCancel: () => void;
}

export function ImageCropDialog({ src, onConfirm, onCancel }: ImageCropDialogProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [saving, setSaving] = useState(false);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(getDefaultCrop(width, height));
  }, []);

  function handleConfirm() {
    if (!imgRef.current || !completedCrop) return;
    setSaving(true);
    try {
      const dataUrl = cropImageToDataUrl(imgRef.current, completedCrop);
      onConfirm(dataUrl);
    } catch {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!src} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="max-w-2xl w-full">
        <DialogHeader>
          <DialogTitle className="font-serif">Crop Image</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-center bg-muted/20 min-h-[200px] max-h-[60vh] overflow-auto py-4">
          {src && (
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              minWidth={20}
              minHeight={20}
            >
              <img
                ref={imgRef}
                src={src}
                alt="Crop preview"
                onLoad={onImageLoad}
                style={{ maxHeight: "55vh", maxWidth: "100%", display: "block" }}
              />
            </ReactCrop>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Drag to reposition the crop area. Drag the corners or edges to resize it.
        </p>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={saving || !completedCrop}>
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : "Crop & Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
