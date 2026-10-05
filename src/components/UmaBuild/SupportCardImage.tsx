import type { SupportCardBuild } from "../../types/UmaBuild";
import { config } from "../../lib/config";

interface SupportCardImageProps {
  card: SupportCardBuild;
  className?: string;
}

export default function SupportCardImage({ card, className }: SupportCardImageProps) {
  return (
    <img
      className={className}
      src={`${config.r2BaseUrl}/images/support_cards/full/${card.support_card_id}.png`}
      alt={`Support card ${card.support_card_id}`}
    />
  );
}
