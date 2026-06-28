import { supabase } from "@/lib/supabase";

/**
 * Resize an image file in the browser to a max dimension,
 * then upload to Supabase Storage and return the public URL.
 */
export async function resizeAndUpload(
  file: File,
  maxWidth = 1200,
  quality = 0.82
): Promise<string> {
  // 1. Resize in browser using Canvas
  const resizedBlob = await resizeImage(file, maxWidth, quality);

  // 2. Generate unique filename
  const ext = file.type === "image/png" ? "png" : "jpg";
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? "anon";
  const filename = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  // 3. Upload to Supabase Storage
  const { error } = await supabase.storage
    .from("artwork-images")
    .upload(filename, resizedBlob, {
      contentType: `image/${ext}`,
      upsert: false,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  // 4. Get public URL
  const { data } = supabase.storage
    .from("artwork-images")
    .getPublicUrl(filename);

  return data.publicUrl;
}

function resizeImage(file: File, maxWidth: number, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const ratio = Math.min(1, maxWidth / img.width);
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error("Canvas toBlob failed")),
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = url;
  });
}
