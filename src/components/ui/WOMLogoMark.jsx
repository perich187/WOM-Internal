/**
 * WOM Logo component.
 *
 * variant="icon"  — circular icon only  (wom-icon.png)
 * variant="full"  — icon + "WORD OF MOUTH" wordmark (wom-logo.png)
 *
 * white prop — applies CSS filter to flip the navy logo to white,
 * for use on dark/navy backgrounds (e.g. the sidebar).
 */
export default function WOMLogoMark({ variant = 'icon', height = 36, white = false, className = '' }) {
  const src   = variant === 'full' ? '/wom-logo.png' : '/wom-icon.png'
  const style = white ? { filter: 'brightness(0) invert(1)', height } : { height }

  return (
    <img
      src={src}
      alt="Word of Mouth"
      style={style}
      className={`object-contain select-none flex-shrink-0 ${className}`}
      draggable={false}
    />
  )
}
