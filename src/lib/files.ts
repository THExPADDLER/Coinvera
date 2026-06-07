export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

interface CompressOptions {
  maxBytes?: number;
  maxDimension?: number;
  quality?: number;
}

const defaultMaxBytes = 650 * 1024;

export async function imageFileToCompressedDataUrl(file: File, options: CompressOptions = {}): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files can be uploaded.");
  }

  const maxBytes = options.maxBytes ?? defaultMaxBytes;
  const maxDimension = options.maxDimension ?? 1200;
  const quality = options.quality ?? 0.78;
  const source = await fileToDataUrl(file);
  const image = await loadImage(source);
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image compression is not available in this browser.");
  context.drawImage(image, 0, 0, width, height);

  let nextQuality = quality;
  let output = canvas.toDataURL("image/jpeg", nextQuality);
  while (dataUrlBytes(output) > maxBytes && nextQuality > 0.42) {
    nextQuality -= 0.08;
    output = canvas.toDataURL("image/jpeg", nextQuality);
  }

  if (dataUrlBytes(output) > maxBytes) {
    throw new Error("Image is too large. Please upload a clearer smaller screenshot.");
  }

  return output;
}

export function isImageData(value?: string): boolean {
  return Boolean(value?.startsWith("data:image/"));
}

export function dataUrlBytes(value: string): number {
  const base64 = value.split(",")[1] || "";
  return Math.ceil((base64.length * 3) / 4);
}

export function imageSizeLabel(value?: string): string {
  if (!value || !isImageData(value)) return "";
  const kb = dataUrlBytes(value) / 1024;
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(kb))} KB`;
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read this image."));
    image.src = source;
  });
}
