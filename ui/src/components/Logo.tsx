/** The Relay mark: a leaf that is also an arrowhead, moving.
 *
 * Authored as SVG rather than a raster so it stays crisp from 16px favicon to
 * billboard, inherits `currentColor`, and needs no separate light/dark asset.
 */
export function Logo({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label="Relay"
    >
      <path d="M3 22.5 h5.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" opacity=".5" />
      <path d="M5.5 27.5 h6" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" opacity=".78" />
      <path d="M27 5 C 27 15.8 20.6 23 9.2 24.3 C 9.2 13.5 15.6 6.3 27 5 Z" fill="currentColor" />
      <path d="M12.6 21 L 23.4 9.6" stroke="#d8f34b" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
