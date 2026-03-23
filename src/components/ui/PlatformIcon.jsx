import { cn } from '@/lib/utils'

// SVG platform icons inline — avoids external dependency

function InstagramIcon({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="ig-grad" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#f09433" />
          <stop offset="25%" stopColor="#e6683c" />
          <stop offset="50%" stopColor="#dc2743" />
          <stop offset="75%" stopColor="#cc2366" />
          <stop offset="100%" stopColor="#bc1888" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill="url(#ig-grad)" />
      <circle cx="12" cy="12" r="4" stroke="white" strokeWidth="1.8" fill="none" />
      <circle cx="17" cy="7" r="1.2" fill="white" />
    </svg>
  )
}

function FacebookIcon({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect width="24" height="24" rx="6" fill="#1877F2" />
      <path d="M15 8h-2a1 1 0 0 0-1 1v2h3l-.5 3H12v7h-3v-7H7v-3h2V9a4 4 0 0 1 4-4h2v3z" fill="white" />
    </svg>
  )
}

function TikTokIcon({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect width="24" height="24" rx="6" fill="#010101" />
      <path d="M19 7.5c-1.3 0-2.4-.9-2.7-2.1H13.5v9.6c0 1-.8 1.8-1.8 1.8s-1.8-.8-1.8-1.8.8-1.8 1.8-1.8c.2 0 .4 0 .5.1V10c-.2 0-.4-.1-.5-.1-2.7 0-4.8 2.1-4.8 4.8s2.1 4.8 4.8 4.8 4.8-2.1 4.8-4.8V9.3c.9.6 1.9.9 3 .9V7c-.1.5-.3.5-.5.5z" fill="white" />
    </svg>
  )
}

function LinkedInIcon({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect width="24" height="24" rx="6" fill="#0A66C2" />
      <path d="M7 9h2v8H7V9zm1-3.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zM11 9h2v1.1c.3-.6 1.1-1.3 2.2-1.3 2.3 0 2.8 1.5 2.8 3.4V17h-2v-4.4c0-.9 0-2-1.2-2s-1.4 1-1.4 1.9V17h-2V9z" fill="white" />
    </svg>
  )
}

function TwitterIcon({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect width="24" height="24" rx="6" fill="#000" />
      <path d="M13.4 11.1L18.3 5.5h-1.2l-4.2 4.9-3.3-4.9H6l5.1 7.5-5.2 6h1.2l4.5-5.2 3.6 5.2H19l-5.6-8.4zm-1.6 1.8l-.5-.7-4-5.7h1.7l3.2 4.6.5.7 4.2 6h-1.7l-3.4-4.9z" fill="white" />
    </svg>
  )
}

function PinterestIcon({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect width="24" height="24" rx="6" fill="#E60023" />
      <path d="M12 4C7.6 4 4 7.6 4 12c0 3.4 2.1 6.4 5.1 7.7-.1-.6-.2-1.6 0-2.3l1-4.3s-.3-.6-.3-1.4c0-1.3.8-2.3 1.7-2.3.8 0 1.2.6 1.2 1.4 0 .8-.5 2.1-.8 3.2-.2.9.5 1.7 1.4 1.7 1.7 0 3-1.8 3-4.4 0-2.3-1.7-3.9-4-3.9-2.7 0-4.3 2-4.3 4.1 0 .8.3 1.6.7 2.1.1.1.1.2.1.3l-.3 1.2c0 .1-.2.2-.3.1C7.5 16.5 7 14.9 7 13.1c0-2.9 2.1-5.5 6-5.5 3.2 0 5.6 2.2 5.6 5.2 0 3.1-2 5.6-4.7 5.6-.9 0-1.8-.5-2.1-1l-.6 2.2c-.2.8-.7 1.8-1.1 2.4.8.3 1.7.4 2.6.4 4.4 0 8-3.6 8-8S16.4 4 12 4z" fill="white" />
    </svg>
  )
}

function YouTubeIcon({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect width="24" height="24" rx="6" fill="#FF0000" />
      <path d="M19.6 8.2c-.2-.8-.8-1.4-1.6-1.6C16.6 6.4 12 6.4 12 6.4s-4.6 0-6 .2c-.8.2-1.4.8-1.6 1.6C4.2 9.6 4.2 12 4.2 12s0 2.4.2 3.8c.2.8.8 1.4 1.6 1.6 1.4.2 6 .2 6 .2s4.6 0 6-.2c.8-.2 1.4-.8 1.6-1.6.2-1.4.2-3.8.2-3.8s0-2.4-.2-3.8zM10.4 14.4V9.6l4 2.4-4 2.4z" fill="white" />
    </svg>
  )
}

function GoogleIcon({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect width="24" height="24" rx="6" fill="#4285F4" />
      <path d="M12 11v2.4h3.3c-.4 1.6-1.7 2.6-3.3 2.6-2 0-3.6-1.6-3.6-3.6s1.6-3.6 3.6-3.6c.9 0 1.7.3 2.3.9l1.7-1.7C14.8 7.4 13.5 7 12 7c-3.3 0-6 2.7-6 6s2.7 6 6 6c3.5 0 5.8-2.4 5.8-5.9 0-.4 0-.7-.1-1H12z" fill="white" />
    </svg>
  )
}

const ICON_MAP = {
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  tiktok: TikTokIcon,
  linkedin: LinkedInIcon,
  twitter: TwitterIcon,
  pinterest: PinterestIcon,
  youtube: YouTubeIcon,
  google: GoogleIcon,
}

export default function PlatformIcon({ platform, size = 24, className }) {
  const Icon = ICON_MAP[platform]
  if (!Icon) return null
  return (
    <span className={cn('inline-flex', className)} title={platform}>
      <Icon size={size} />
    </span>
  )
}
