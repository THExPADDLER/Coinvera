import { useEffect, useRef, useState } from "react";
import { Crop, X } from "lucide-react";

interface ImageCropModalProps {
  file: File;
  onCancel: () => void;
  onSave: (dataUrl: string) => void;
}

export function ImageCropModal({ file, onCancel, onSave }: ImageCropModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [source, setSource] = useState("");
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = () => setSource(String(reader.result || ""));
    reader.readAsDataURL(file);
  }, [file]);

  useEffect(() => {
    if (!source) return;
    const image = new Image();
    image.onload = () => {
      imageRef.current = image;
      drawCrop();
    };
    image.src = source;
  }, [source]);

  useEffect(() => {
    drawCrop();
  }, [zoom, offsetX, offsetY]);

  function drawCrop() {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const size = canvas.width;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    const scale = Math.max(size / image.width, size / image.height) * zoom;
    const width = image.width * scale;
    const height = image.height * scale;
    const x = (size - width) / 2 + offsetX;
    const y = (size - height) / 2 + offsetY;
    ctx.drawImage(image, x, y, width, height);
  }

  function save() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSave(canvas.toDataURL("image/png"));
  }

  return (
    <div className="modalBackdrop" role="dialog" aria-modal="true" aria-label="Crop QR image">
      <div className="cropModal">
        <div className="paymentHeader">
          <h2>Adjust QR image</h2>
          <button type="button" onClick={onCancel} aria-label="Close crop">
            <X size={18} />
          </button>
        </div>
        <canvas className="cropCanvas" width="420" height="420" ref={canvasRef} />
        <div className="cropControls">
          <label>
            Zoom
            <input type="range" min="1" max="3" step="0.05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
          </label>
          <label>
            Move X
            <input type="range" min="-180" max="180" step="1" value={offsetX} onChange={(event) => setOffsetX(Number(event.target.value))} />
          </label>
          <label>
            Move Y
            <input type="range" min="-180" max="180" step="1" value={offsetY} onChange={(event) => setOffsetY(Number(event.target.value))} />
          </label>
        </div>
        <button className="primaryButton" type="button" onClick={save}>
          <Crop size={18} />
          Save cropped QR
        </button>
      </div>
    </div>
  );
}
