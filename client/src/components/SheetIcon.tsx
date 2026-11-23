import React from 'react';

interface SheetIconProps {
  size?: number;
  /** 'mono' draws an outline in the current text colour, for use on coloured buttons. */
  variant?: 'color' | 'mono';
}

/** A small spreadsheet: a page with a grid on it. Green, or an outline in the text colour. */
const SheetIcon: React.FC<SheetIconProps> = ({ size = 20, variant = 'color' }) => (
  <svg
    className="sheet-icon"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
    {variant === 'mono' ? (
      <g fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="4.5" y="2.5" width="15" height="19" rx="2" />
        <path d="M7.5 9h9M7.5 12.5h9M7.5 16h9M11.5 9v9" />
      </g>
    ) : (
      <>
        <rect x="4" y="2" width="16" height="20" rx="2" fill="#1d8348" />
        <rect x="7" y="7" width="10" height="11" rx="0.5" fill="#ffffff" />
        <path d="M7 10.67h10M7 14.33h10M11 7v11" stroke="#1d8348" strokeWidth="1" fill="none" />
      </>
    )}
  </svg>
);

export default SheetIcon;
