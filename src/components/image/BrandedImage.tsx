import { forwardRef } from "react";
import type { ReactNode } from "react";
import "../../styles/UmaBuildImage.css";

interface BrandedImageProps {
  event: string;
  width: number;
  className?: string;
  children: ReactNode;
}

const BrandedImage = forwardRef<HTMLElement, BrandedImageProps>(
  function BrandedImage({ event, width, className = "", children }, ref) {
    return (
      <article
        className={`result-image${className ? ` ${className}` : ""}`}
        ref={ref}
        style={{ width: `${width}px` }}
      >
        <header className="result-image__brand">
          <strong><img src="/fazed.webp" alt="" /> Umaplanner.app</strong>
          <span className="result-image__event">{event}</span>
        </header>
        {children}
      </article>
    );
  },
);

export default BrandedImage;
