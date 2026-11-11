"use client";

import Image from "next/image";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";

const categories = ["Bathroom", "Kitchen", "Living Room", "Whole Home"] as const;
type Category = (typeof categories)[number];
type GalleryPhoto = { id: string; category: Category; description: string; src: string; createdAt?: string };
const field: React.CSSProperties = { width: "100%", boxSizing: "border-box", border: "1px solid #cbd5dc", borderRadius: 8, padding: 12, color: "#172b3d", font: "inherit", background: "white" };
const button: React.CSSProperties = { border: 0, borderRadius: 8, padding: "12px 16px", background: "#16834a", color: "white", fontWeight: 700, cursor: "pointer" };

async function compressImage(file: File): Promise<string> {
  if (file.size > 20 * 1024 * 1024) throw new Error("Choose an image smaller than 20 MB.");

  let bitmap: ImageBitmap | null = null;
  if (typeof createImageBitmap === "function") {
    try { bitmap = await createImageBitmap(file); } catch { /* Fall back to the browser's image decoder. */ }
  }
  let objectUrl = "";
  let source: CanvasImageSource;
  if (bitmap) {
    source = bitmap;
  } else {
    objectUrl = URL.createObjectURL(file);
    source = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new window.Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("This image could not be opened. Please try another photo."));
      image.src = objectUrl;
    });
  }

  const sourceWidth = bitmap?.width || (source as HTMLImageElement).naturalWidth;
  const sourceHeight = bitmap?.height || (source as HTMLImageElement).naturalHeight;
  if (!sourceWidth || !sourceHeight) {
    bitmap?.close();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    throw new Error("This image could not be opened. Please try another photo.");
  }
  const scale = Math.min(1, 1600 / Math.max(sourceWidth, sourceHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap?.close();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    throw new Error("This image could not be prepared. Please try another photo.");
  }
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  bitmap?.close();
  if (objectUrl) URL.revokeObjectURL(objectUrl);

  for (const quality of [0.82, 0.74, 0.66, 0.58]) {
    let blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    if (blob && blob.type !== "image/webp") {
      blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    }
    if (!blob) continue;
    const reader = new FileReader();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("This image could not be read."));
      reader.onerror = () => reject(new Error("This image could not be read."));
      reader.readAsDataURL(blob);
    });
    if (dataUrl.length <= 1_250_000) return dataUrl;
  }
  throw new Error("This photo is still too large after compression. Try a smaller image.");
}

export default function ManagerGalleryEditor() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [category, setCategory] = useState<Category>(categories[0]);
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/manager/gallery", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json() as { photos?: GalleryPhoto[]; error?: string };
        if (!response.ok) throw new Error(result.error || "Gallery photos could not be loaded.");
        if (active) setPhotos(Array.isArray(result.photos) ? result.photos : []);
      })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Gallery photos could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] || null;
    setFile(selected); setPreview(""); setError(""); setMessage("");
    if (!selected) return;
    if (!selected.type.startsWith("image/")) { setFile(null); setError("Choose an image file."); return; }
    try { setPreview(await compressImage(selected)); }
    catch (reason) { setFile(null); setError(reason instanceof Error ? reason.message : "This image could not be prepared."); }
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!preview) { setError("Choose a photo before uploading."); return; }
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/manager/gallery", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category, description, imageData: preview }) });
      const result = await response.json() as { photo?: GalleryPhoto; error?: string };
      if (!response.ok || !result.photo) throw new Error(result.error || "This photo could not be added.");
      setPhotos((current) => [result.photo!, ...current]); setFile(null); setPreview(""); setDescription("");
      const input = document.getElementById("gallery-photo-file") as HTMLInputElement | null;
      if (input) input.value = "";
      setMessage("Photo added to Our Work and is now visible on the public page.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "This photo could not be added."); }
    finally { setSaving(false); }
  }

  async function remove(photo: GalleryPhoto) {
    if (!window.confirm(`Remove this photo from the Our Work page?`)) return;
    setRemovingId(photo.id); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/manager/gallery/${encodeURIComponent(photo.id)}`, { method: "DELETE" });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "This photo could not be removed.");
      setPhotos((current) => current.filter((item) => item.id !== photo.id));
      setMessage("Photo removed from the gallery.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "This photo could not be removed."); }
    finally { setRemovingId(""); }
  }

  return <div style={{ display: "grid", gap: 22, marginTop: 24 }}>
    <section style={{ background: "white", border: "1px solid #e3e9ed", borderRadius: 12, padding: "clamp(18px, 4vw, 28px)" }}>
      <p style={{ margin: "0 0 5px", color: "#16834a", fontSize: 12, fontWeight: 700, letterSpacing: ".08em" }}>OUR WORK · PHOTO MANAGER</p>
      <h2 style={{ margin: "0 0 7px" }}>Add a gallery photo</h2>
      <p style={{ marginTop: 0, color: "#687786" }}>Choose a room, add an optional short description, and upload. The photo will appear on the public Our Work page right away.</p>
      <form onSubmit={(event) => void upload(event)} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,220px),1fr))", alignItems: "end", gap: 14 }}>
        <label style={{ display: "grid", gap: 6, color: "#465766", fontSize: 14, fontWeight: 700 }}>Gallery category<select value={category} onChange={(event) => setCategory(event.target.value as Category)} style={field}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label style={{ display: "grid", gap: 6, color: "#465766", fontSize: 14, fontWeight: 700 }}>Short description (optional)<input value={description} maxLength={180} onChange={(event) => setDescription(event.target.value)} placeholder="Example: A refreshed cooktop detail" style={field} /></label>
        <label style={{ display: "grid", gap: 6, color: "#465766", fontSize: 14, fontWeight: 700 }}>Choose a photo<input id="gallery-photo-file" type="file" accept="image/*" onChange={(event) => void selectFile(event)} style={{ ...field, padding: 8 }} /></label>
        <button type="submit" disabled={saving || !preview} style={{ ...button, opacity: saving || !preview ? .65 : 1 }}>{saving ? "Adding photo…" : "Add to Our Work"}</button>
      </form>
      <p style={{ color: "#687786", fontSize: 13, marginBottom: 0 }}>Photos are automatically resized for the website. Maximum original file size: 20 MB; descriptions up to 180 characters.</p>
      {preview && <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 16 }}><Image src={preview} alt="Selected photo preview" width={600} height={400} unoptimized style={{ width: 112, height: 82, objectFit: "cover", borderRadius: 8 }} /><span style={{ color: "#52616d", fontSize: 14 }}>{file?.name} · {category}</span></div>}
      {message && <p role="status" style={{ padding: 12, borderRadius: 8, color: "#176b40", background: "#e8f5ec", marginBottom: 0 }}>{message}</p>}
      {error && <p role="alert" style={{ padding: 12, borderRadius: 8, color: "#8a3028", background: "#fff0ef", marginBottom: 0 }}>{error}</p>}
    </section>

    <section style={{ background: "white", border: "1px solid #e3e9ed", borderRadius: 12, padding: "clamp(18px, 4vw, 28px)" }}>
      <h2 style={{ margin: "0 0 6px" }}>Uploaded gallery photos</h2>
      <p style={{ marginTop: 0, color: "#687786" }}>These photos are stored with your business records and displayed alongside the existing gallery photos.</p>
      {loading ? <p>Loading photos…</p> : photos.length === 0 ? <p style={{ color: "#687786" }}>No photos uploaded yet. Your existing Our Work gallery remains in place.</p> : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: 14 }}>{photos.map((photo) => <article key={photo.id} style={{ border: "1px solid #e3e9ed", borderRadius: 10, overflow: "hidden" }}><Image src={photo.src} alt={photo.description || `${photo.category} gallery photo`} width={600} height={400} unoptimized style={{ display: "block", width: "100%", height: 150, objectFit: "cover" }} /><div style={{ padding: 12 }}><strong>{photo.category}</strong><p style={{ minHeight: 38, margin: "6px 0 12px", color: "#687786", fontSize: 14 }}>{photo.description || "No description added"}</p><button type="button" disabled={removingId === photo.id} onClick={() => void remove(photo)} style={{ ...button, padding: "8px 11px", fontSize: 13, background: "#fff0ef", color: "#8a3028", opacity: removingId === photo.id ? .6 : 1 }}>{removingId === photo.id ? "Removing…" : "Remove photo"}</button></div></article>)}</div>}
    </section>
  </div>;
}
