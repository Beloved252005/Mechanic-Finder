"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error("ErrorBoundary caught:", error, info.componentStack);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="error-boundary">
                    <div className="error-boundary-content">
                        <div className="error-boundary-icon">⚠️</div>
                        <h2 className="error-boundary-title">Something went wrong</h2>
                        <p className="error-boundary-message">
                            An unexpected error occurred. Please try again.
                        </p>
                        {process.env.NODE_ENV === "development" && this.state.error && (
                            <details className="error-boundary-details">
                                <summary>Error details</summary>
                                <pre>{this.state.error.message}</pre>
                            </details>
                        )}
                        <button className="btn btn-primary" onClick={this.handleReset}>
                            Try Again
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
