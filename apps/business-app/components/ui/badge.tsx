import * as React from "react"

import { cn } from "@/lib/utils"

function Badge({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"span"> & {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success"
}) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring/50",
        {
          default: "border-transparent bg-primary text-primary-foreground",
          secondary: "border-transparent bg-secondary text-secondary-foreground",
          destructive: "border-transparent bg-destructive/10 text-destructive",
          outline: "border-border text-foreground",
          success: "border-transparent bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
        }[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }
