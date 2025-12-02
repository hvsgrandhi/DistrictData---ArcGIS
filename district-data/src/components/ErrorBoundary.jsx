import React from "react";

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, info: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error("ErrorBoundary caught:", error, info);
        this.setState({ info });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: 20 }}>
                    <h2>Something went wrong</h2>
                    <details style={{ whiteSpace: "pre-wrap" }}>
                        {String(this.state.error)}
                        <br />
                        {this.state.info?.componentStack}
                    </details>
                </div>
            );
        }

        return this.props.children;
    }
}
