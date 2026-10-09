import { useEffect, useRef, useState } from "react";

type NextUpdateCountdownProps = {
  event: string;
  nextUpdate: string;
  onRefresh: () => void;
};

function formatRemaining(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export default function NextUpdateCountdown({
  event,
  nextUpdate,
  onRefresh,
}: NextUpdateCountdownProps) {
  const [now, setNow] = useState(() => Date.now());
  const lastRefreshKey = useRef<string | undefined>(undefined);
  const updateTime = Date.parse(nextUpdate);

  useEffect(() => {
    if (!Number.isFinite(updateTime)) {
      return;
    }

    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [updateTime]);

  useEffect(() => {
    if (!Number.isFinite(updateTime)) {
      return;
    }

    const refreshKey = `${event}:${nextUpdate}`;
    if (lastRefreshKey.current === refreshKey) {
      return;
    }

    const timeout = window.setTimeout(
      () => {
        lastRefreshKey.current = refreshKey;
        onRefresh();
      },
      Math.max(0, updateTime + 3000 - Date.now()),
    );
    return () => window.clearTimeout(timeout);
  }, [event, nextUpdate, onRefresh, updateTime]);

  if (!Number.isFinite(updateTime)) {
    return null;
  }

  const remaining = Math.max(0, updateTime - now);
  const formattedRemaining = formatRemaining(remaining);

  return (
    <p className="overview-next-update" role="timer">
      Next update in {formattedRemaining}
    </p>
  );
}
