import { config } from "../../../lib/config";

interface SupportCardImageProps {
  cardId: number;
  variant?: "full" | "icon";
  className?: string;
  alt?: string;
  loading?: "eager" | "lazy";
}

export default function SupportCardImage({
  cardId,
  variant = "full",
  className,
  alt,
  loading,
}: SupportCardImageProps) {
  return (
    <img
      className={className}
      src={`${config.r2BaseUrl}/images/support_cards/${variant}/${cardId}.png`}
      alt={alt ?? `Support card ${cardId}`}
      loading={loading}
    />
  );
}
