import { toBlob } from "html-to-image";

export type ImageCopyResult = "copied" | "downloaded" | "fallback-download";

export async function copyElementAsPng(
  node: HTMLElement,
  filename: string,
): Promise<ImageCopyResult> {
  const image = toBlob(node, { pixelRatio: 2 }).then((blob) => {
    if (!blob) throw new Error("The browser could not render the image.");
    return blob;
  });
  const canCopyToClipboard =
    typeof navigator.clipboard?.write === "function" &&
    typeof ClipboardItem !== "undefined";

  if (canCopyToClipboard) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": image }),
      ]);
      return "copied";
    } catch {
      downloadImage(await image, filename);
      return "fallback-download";
    }
  }

  downloadImage(await image, filename);
  return "downloaded";
}

function downloadImage(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
