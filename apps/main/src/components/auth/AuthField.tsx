import type { InputHTMLAttributes, ReactNode } from 'react'
import { Input } from '@taskflow/ui'

type Props = {
  label: string
  hint?: ReactNode
  inputProps: InputHTMLAttributes<HTMLInputElement>
}

export function AuthField({ label, hint, inputProps }: Props) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <Input {...inputProps} />
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  )
}
