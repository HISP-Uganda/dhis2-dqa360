import React from 'react'
import { NoticeBox, Button } from '@dhis2/ui'

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null, errorInfo: null }
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { hasError: true }
    }

    componentDidCatch(error, errorInfo) {
        // Log error details
        console.error('DQA360 Error Boundary caught an error:', error, errorInfo)
        
        // Filter out non-critical errors
        const nonCriticalErrors = [
            'socket hang up',
            'Network Error',
            'logo_banner',
            'staticContent',
            'StyleSheet: illegal rule',
            'Method Not Allowed (405)',
            'Conflict (409)',
            'Failed to fetch user locale',
            'Unauthorized',
            'FetchError',
            'userSettings',
            'api/41/me',
            'Failed to load resource',
            'useCurrentUserLocale',
            'AppWrapper',
            'the server responded with a status of 401'
        ]
        
        const isNonCritical = nonCriticalErrors.some(pattern => 
            error.message?.includes(pattern) || error.toString().includes(pattern)
        )
        
        if (isNonCritical) {
            // Reset error state for non-critical errors
            this.setState({ hasError: false, error: null, errorInfo: null })
            return
        }
        
        this.setState({
            error: error,
            errorInfo: errorInfo
        })
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null })
    }

    render() {
        if (this.state.hasError) {
            // Fallback UI
            return (
                <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
                    <NoticeBox 
                        error 
                        title="Application Error"
                        style={{ marginBottom: '16px' }}
                    >
                        <div style={{ marginBottom: '16px' }}>
                            Something went wrong in the DQA360 application. This is likely a temporary issue.
                        </div>
                        
                        {this.state.error && (
                            <details style={{ marginBottom: '16px' }}>
                                <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                                    Error Details (for developers)
                                </summary>
                                <div style={{ 
                                    marginTop: '8px', 
                                    padding: '8px', 
                                    backgroundColor: '#f5f5f5', 
                                    borderRadius: '4px',
                                    fontFamily: 'monospace',
                                    fontSize: '12px',
                                    whiteSpace: 'pre-wrap'
                                }}>
                                    {this.state.error.toString()}
                                    {this.state.errorInfo.componentStack}
                                </div>
                            </details>
                        )}
                        
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <Button primary onClick={this.handleRetry}>
                                Try Again
                            </Button>
                            <Button onClick={() => window.location.reload()}>
                                Reload Page
                            </Button>
                        </div>
                    </NoticeBox>
                </div>
            )
        }

        return this.props.children
    }
}

export default ErrorBoundary