import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatNumber(num) {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M'
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K'
  return num?.toString() ?? '0'
}

export function formatDate(date) {
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date) {
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date)) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', color: '#E1306C', bgClass: 'platform-instagram' },
  { id: 'facebook', label: 'Facebook', color: '#1877F2', bgClass: 'platform-facebook' },
  { id: 'tiktok', label: 'TikTok', color: '#010101', bgClass: 'platform-tiktok' },
  { id: 'linkedin', label: 'LinkedIn', color: '#0A66C2', bgClass: 'platform-linkedin' },
  { id: 'twitter', label: 'Twitter / X', color: '#000000', bgClass: 'platform-twitter' },
  { id: 'pinterest', label: 'Pinterest', color: '#E60023', bgClass: 'platform-pinterest' },
  { id: 'youtube', label: 'YouTube', color: '#FF0000', bgClass: 'platform-youtube' },
  { id: 'google', label: 'Google Business', color: '#4285F4', bgClass: 'platform-google' },
]

export const PLATFORM_MAP = Object.fromEntries(PLATFORMS.map(p => [p.id, p]))
