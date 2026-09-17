import type { UmaEntry } from "../types/UmaEntry";

interface UmaImageProps {
  uma: UmaEntry;
  className?: string;
  alt: string;
  lazy?: boolean;
}

export default function UmaImage({
  uma,
  className,
  alt,
  lazy = false,
}: UmaImageProps) {
  const imagePath = `${import.meta.env.VITE_R2_BASE_URL}/images/characters/thumb/${uma.id}`;

  return (
    <img
      className={className}
      src={`${imagePath}.webp`}
      alt={alt}
      loading={lazy ? "lazy" : "eager"}
      onError={(event) => {
        event.currentTarget.onerror = null;
        event.currentTarget.src = `${imagePath}.png`;
      }}
    />
  );
}
