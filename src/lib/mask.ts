export function maskEmail(email = ""): string {
  const trimmed = email.trim();
  const [name, domain] = trimmed.split("@");
  if (!name || !domain) return "Email not added";
  const visible = name.slice(-3);
  return `${"x".repeat(Math.max(4, name.length - visible.length))}${visible}@${domain}`;
}

export function maskMobile(mobile = ""): string {
  const clean = mobile.replace(/\D/g, "");
  if (!clean) return "Mobile not added";
  return `${"x".repeat(Math.max(6, clean.length - 4))}${clean.slice(-4)}`;
}

export function maskAddress(value = ""): string {
  const text = value.trim();
  if (text.length <= 10) return text || "Not added";
  return `${text.slice(0, 5)}...${text.slice(-5)}`;
}

export function maskAadhaar(value = ""): string {
  const clean = value.replace(/\D/g, "");
  if (!clean) return "Not added";
  return `XXXX-XXXX-${clean.slice(-4)}`;
}

export function maskPan(value = ""): string {
  const text = value.trim().toUpperCase();
  if (!text) return "Not added";
  if (text.length < 10) return maskAddress(text);
  return `${text.slice(0, 5)}****${text.slice(-1)}`;
}
