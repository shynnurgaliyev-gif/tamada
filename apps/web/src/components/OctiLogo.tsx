/**
 * Octiqa brand mark — rounded square + minimalist octopus imprint.
 * Self-contained: no CSS class dependencies.
 */

export function OctiMark({ size = 32 }: { size?: number }) {
  const svgSize = Math.round(size * 0.64);
  return (
    <span style={{
      width: size,
      height: size,
      borderRadius: Math.round(size * 0.28),
      background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      boxShadow: '0 4px 16px rgba(109,40,217,.28)',
    }}>
      <svg width={svgSize} height={svgSize} viewBox="0 0 100 100" fill="none">
        {/* 8 curved arms — clockwise curl, organic feel */}
        <path d="M61,50 Q76,44 90,50"         stroke="white" strokeWidth="6.5" strokeLinecap="round"/>
        <path d="M57.8,57.8 Q72.2,63.8 78.3,78.3" stroke="white" strokeWidth="6.5" strokeLinecap="round"/>
        <path d="M50,61 Q56,75.5 50,90"        stroke="white" strokeWidth="6.5" strokeLinecap="round"/>
        <path d="M42.2,57.8 Q36.2,72.2 21.7,78.3" stroke="white" strokeWidth="6.5" strokeLinecap="round"/>
        <path d="M39,50 Q24.5,56 10,50"        stroke="white" strokeWidth="6.5" strokeLinecap="round"/>
        <path d="M42.2,42.2 Q27.8,36.2 21.7,21.7" stroke="white" strokeWidth="6.5" strokeLinecap="round"/>
        <path d="M50,39 Q44,24.5 50,10"        stroke="white" strokeWidth="6.5" strokeLinecap="round"/>
        <path d="M57.8,42.2 Q63.8,27.8 78.3,21.7" stroke="white" strokeWidth="6.5" strokeLinecap="round"/>
        {/* Body */}
        <circle cx="50" cy="50" r="14" fill="white"/>
      </svg>
    </span>
  );
}
