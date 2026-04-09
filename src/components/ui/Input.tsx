import * as React from 'react'
import { cn } from '@/lib/utils/cn'

/* ============================================================
   Input / 输入框组件
   支持图标前缀/后缀、错误状态、禁用状态
   Supports prefix/suffix icons, error state, disabled state
   ============================================================ */

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** 左侧图标 / Left icon */
  prefixIcon?: React.ReactNode
  /** 右侧图标/元素 / Right icon or element */
  suffixIcon?: React.ReactNode
  /** 错误信息 / Error message */
  error?: string
  /** 标签 / Label */
  label?: string
  /** 提示文字 / Helper text */
  helperText?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      prefixIcon,
      suffixIcon,
      error,
      label,
      helperText,
      id,
      disabled,
      ...props
    },
    ref,
  ) => {
    const inputId = id ?? React.useId()

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {/* 标签 / Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-[var(--color-text)] font-[family-name:var(--font-body)]"
          >
            {label}
          </label>
        )}

        {/* 输入框容器 / Input wrapper */}
        <div className="relative flex items-center">
          {/* 左侧图标 / Left icon */}
          {prefixIcon && (
            <span
              className="absolute left-3 text-[var(--color-text-muted)] pointer-events-none"
              aria-hidden="true"
            >
              {prefixIcon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={cn(
              /* 基础 / Base */
              'w-full h-11 text-sm text-[var(--color-text)]',
              'bg-white border rounded-[var(--radius-md)]',
              'placeholder:text-[var(--color-text-light)]',
              'font-[family-name:var(--font-body)]',
              /* 过渡 / Transition */
              'transition-all duration-[var(--duration-fast)]',
              /* 边框 / Border */
              !error && 'border-[var(--color-border)] focus:border-[var(--color-primary)]',
              error && 'border-[var(--color-error)]',
              /* 焦点环 / Focus ring */
              'focus:outline-none focus:ring-2',
              !error && 'focus:ring-[var(--color-primary)]/20',
              error && 'focus:ring-[var(--color-error)]/20',
              /* 内边距（考虑图标）/ Padding (accounting for icons) */
              prefixIcon ? 'pl-10' : 'pl-3',
              suffixIcon ? 'pr-10' : 'pr-3',
              /* 禁用 / Disabled */
              disabled && 'opacity-50 cursor-not-allowed bg-[var(--color-bg-base)]',
              className,
            )}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            aria-invalid={!!error}
            {...props}
          />

          {/* 右侧图标 / Right icon */}
          {suffixIcon && (
            <span
              className="absolute right-3 text-[var(--color-text-muted)]"
              aria-hidden="true"
            >
              {suffixIcon}
            </span>
          )}
        </div>

        {/* 错误信息 / Error message */}
        {error && (
          <p
            id={`${inputId}-error`}
            role="alert"
            className="text-xs text-[var(--color-error)] flex items-center gap-1"
          >
            <span aria-hidden="true">⚠</span>
            {error}
          </p>
        )}

        {/* 提示文字 / Helper text */}
        {!error && helperText && (
          <p
            id={`${inputId}-helper`}
            className="text-xs text-[var(--color-text-muted)]"
          >
            {helperText}
          </p>
        )}
      </div>
    )
  },
)

Input.displayName = 'Input'
