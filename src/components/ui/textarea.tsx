"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// 修改这个接口，添加具体的类型扩展
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  // 如果需要添加自定义属性可以在这里添加
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }