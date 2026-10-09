import { Children, cloneElement, isValidElement, useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode, Ref } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

type ExpandableListProps = {
  className: string;
  popupClassName?: string;
  label: string;
  title: string;
  titleId: string;
  headingLevel: "h3" | "h4";
  previewLimit?: number;
  titleAdornment?: ReactNode;
  emptyMessage?: string;
  columns?: number;
  estimatedItemSize?: number;
  itemGap?: number;
  children: ReactNode;
};

type VirtualizedListItemProps = {
  "data-index"?: number;
  "aria-posinset"?: number;
  "aria-setsize"?: number;
  ref?: Ref<HTMLLIElement>;
  style?: CSSProperties;
};

export default function ExpandableList({
  className,
  popupClassName,
  label,
  title,
  titleId,
  headingLevel,
  previewLimit = 6,
  titleAdornment,
  emptyMessage,
  columns = 1,
  estimatedItemSize = 64,
  itemGap = 6,
  children,
}: ExpandableListProps) {
  const [expanded, setExpanded] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(() =>
    columns > 1 && typeof window !== "undefined" && window.innerWidth <= 520
      ? 1
      : columns,
  );
  const items = Children.toArray(children);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const listViewportRef = useRef<HTMLDivElement>(null);
  const Heading = headingLevel;
  const virtualizer = useVirtualizer<HTMLDivElement, HTMLLIElement>({
    count: items.length,
    getScrollElement: () => listViewportRef.current,
    estimateSize: () => estimatedItemSize,
    getItemKey: (index) => {
      const item = items[index];
      return isValidElement(item) && item.key !== null ? item.key : index;
    },
    lanes: visibleColumns,
    gap: itemGap,
    overscan: 6,
  });

  useEffect(() => {
    const updateColumns = () => {
      setVisibleColumns(
        columns > 1 && window.innerWidth <= 520 ? 1 : columns,
      );
    };

    updateColumns();
    window.addEventListener("resize", updateColumns);
    return () => window.removeEventListener("resize", updateColumns);
  }, [columns]);

  useEffect(() => {
    if (!expanded) return;

    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
      trigger?.focus();
    };
  }, [expanded]);

  return (
    <>
      <div className="overview-list-heading">
        <Heading id={titleId}>{title}</Heading>
        {titleAdornment}
        {items.length > previewLimit ? (
          <button
            className="overview-expand-button"
            type="button"
            aria-haspopup="dialog"
            aria-expanded={expanded}
            ref={triggerRef}
            onClick={() => setExpanded(true)}
          >
            Expand
          </button>
        ) : null}
      </div>
      {items.length > 0 ? (
        <ul className={className} aria-label={label}>
          {items.slice(0, previewLimit)}
        </ul>
      ) : emptyMessage ? (
        <p>{emptyMessage}</p>
      ) : null}
      {items.length > previewLimit && expanded ? (
        <div
          className="overview-popup-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) setExpanded(false);
          }}
        >
          <div
            className="overview-popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${titleId}-popup-title`}
            tabIndex={-1}
            onKeyDown={(event) => {
              if (event.key === "Tab") {
                const first = closeRef.current;
                const last = listViewportRef.current;
                if (event.shiftKey && document.activeElement === first) {
                  event.preventDefault();
                  last?.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                  event.preventDefault();
                  first?.focus();
                }
              }
            }}
          >
            <div className="overview-popup__heading">
              <h3 id={`${titleId}-popup-title`}>{title}</h3>
              <button
                ref={closeRef}
                className="overview-popup__close"
                type="button"
                aria-label="Close"
                onClick={() => setExpanded(false)}
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <div
              className="overview-popup__list-viewport"
              ref={listViewportRef}
              role="region"
              aria-label={`${title} list`}
              tabIndex={0}
            >
              <ul
                className={popupClassName ?? className}
                aria-label={`${label} all`}
                style={{
                  height: virtualizer.getTotalSize(),
                  position: "relative",
                }}
              >
                {virtualizer.getVirtualItems().map((virtualItem) => {
                  const item = items[virtualItem.index];
                  if (!isValidElement<VirtualizedListItemProps & { children?: ReactNode }>(item)) {
                    return null;
                  }
                  const columnWidth = visibleColumns === 1
                    ? "100%"
                    : `calc((100% - ${(visibleColumns - 1) * 0.55}rem) / ${visibleColumns})`;
                  const left = visibleColumns === 1 || virtualItem.lane === 0
                    ? "0"
                    : `calc(${(virtualItem.lane * 100) / visibleColumns}% + ${virtualItem.lane * 0.275}rem)`;
                  return cloneElement(item, {
                    "data-index": virtualItem.index,
                    "aria-posinset": virtualItem.index + 1,
                    "aria-setsize": items.length,
                    ref: virtualizer.measureElement,
                    style: {
                      ...item.props.style,
                      position: "absolute",
                      top: 0,
                      left,
                      width: columnWidth,
                      transform: `translateY(${virtualItem.start}px)`,
                    },
                  });
                })}
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
