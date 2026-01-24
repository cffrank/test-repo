"use client"

import * as React from "react"
import Image from "next/image"

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg"
}

const sizeStyles = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className = "", size = "md", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`relative flex shrink-0 overflow-hidden rounded-full ${sizeStyles[size]} ${className}`}
        {...props}
      />
    )
  }
)
Avatar.displayName = "Avatar"

interface AvatarImageProps {
  src: string;
  alt: string;
  className?: string;
}

const AvatarImage = ({ className = "", alt, src }: AvatarImageProps) => {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      className={`aspect-square object-cover ${className}`}
    />
  )
}
AvatarImage.displayName = "AvatarImage"

interface AvatarFallbackProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const AvatarFallback = React.forwardRef<HTMLDivElement, AvatarFallbackProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`flex h-full w-full items-center justify-center rounded-full bg-primary-100 text-primary font-medium ${className}`}
        {...props}
      />
    )
  }
)
AvatarFallback.displayName = "AvatarFallback"

export { Avatar, AvatarImage, AvatarFallback }
