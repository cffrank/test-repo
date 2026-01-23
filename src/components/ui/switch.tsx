"use client"

import * as React from "react"
import { twMerge } from "tailwind-merge"

interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, checked = false, onCheckedChange, disabled, id, ...props }, ref) => {
    const [internalChecked, setInternalChecked] = React.useState(checked)

    const isChecked = onCheckedChange !== undefined ? checked : internalChecked

    const handleClick = () => {
      if (disabled) return
      const newValue = !isChecked
      if (onCheckedChange) {
        onCheckedChange(newValue)
      } else {
        setInternalChecked(newValue)
      }
    }

    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={isChecked}
        disabled={disabled}
        id={id}
        onClick={handleClick}
        className={twMerge(
          "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
          isChecked ? "bg-accent" : "bg-gray-200",
          className
        )}
      >
        <span
          className={twMerge(
            "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
            isChecked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    )
  }
)
Switch.displayName = "Switch"

export { Switch }
