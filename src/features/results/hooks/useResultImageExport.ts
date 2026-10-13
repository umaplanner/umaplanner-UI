import { useEffect, useRef, useState } from "react";
import type { TeamRaceResultRow } from "../domain/resultsTypes";
import { copyElementAsPng } from "../../../lib/copyElementAsPng";

type CopyTarget = "summary" | { row: TeamRaceResultRow };

export function useResultImageExport(event: string) {
  const [isCopyingImage, setIsCopyingImage] = useState(false);
  const [summaryCopyStatus, setSummaryCopyStatus] = useState("");
  const [dayCopyStatus, setDayCopyStatus] = useState<{
    row: TeamRaceResultRow;
    message: string;
  } | null>(null);
  const fullImageRef = useRef<HTMLElement | null>(null);
  const roundsImageRef = useRef<HTMLElement | null>(null);
  const dayImageRefs = useRef(new Map<TeamRaceResultRow, HTMLElement>());
  const summaryStatusTimeout = useRef<number | null>(null);
  const dayStatusTimeout = useRef<number | null>(null);

  useEffect(() => () => {
    if (summaryStatusTimeout.current !== null) window.clearTimeout(summaryStatusTimeout.current);
    if (dayStatusTimeout.current !== null) window.clearTimeout(dayStatusTimeout.current);
  }, []);

  function showCopyStatus(target: CopyTarget, message: string) {
    if (target === "summary") {
      if (summaryStatusTimeout.current !== null) window.clearTimeout(summaryStatusTimeout.current);

      setSummaryCopyStatus(message);
      summaryStatusTimeout.current = window.setTimeout(() => {
        setSummaryCopyStatus("");
        summaryStatusTimeout.current = null;
      }, 5000);
      return;
    }
    if (dayStatusTimeout.current !== null) window.clearTimeout(dayStatusTimeout.current);

    setDayCopyStatus({ row: target.row, message });
    dayStatusTimeout.current = window.setTimeout(() => {
      setDayCopyStatus(null);
      dayStatusTimeout.current = null;
    }, 5000);
  }

  function clearCopyStatus(target: CopyTarget) {
    if (target === "summary") {
      if (summaryStatusTimeout.current !== null) {
        window.clearTimeout(summaryStatusTimeout.current);
        summaryStatusTimeout.current = null;
      }
      setSummaryCopyStatus("");
      return;
    }
    if (dayStatusTimeout.current !== null) {
      window.clearTimeout(dayStatusTimeout.current);
      dayStatusTimeout.current = null;
    }
    setDayCopyStatus(null);
  }

  async function copyImage(
    node: HTMLElement | null,
    filename: string,
    target: CopyTarget,
  ) {
    if (!node || isCopyingImage) return;

    setIsCopyingImage(true);
    clearCopyStatus(target);

    try {
      const result = await copyElementAsPng(node, filename);
      showCopyStatus(target, result === "copied"
        ? "Image copied to clipboard."
        : result === "fallback-download"
          ? "Clipboard unavailable; PNG downloaded instead."
          : "PNG downloaded.");
    } catch (error) {
      showCopyStatus(
        target,
        `Could not create the image: ${error instanceof Error ? error.message : "Unknown error."}`,
      );
    } finally {
      setIsCopyingImage(false);
    }
  }

  const eventFileName = event.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "results";

  return {
    isCopyingImage,
    summaryCopyStatus,
    dayCopyStatus,
    fullImageRef,
    roundsImageRef,
    dayImageRefs,
    eventFileName,
    copyImage,
  };
}
