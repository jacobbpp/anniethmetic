import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Anniethmetic crashed:', error, info.componentStack)
  }

  handleReload = (): void => {
    window.location.reload()
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="app">
        <div className="overlay__card" style={{ margin: 'auto' }}>
          <h2 className="overlay__title">That didn't work</h2>
          <p className="overlay__subtitle">Give it another go.</p>
          <button type="button" className="btn btn--primary" onClick={this.handleReload}>
            Reload
          </button>
        </div>
      </div>
    )
  }
}
