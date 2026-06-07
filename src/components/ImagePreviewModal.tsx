import { X } from "lucide-react";

interface ImagePreviewModalProps {
  alt: string;
  src: string;
  onClose: () => void;
}

export function ImagePreviewModal({ alt, onClose, src }: ImagePreviewModalProps) {
  return (
    <div className="modalBackdrop" role="dialog" aria-modal="true" aria-label={alt}>
      <div className="imagePreviewModal">
        <button className="closeButton" type="button" onClick={onClose} aria-label="Close image preview">
          <X size={19} />
        </button>
        <img src={src} alt={alt} />
      </div>
    </div>
  );
}
