/**
 * WOM branded logo mark — gold rounded square with bold "WOM" wordmark.
 * Use size prop to scale uniformly.
 */
export default function WOMLogoMark({ size = 36, className = '' }) {
  const radius = Math.round(size * 0.28)
  const fontSize = Math.round(size * 0.3)

  return (
    <div
      className={`flex-shrink-0 flex items-center justify-center select-none ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: '#F0A629',
      }}
    >
      <span
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: fontSize,
          color: '#092137',
          letterSpacing: '-0.5px',
          lineHeight: 1,
        }}
      >
        WOM
      </span>
    </div>
  )
}
