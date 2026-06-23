import QRCode from "qrcode";

/** PNG data URL — convenient for <img src>. */
export async function qrPngDataUrl(
  text: string,
  opts?: { width?: number; margin?: number; dark?: string }
): Promise<string> {
  return QRCode.toDataURL(text, {
    width: opts?.width ?? 512,
    margin: opts?.margin ?? 2,
    color: { dark: opts?.dark ?? "#000000", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });
}

/** Inline SVG string — crisp at any print size. */
export async function qrSvg(
  text: string,
  opts?: { margin?: number; dark?: string }
): Promise<string> {
  return QRCode.toString(text, {
    type: "svg",
    margin: opts?.margin ?? 1,
    color: { dark: opts?.dark ?? "#000000", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });
}
