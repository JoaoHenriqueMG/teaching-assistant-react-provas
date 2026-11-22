import React from 'react';

interface SheetIconProps {
  size?: number;
}

/** A small green spreadsheet: a page with a white grid on it. */
const SheetIcon: React.FC<SheetIconProps> = ({ size = 20 }) => (
  <svg
    className="sheet-icon"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
    <rect x="4" y="2" width="16" height="20" rx="2" fill="#1d8348" />
    <rect x="7" y="7" width="10" height="11" rx="0.5" fill="#ffffff" />
    <path d="M7 10.67h10M7 14.33h10M11 7v11" stroke="#1d8348" strokeWidth="1" fill="none" />
  </svg>
);

export default SheetIcon;