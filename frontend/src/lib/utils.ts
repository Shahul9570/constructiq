import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getFileUrl(url: string | undefined | null) {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  const baseUrl = (import.meta.env.VITE_API_URL || '/api/v1').replace('/api/v1', '')
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`
}
