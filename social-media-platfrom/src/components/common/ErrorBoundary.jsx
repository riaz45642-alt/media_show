import { Component } from 'react'
import { AlertTriangle } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Kept as console output rather than a remote logger — no backend
    // error-reporting endpoint is wired up in this demo.
    console.error('Media Show crashed:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-500">
            <AlertTriangle size={26} />
          </span>
          <h2 className="font-display text-lg font-bold text-gray-800">Something went wrong</h2>
          <p className="max-w-xs text-sm text-gray-500">
            This page hit an unexpected error. Try going back to the home screen.
          </p>
          <button
            onClick={() => {
              this.setState({ error: null })
              window.location.assign('/')
            }}
            className="btn-press tap-scale mt-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-soft"
          >
            Back to Home
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
