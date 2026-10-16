import React from 'react';

/** Decorative line work; separate from each shop's logo and product imagery. */
export function MenuBotanical({ className = '' }: { className?: string }) {
  return <svg className={`menu-botanical ${className}`} viewBox="0 0 180 220" fill="none" aria-hidden="true" focusable="false">
    <g stroke="currentColor" strokeWidth=".8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M24 210C72 173 104 107 124 20M58 178C47 147 36 123 18 111C52 115 75 134 74 151M77 145C100 130 131 127 156 133C126 156 104 163 77 145M92 112C61 102 45 82 41 61C76 72 94 92 92 112M108 79C129 61 150 53 171 57C151 80 132 89 108 79M119 39C106 24 99 10 104 2C123 13 130 22 119 39" />
      <path d="M58 178L18 111M77 145L156 133M92 112L41 61M108 79L171 57M119 39L104 2M31 205C28 178 16 160 4 153C26 156 41 171 44 189M31 205L4 153M52 184C78 181 96 185 106 195C79 202 64 200 52 184M52 184L106 195" />
      <path d="M53 145C52 134 48 126 40 121M57 147C59 135 63 130 66 129M113 140C125 137 135 137 142 139M69 86C70 96 78 103 84 106M70 86C60 81 50 77 47 72M132 73C141 71 153 64 159 61" />
    </g>
  </svg>;
}
