// ===== GLOBAL ERROR HANDLER =====
window.addEventListener('error', (event) => {
    ErrorHandler.error('Uncaught error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
    });
});

window.addEventListener('unhandledrejection', (event) => {
    ErrorHandler.error('Unhandled promise rejection', {
        reason: event.reason
    });
});

// ===== APPLICATION STARTUP =====
// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        App.init();
    });
} else {
    // DOM already loaded
    App.init();
}

// Expose App to global scope for debugging (remove in production)
if (typeof window !== 'undefined') {
    window.CostcoApp = App;
    window.EventBus = EventBus;
    window.ErrorHandler = ErrorHandler;
}
