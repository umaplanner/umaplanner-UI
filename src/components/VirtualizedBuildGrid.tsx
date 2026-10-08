import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Key, ReactNode } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";

const OVERSCAN_BUILD_COUNT = 20;
const ESTIMATED_ROW_HEIGHT = 320;

function getColumnCount(): number {
  if (typeof window === "undefined") return 3;
  if (window.innerWidth <= 520) return 1;
  if (window.innerWidth <= 800) return 2;
  return 3;
}

interface VirtualizedBuildGridProps<T> {
  items: readonly T[];
  getKey: (item: T, index: number) => Key;
  renderItem: (item: T, index: number) => ReactNode;
  resetKey?: string | number | null;
}

export default function VirtualizedBuildGrid<T>({
  items,
  getKey,
  renderItem,
  resetKey,
}: VirtualizedBuildGridProps<T>) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(getColumnCount);
  const [scrollMargin, setScrollMargin] = useState(0);
  const rowCount = Math.ceil(items.length / columns);
  const virtualizer = useWindowVirtualizer<HTMLDivElement>({
    count: rowCount,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: Math.ceil(OVERSCAN_BUILD_COUNT / columns),
    scrollMargin,
  });

  useEffect(() => {
    const updateColumns = () => setColumns(getColumnCount());
    window.addEventListener("resize", updateColumns);
    return () => window.removeEventListener("resize", updateColumns);
  }, []);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (grid) {
      setScrollMargin(grid.getBoundingClientRect().top + window.scrollY);
    }
    virtualizer.measure();
  }, [columns, items, resetKey, virtualizer]);

  useEffect(() => {
    if (resetKey !== undefined && window.scrollY > scrollMargin) {
      virtualizer.scrollToIndex(0, { align: "start" });
    }
  }, [resetKey, scrollMargin, virtualizer]);

  return (
    <div
      ref={gridRef}
      className="virtualized-build-grid"
      style={{
        position: "relative",
        height: virtualizer.getTotalSize(),
        width: "100%",
      }}
    >
      {virtualizer.getVirtualItems().map((virtualRow) => {
        const rowStart = virtualRow.index * columns;
        const rowItems = items.slice(rowStart, rowStart + columns);

        return (
          <div
            key={virtualRow.key}
            ref={virtualizer.measureElement}
            data-index={virtualRow.index}
            className="builds-grid"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              transform: `translateY(${virtualRow.start - scrollMargin}px)`,
            }}
          >
            {rowItems.map((item, index) => (
              <div key={getKey(item, rowStart + index)}>
                {renderItem(item, rowStart + index)}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
