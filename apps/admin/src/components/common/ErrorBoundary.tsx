import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@taskflow/ui'

import { useI18n } from '@/i18n'

type Props = { children: ReactNode }
type State = { error: Error | null }

function ErrorFallback({ error, onReset }: { error: Error; onReset: () => void }) {
  const { t } = useI18n()
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h1 className="text-xl font-semibold text-foreground">{t('common.errorTitle')}</h1>
      <p className="max-w-md text-sm text-muted-foreground">{t('common.errorBody')}</p>
      {import.meta.env.DEV ? (
        <pre className="max-w-lg overflow-auto rounded-md border border-border/60 bg-muted/40 p-3 text-start text-xs text-muted-foreground">
          {error.message}
        </pre>
      ) : null}
      <Button type="button" onClick={onReset}>
        {t('common.retry')}
      </Button>
    </div>
  )
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorFallback
          error={this.state.error}
          onReset={() => {
            this.setState({ error: null })
            window.location.assign(window.location.pathname)
          }}
        />
      )
    }
    return this.props.children
  }
}
