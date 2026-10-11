import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toBlob } from "html-to-image";
import { copyElementAsPng } from "../../src/lib/copyElementAsPng";

vi.mock("html-to-image", () => ({ toBlob: vi.fn() }));

const originalClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");
const originalClipboardItem = Object.getOwnPropertyDescriptor(window, "ClipboardItem");

beforeEach(() => {
  class TestClipboardItem {
    constructor(_data: Record<string, Blob | Promise<Blob>>) {}
  }
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { write: vi.fn().mockResolvedValue(undefined) },
  });
  Object.defineProperty(window, "ClipboardItem", {
    configurable: true,
    value: TestClipboardItem,
  });
  vi.mocked(toBlob).mockResolvedValue(new Blob(["image"], { type: "image/png" }));
});

afterEach(() => {
  if (originalClipboard) {
    Object.defineProperty(navigator, "clipboard", originalClipboard);
  } else {
    Reflect.deleteProperty(navigator, "clipboard");
  }
  if (originalClipboardItem) {
    Object.defineProperty(window, "ClipboardItem", originalClipboardItem);
  } else {
    Reflect.deleteProperty(window, "ClipboardItem");
  }
  vi.mocked(toBlob).mockReset();
});

describe("copyElementAsPng", () => {
  it("bypasses cached remote images while rendering", async () => {
    const node = document.createElement("div");

    await copyElementAsPng(node, "image.png");

    expect(toBlob).toHaveBeenCalledWith(node, { pixelRatio: 2, cacheBust: true });
  });
});
