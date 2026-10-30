"use client";

import { useId, useState } from "react";

export type UploadedImage = { url: string; publicId: string };

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_BYTES = 10 * 1024 * 1024;

type SignResponse = { cloudName: string; apiKey: string; timestamp: number; folder: string; signature: string; error?: string };

function uploadWithProgress(file: File, sign: SignResponse, onProgress: (percent: number) => void): Promise<UploadedImage> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    form.append("api_key", sign.apiKey);
    form.append("timestamp", String(sign.timestamp));
    form.append("folder", sign.folder);
    form.append("signature", sign.signature);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = () => reject(new Error("The upload could not reach Cloudinary. Check your connection and try again."));
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText) as { secure_url?: string; public_id?: string; error?: { message?: string } };
        if (xhr.status >= 200 && xhr.status < 300 && data.secure_url && data.public_id) {
          resolve({ url: data.secure_url, publicId: data.public_id });
        } else {
          reject(new Error(data.error?.message ?? "Cloudinary rejected the upload."));
        }
      } catch {
        reject(new Error("Unexpected response from Cloudinary."));
      }
    };
    xhr.send(form);
  });
}

type ImageUploaderProps = {
  onUploaded: (image: UploadedImage) => void;
  label?: string;
  disabled?: boolean;
};

/** Signed direct upload to Cloudinary. The API secret never reaches the browser. */
export default function ImageUploader({ onUploaded, label = "Upload image", disabled = false }: ImageUploaderProps) {
  const inputId = useId();
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function handleFile(file: File) {
    setError("");
    if (!ACCEPTED.includes(file.type)) {
      setError("Please choose a JPEG, PNG, WebP or AVIF image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("That image is larger than 10 MB. Please choose a smaller file.");
      return;
    }
    setProgress(0);
    try {
      const res = await fetch("/api/admin/cloudinary/sign", { method: "POST" });
      const sign = (await res.json()) as SignResponse;
      if (!res.ok) throw new Error(sign.error ?? "Could not start the upload.");
      const uploaded = await uploadWithProgress(file, sign, setProgress);
      onUploaded(uploaded);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The upload failed.");
    } finally {
      setProgress(null);
    }
  }

  const busy = progress !== null;
  return (
    <div className="admin-upload">
      <label className={`btn btn--outline btn--sm admin-upload__btn${busy || disabled ? " is-disabled" : ""}`} htmlFor={inputId}>
        {busy ? `Uploading… ${progress}%` : label}
      </label>
      <input
        id={inputId}
        className="admin-upload__input"
        type="file"
        accept={ACCEPTED.join(",")}
        disabled={busy || disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void handleFile(file);
        }}
      />
      {busy ? (
        <div className="admin-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress ?? 0} aria-label="Upload progress">
          <span style={{ width: `${progress}%` }} />
        </div>
      ) : null}
      {error ? <p className="admin-error" role="alert">{error}</p> : null}
    </div>
  );
}
