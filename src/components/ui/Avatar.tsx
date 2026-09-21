import React from 'react'

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl'

interface AvatarProps {
  name: string
  src?: string
  size?: AvatarSize
  className?: string
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: 'w-7 h-7 text-[10px]',
  md: 'w-9 h-9 text-xs',
  lg: 'w-11 h-11 text-sm',
  xl: 'w-14 h-14 text-base',
}

const avatarColors = ['bg-indigo-500', 'bg-violet-500', 'bg-cyan-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500']

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return (parts[0]?.[0] ?? '').toUpperCase()
}

function getColorFromName(name: string): string {
  const idx = name ? name.charCodeAt(0) % avatarColors.length : 0
  return avatarColors[idx]
}

export function Avatar({ name, src, size = 'md', className = '' }: AvatarProps) {
  const [imgError, setImgError] = React.useState(false)

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setImgError(true)}
        className={`rounded-full object-cover ring-2 ring-white/[0.06] ring-offset-2 ring-offset-[#0f1117] ${sizeClasses[size]} ${className}`}
      />
    )
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center font-medium shrink-0 text-white ring-2 ring-white/[0.06] ring-offset-2 ring-offset-[#0f1117] ${getColorFromName(name)} ${sizeClasses[size]} ${className}`}
      title={name}
    >
      {getInitials(name)}
    </div>
  )
}
