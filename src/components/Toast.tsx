import { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  onDone: () => void;
}

export function Toast({ message, onDone }: ToastProps) {
  const [visible, setVisible] = useState(Boolean(message));

  useEffect(() => {
    if (!message) return;
    setVisible(true);
    const hide = window.setTimeout(() => setVisible(false), 2400);
    const clear = window.setTimeout(onDone, 2750);
    return () => {
      window.clearTimeout(hide);
      window.clearTimeout(clear);
    };
  }, [message, onDone]);

  return (
    <div className={`toast ${visible ? "show" : ""}`} role="status" aria-live="polite">
      {message}
    </div>
  );
}
