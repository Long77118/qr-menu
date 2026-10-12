import React from 'react';
import { CategoryCardTheme, hashString } from '../constants/theme';

interface GeometricCardBackgroundProps {
  theme: CategoryCardTheme;
  itemId: string;
  className?: string;
}

export const GeometricCardBackground: React.FC<GeometricCardBackgroundProps> = ({
  theme,
  itemId,
  className = '',
}) => {
  // 3 distinct, controlled geometric compositions so cards within the same category don't look clones
  const variant = hashString(itemId) % 3;

  return (
    <div
      className={`absolute inset-0 w-full h-full overflow-hidden select-none pointer-events-none ${className}`}
      style={{ backgroundColor: theme.bgHex }}
    >
      {variant === 0 && (
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 300 220"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Large soft arch sweeping from bottom-left */}
          <path
            d="M-20 240 C-20 100 80 40 200 40 C280 40 320 80 340 120 L340 240 Z"
            fill={theme.shape1Hex}
            opacity="0.9"
          />
          {/* Cut disc on top-right below price badge */}
          <circle cx="250" cy="50" r="65" fill={theme.shape2Hex} opacity="0.6" />
          {/* Subtle playful dot badge */}
          <circle cx="90" cy="80" r="14" fill="#FFFFFF" opacity="0.3" />
        </svg>
      )}

      {variant === 1 && (
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 300 220"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Bold circular plane on center-right */}
          <circle cx="180" cy="110" r="110" fill={theme.shape1Hex} opacity="0.85" />
          {/* Organic floating pill */}
          <rect
            x="20"
            y="25"
            width="140"
            height="50"
            rx="25"
            fill={theme.shape2Hex}
            opacity="0.65"
            transform="rotate(-8 20 25)"
          />
          {/* Small accent circle */}
          <circle cx="250" cy="160" r="28" fill="#FFFFFF" opacity="0.25" />
        </svg>
      )}

      {variant === 2 && (
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 300 220"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Diagonal sweeping graphic wave */}
          <path
            d="M-40 80 Q120 170 340 50 L340 240 L-40 240 Z"
            fill={theme.shape1Hex}
            opacity="0.85"
          />
          {/* Angled squircle */}
          <rect
            x="130"
            y="-30"
            width="120"
            height="120"
            rx="36"
            fill={theme.shape2Hex}
            opacity="0.65"
            transform="rotate(18 190 30)"
          />
          {/* Modern accent ring */}
          <circle
            cx="70"
            cy="60"
            r="32"
            stroke="#FFFFFF"
            strokeWidth="8"
            opacity="0.35"
          />
        </svg>
      )}
    </div>
  );
};
