// ===== APPLICATION MODULES =====
const App = {
    // Module references
    modules: {
        dataProcessor: DataProcessor,
        dataStore: DataStore,
        filterManager: FilterManager,
        statsCalculator: StatsCalculator,
        visualizationManager: VisualizationManager,
        uiController: null,
        exportManager: null,
        errorHandler: ErrorHandler
    },
    
    // Event bus reference
    eventBus: EventBus,
    
    // Application state
    state: {
        initialized: false,
        dataLoaded: false,
        currentFilters: null
    },
    
    /**
     * Initialize all modules in sequence
     */
    init: withErrorBoundary(function() {
        ErrorHandler.info('Initializing Costco Receipt Analyzer...');
        
        if (this.state.initialized) {
            ErrorHandler.warn('App already initialized');
            return;
        }
        
        try {
            // Initialize UI Controller first
            this.modules.uiController = UIController;
            this.modules.uiController.init();
            ErrorHandler.debug('UIController initialized');
            
            // Initialize data modules
            ErrorHandler.debug('DataProcessor initialized');
            ErrorHandler.debug('DataStore initialized');
            ErrorHandler.debug('StatsCalculator initialized');
            
            // Initialize FilterManager
            this.modules.filterManager.init();
            ErrorHandler.debug('FilterManager initialized');
            
            // Initialize VisualizationManager
            this.modules.visualizationManager.init();
            ErrorHandler.debug('VisualizationManager initialized');
            
            // Initialize other modules (will be implemented in future tasks)
            // this.modules.exportManager = ExportManager;
            
            this.state.initialized = true;
            ErrorHandler.info('Application initialized successfully');
            
            // Emit initialization complete event
            EventBus.emit('app:initialized', { timestamp: new Date() });
            
        } catch (error) {
            ErrorHandler.handleError(error, 'App Initialization');
            throw error;
        }
    }, 'App Initialization'),
    
    /**
     * Reset application state
     */
    reset: withErrorBoundary(function() {
        ErrorHandler.info('Resetting application...');
        
        // Clear data processor
        if (this.modules.dataProcessor && this.modules.dataProcessor.clear) {
            this.modules.dataProcessor.clear();
        }
        
        // Clear data store
        if (this.modules.dataStore && this.modules.dataStore.clear) {
            this.modules.dataStore.clear();
        }
        
        // Reset filters
        if (this.modules.filterManager && this.modules.filterManager.clearFilters) {
            this.modules.filterManager.clearFilters();
        }
        
        // Clear UI
        if (this.modules.uiController && this.modules.uiController.reset) {
            this.modules.uiController.reset();
        }
        
        this.state.dataLoaded = false;
        this.state.currentFilters = null;
        
        EventBus.emit('app:reset', { timestamp: new Date() });
        ErrorHandler.info('Application reset complete');
    }, 'App Reset')
};
