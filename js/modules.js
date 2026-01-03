'use strict';

// ===== DEPARTMENT MAPPINGS =====
// Loaded from resources/department_mappings.json
const DEPARTMENT_MAPPINGS = {
    "0": "Online Orders",
    "12": "Snacks & Candy",
    "13": "Grocery & Household Essentials (pantry, snacks, beverages, cleaning, paper)",
    "14": "Grocery & Household Essentials (pantry, snacks, beverages, cleaning, paper)",
    "16": "Beverages/Alcohol",
    "17": "Dairy",
    "18": "Frozen",
    "19": "Deli",
    "20": "Beauty (skin care, hair care, cosmetics, fragrance)",
    "21": "Office Products",
    "23": "Home Improvement & Tools",
    "24": "Electronics (TVs, audio, cameras, wearables)",
    "25": "Automotive & Tires",
    "26": "Sports & Fitness",
    "27": "Patio, Lawn & Garden",
    "28": "Toys",
    "31": "Clothing, Luggage & Handbags",
    "32": "Home Improvement & Tools",
    "33": "Appliances (major and small kitchen appliances, laundry)",
    "34": "Home & Kitchen (cookware, small appliances, tableware)",
    "38": "Furniture (indoor, outdoor, office, kids)",
    "39": "Clothing, Luggage & Handbags",
    "53": "Gas Station",
    "61": "Meat & Seafood",
    "62": "Bakery",
    "63": "Frozen Foods",
    "65": "Produce",
    "75": "Gift Cards/Services",
    "88": "Deli",
    "93": "Pharmacy (Rx), Over‑the‑Counter & Wellness"
};

/**
 * Get department name from mapping, fallback to "Dept X" if not found
 * @param {number|string} deptNumber - Department number
 * @returns {string} Department name
 */
function getDepartmentName(deptNumber) {
    const deptStr = String(deptNumber || 0);
    return DEPARTMENT_MAPPINGS[deptStr] || `Dept ${deptNumber}`;
}

// ===== UTILITY FUNCTIONS =====

/**
 * Debounce function - delays execution until after wait ms have elapsed since last call
 * @param {Function} func - Function to debounce
 * @param {number} wait - Milliseconds to wait
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function - ensures function is called at most once per wait ms
 * @param {Function} func - Function to throttle
 * @param {number} wait - Milliseconds between calls
 * @returns {Function} Throttled function
 */
function throttle(func, wait) {
    let lastTime = 0;
    return function executedFunction(...args) {
        const now = Date.now();
        if (now - lastTime >= wait) {
            lastTime = now;
            func.apply(this, args);
        }
    };
}

// ===== EVENT BUS =====
// Simple publish-subscribe pattern for inter-module communication
const EventBus = (() => {
    const events = new Map();
    
    return {
        /**
         * Subscribe to an event
         * @param {string} eventName - Name of the event
         * @param {Function} callback - Function to call when event fires
         * @returns {Function} Unsubscribe function
         */
        on(eventName, callback) {
            if (!events.has(eventName)) {
                events.set(eventName, []);
            }
            events.get(eventName).push(callback);
            
            // Return unsubscribe function
            return () => {
                const callbacks = events.get(eventName);
                const index = callbacks.indexOf(callback);
                if (index > -1) {
                    callbacks.splice(index, 1);
                }
            };
        },
        
        /**
         * Publish an event
         * @param {string} eventName - Name of the event
         * @param {*} data - Data to pass to subscribers
         */
        emit(eventName, data) {
            if (!events.has(eventName)) {
                return;
            }
            
            const callbacks = events.get(eventName);
            callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event handler for "${eventName}":`, error);
                }
            });
        },
        
        /**
         * Remove all subscribers for an event
         * @param {string} eventName - Name of the event
         */
        off(eventName) {
            events.delete(eventName);
        },
        
        /**
         * Get all registered events (for debugging)
         * @returns {Array<string>}
         */
        getEvents() {
            return Array.from(events.keys());
        }
    };
})();

// ===== ERROR HANDLER MODULE =====
const ErrorHandler = (() => {
    const errorLog = [];
    const DEBUG = true; // Set to false in production
    
    /**
     * Log with timestamp
     * @param {string} level - Log level
     * @param {string} message - Log message
     * @param {*} data - Additional data
     */
    function log(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const entry = { timestamp, level, message, data };
        
        errorLog.push(entry);
        
        // Console output with color coding
        const styles = {
            ERROR: 'color: #dc3545; font-weight: bold',
            WARN: 'color: #ffc107; font-weight: bold',
            INFO: 'color: #17a2b8',
            DEBUG: 'color: #6c757d'
        };
        
        if (level === 'DEBUG' && !DEBUG) return;
        
        console.log(
            `%c[${level}] ${timestamp}%c ${message}`,
            styles[level],
            'color: inherit',
            data || ''
        );
    }
    
    /**
     * Show error to user
     * @param {string} message - User-friendly error message
     */
    function showUserError(message) {
        const errorContainer = document.getElementById('error-container');
        const errorMessage = document.getElementById('error-message');
        
        if (errorContainer && errorMessage) {
            errorMessage.textContent = message;
            errorContainer.classList.add('active');
            
            // Auto-hide after 10 seconds
            setTimeout(() => {
                errorContainer.classList.remove('active');
            }, 10000);
        }
        
        EventBus.emit('error:shown', { message });
    }
    
    /**
     * Handle error with context
     * @param {Error|string} error - Error object or message
     * @param {string} context - Context where error occurred
     */
    function handleError(error, context = 'Unknown') {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : null;
        
        log('ERROR', `${context}: ${errorMessage}`, errorStack);
        
        // User-friendly messages based on context
        const userMessages = {
            'File Loading': 'Failed to load file. Please ensure it is a valid JSON or CSV file.',
            'JSON Parsing': 'Invalid JSON format. Please check your file format.',
            'Data Processing': 'Error processing receipt data. Some data may be missing or invalid.',
            'Visualization': 'Failed to render chart. Please try refreshing the page.',
            'Export': 'Failed to export data. Please try again.'
        };
        
        const userMessage = userMessages[context] || 'An unexpected error occurred. Please try again.';
        showUserError(userMessage);
        
        EventBus.emit('error:occurred', { error, context });
    }
    
    return {
        error: (message, data) => log('ERROR', message, data),
        warn: (message, data) => log('WARN', message, data),
        info: (message, data) => log('INFO', message, data),
        debug: (message, data) => log('DEBUG', message, data),
        handleError,
        showUserError,
        getErrorLog: () => [...errorLog],
        clearLogs: () => { errorLog.length = 0; }
    };
})();

// ===== ERROR BOUNDARY WRAPPER =====
/**
 * Wraps a function with error handling
 * @param {Function} fn - Function to wrap
 * @param {string} context - Context for error reporting
 * @returns {Function} Wrapped function
 */
function withErrorBoundary(fn, context) {
    return function(...args) {
        try {
            const result = fn.apply(this, args);
            
            // Handle promises
            if (result instanceof Promise) {
                return result.catch(error => {
                    ErrorHandler.handleError(error, context);
                    throw error;
                });
            }
            
            return result;
        } catch (error) {
            ErrorHandler.handleError(error, context);
            throw error;
        }
    };
}

// ===== D3 UTILITIES =====
// Check if D3 is loaded
function checkD3() {
    console.log('Checking D3 availability...');
    console.log('typeof d3:', typeof d3);
    if (typeof d3 === 'undefined') {
        console.error('D3.js not loaded - visualizations will not work');
        ErrorHandler.error('D3.js not loaded - visualizations will not work');
        return false;
    }
    console.log(`D3.js v${d3.version} loaded successfully`);
    ErrorHandler.debug(`D3.js v${d3.version} loaded successfully`);
    return true;
}

// ===== VISUALIZATION MANAGER MODULE =====
const VisualizationManager = (() => {
    const charts = new Map();  // chartId -> chart instance
    let d3Available = false;
    
    /**
     * Initialize VisualizationManager
     */
    function init() {
        d3Available = checkD3();
        
        if (!d3Available) {
            ErrorHandler.error('D3.js failed to load. Charts will not render.');
            return;
        }
        
        // Set up resize observer for responsive charts
        setupResizeHandlers();
        
        ErrorHandler.info('VisualizationManager initialized');
    }
    
    /**
     * Setup window resize handlers for responsive charts
     */
    function setupResizeHandlers() {
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                resizeCharts();
            }, 250); // Debounce resize events
        });
    }
    
    /**
     * Create a chart
     * @param {string} chartId - Unique chart identifier
     * @param {string} containerId - DOM container ID
     * @param {string} type - Chart type
     * @param {Object} data - Chart data
     * @param {Object} options - Chart options
     * @returns {Object} Chart instance
     */
    function createChart(chartId, containerId, type, data, options = {}) {
        if (!d3Available) {
            ErrorHandler.warn(`Cannot create chart ${chartId}: D3 not available`);
            return null;
        }
        
        // Destroy existing chart if it exists
        if (charts.has(chartId)) {
            destroyChart(chartId);
        }
        
        const container = document.getElementById(containerId);
        if (!container) {
            ErrorHandler.error(`Container ${containerId} not found for chart ${chartId}`);
            return null;
        }
        
        try {
            const chart = {
                id: chartId,
                type,
                containerId,
                container,
                data,
                options,
                svg: null,
                update: null,
                destroy: null
            };
            
            // Create chart based on type
            switch (type) {
                case 'spending-trend':
                    createSpendingTrendChart(chart);
                    break;
                case 'top-items':
                    createTopItemsChart(chart);
                    break;
                case 'frequent-items':
                    createFrequentItemsChart(chart);
                    break;
                case 'warehouse-comparison':
                    createWarehouseChart(chart);
                    break;
                case 'savings-trend':
                    createSavingsTrendChart(chart);
                    break;
                case 'tax-rate-trend':
                    createTaxRateTrendChart(chart);
                    break;
                case 'category-breakdown':
                    createCategoryChart(chart);
                    break;
                case 'calendar-heatmap':
                    createCalendarHeatmap(chart);
                    break;
                case 'price-evolution':
                    createPriceEvolutionChart(chart);
                    break;
                default:
                    ErrorHandler.warn(`Unknown chart type: ${type}`);
                    return null;
            }
            
            charts.set(chartId, chart);
            ErrorHandler.debug(`Chart created: ${chartId} (${type})`);
            
            return chart;
        } catch (error) {
            ErrorHandler.handleError(error, 'Visualization');
            return null;
        }
    }
    
    /**
     * Update a chart with new data
     * @param {string} chartId - Chart identifier
     * @param {Object} data - New data
     */
    function updateChart(chartId, data) {
        const chart = charts.get(chartId);
        if (!chart) {
            ErrorHandler.warn(`Chart ${chartId} not found`);
            return;
        }
        
        chart.data = data;
        if (chart.update) {
            chart.update(data);
        }
    }
    
    /**
     * Destroy a chart
     * @param {string} chartId - Chart identifier
     */
    function destroyChart(chartId) {
        const chart = charts.get(chartId);
        if (!chart) return;
        
        if (chart.destroy) {
            chart.destroy();
        }
        
        // Remove SVG from DOM
        if (chart.svg) {
            chart.svg.remove();
        }
        
        // Clear container
        if (chart.container) {
            chart.container.innerHTML = '';
        }
        
        charts.delete(chartId);
        ErrorHandler.debug(`Chart destroyed: ${chartId}`);
    }
    
    /**
     * Resize all charts
     */
    function resizeCharts() {
        charts.forEach((chart, chartId) => {
            // Only resize charts that are in visible containers
            if (chart.container && chart.update) {
                const containerWidth = chart.container.clientWidth;
                if (containerWidth > 0) {
                chart.update(chart.data);
                } else {
                    // Mark chart as needing render when tab becomes visible
                    chart.needsRender = true;
                }
            }
        });
        ErrorHandler.debug('Charts resized');
    }
    
    /**
     * Resize charts in a specific tab
     * @param {string} tabId - The tab identifier
     */
    function resizeChartsInTab(tabId) {
        // Find the active tab content element
        const tabContent = document.getElementById(`tab-${tabId}`);
        if (!tabContent) {
            ErrorHandler.debug(`Tab content not found: tab-${tabId}`);
            return;
        }
        
        // Check if tab is visible
        const isVisible = tabContent.classList.contains('active') && 
                         tabContent.offsetParent !== null;
        
        if (!isVisible) {
            ErrorHandler.debug(`Tab ${tabId} is not visible, skipping resize`);
            return;
        }
        
        charts.forEach((chart, chartId) => {
            if (!chart.container || !chart.update) return;
            
            // Check if chart container is within the active tab
            const isInTab = tabContent.contains(chart.container);
            
            if (isInTab) {
                const containerWidth = chart.container.clientWidth;
                if (containerWidth > 0) {
                    chart.update(chart.data);
                } else {
                    // Container exists but has zero width - mark for later render
                    chart.needsRender = true;
                    ErrorHandler.debug(`Chart ${chartId} in tab ${tabId} has zero width, deferring render`);
                }
            }
        });
        
        ErrorHandler.debug(`Charts resized for tab: ${tabId}`);
    }
    
    /**
     * Create a standardized tooltip element for charts
     * @param {HTMLElement} container - The chart container
     * @returns {Object} - D3 selection of the tooltip
     */
    function createChartTooltip(container) {
        return d3.select(container)
            .append('div')
            .attr('class', 'chart-tooltip')
            .style('position', 'absolute')
            .style('visibility', 'hidden');
    }
    
    /**
     * Show tooltip with formatted content
     * @param {Object} tooltip - D3 selection of tooltip
     * @param {string} title - Tooltip title
     * @param {Array} rows - Array of {label, value, className?} objects
     * @param {Event} event - Mouse event for positioning
     * @param {HTMLElement} container - Chart container
     */
    function showTooltip(tooltip, title, rows, event, container) {
        let html = '';
        if (title) {
            html += `<div class="chart-tooltip-title">${title}</div>`;
        }
        rows.forEach(row => {
            const valueClass = row.className ? ` ${row.className}` : '';
            html += `<div class="chart-tooltip-row">
                <span class="chart-tooltip-label">${row.label}</span>
                <span class="chart-tooltip-value${valueClass}">${row.value}</span>
            </div>`;
        });
        
        tooltip
            .html(html)
            .classed('visible', true)
            .style('visibility', 'visible');
        
        positionTooltip(tooltip, event, container);
    }
    
    /**
     * Hide tooltip
     * @param {Object} tooltip - D3 selection of tooltip
     */
    function hideTooltip(tooltip) {
        tooltip
            .classed('visible', false)
            .style('visibility', 'hidden');
    }
    
    /**
     * Helper function to position tooltip correctly
     * @param {Object} tooltip - D3 selection of tooltip
     * @param {Event} event - The mouse event
     * @param {HTMLElement} container - The chart container
     */
    function positionTooltip(tooltip, event, container) {
        const containerRect = container.getBoundingClientRect();
        const tooltipNode = tooltip.node();
        const tooltipRect = tooltipNode.getBoundingClientRect();
        
        // Calculate position relative to container
        let left = event.clientX - containerRect.left + 10;
        let top = event.clientY - containerRect.top - 10;
        
        // Check if tooltip would go off the right edge
        if (left + tooltipRect.width > containerRect.width) {
            left = event.clientX - containerRect.left - tooltipRect.width - 10;
        }
        
        // Check if tooltip would go off the bottom edge
        if (top + tooltipRect.height > containerRect.height) {
            top = event.clientY - containerRect.top - tooltipRect.height - 10;
        }
        
        // Ensure tooltip doesn't go off the left or top edge
        left = Math.max(5, left);
        top = Math.max(5, top);
        
        tooltip
            .style('left', left + 'px')
            .style('top', top + 'px');
    }
    
    /**
     * Create a chart legend
     * @param {HTMLElement} container - Container to append legend to
     * @param {Array} items - Array of {label, color, active?} objects
     * @param {Function} onToggle - Callback when item is toggled (receives item and active state)
     * @returns {HTMLElement} - The legend element
     */
    function createChartLegend(container, items, onToggle) {
        const legend = document.createElement('div');
        legend.className = 'chart-legend';
        
        items.forEach((item, index) => {
            const legendItem = document.createElement('div');
            legendItem.className = 'chart-legend-item' + (item.active === false ? ' inactive' : '');
            legendItem.innerHTML = `
                <span class="chart-legend-color" style="background-color: ${item.color}"></span>
                <span class="chart-legend-label">${item.label}</span>
            `;
            
            if (onToggle) {
                legendItem.addEventListener('click', () => {
                    const isActive = !legendItem.classList.contains('inactive');
                    legendItem.classList.toggle('inactive');
                    onToggle(item, !isActive, index);
                });
            }
            
            legend.appendChild(legendItem);
        });
        
        container.appendChild(legend);
        return legend;
    }
    
    /**
     * Create spending trend chart
     */
    function createSpendingTrendChart(chart) {
        console.log('=== CREATING SPENDING TREND CHART ===');
        console.log('Chart data:', chart.data);
        console.log('Chart container:', chart.container);
        console.log('D3 available:', typeof d3 !== 'undefined');
        
        const data = chart.data || [];
        if (data.length === 0) {
            console.warn('No data available for chart');
            chart.container.innerHTML = '<p style="text-align:center;padding:2rem;color:var(--color-text-tertiary);">No data available</p>';
            return;
        }
        
        console.log(`Creating chart with ${data.length} data points`);
        
        // Clear container
        chart.container.innerHTML = '';
        
        // Get container dimensions
        const containerWidth = chart.container.clientWidth;
        const containerHeight = Math.max(chart.container.clientHeight, 300);
        
        // Guard: Skip rendering if container is hidden (zero width)
        if (containerWidth <= 0) {
            console.warn('Chart container has zero width (likely hidden tab). Deferring render.');
            chart.needsRender = true;
            return;
        }
        
        // Set margins and dimensions
        const margin = { top: 20, right: 30, bottom: 50, left: 60 };
        const width = containerWidth - margin.left - margin.right;
        const height = containerHeight - margin.top - margin.bottom;
        
        // Create SVG
        const svg = d3.select(chart.container)
            .append('svg')
            .attr('width', containerWidth)
            .attr('height', containerHeight)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        chart.svg = svg;
        
        // Parse dates and prepare data
        const parseDate = d3.timeParse('%Y-%m');
        const dataWithDates = data.map(d => ({
            ...d,
            date: parseDate(d.month)
        })).sort((a, b) => a.date - b.date);
        
        // Create scales
        const x = d3.scaleTime()
            .domain(d3.extent(dataWithDates, d => d.date))
            .range([0, width]);
        
        const y = d3.scaleLinear()
            .domain([0, d3.max(dataWithDates, d => d.total) * 1.1])
            .nice()
            .range([height, 0]);
        
        // Create gradient for area
        const gradient = svg.append('defs')
            .append('linearGradient')
            .attr('id', `gradient-${chart.id}`)
            .attr('gradientUnits', 'userSpaceOnUse')
            .attr('x1', 0)
            .attr('y1', y(0))
            .attr('x2', 0)
            .attr('y2', y(d3.max(dataWithDates, d => d.total)));
        
        gradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', 'var(--color-primary)')
            .attr('stop-opacity', 0.3);
        
        gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', 'var(--color-primary)')
            .attr('stop-opacity', 0);
        
        // Create area generator
        const area = d3.area()
            .x(d => x(d.date))
            .y0(height)
            .y1(d => y(d.total))
            .curve(d3.curveMonotoneX);
        
        // Create line generator
        const line = d3.line()
            .x(d => x(d.date))
            .y(d => y(d.total))
            .curve(d3.curveMonotoneX);
        
        // Add area
        svg.append('path')
            .datum(dataWithDates)
            .attr('class', 'area')
            .attr('fill', `url(#gradient-${chart.id})`)
            .attr('d', area);
        
        // Add line
        svg.append('path')
            .datum(dataWithDates)
            .attr('class', 'line')
            .attr('fill', 'none')
            .attr('stroke', 'var(--color-primary)')
            .attr('stroke-width', 2)
            .attr('d', line);
        
        // Add x-axis
        svg.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x)
                .ticks(Math.min(dataWithDates.length, 8))
                .tickFormat(d3.timeFormat('%b %Y')))
            .selectAll('text')
            .attr('transform', 'rotate(-45)')
            .style('text-anchor', 'end')
            .attr('dx', '-.8em')
            .attr('dy', '.15em');
        
        // Add y-axis
        svg.append('g')
            .attr('class', 'y-axis')
            .call(d3.axisLeft(y)
                .ticks(6)
                .tickFormat(d => `$${d.toLocaleString()}`));
        
        // Add grid lines
        svg.append('g')
            .attr('class', 'grid')
            .attr('opacity', 0.1)
            .call(d3.axisLeft(y)
                .ticks(6)
                .tickSize(-width)
                .tickFormat(''));
        
        // Add y-axis label
        svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', -margin.left + 15)
            .attr('x', -height / 2)
            .attr('text-anchor', 'middle')
            .style('font-size', '12px')
            .style('fill', 'var(--color-text-secondary)')
            .text('Total Spent ($)');
        
        // Tooltip (using standardized factory)
        const tooltip = createChartTooltip(chart.container);
        
        // Add data points with animation
        const dots = svg.selectAll('.dot')
            .data(dataWithDates)
            .enter()
            .append('circle')
            .attr('class', 'dot')
            .attr('cx', d => x(d.date))
            .attr('cy', height)
            .attr('r', 0)
            .attr('fill', 'var(--color-primary)')
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
            .style('cursor', 'pointer')
            .attr('tabindex', '0')  // Make focusable for accessibility
            .attr('role', 'button')
            .attr('aria-label', d => `${d3.timeFormat('%B %Y')(d.date)}: $${d.total.toFixed(2)}`);
        
        // Animate entry
        dots.transition()
            .duration(800)
            .delay((d, i) => i * 50)
            .attr('cy', d => y(d.total))
            .attr('r', 4);
        
        // Tooltip show handler
        function showDotTooltip(event, d) {
            showTooltip(tooltip, d3.timeFormat('%B %Y')(d.date), [
                { label: 'Total Spent', value: `$${d.total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` },
                { label: 'Trips', value: d.count },
                { label: 'Items', value: d.items },
                { label: 'Avg/Trip', value: `$${(d.total / d.count).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` }
            ], event, chart.container);
        }
        
        // Add hover interactions
        dots.on('mouseover', function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', 6);
                showDotTooltip(event, d);
            })
            .on('mousemove', function(event) {
                positionTooltip(tooltip, event, chart.container);
            })
            .on('mouseout', function() {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', 4);
                hideTooltip(tooltip);
            })
            .on('focus', function(event) {
                // Keyboard accessibility - show tooltip on focus
                const d = d3.select(this).datum();
                d3.select(this).attr('r', 6);
                showDotTooltip(event, d);
            })
            .on('blur', function() {
                d3.select(this).attr('r', 4);
                hideTooltip(tooltip);
            })
            .on('click', function(event, d) {
                // Emit event for filtering by this month
                EventBus.emit('chart:monthClicked', {
                    month: d.month,
                    date: d.date,
                    data: d
                });
            })
            .on('keydown', function(event) {
                // Allow Enter/Space to trigger click for keyboard users
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    const d = d3.select(this).datum();
                    EventBus.emit('chart:monthClicked', {
                        month: d.month,
                        date: d.date,
                        data: d
                    });
                }
            });
        
        // Update function
        chart.update = function(newData) {
            createSpendingTrendChart({ ...chart, data: newData });
        };
        
        // Destroy function
        chart.destroy = function() {
            if (tooltip) tooltip.remove();
            if (svg) svg.remove();
        };
    }
    
    /**
     * Create top items horizontal bar chart
     */
    function createTopItemsChart(chart) {
        console.log('=== CREATING TOP ITEMS BAR CHART ===');
        const data = chart.data || [];
        
        if (data.length === 0) {
            chart.container.innerHTML = '<p style="text-align:center;padding:2rem;color:var(--color-text-tertiary);">No data available</p>';
            return;
        }
        
        // Clear container
        chart.container.innerHTML = '';
        
        // Get container dimensions
        const containerWidth = chart.container.clientWidth;
        const containerHeight = Math.max(chart.container.clientHeight, 400);
        
        // Guard: Skip rendering if container is hidden (zero width)
        if (containerWidth <= 0) {
            console.warn('Chart container has zero width (likely hidden tab). Deferring render.');
            chart.needsRender = true;
            return;
        }
        
        // Set margins
        const margin = { top: 20, right: 30, bottom: 40, left: 200 };
        const width = containerWidth - margin.left - margin.right;
        const height = containerHeight - margin.top - margin.bottom;
        
        // Create SVG
        const svg = d3.select(chart.container)
            .append('svg')
            .attr('width', containerWidth)
            .attr('height', containerHeight)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        chart.svg = svg;
        
        // Create scales
        const x = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.totalSpent) * 1.1])
            .range([0, width]);
        
        const y = d3.scaleBand()
            .domain(data.map(d => d.name))
            .range([0, height])
            .padding(0.2);
        
        // Add x-axis
        svg.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x)
                .ticks(5)
                .tickFormat(d => `$${d.toLocaleString()}`));
        
        // Add y-axis
        svg.append('g')
            .attr('class', 'y-axis')
            .call(d3.axisLeft(y))
            .selectAll('text')
            .style('font-size', '12px')
            .text(d => d.length > 30 ? d.substring(0, 30) + '...' : d);
        
        // Add grid lines
        svg.append('g')
            .attr('class', 'grid')
            .attr('opacity', 0.1)
            .call(d3.axisBottom(x)
                .ticks(5)
                .tickSize(height)
                .tickFormat(''));
        
        // Tooltip (using standardized factory)
        const tooltip = createChartTooltip(chart.container);
        
        // Add bars with animation
        const bars = svg.selectAll('.bar')
            .data(data)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', 0)
            .attr('y', d => y(d.name))
            .attr('width', 0)
            .attr('height', y.bandwidth())
            .attr('fill', 'var(--color-primary)')
            .attr('opacity', 0.8)
            .style('cursor', 'pointer')
            .attr('tabindex', '0')
            .attr('role', 'button')
            .attr('aria-label', d => `${d.name}: $${d.totalSpent.toFixed(2)} total`);
        
        // Animate width
        bars.transition()
            .duration(800)
            .delay((d, i) => i * 50)
            .attr('width', d => x(d.totalSpent));
        
        // Add value labels on bars
        svg.selectAll('.label')
            .data(data)
            .enter()
            .append('text')
            .attr('class', 'label')
            .attr('x', d => x(d.totalSpent) + 5)
            .attr('y', d => y(d.name) + y.bandwidth() / 2)
            .attr('dy', '0.35em')
            .style('font-size', '11px')
            .style('fill', 'var(--color-text-secondary)')
            .text(d => `$${d.totalSpent.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
        
        // Tooltip show handler
        function showBarTooltip(event, d) {
            const rows = [
                { label: 'Total Spent', value: `$${d.totalSpent.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` },
                { label: 'Quantity', value: `${d.totalQuantity.toLocaleString()} units` },
                { label: 'Purchases', value: `${d.purchases} times` },
                { label: 'Avg Price', value: `$${d.avgPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}/unit` },
                { label: 'Price Range', value: `$${d.minPrice.toFixed(2)} - $${d.maxPrice.toFixed(2)}` }
            ];
            showTooltip(tooltip, d.name, rows, event, chart.container);
        }
        
        // Add interactivity
        bars.on('mouseover', function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('opacity', 1)
                    .attr('fill', 'var(--color-primary-dark)');
                showBarTooltip(event, d);
            })
            .on('mousemove', function(event) {
                positionTooltip(tooltip, event, chart.container);
            })
            .on('mouseout', function() {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('opacity', 0.8)
                    .attr('fill', 'var(--color-primary)');
                hideTooltip(tooltip);
            })
            .on('focus', function(event) {
                const d = d3.select(this).datum();
                d3.select(this).attr('opacity', 1).attr('fill', 'var(--color-primary-dark)');
                showBarTooltip(event, d);
            })
            .on('blur', function() {
                d3.select(this).attr('opacity', 0.8).attr('fill', 'var(--color-primary)');
                hideTooltip(tooltip);
            })
            .on('click', function(event, d) {
                EventBus.emit('chart:itemClicked', {
                    itemNumber: d.itemNumber,
                    itemName: d.name,
                    data: d
                });
            });
        
        // Update function
        chart.update = function(newData) {
            createTopItemsChart({ ...chart, data: newData });
        };
        
        // Destroy function
        chart.destroy = function() {
            if (tooltip) tooltip.remove();
            if (svg) svg.remove();
        };
        
        console.log(`Top items chart created with ${data.length} items`);
    }
    
    /**
     * Create frequent items chart (by purchase count)
     */
    function createFrequentItemsChart(chart) {
        console.log('=== CREATING FREQUENT ITEMS BAR CHART ===');
        const data = chart.data || [];
        
        if (data.length === 0) {
            chart.container.innerHTML = '<p style="text-align:center;padding:2rem;color:var(--color-text-tertiary);">No data available</p>';
            return;
        }
        
        // Clear container
        chart.container.innerHTML = '';
        
        // Get container dimensions
        const containerWidth = chart.container.clientWidth;
        const containerHeight = Math.max(chart.container.clientHeight, 400);
        
        // Guard: Skip rendering if container is hidden (zero width)
        if (containerWidth <= 0) {
            console.warn('Chart container has zero width (likely hidden tab). Deferring render.');
            chart.needsRender = true;
            return;
        }
        
        // Set margins
        const margin = { top: 20, right: 30, bottom: 40, left: 200 };
        const width = containerWidth - margin.left - margin.right;
        const height = containerHeight - margin.top - margin.bottom;
        
        // Create SVG
        const svg = d3.select(chart.container)
            .append('svg')
            .attr('width', containerWidth)
            .attr('height', containerHeight)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        chart.svg = svg;
        
        // Create scales (using purchases instead of totalSpent)
        const x = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.purchases) * 1.1])
            .range([0, width]);
        
        const y = d3.scaleBand()
            .domain(data.map(d => d.name))
            .range([0, height])
            .padding(0.2);
        
        // Add x-axis
        svg.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x)
                .ticks(5)
                .tickFormat(d => `${d} times`));
        
        // Add y-axis
        svg.append('g')
            .attr('class', 'y-axis')
            .call(d3.axisLeft(y))
            .selectAll('text')
            .style('font-size', '12px')
            .text(d => d.length > 30 ? d.substring(0, 30) + '...' : d);
        
        // Add grid lines
        svg.append('g')
            .attr('class', 'grid')
            .attr('opacity', 0.1)
            .call(d3.axisBottom(x)
                .ticks(5)
                .tickSize(height)
                .tickFormat(''));
        
        // Tooltip (using standardized factory)
        const tooltip = createChartTooltip(chart.container);
        
        // Tooltip show handler
        function showFrequentTooltip(event, d) {
            showTooltip(tooltip, d.name, [
                { label: 'Purchased', value: `${d.purchases} times` },
                { label: 'Total Spent', value: `$${d.totalSpent.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` },
                { label: 'Quantity', value: `${d.totalQuantity.toLocaleString()} units` },
                { label: 'Avg Price', value: `$${d.avgPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}/unit` },
                { label: 'Price Range', value: `$${d.minPrice.toFixed(2)} - $${d.maxPrice.toFixed(2)}` }
            ], event, chart.container);
        }
        
        // Add bars with animation (using secondary color for distinction)
        const bars = svg.selectAll('.bar')
            .data(data)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', 0)
            .attr('y', d => y(d.name))
            .attr('width', 0)
            .attr('height', y.bandwidth())
            .attr('fill', 'var(--color-secondary)')
            .attr('opacity', 0.8)
            .style('cursor', 'pointer')
            .attr('tabindex', '0')
            .attr('role', 'button')
            .attr('aria-label', d => `${d.name}: purchased ${d.purchases} times`);
        
        // Animate width
        bars.transition()
            .duration(800)
            .delay((d, i) => i * 50)
            .attr('width', d => x(d.purchases));
        
        // Add value labels on bars
        svg.selectAll('.label')
            .data(data)
            .enter()
            .append('text')
            .attr('class', 'label')
            .attr('x', d => x(d.purchases) + 5)
            .attr('y', d => y(d.name) + y.bandwidth() / 2)
            .attr('dy', '0.35em')
            .style('font-size', '11px')
            .style('fill', 'var(--color-text-secondary)')
            .text(d => `${d.purchases}x`);
        
        // Add interactivity
        bars.on('mouseover', function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('opacity', 1)
                    .attr('fill', '#d97706');
                showFrequentTooltip(event, d);
            })
            .on('mousemove', function(event) {
                positionTooltip(tooltip, event, chart.container);
            })
            .on('mouseout', function() {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('opacity', 0.8)
                    .attr('fill', 'var(--color-secondary)');
                hideTooltip(tooltip);
            })
            .on('focus', function(event) {
                const d = d3.select(this).datum();
                d3.select(this).attr('opacity', 1).attr('fill', '#d97706');
                showFrequentTooltip(event, d);
            })
            .on('blur', function() {
                d3.select(this).attr('opacity', 0.8).attr('fill', 'var(--color-secondary)');
                hideTooltip(tooltip);
            })
            .on('click', function(event, d) {
                EventBus.emit('chart:itemClicked', {
                    itemNumber: d.itemNumber,
                    itemName: d.name,
                    data: d
                });
            })
            .on('keydown', function(event) {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    const d = d3.select(this).datum();
                    EventBus.emit('chart:itemClicked', {
                        itemNumber: d.itemNumber,
                        itemName: d.name,
                        data: d
                    });
                }
            });
        
        // Update function
        chart.update = function(newData) {
            createFrequentItemsChart({ ...chart, data: newData });
        };
        
        // Destroy function
        chart.destroy = function() {
            if (tooltip) tooltip.remove();
            if (svg) svg.remove();
        };
        
        console.log(`Frequent items chart created with ${data.length} items`);
    }
    
    /**
     * Create category breakdown chart (treemap)
     */
    function createCategoryChart(chart) {
        console.log('=== CREATING CATEGORY BREAKDOWN CHART ===');
        const receipts = chart.data || [];
        
        if (receipts.length === 0) {
            chart.container.innerHTML = '<p style="text-align:center;padding:2rem;color:var(--color-text-tertiary);">No data available</p>';
            return;
        }
        
        // Build hierarchical data by department with item details (net of returns)
        const deptMap = new Map();
        receipts.forEach(receipt => {
            if (Array.isArray(receipt.itemArray)) {
                receipt.itemArray.forEach(item => {
                    if (item.isDiscount) return;
                    const dept = item.itemDepartmentNumber || 0;
                    if (!deptMap.has(dept)) {
                        deptMap.set(dept, {
                            department: dept,
                            name: getDepartmentName(dept),
                            value: 0,
                            items: 0,
                            itemList: [] // Store individual items for drill-down
                        });
                    }
                    const deptData = deptMap.get(dept);
                    
                    // Check if this is a return/refund
                    const amount = Number(item.amount) || 0;
                    // item.unit is already normalized to a number (defaults to 1 for "EA", etc.)
                    const quantity = Number(item.unit) || 1; // Default to 1 if unit is 0 or NaN
                    const isRefund = (receipt.transactionType === 'Refund' ||
                                     receipt.transactionType === 'Return' ||
                                     receipt.transactionType === 'Returned' ||
                                     (receipt.total || 0) < 0 ||
                                     amount < 0 ||
                                     quantity < 0); // Also check if quantity is negative
                    
                    // Net aggregation: subtract returns
                    if (isRefund) {
                        deptData.value -= Math.abs(amount);
                        deptData.items -= Math.abs(quantity);
                    } else {
                        deptData.value += amount;
                        deptData.items += Math.abs(quantity);
                    }
                    
                    // Store item details for drill-down
                    deptData.itemList.push({
                        name: item.normalizedName,
                        itemNumber: item.itemNumber,
                        image: item.fullItemImage || null,
                        amount: amount,
                        quantity: quantity, // Keep sign for proper aggregation
                        unitPrice: item.unitPrice || 0,
                        date: receipt.transactionDateTime,
                        isRefund: isRefund
                    });
                });
            }
        });
        
        const data = Array.from(deptMap.values())
            .map(d => ({
                ...d,
                value: Math.max(0, d.value), // Ensure non-negative for display
                items: Math.max(0, d.items)
            }))
            .filter(d => d.value > 0) // Only show departments with net positive spend
            .sort((a, b) => b.value - a.value)
            .slice(0, 20); // Top 20 departments
        
        if (data.length === 0) {
            chart.container.innerHTML = '<p style="text-align:center;padding:2rem;color:var(--color-text-tertiary);">No category data available</p>';
            return;
        }
        
        // Clear container
        chart.container.innerHTML = '';
        
        // Get dimensions
        const containerWidth = chart.container.clientWidth;
        const containerHeight = Math.max(chart.container.clientHeight, 400);
        
        // Guard: Skip rendering if container is hidden (zero width)
        if (containerWidth <= 0) {
            console.warn('Chart container has zero width (likely hidden tab). Deferring render.');
            chart.needsRender = true;
            return;
        }
        
        const margin = { top: 10, right: 10, bottom: 10, left: 10 };
        const width = containerWidth - margin.left - margin.right;
        const height = containerHeight - margin.top - margin.bottom;
        
        // Create SVG
        const svg = d3.select(chart.container)
            .append('svg')
            .attr('width', containerWidth)
            .attr('height', containerHeight)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        chart.svg = svg;
        
        // Create hierarchy
        const root = d3.hierarchy({ children: data })
            .sum(d => d.value)
            .sort((a, b) => b.value - a.value);
        
        // Create treemap layout
        d3.treemap()
            .size([width, height])
            .padding(2)
            .round(true)(root);
        
        // Color scale
        const color = d3.scaleOrdinal(d3.schemeCategory10);
        
        // Tooltip (using standardized factory)
        const tooltip = createChartTooltip(chart.container);
        
        // Tooltip show handler
        function showCellTooltip(event, d) {
            showTooltip(tooltip, d.data.name, [
                { label: 'Total Spent', value: `$${d.data.value.toLocaleString('en-US', {minimumFractionDigits: 2})}` },
                { label: 'Items', value: d.data.items },
                { label: '', value: '👆 Click to see items', className: 'positive' }
            ], event, chart.container);
        }
        
        // Create cells
        const cell = svg.selectAll('g')
            .data(root.leaves())
            .enter()
            .append('g')
            .attr('transform', d => `translate(${d.x0},${d.y0})`);
        
        // Add rectangles
        cell.append('rect')
            .attr('width', d => d.x1 - d.x0)
            .attr('height', d => d.y1 - d.y0)
            .attr('fill', d => color(d.data.department))
            .attr('opacity', 0.8)
            .style('cursor', 'pointer')
            .attr('tabindex', '0')
            .attr('role', 'button')
            .attr('aria-label', d => `${d.data.name}: $${d.data.value.toFixed(2)}`)
            .on('mouseover', function(event, d) {
                d3.select(this).attr('opacity', 1);
                showCellTooltip(event, d);
            })
            .on('mousemove', function(event) {
                positionTooltip(tooltip, event, chart.container);
            })
            .on('mouseout', function() {
                d3.select(this).attr('opacity', 0.8);
                hideTooltip(tooltip);
            })
            .on('focus', function(event) {
                const d = d3.select(this).datum();
                d3.select(this).attr('opacity', 1);
                showCellTooltip(event, d);
            })
            .on('blur', function() {
                d3.select(this).attr('opacity', 0.8);
                hideTooltip(tooltip);
            })
            .on('click', function(event, d) {
                hideTooltip(tooltip);
                showDepartmentDrillDown(d.data, chart.container);
            })
            .on('keydown', function(event) {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    const d = d3.select(this).datum();
                    hideTooltip(tooltip);
                    showDepartmentDrillDown(d.data, chart.container);
                }
            });
        
        // Add text labels (for larger cells)
        cell.append('text')
            .attr('x', 4)
            .attr('y', 16)
            .style('font-size', '11px')
            .style('fill', 'white')
            .style('font-weight', 'bold')
            .style('pointer-events', 'none')
            .text(d => {
                const width = d.x1 - d.x0;
                const height = d.y1 - d.y0;
                if (width > 50 && height > 30) {
                    const name = d.data.name || getDepartmentName(d.data.department);
                    // Truncate if too long for cell
                    const maxLength = Math.floor(width / 6);
                    return name.length > maxLength ? name.substring(0, maxLength - 3) + '...' : name;
                }
                return '';
            });
        
        cell.append('text')
            .attr('x', 4)
            .attr('y', 30)
            .style('font-size', '10px')
            .style('fill', 'white')
            .style('pointer-events', 'none')
            .text(d => {
                const width = d.x1 - d.x0;
                const height = d.y1 - d.y0;
                return (width > 60 && height > 45) ? `$${(d.data.value/1000).toFixed(1)}k` : '';
            });
        
        // Update function
        chart.update = function(newData) {
            createCategoryChart({ ...chart, data: newData });
        };
        
        // Destroy function
        chart.destroy = function() {
            if (tooltip) tooltip.remove();
            if (svg) svg.remove();
        };
        
        console.log(`Category chart created with ${data.length} departments`);
    }
    
    /**
     * Show drill-down modal for department items
     */
    function showDepartmentDrillDown(departmentData, container) {
        // Create modal overlay
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
        `;
        
        // Aggregate items by item number
        const itemMap = new Map();
        departmentData.itemList.forEach(item => {
            if (!itemMap.has(item.itemNumber)) {
                itemMap.set(item.itemNumber, {
                    name: item.name,
                    itemNumber: item.itemNumber,
                    image: item.image || null,
                    totalAmount: 0,
                    totalQuantity: 0,
                    purchases: 0,
                    returns: 0,
                    avgPrice: 0
                });
            }
            const agg = itemMap.get(item.itemNumber);
            if (!agg.image && item.image) {
                agg.image = item.image;
            }
            
            // Net aggregation: subtract returns
            if (item.isRefund) {
                agg.totalAmount -= Math.abs(item.amount);
                agg.totalQuantity -= Math.abs(item.quantity);
                agg.returns++;
            } else {
            agg.totalAmount += item.amount;
            agg.totalQuantity += item.quantity;
            agg.purchases++;
            }
        });
        
        // Calculate averages and sort (net of returns)
        const items = Array.from(itemMap.values())
            .map(item => {
                const netQty = item.totalQuantity; // preserve sign
                const netAmt = item.totalAmount;
                return {
            ...item,
                    totalAmount: netAmt,
                    totalQuantity: netQty,
                    avgPrice: netQty > 0 ? netAmt / netQty : 0
                };
            })
            // Only show items with positive net qty and net amount
            .filter(item => item.totalQuantity > 0 && item.totalAmount > 0)
            // Sort by net amount descending
            .sort((a, b) => b.totalAmount - a.totalAmount);
        
        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: var(--color-surface);
            border-radius: var(--radius-lg);
            max-width: 900px;
            width: 100%;
            max-height: 80vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            box-shadow: var(--shadow-xl);
        `;
        
        // Header
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 1.5rem;
            border-bottom: 1px solid var(--color-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        header.innerHTML = `
            <div>
                <h3 style="margin: 0; font-size: 1.25rem; color: var(--color-text-primary);">
                    ${departmentData.name || getDepartmentName(departmentData.department)} Items
                </h3>
                <p style="margin: 0.5rem 0 0 0; font-size: 0.875rem; color: var(--color-text-tertiary);">
                    ${items.length} unique items • $${Math.max(0, departmentData.value).toLocaleString('en-US', {minimumFractionDigits: 2})} net total
                </p>
            </div>
            <button id="close-drill-down" style="
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                color: var(--color-text-secondary);
                padding: 0;
                width: 2rem;
                height: 2rem;
                display: flex;
                align-items: center;
                justify-content: center;
            ">&times;</button>
        `;
        
        // Content (scrollable table)
        const content = document.createElement('div');
        content.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 1.5rem;
        `;
        
        const table = document.createElement('table');
        table.style.cssText = `
            width: 100%;
            border-collapse: collapse;
        `;
        
        // Table header
        table.innerHTML = `
            <thead>
                <tr style="border-bottom: 2px solid var(--color-border);">
                    <th style="text-align: left; padding: 0.75rem; font-weight: 600; color: var(--color-text-secondary);">Item</th>
                    <th style="text-align: right; padding: 0.75rem; font-weight: 600; color: var(--color-text-secondary);">Net Qty</th>
                    <th style="text-align: right; padding: 0.75rem; font-weight: 600; color: var(--color-text-secondary);">Avg Price</th>
                    <th style="text-align: right; padding: 0.75rem; font-weight: 600; color: var(--color-text-secondary);">Net Total</th>
                </tr>
            </thead>
            <tbody>
                ${items.map(item => `
                    <tr style="border-bottom: 1px solid var(--color-border);">
                        <td style="padding: 0.75rem; display: flex; align-items: center; gap: 0.75rem;">
                            ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width: 48px; height: 48px; object-fit: contain; border: 1px solid var(--color-border); border-radius: 6px; background: white;">` : ''}
                            <div>
                            <div style="font-weight: 500; color: var(--color-text-primary);">${item.name}</div>
                            <div style="font-size: 0.75rem; color: var(--color-text-tertiary);">#${item.itemNumber}</div>
                            </div>
                        </td>
                        <td style="text-align: right; padding: 0.75rem; font-weight: 600; color: var(--color-text-primary);">${item.totalQuantity.toFixed(1)}</td>
                        <td style="text-align: right; padding: 0.75rem; color: var(--color-text-secondary);">$${item.avgPrice.toFixed(2)}</td>
                        <td style="text-align: right; padding: 0.75rem; font-weight: 600; color: var(--color-primary);">$${item.totalAmount.toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        
        content.appendChild(table);
        
        // Assemble modal
        modalContent.appendChild(header);
        modalContent.appendChild(content);
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Close handlers
        const closeModal = () => {
            document.body.removeChild(modal);
        };
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        
        document.getElementById('close-drill-down').addEventListener('click', closeModal);
        
        // ESC key handler
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }
    
    /**
     * Show item detail drilldown panel
     * @param {Object} itemData - Item data from chart
     * @param {Array} allReceipts - All receipts to find purchase history
     */
    function showItemDrillDown(itemData, allReceipts) {
        // Find all purchases of this item
        const purchases = [];
        allReceipts.forEach(receipt => {
            if (!receipt.itemArray) return;
            receipt.itemArray.forEach(item => {
                if (item.itemNumber === itemData.itemNumber && !item.isDiscount) {
                    purchases.push({
                        date: receipt.transactionDateTime,
                        dateStr: receipt.transactionDateISO || receipt.transactionDate,
                        warehouse: receipt.warehouseName || receipt.warehouse || 'Unknown',
                        price: item.unitPrice || item.amount,
                        quantity: item.unit || 1,
                        amount: item.amount,
                        channel: receipt.channel || 'warehouse'
                    });
                }
            });
        });
        
        // Sort by date descending
        purchases.sort((a, b) => (b.date || 0) - (a.date || 0));
        
        // Calculate price stats
        const prices = purchases.map(p => p.price).filter(p => p > 0);
        const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
        const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
        const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
        
        // Create drilldown panel
        const overlay = document.createElement('div');
        overlay.className = 'drilldown-overlay';
        
        const panel = document.createElement('div');
        panel.className = 'drilldown-panel';
        panel.innerHTML = `
            <div class="drilldown-header">
                <h3 class="drilldown-title">🏷️ ${itemData.name || 'Item'}</h3>
                <button class="drilldown-close" aria-label="Close">&times;</button>
            </div>
            <div class="drilldown-content">
                <div class="drilldown-section">
                    <div class="drilldown-section-title">📊 Summary</div>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                        <div class="stat-card" style="padding: 1rem;">
                            <div class="stat-label">Item Number</div>
                            <div class="stat-value" style="font-size: 1rem;">#${itemData.itemNumber}</div>
                        </div>
                        <div class="stat-card" style="padding: 1rem;">
                            <div class="stat-label">Times Purchased</div>
                            <div class="stat-value" style="font-size: 1rem;">${purchases.length}</div>
                        </div>
                        <div class="stat-card" style="padding: 1rem;">
                            <div class="stat-label">Total Spent</div>
                            <div class="stat-value" style="font-size: 1rem;">$${itemData.totalSpent?.toFixed(2) || '0.00'}</div>
                        </div>
                        <div class="stat-card" style="padding: 1rem;">
                            <div class="stat-label">Total Quantity</div>
                            <div class="stat-value" style="font-size: 1rem;">${itemData.totalQuantity?.toFixed(1) || '0'}</div>
                        </div>
                    </div>
                </div>
                
                <div class="drilldown-section">
                    <div class="drilldown-section-title">💰 Price Analysis</div>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
                        <div style="text-align: center; padding: 1rem; background: var(--color-surface-elevated); border-radius: var(--radius-md);">
                            <div style="font-size: 0.75rem; color: var(--color-text-secondary);">Min Price</div>
                            <div style="font-size: 1.25rem; font-weight: 600; color: var(--color-success);">$${minPrice.toFixed(2)}</div>
                        </div>
                        <div style="text-align: center; padding: 1rem; background: var(--color-surface-elevated); border-radius: var(--radius-md);">
                            <div style="font-size: 0.75rem; color: var(--color-text-secondary);">Avg Price</div>
                            <div style="font-size: 1.25rem; font-weight: 600; color: var(--color-primary);">$${avgPrice.toFixed(2)}</div>
                        </div>
                        <div style="text-align: center; padding: 1rem; background: var(--color-surface-elevated); border-radius: var(--radius-md);">
                            <div style="font-size: 0.75rem; color: var(--color-text-secondary);">Max Price</div>
                            <div style="font-size: 1.25rem; font-weight: 600; color: var(--color-error);">$${maxPrice.toFixed(2)}</div>
                        </div>
                    </div>
                </div>
                
                <div class="drilldown-section">
                    <div class="drilldown-section-title">📅 Purchase History</div>
                    <div style="max-height: 300px; overflow-y: auto;">
                        <table style="width: 100%; font-size: 0.85rem; border-collapse: collapse;">
                            <thead style="position: sticky; top: 0; background: var(--color-surface);">
                                <tr style="border-bottom: 2px solid var(--color-border);">
                                    <th style="text-align: left; padding: 0.5rem;">Date</th>
                                    <th style="text-align: left; padding: 0.5rem;">Location</th>
                                    <th style="text-align: right; padding: 0.5rem;">Qty</th>
                                    <th style="text-align: right; padding: 0.5rem;">Price</th>
                                    <th style="text-align: right; padding: 0.5rem;">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${purchases.slice(0, 50).map(p => `
                                    <tr style="border-bottom: 1px solid var(--color-border);">
                                        <td style="padding: 0.5rem; color: var(--color-text-secondary);">${p.dateStr || 'Unknown'}</td>
                                        <td style="padding: 0.5rem;">${p.warehouse}</td>
                                        <td style="text-align: right; padding: 0.5rem;">${p.quantity}</td>
                                        <td style="text-align: right; padding: 0.5rem;">$${p.price?.toFixed(2) || '—'}</td>
                                        <td style="text-align: right; padding: 0.5rem; font-weight: 500;">$${p.amount?.toFixed(2) || '—'}</td>
                                    </tr>
                                `).join('')}
                                ${purchases.length > 50 ? `<tr><td colspan="5" style="padding: 1rem; text-align: center; color: var(--color-text-tertiary);">+ ${purchases.length - 50} more purchases</td></tr>` : ''}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        document.body.appendChild(panel);
        
        // Trigger animation
        requestAnimationFrame(() => {
            overlay.classList.add('visible');
            panel.classList.add('open');
        });
        
        // Close handlers
        const closePanel = () => {
            overlay.classList.remove('visible');
            panel.classList.remove('open');
            setTimeout(() => {
                overlay.remove();
                panel.remove();
            }, 300);
        };
        
        overlay.addEventListener('click', closePanel);
        panel.querySelector('.drilldown-close').addEventListener('click', closePanel);
        
        // ESC key handler
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                closePanel();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }
    
    /**
     * Show warehouse detail drilldown panel
     * @param {Object} warehouseData - Warehouse data from chart
     * @param {Array} allReceipts - All receipts to find warehouse history
     */
    function showWarehouseDrillDown(warehouseData, allReceipts) {
        // Find all receipts from this warehouse
        const warehouseReceipts = allReceipts.filter(r => {
            if (warehouseData.warehouseNumber === 'ONLINE') {
                // Filter for online orders
                return r.channel === 'online' || 
                       r.documentType === 'ONLINE' || 
                       r.documentType === 'OnlineReceipts' ||
                       r.warehouseName === 'Online';
            } else {
                return r.warehouseNumber === warehouseData.warehouseNumber ||
                       r.warehouse === warehouseData.warehouseNumber;
            }
        });
        
        // Calculate top items at this warehouse
        const itemMap = new Map();
        warehouseReceipts.forEach(receipt => {
            if (!receipt.itemArray) return;
            receipt.itemArray.forEach(item => {
                if (item.isDiscount || !item.itemNumber) return;
                if (!itemMap.has(item.itemNumber)) {
                    itemMap.set(item.itemNumber, {
                        name: item.normalizedName || item.itemDescription01,
                        itemNumber: item.itemNumber,
                        totalSpent: 0,
                        purchases: 0
                    });
                }
                const data = itemMap.get(item.itemNumber);
                data.totalSpent += Math.abs(item.amount || 0);
                data.purchases++;
            });
        });
        
        const topItems = Array.from(itemMap.values())
            .sort((a, b) => b.totalSpent - a.totalSpent)
            .slice(0, 10);
        
        // Monthly spending at this warehouse
        const monthlySpend = {};
        warehouseReceipts.forEach(r => {
            if (!r.transactionDateTime) return;
            const date = new Date(r.transactionDateTime);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlySpend[monthKey] = (monthlySpend[monthKey] || 0) + Math.abs(Number(r.total) || 0);
        });
        
        // Create drilldown panel
        const overlay = document.createElement('div');
        overlay.className = 'drilldown-overlay';
        
        const panel = document.createElement('div');
        panel.className = 'drilldown-panel';
        const isOnline = warehouseData.warehouseNumber === 'ONLINE' || warehouseData.warehouseName === 'Online';
        const title = isOnline ? '🛒 Online Orders' : `🏪 ${warehouseData.warehouseName || 'Warehouse'} #${warehouseData.warehouseNumber}`;
        
        panel.innerHTML = `
            <div class="drilldown-header">
                <h3 class="drilldown-title">${title}</h3>
                <button class="drilldown-close" aria-label="Close">&times;</button>
            </div>
            <div class="drilldown-content">
                <div class="drilldown-section">
                    <div class="drilldown-section-title">📍 Location</div>
                    <p style="color: var(--color-text-secondary); margin: 0;">
                        ${isOnline ? 'Online Orders' : (warehouseData.warehouseCity || '') + (warehouseData.warehouseCity && warehouseData.warehouseState ? ', ' : '') + (warehouseData.warehouseState || '')}
                    </p>
                </div>
                
                <div class="drilldown-section">
                    <div class="drilldown-section-title">📊 Summary</div>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                        <div class="stat-card" style="padding: 1rem;">
                            <div class="stat-label">Trips (unique days)</div>
                            <div class="stat-value" style="font-size: 1rem;">${warehouseData.tripCount ?? 0}</div>
                        </div>
                        <div class="stat-card" style="padding: 1rem;">
                            <div class="stat-label">Receipts</div>
                            <div class="stat-value" style="font-size: 1rem;">${warehouseData.receiptCount ?? 0}</div>
                        </div>
                        <div class="stat-card" style="padding: 1rem;">
                            <div class="stat-label">Total Spent</div>
                            <div class="stat-value" style="font-size: 1rem;">$${warehouseData.totalSpent?.toLocaleString('en-US', {minimumFractionDigits: 2}) || '0.00'}</div>
                        </div>
                        <div class="stat-card" style="padding: 1rem;">
                            <div class="stat-label">Avg Per Trip</div>
                            <div class="stat-value" style="font-size: 1rem;">$${warehouseData.avgPerTrip?.toFixed(2) || '0.00'}</div>
                        </div>
                    </div>
                </div>
                
                <div class="drilldown-section">
                    <div class="drilldown-section-title">🏆 Top Items at This Location</div>
                    <div style="max-height: 250px; overflow-y: auto;">
                        <table style="width: 100%; font-size: 0.85rem; border-collapse: collapse;">
                            <thead style="position: sticky; top: 0; background: var(--color-surface);">
                                <tr style="border-bottom: 2px solid var(--color-border);">
                                    <th style="text-align: left; padding: 0.5rem;">Item</th>
                                    <th style="text-align: right; padding: 0.5rem;">Purchases</th>
                                    <th style="text-align: right; padding: 0.5rem;">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${topItems.map(item => `
                                    <tr style="border-bottom: 1px solid var(--color-border);">
                                        <td style="padding: 0.5rem;">
                                            <div style="font-weight: 500;">${item.name || 'Unknown'}</div>
                                            <div style="font-size: 0.7rem; color: var(--color-text-tertiary);">#${item.itemNumber}</div>
                                        </td>
                                        <td style="text-align: right; padding: 0.5rem;">${item.purchases}</td>
                                        <td style="text-align: right; padding: 0.5rem; font-weight: 500; color: var(--color-primary);">$${item.totalSpent.toFixed(2)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        document.body.appendChild(panel);
        
        // Trigger animation
        requestAnimationFrame(() => {
            overlay.classList.add('visible');
            panel.classList.add('open');
        });
        
        // Close handlers
        const closePanel = () => {
            overlay.classList.remove('visible');
            panel.classList.remove('open');
            setTimeout(() => {
                overlay.remove();
                panel.remove();
            }, 300);
        };
        
        overlay.addEventListener('click', closePanel);
        panel.querySelector('.drilldown-close').addEventListener('click', closePanel);
        
        // ESC key handler
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                closePanel();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }
    
    /**
     * Create calendar heatmap
     */
    function createCalendarHeatmap(chart) {
        console.log('=== CREATING CALENDAR HEATMAP ===');
        const receipts = chart.data || [];
        
        if (receipts.length === 0) {
            chart.container.innerHTML = '<p style="text-align:center;padding:2rem;color:var(--color-text-tertiary);">No data available</p>';
            return;
        }
        
        // Clear container
        chart.container.innerHTML = '';
        
        // Guard: Skip rendering if container is hidden (zero width)
        const containerWidth = chart.container.clientWidth;
        if (containerWidth <= 0) {
            console.warn('Chart container has zero width (likely hidden tab). Deferring render.');
            chart.needsRender = true;
            return;
        }
        
        // Determine metric (visits, spend, items)
        const metricSelect = document.getElementById('calendar-metric');
        // Bind change listener once to refresh chart on metric switch
        if (metricSelect && !metricSelect.dataset.boundCalendarMetric) {
            metricSelect.addEventListener('change', () => {
                // Re-render using existing data; createCalendarHeatmap will read the new metric value
                chart.update(chart.data);
            });
            metricSelect.dataset.boundCalendarMetric = 'true';
        }
        const metric = metricSelect ? metricSelect.value : 'visits';
        const metricLabels = {
            visits: { label: 'Trips', formatter: v => `${v} trip${v === 1 ? '' : 's'}` },
            spend: { label: 'Spent', formatter: v => `$${v.toFixed(2)}` },
            items: { label: 'Items', formatter: v => `${v} item${v === 1 ? '' : 's'}` }
        };
        const metricLabel = metricLabels[metric] || metricLabels.visits;
        
        // Get date range (cap to avoid squishing long timelines)
        const dates = receipts.map(r => r.transactionDateTime).filter(d => d);
        dates.sort((a, b) => a - b);
        const maxDate = new Date(dates[dates.length - 1]);
        const minDateOriginal = new Date(dates[0]);
        
        // If more than 12 months span, show only the last 12 months for readability
        const maxMonthsToShow = 12;
        const monthsDiffTotal = (maxDate.getFullYear() - minDateOriginal.getFullYear()) * 12 +
            (maxDate.getMonth() - minDateOriginal.getMonth());
        
        let cappedReceipts = receipts;
        const minDate = new Date(minDateOriginal);
        if (monthsDiffTotal > maxMonthsToShow) {
            const cutoff = new Date(maxDate);
            cutoff.setMonth(cutoff.getMonth() - (maxMonthsToShow - 1));
            cutoff.setDate(1); // start at beginning of month
            cappedReceipts = receipts.filter(r => r.transactionDateTime && r.transactionDateTime >= cutoff && r.transactionDateTime <= maxDate);
            minDate.setTime(cutoff.getTime());
        }
        
        // Aggregate metric by date (using capped receipts)
        const dateMap = new Map();
        cappedReceipts.forEach(receipt => {
            if (!receipt.transactionDateTime) return;
            const date = new Date(receipt.transactionDateTime);
            const dateStr = date.toISOString().split('T')[0];
            if (!dateMap.has(dateStr)) {
                dateMap.set(dateStr, { date: new Date(dateStr), value: 0, count: 0, receipts: [], items: 0, spend: 0 });
            }
            const dayData = dateMap.get(dateStr);
            // Metric calculations
            if (metric === 'spend') {
                dayData.value += Math.abs(Number(receipt.total) || 0);
            } else if (metric === 'items') {
                const itemsCount = receipt.totalItemCount
                    || (receipt.itemArray ? receipt.itemArray.reduce((sum, it) => sum + Math.abs(Number(it.unit || 0)), 0) : 0);
                dayData.value += itemsCount;
            } else {
                // visits
                dayData.value += 1;
            }
            
            dayData.count++; // visits/trips
            dayData.spend += Math.abs(Number(receipt.total) || 0);
            dayData.items += receipt.totalItemCount
                || (receipt.itemArray ? receipt.itemArray.reduce((sum, it) => sum + Math.abs(Number(it.unit || 0)), 0) : 0);
            dayData.receipts.push(receipt);
        });
        
        // Start from the first day of the week containing minDate
        const startDate = new Date(minDate);
        startDate.setDate(startDate.getDate() - startDate.getDay()); // Go to Sunday
        
        // End at the last day of the week containing maxDate
        const endDate = new Date(maxDate);
        endDate.setDate(endDate.getDate() + (6 - endDate.getDay())); // Go to Saturday
        
        // Calculate number of weeks
        const weeks = Math.ceil((endDate - startDate) / (7 * 24 * 60 * 60 * 1000));
        
        // Calculate dimensions, scaling cell size to fill width
        const dayLabelWidth = 30;
        const monthLabelHeight = 20;
        const cellGap = 3;
        const availableWidth = Math.max(containerWidth - dayLabelWidth - 20, 320);
        const cellSize = Math.min(20, Math.max(12, (availableWidth / weeks) - cellGap));
        const cellTotal = cellSize + cellGap;
        const widthForCells = dayLabelWidth + (weeks * cellTotal) + 20;
        const height = monthLabelHeight + (7 * cellTotal) + 20;
        
        // Create SVG that fills container width
        const viewWidth = Math.max(widthForCells, containerWidth);
        const svg = d3.select(chart.container)
            .append('svg')
            .attr('width', '100%')
            .attr('height', height)
            .attr('viewBox', `0 0 ${viewWidth} ${height}`)
            .attr('preserveAspectRatio', 'xMinYMin meet')
            .style('max-width', '100%')
            .style('display', 'block');
        
        chart.svg = svg;
        
        const g = svg.append('g')
            .attr('transform', `translate(${dayLabelWidth}, ${monthLabelHeight})`);
        
        // Create color scale based on spending
        const maxValue = d3.max(Array.from(dateMap.values()), d => d.value) || 1;
        const colorScale = d3.scaleQuantize()
            .domain([0, maxValue])
            .range(['#ebedf0', '#c6e48b', '#7bc96f', '#239a3b', '#196127']);
        
        // Day labels
        const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        svg.append('g')
            .attr('transform', `translate(0, ${monthLabelHeight})`)
            .selectAll('text')
            .data(dayLabels)
            .enter()
            .append('text')
            .attr('x', 5)
            .attr('y', (d, i) => i * cellTotal + cellSize)
            .attr('text-anchor', 'start')
            .attr('font-size', '10px')
            .attr('fill', 'var(--color-text-secondary)')
            .text(d => d);
        
        // Generate all days in range
        const allDays = [];
        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const dayData = dateMap.get(dateStr) || { 
                date: new Date(currentDate), 
                value: 0, 
                count: 0,
                receipts: []
            };
            allDays.push(dayData);
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        // Create tooltip
        const tooltip = createChartTooltip(chart.container);
        
        // Draw cells
        const cells = g.selectAll('rect')
            .data(allDays)
            .enter()
            .append('rect')
            .attr('width', cellSize)
            .attr('height', cellSize)
            .attr('x', d => {
                const weekIndex = Math.floor((d.date - startDate) / (7 * 24 * 60 * 60 * 1000));
                return weekIndex * cellTotal;
            })
            .attr('y', d => d.date.getDay() * cellTotal)
            .attr('rx', 2)
            .attr('ry', 2)
            .attr('fill', d => d.count > 0 ? colorScale(d.value) : '#ebedf0')
            .attr('stroke', '#fff')
            .attr('stroke-width', 1)
            .attr('tabindex', d => d.count > 0 ? '0' : null)
            .attr('role', d => d.count > 0 ? 'button' : null)
            .attr('aria-label', d => {
                if (d.count === 0) return null;
                const dateStr = d.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                return `${dateStr}: ${d.count} trip${d.count > 1 ? 's' : ''}, $${d.value.toFixed(2)} spent`;
            })
            .style('cursor', d => d.count > 0 ? 'pointer' : 'default')
            .on('mouseover', function(event, d) {
                if (d.count === 0) return;
                
                d3.select(this)
                    .attr('stroke', '#000')
                    .attr('stroke-width', 2);
                
                const dateStr = d.date.toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                });
                
                const receiptTypes = {};
                d.receipts.forEach(r => {
                    const type = r.receiptType || 'Purchase';
                    receiptTypes[type] = (receiptTypes[type] || 0) + 1;
                });
                
                const typeInfo = Object.entries(receiptTypes)
                    .map(([type, count]) => `${count} ${type}`)
                    .join(', ');
                
                showTooltip(
                    tooltip,
                    dateStr,
                    [
                        { label: metricLabel.label, value: metricLabel.formatter(d.value) },
                        { label: 'Trips', value: d.count },
                        { label: 'Amount', value: `$${(d.spend || 0).toFixed(2)}` },
                        { label: 'Items', value: d.items || 0 },
                        ...(typeInfo ? [{ label: 'Types', value: typeInfo, className: 'chart-tooltip-label' }] : [])
                    ],
                    event,
                    chart.container
                );
            })
            .on('mouseout', function(event, d) {
                if (d.count === 0) return;
                d3.select(this)
                    .attr('stroke', '#fff')
                    .attr('stroke-width', 1);
                hideTooltip(tooltip);
            })
            .on('focus', function(event, d) {
                if (d.count === 0) return;
                d3.select(this)
                    .attr('stroke', '#000')
                    .attr('stroke-width', 2);
                
                const dateStr = d.date.toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                });
                
                showTooltip(
                    tooltip,
                    dateStr,
                    [
                        { label: metricLabel.label, value: metricLabel.formatter(d.value) },
                        { label: 'Trips', value: d.count },
                        { label: 'Amount', value: `$${(d.spend || 0).toFixed(2)}` },
                        { label: 'Items', value: d.items || 0 }
                    ],
                    event,
                    chart.container
                );
            })
            .on('blur', function(event, d) {
                if (d.count === 0) return;
                d3.select(this)
                    .attr('stroke', '#fff')
                    .attr('stroke-width', 1);
                hideTooltip(tooltip);
            });
        
        // Add month labels
        const monthsGroup = svg.append('g')
            .attr('transform', `translate(${dayLabelWidth}, 10)`);
        
        let lastMonth = -1;
        let monthX = 0;
        allDays.forEach((d, i) => {
            const month = d.date.getMonth();
            if (month !== lastMonth && d.date.getDay() === 0) {
                const weekIndex = Math.floor(i / 7);
                monthsGroup.append('text')
                    .attr('x', weekIndex * cellTotal)
                    .attr('y', 0)
                    .attr('text-anchor', 'start')
                    .attr('font-size', '11px')
                    .attr('font-weight', '600')
                    .attr('fill', 'var(--color-text-primary)')
                    .text(d.date.toLocaleDateString('en-US', { month: 'short' }));
                lastMonth = month;
            }
        });
        
        // Add legend
        const legendData = [
            { label: 'Less', color: '#ebedf0' },
            { label: '', color: '#c6e48b' },
            { label: '', color: '#7bc96f' },
            { label: '', color: '#239a3b' },
            { label: 'More', color: '#196127' }
        ];
        
        const legend = svg.append('g')
            .attr('transform', `translate(${viewWidth - 150}, ${height - 20})`);
        
        legend.selectAll('rect')
            .data(legendData)
            .enter()
            .append('rect')
            .attr('x', (d, i) => i * (cellSize + 2))
            .attr('y', 0)
            .attr('width', cellSize)
            .attr('height', cellSize)
            .attr('rx', 2)
            .attr('fill', d => d.color);
        
        legend.append('text')
            .attr('x', -5)
            .attr('y', cellSize - 2)
            .attr('text-anchor', 'end')
            .attr('font-size', '10px')
            .attr('fill', 'var(--color-text-secondary)')
            .text('Less');
        
        legend.append('text')
            .attr('x', legendData.length * (cellSize + 2) + 5)
            .attr('y', cellSize - 2)
            .attr('text-anchor', 'start')
            .attr('font-size', '10px')
            .attr('fill', 'var(--color-text-secondary)')
            .text('More');
        
        // Update function
        chart.update = function(newData) {
            createCalendarHeatmap({ ...chart, data: newData });
        };
        
        // Destroy function
        chart.destroy = function() {
            if (tooltip) tooltip.remove();
            if (svg) svg.remove();
        };
        
        // If we truncated the range, add a subtle note
        if (monthsDiffTotal > maxMonthsToShow) {
            const note = document.createElement('div');
            note.style.cssText = 'margin-top: 0.5rem; font-size: 0.8rem; color: var(--color-text-tertiary);';
            note.textContent = `Showing last ${maxMonthsToShow} months for readability (earliest: ${minDate.toLocaleDateString()})`;
            chart.container.appendChild(note);
        }
        
        console.log(`Calendar heatmap created with ${allDays.length} days (${dateMap.size} with activity)`);
    }
    
    /**
     * Create price evolution chart showing price changes over time for selected items
     */
    function createPriceEvolutionChart(chart) {
        console.log('=== CREATING PRICE EVOLUTION CHART ===');
        const items = chart.data || [];
        
        if (items.length === 0) {
            chart.container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--color-text-tertiary);">
                    <p>Price evolution tracking for your most frequently purchased items</p>
                    <p style="font-size: 0.85rem;">Items need at least 2 purchases to show price trends</p>
            </div>
        `;
            return;
        }
        
        // Clear container
        chart.container.innerHTML = '';
        
        // Get container dimensions
        const containerWidth = chart.container.clientWidth;
        const containerHeight = Math.max(chart.container.clientHeight, 300);
        
        // Guard: Skip rendering if container is hidden
        if (containerWidth <= 0) {
            console.warn('Price evolution chart container has zero width. Deferring render.');
            chart.needsRender = true;
            return;
        }
        
        // Set margins - increase right margin for legend with more items
        const margin = { top: 30, right: Math.max(120, items.length * 2 + 100), bottom: 60, left: 60 };
        const width = containerWidth - margin.left - margin.right;
        const height = containerHeight - margin.top - margin.bottom;
        
        // Process data - get price history for selected items
        const lineData = items.map((item, idx) => ({
            name: item.name,
            color: d3.schemeCategory10[idx % 10],
            values: (item.priceHistory || []).map(p => ({
                date: new Date(p.date),
                price: p.price
            })).sort((a, b) => a.date - b.date)
        })).filter(d => d.values.length > 0);
        
        if (lineData.length === 0) {
            chart.container.innerHTML = '<p style="text-align:center;padding:2rem;color:var(--color-text-tertiary);">No price history available for selected items</p>';
            return;
        }
        
        // Get all dates and prices for scales
        const allDates = lineData.flatMap(d => d.values.map(v => v.date));
        const allPrices = lineData.flatMap(d => d.values.map(v => v.price));
        
        // Create SVG
        const svg = d3.select(chart.container)
            .append('svg')
            .attr('width', containerWidth)
            .attr('height', containerHeight)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        // Create scales
        const x = d3.scaleTime()
            .domain(d3.extent(allDates))
            .range([0, width]);
        
        const y = d3.scaleLinear()
            .domain([0, d3.max(allPrices) * 1.1])
            .range([height, 0]);
        
        // Add X axis
        svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x)
                .ticks(Math.min(6, allDates.length))
                .tickFormat(d3.timeFormat('%b %Y')))
            .selectAll('text')
            .attr('transform', 'rotate(-45)')
            .style('text-anchor', 'end');
        
        // Add Y axis
        svg.append('g')
            .call(d3.axisLeft(y)
                .ticks(5)
                .tickFormat(d => `$${d.toFixed(2)}`));
        
        // Add Y axis label
        svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', -margin.left + 15)
            .attr('x', -height / 2)
            .attr('text-anchor', 'middle')
            .style('font-size', '12px')
            .style('fill', 'var(--color-text-secondary)')
            .text('Price ($)');
        
        // Add grid lines
        svg.append('g')
            .attr('class', 'grid')
            .attr('opacity', 0.1)
            .call(d3.axisLeft(y)
                .ticks(5)
                .tickSize(-width)
                .tickFormat(''));
        
        // Line generator
        const line = d3.line()
            .x(d => x(d.date))
            .y(d => y(d.price))
            .curve(d3.curveMonotoneX);
        
        // Tooltip
        const tooltip = createChartTooltip(chart.container);
        
        // Draw lines and points for each item
        lineData.forEach((item, idx) => {
            // Draw line
            svg.append('path')
                .datum(item.values)
                .attr('fill', 'none')
                .attr('stroke', item.color)
                .attr('stroke-width', 2)
                .attr('d', line);
            
            // Draw points
            svg.selectAll(`.dot-${idx}`)
                .data(item.values)
                .enter()
                .append('circle')
                .attr('class', `dot-${idx}`)
                .attr('cx', d => x(d.date))
                .attr('cy', d => y(d.price))
                .attr('r', 4)
                .attr('fill', item.color)
                .attr('stroke', 'white')
                .attr('stroke-width', 1)
                .style('cursor', 'pointer')
                .on('mouseover', function(event, d) {
                    d3.select(this).attr('r', 6);
                    showTooltip(tooltip, item.name, [
                        { label: 'Date', value: d3.timeFormat('%b %d, %Y')(d.date) },
                        { label: 'Price', value: `$${d.price.toFixed(2)}` }
                    ], event, chart.container);
                })
                .on('mousemove', function(event) {
                    positionTooltip(tooltip, event, chart.container);
                })
                .on('mouseout', function() {
                    d3.select(this).attr('r', 4);
                    hideTooltip(tooltip);
                });
        });
        
        // Add legend
        const legend = svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${width + 10}, 0)`);
        
        lineData.forEach((item, idx) => {
            const legendItem = legend.append('g')
                .attr('transform', `translate(0, ${idx * 18})`);
            
            legendItem.append('rect')
                .attr('width', 12)
                .attr('height', 12)
                .attr('fill', item.color)
                .attr('rx', 2);
            
            // Truncate long item names for legend (max ~20 chars)
            const maxChars = 20;
            const truncatedName = item.name.length > maxChars 
                ? item.name.substring(0, maxChars - 3) + '...' 
                : item.name;
            
            legendItem.append('text')
                .attr('x', 16)
                .attr('y', 10)
                .style('font-size', '9px')
                .style('fill', 'var(--color-text-secondary)')
                .text(truncatedName);
        });
        
        // Update function
        chart.update = function(newData) {
            createPriceEvolutionChart({ ...chart, data: newData });
        };
        
        // Destroy function
        chart.destroy = function() {
            if (tooltip) tooltip.remove();
            chart.container.innerHTML = '';
        };
        
        console.log(`Price evolution chart created with ${lineData.length} items`);
    }
    
    /**
     * Create warehouse comparison chart
     */
    function createWarehouseChart(chart) {
        console.log('=== CREATING WAREHOUSE COMPARISON CHART ===');
        const data = chart.data || [];
        
        if (data.length === 0) {
            chart.container.innerHTML = '<p style="text-align:center;padding:2rem;color:var(--color-text-tertiary);">No warehouse data available</p>';
            return;
        }
        
        // Clear container
        chart.container.innerHTML = '';
        
        // Get container dimensions
        const containerWidth = chart.container.clientWidth;
        const containerHeight = Math.max(chart.container.clientHeight, 350);
        
        // Guard: Skip rendering if container is hidden (zero width)
        if (containerWidth <= 0) {
            console.warn('Chart container has zero width (likely hidden tab). Deferring render.');
            chart.needsRender = true;
            return;
        }
        
        // Set margins
        const margin = { top: 20, right: 30, bottom: 80, left: 60 };
        const width = containerWidth - margin.left - margin.right;
        const height = containerHeight - margin.top - margin.bottom;
        
        // Create SVG
        const svg = d3.select(chart.container)
            .append('svg')
            .attr('width', containerWidth)
            .attr('height', containerHeight)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        chart.svg = svg;
        
        // Create scales
        const x = d3.scaleBand()
            .domain(data.map(d => {
                if (d.warehouseNumber === 'ONLINE' || d.warehouseName === 'Online') {
                    return 'Online';
                }
                return `${d.warehouseNumber}\n${d.warehouseCity || ''}`;
            }))
            .range([0, width])
            .padding(0.3);
        
        const y = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.totalSpent) * 1.1])
            .nice()
            .range([height, 0]);
        
        // Add x-axis
        svg.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x))
            .selectAll('text')
            .attr('transform', 'rotate(-45)')
            .style('text-anchor', 'end')
            .attr('dx', '-.8em')
            .attr('dy', '.15em')
            .style('font-size', '11px');
        
        // Add y-axis
        svg.append('g')
            .attr('class', 'y-axis')
            .call(d3.axisLeft(y)
                .ticks(6)
                .tickFormat(d => `$${(d/1000).toFixed(0)}k`));
        
        // Add y-axis label
        svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', -margin.left + 15)
            .attr('x', -height / 2)
            .attr('text-anchor', 'middle')
            .style('font-size', '12px')
            .style('fill', 'var(--color-text-secondary)')
            .text('Total Spent ($)');
        
        // Tooltip (using standardized factory)
        const tooltip = createChartTooltip(chart.container);
        
        // Tooltip show handler
        function showWarehouseTooltip(event, d) {
            const isOnline = d.warehouseNumber === 'ONLINE' || d.warehouseName === 'Online';
            const title = isOnline ? 'Online' : `${d.warehouseName || 'Warehouse'} #${d.warehouseNumber}`;
            const location = isOnline ? 'Online Orders' : `${d.warehouseCity || ''}, ${d.warehouseState || ''}`;
            
            showTooltip(tooltip, title, [
                { label: 'Location', value: location },
                { label: 'Total Spent', value: `$${d.totalSpent.toLocaleString('en-US', {minimumFractionDigits: 2})}` },
                { label: 'Trips (unique days)', value: d.tripCount ?? 0 },
                { label: 'Receipts', value: d.receiptCount ?? 0 },
                { label: 'Avg/Trip', value: `$${d.avgPerTrip.toLocaleString('en-US', {minimumFractionDigits: 2})}` }
            ], event, chart.container);
        }
        
        // Add bars with animation
        const bars = svg.selectAll('.bar')
            .data(data)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', d => {
                if (d.warehouseNumber === 'ONLINE' || d.warehouseName === 'Online') {
                    return x('Online');
                }
                return x(`${d.warehouseNumber}\n${d.warehouseCity || ''}`);
            })
            .attr('y', height)
            .attr('width', x.bandwidth())
            .attr('height', 0)
            .attr('fill', 'var(--color-secondary)')
            .attr('opacity', 0.8)
            .style('cursor', 'pointer')
            .attr('tabindex', '0')
            .attr('role', 'button')
            .attr('aria-label', d => {
                const isOnline = d.warehouseNumber === 'ONLINE' || d.warehouseName === 'Online';
                return isOnline 
                    ? `Online: $${d.totalSpent.toFixed(2)}`
                    : `${d.warehouseName || 'Warehouse'} #${d.warehouseNumber}: $${d.totalSpent.toFixed(2)}`;
            });
        
        // Animate bars growing
        bars.transition()
            .duration(800)
            .delay((d, i) => i * 100)
            .attr('y', d => y(d.totalSpent))
            .attr('height', d => height - y(d.totalSpent));
        
        // Add hover interactions
        bars.on('mouseover', function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('opacity', 1)
                    .attr('fill', 'var(--color-secondary-dark)');
                showWarehouseTooltip(event, d);
            })
            .on('mousemove', function(event) {
                positionTooltip(tooltip, event, chart.container);
            })
            .on('mouseout', function() {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('opacity', 0.8)
                    .attr('fill', 'var(--color-secondary)');
                hideTooltip(tooltip);
            })
            .on('focus', function(event) {
                const d = d3.select(this).datum();
                d3.select(this).attr('opacity', 1).attr('fill', 'var(--color-secondary-dark)');
                showWarehouseTooltip(event, d);
            })
            .on('blur', function() {
                d3.select(this).attr('opacity', 0.8).attr('fill', 'var(--color-secondary)');
                hideTooltip(tooltip);
            })
            .on('click', function(event, d) {
                // Show warehouse drilldown
                const receipts = App.modules.filterManager?.getFilteredReceipts() || [];
                showWarehouseDrillDown(d, receipts);
            })
            .on('keydown', function(event) {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    const d = d3.select(this).datum();
                    const receipts = App.modules.filterManager?.getFilteredReceipts() || [];
                    showWarehouseDrillDown(d, receipts);
                }
            });
        
        // Update function
        chart.update = function(newData) {
            createWarehouseChart({ ...chart, data: newData });
        };
        
        // Destroy function
        chart.destroy = function() {
            if (tooltip) tooltip.remove();
            if (svg) svg.remove();
        };
        
        console.log(`Warehouse chart created with ${data.length} warehouses`);
    }
    
    /**
     * Create savings trend chart (time series)
     */
    function createSavingsTrendChart(chart) {
        console.log('=== CREATING SAVINGS TREND CHART ===');
        console.log('Chart data:', chart.data);
        
        const data = chart.data || [];
        if (data.length === 0) {
            console.warn('No data available for savings chart');
            chart.container.innerHTML = '<p style="text-align:center;padding:2rem;color:var(--color-text-tertiary);">No savings data available</p>';
            return;
        }
        
        // Filter for months with savings
        const dataWithSavings = data.filter(d => d.savings && d.savings > 0);
        
        if (dataWithSavings.length === 0) {
            chart.container.innerHTML = '<p style="text-align:center;padding:2rem;color:var(--color-text-tertiary);">No savings recorded</p>';
            return;
        }
        
        console.log(`Creating savings chart with ${dataWithSavings.length} data points`);
        
        // Clear container
        chart.container.innerHTML = '';
        
        // Get container dimensions
        const containerWidth = chart.container.clientWidth;
        const containerHeight = Math.max(chart.container.clientHeight, 300);
        
        // Guard: Skip rendering if container is hidden (zero width)
        if (containerWidth <= 0) {
            console.warn('Chart container has zero width (likely hidden tab). Deferring render.');
            chart.needsRender = true;
            return;
        }
        
        // Set margins and dimensions
        const margin = { top: 20, right: 30, bottom: 50, left: 60 };
        const width = containerWidth - margin.left - margin.right;
        const height = containerHeight - margin.top - margin.bottom;
        
        // Create SVG
        const svg = d3.select(chart.container)
            .append('svg')
            .attr('width', containerWidth)
            .attr('height', containerHeight)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        chart.svg = svg;
        
        // Parse dates and prepare data
        const parseDate = d3.timeParse('%Y-%m');
        const dataWithDates = dataWithSavings.map(d => ({
            ...d,
            date: parseDate(d.month)
        })).sort((a, b) => a.date - b.date);
        
        // Create scales
        const x = d3.scaleTime()
            .domain(d3.extent(dataWithDates, d => d.date))
            .range([0, width]);
        
        const y = d3.scaleLinear()
            .domain([0, d3.max(dataWithDates, d => d.savings) * 1.1])
            .nice()
            .range([height, 0]);
        
        // Create gradient for area
        const gradient = svg.append('defs')
            .append('linearGradient')
            .attr('id', `savings-gradient-${chart.id}`)
            .attr('x1', '0%')
            .attr('y1', '0%')
            .attr('x2', '0%')
            .attr('y2', '100%');
        
        gradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', '#22c55e')
            .attr('stop-opacity', 0.3);
        
        gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', '#22c55e')
            .attr('stop-opacity', 0);
        
        // Create area
        const area = d3.area()
            .x(d => x(d.date))
            .y0(height)
            .y1(d => y(d.savings))
            .curve(d3.curveMonotoneX);
        
        // Add area path
        svg.append('path')
            .datum(dataWithDates)
            .attr('fill', `url(#savings-gradient-${chart.id})`)
            .attr('d', area);
        
        // Create line
        const line = d3.line()
            .x(d => x(d.date))
            .y(d => y(d.savings))
            .curve(d3.curveMonotoneX);
        
        // Add line path
        svg.append('path')
            .datum(dataWithDates)
            .attr('fill', 'none')
            .attr('stroke', '#22c55e')
            .attr('stroke-width', 2)
            .attr('d', line);
        
        // Add X axis
        svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x)
                .ticks(Math.min(dataWithDates.length, 8))
                .tickFormat(d3.timeFormat('%b %Y')))
            .selectAll('text')
            .style('text-anchor', 'end')
            .attr('dx', '-.8em')
            .attr('dy', '.15em')
            .attr('transform', 'rotate(-45)');
        
        // Add Y axis
        svg.append('g')
            .call(d3.axisLeft(y)
                .ticks(6)
                .tickFormat(d => `$${d.toFixed(0)}`));
        
        // Add Y axis label
        svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', 0 - margin.left)
            .attr('x', 0 - (height / 2))
            .attr('dy', '1em')
            .style('text-anchor', 'middle')
            .style('font-size', '12px')
            .style('fill', 'var(--color-text-secondary)')
            .text('Savings ($)');
        
        // Create tooltip
        const tooltip = createChartTooltip(chart.container);
        
        // Add interactive circles
        svg.selectAll('circle')
            .data(dataWithDates)
            .enter()
            .append('circle')
            .attr('cx', d => x(d.date))
            .attr('cy', d => y(d.savings))
            .attr('r', 4)
            .attr('fill', '#22c55e')
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
            .attr('tabindex', '0')
            .attr('role', 'button')
            .attr('aria-label', d => `${d3.timeFormat('%B %Y')(d.date)}: $${d.savings.toFixed(2)} saved`)
            .style('cursor', 'pointer')
            .on('mouseover', function(event, d) {
                d3.select(this)
                    .attr('r', 6)
                    .attr('stroke-width', 3);
                
                const savingsRate = d.total > 0 ? (d.savings / d.total * 100).toFixed(2) : 0;
                
                showTooltip(
                    tooltip,
                    `<strong>${d3.timeFormat('%B %Y')(d.date)}</strong><br/>
                     Savings: <strong style="color: #22c55e;">$${d.savings.toFixed(2)}</strong><br/>
                     Spent: $${d.total.toFixed(2)}<br/>
                     Rate: ${savingsRate}%`,
                    event,
                    chart.container
                );
            })
            .on('mouseout', function() {
                d3.select(this)
                    .attr('r', 4)
                    .attr('stroke-width', 2);
                hideTooltip(tooltip);
            })
            .on('focus', function(event, d) {
                d3.select(this).attr('r', 6);
                const savingsRate = d.total > 0 ? (d.savings / d.total * 100).toFixed(2) : 0;
                showTooltip(
                    tooltip,
                    `<strong>${d3.timeFormat('%B %Y')(d.date)}</strong><br/>
                     Savings: <strong style="color: #22c55e;">$${d.savings.toFixed(2)}</strong><br/>
                     Spent: $${d.total.toFixed(2)}<br/>
                     Rate: ${savingsRate}%`,
                    event,
                    chart.container
                );
            })
            .on('blur', function() {
                d3.select(this).attr('r', 4);
                hideTooltip(tooltip);
            });
        
        // Update function
        chart.update = function(newData) {
            createSavingsTrendChart({ ...chart, data: newData });
        };
        
        // Destroy function
        chart.destroy = function() {
            if (tooltip) tooltip.remove();
            if (svg) svg.remove();
        };
        
        console.log(`Savings trend chart created with ${dataWithDates.length} points`);
    }

    /**
     * Create monthly tax rate trend chart (bars showing effective tax rate)
     */
    function createTaxRateTrendChart(chart) {
        const data = chart.data || [];
        if (data.length === 0) {
            chart.container.innerHTML = '<p style="text-align:center;padding:2rem;color:var(--color-text-tertiary);">No tax data available</p>';
            return;
        }
        
        // Clear container
        chart.container.innerHTML = '';
        
        const containerWidth = chart.container.clientWidth;
        const containerHeight = Math.max(chart.container.clientHeight, 260);
        
        if (containerWidth <= 0) {
            chart.needsRender = true;
            return;
        }
        
        const margin = { top: 16, right: 16, bottom: 52, left: 64 };
        const width = containerWidth - margin.left - margin.right;
        const height = containerHeight - margin.top - margin.bottom;
        
        const svg = d3.select(chart.container)
            .append('svg')
            .attr('width', containerWidth)
            .attr('height', containerHeight)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        chart.svg = svg;
        
        const parseDate = d3.timeParse('%Y-%m');
        const formatMonth = d3.timeFormat('%b %Y');
        const dataWithRates = data
            .map(d => {
                const date = parseDate(d.month);
                const total = Number(d.total) || 0;
                const taxes = Number(d.taxes) || 0;
                const rate = total > 0 ? (taxes / total) * 100 : 0;
                return { ...d, date, total, taxes, rate };
            })
            .filter(d => d.date)
            .sort((a, b) => a.date - b.date);
        
        const monthLookup = new Map(dataWithRates.map(d => [d.month, d.date]));
        const maxRate = d3.max(dataWithRates, d => d.rate) || 0;
        
        const x = d3.scaleBand()
            .domain(dataWithRates.map(d => d.month))
            .range([0, width])
            .padding(0.2);
        
        const y = d3.scaleLinear()
            .domain([0, Math.max(5, maxRate * 1.1)])
            .nice()
            .range([height, 0]);
        
        // Grid lines
        svg.append('g')
            .attr('class', 'grid')
            .attr('opacity', 0.1)
            .call(d3.axisLeft(y).ticks(6).tickSize(-width).tickFormat(''));
        
        // Bars
        const tooltip = createChartTooltip(chart.container);
        svg.selectAll('.bar')
            .data(dataWithRates)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', d => x(d.month))
            .attr('y', d => y(d.rate))
            .attr('width', x.bandwidth())
            .attr('height', d => height - y(d.rate))
            .attr('fill', '#7c3aed')
            .attr('rx', 4)
            .attr('tabindex', '0')
            .attr('role', 'button')
            .attr('aria-label', d => `${formatMonth(d.date)}: ${d.rate.toFixed(2)}% tax rate`);
        
        function showBarTooltip(event, d) {
            showTooltip(tooltip, formatMonth(d.date), [
                { label: 'Effective rate', value: `${d.rate.toFixed(2)}%` },
                { label: 'Tax', value: `$${d.taxes.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
                { label: 'Spent', value: `$${d.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
            ], event, chart.container);
        }
        
        svg.selectAll('.bar')
            .on('mouseover', function(event, d) {
                d3.select(this).attr('fill', '#5b21b6');
                showBarTooltip(event, d);
            })
            .on('mousemove', function(event) {
                positionTooltip(tooltip, event, chart.container);
            })
            .on('mouseout', function() {
                d3.select(this).attr('fill', '#7c3aed');
                hideTooltip(tooltip);
            })
            .on('focus', function(event) {
                const d = d3.select(this).datum();
                showBarTooltip(event, d);
            })
            .on('blur', function() {
                hideTooltip(tooltip);
            });
        
        // Axes
        svg.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x)
                .tickFormat(m => {
                    const date = monthLookup.get(m);
                    return date ? d3.timeFormat('%b %y')(date) : m;
                }))
            .selectAll('text')
            .attr('transform', 'rotate(-35)')
            .style('text-anchor', 'end');
        
        svg.append('g')
            .attr('class', 'y-axis')
            .call(d3.axisLeft(y).ticks(6).tickFormat(d => `${d}%`));
        
        // Y label
        svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', -margin.left + 14)
            .attr('x', -height / 2)
            .attr('text-anchor', 'middle')
            .style('font-size', '12px')
            .style('fill', 'var(--color-text-secondary)')
            .text('Effective Tax Rate (%)');
        
        // Update/destroy
        chart.update = function(newData) {
            createTaxRateTrendChart({ ...chart, data: newData });
        };
        
        chart.destroy = function() {
            if (tooltip) tooltip.remove();
            if (svg) svg.remove();
        };
    }
    
    /**
     * Get chart by ID
     * @param {string} chartId - Chart identifier
     * @returns {Object|null} Chart instance or null
     */
    function getChart(chartId) {
        return charts.get(chartId) || null;
    }
    
    /**
     * Get all charts
     * @returns {Map} All charts
     */
    function getAllCharts() {
        return new Map(charts);
    }
    
    return {
        init,
        createChart,
        updateChart,
        destroyChart,
        resizeCharts,
        resizeChartsInTab,
        getChart,
        getAllCharts,
        // Drilldown functions
        showItemDrillDown,
        showWarehouseDrillDown,
        showDepartmentDrillDown
    };
})();

// ===== FILTER MANAGER MODULE =====
const FilterManager = (() => {
    const state = {
        dateRange: {
            start: null,
            end: null
        },
        warehouse: null,
        channel: null, // 'warehouse', 'online', or null for all
        membershipNumber: null, // For both warehouse and online purchases
        searchTerm: null,
        transactionType: null,
        currentPreset: 'all' // Show all receipts by default
    };
    
    /**
     * Set date range filter
     * @param {Date} start - Start date
     * @param {Date} end - End date
     */
    function setDateRange(start, end) {
        state.dateRange.start = start;
        state.dateRange.end = end;
        state.currentPreset = 'custom';
        
        ErrorHandler.debug(`Date range set: ${start} to ${end}`);
        EventBus.emit('filter:changed', getActiveFilters());
    }
    
    /**
     * Set warehouse filter
     * @param {number} warehouseNumber - Warehouse number (null for all)
     */
    function setWarehouse(warehouseNumber) {
        state.warehouse = warehouseNumber;
        ErrorHandler.debug(`Warehouse filter set: ${warehouseNumber}`);
        EventBus.emit('filter:changed', getActiveFilters());
    }
    
    /**
     * Set channel filter (warehouse/online)
     * @param {string} channel - Channel type ('warehouse', 'online', or null for all)
     */
    function setChannel(channel) {
        state.channel = channel === 'all' ? null : channel;
        ErrorHandler.debug(`Channel filter set: ${channel}`);
        EventBus.emit('filter:changed', getActiveFilters());
    }
    
    /**
     * Set membership number filter (works for both warehouse and online purchases)
     * @param {string} membershipNumber - Membership number
     */
    function setMembershipNumber(membershipNumber) {
        const normalizedNumber = membershipNumber && membershipNumber !== 'all'
            ? String(membershipNumber)
            : null;
        state.membershipNumber = normalizedNumber;
        ErrorHandler.debug(`Membership filter set: ${membershipNumber}`);
        EventBus.emit('filter:changed', getActiveFilters());
    }
    
    /**
     * Set search term filter
     * @param {string} term - Search term
     */
    function setSearchTerm(term) {
        state.searchTerm = term && term.trim().length > 0 ? term.trim() : null;
        ErrorHandler.debug(`Search term set: ${state.searchTerm}`);
        EventBus.emit('filter:changed', getActiveFilters());
    }
    
    /**
     * Set transaction type filter
     * @param {string} type - Transaction type (Sales, Refund, etc.)
     */
    function setTransactionType(type) {
        state.transactionType = type;
        ErrorHandler.debug(`Transaction type set: ${type}`);
        EventBus.emit('filter:changed', getActiveFilters());
    }
    
    /**
     * Set a date preset
     * @param {string} preset - Preset name: 'ytd', 'last12', 'all', 'custom'
     */
    function setPreset(preset) {
        const now = new Date();
        const dataStore = App.modules.dataStore;
        
        switch (preset) {
            case 'ytd': {
                // Year to date
                const yearStart = new Date(now.getFullYear(), 0, 1);
                state.dateRange.start = yearStart;
                state.dateRange.end = now;
                state.currentPreset = 'ytd';
                break;
            }
            
            case 'last12': {
                // Last 12 months
                const last12 = new Date();
                last12.setMonth(last12.getMonth() - 12);
                state.dateRange.start = last12;
                state.dateRange.end = now;
                state.currentPreset = 'last12';
                break;
            }
            
            case 'all': {
                // All time - no date filter
                state.dateRange.start = null;
                state.dateRange.end = null;
                state.currentPreset = 'all';
                break;
            }
            
            case 'custom':
                // Keep current custom range
                state.currentPreset = 'custom';
                break;
            
            default:
                ErrorHandler.warn(`Unknown preset: ${preset}`);
                return;
        }
        
        ErrorHandler.debug(`Preset set: ${preset}`);
        EventBus.emit('filter:presetChanged', { preset, filters: getActiveFilters() });
        EventBus.emit('filter:changed', getActiveFilters());
    }
    
    /**
     * Apply filters to receipts
     * @param {Array} receipts - Receipts to filter
     * @returns {Array} Filtered receipts
     */
    function applyFilters(receipts) {
        if (!Array.isArray(receipts)) {
            return [];
        }
        
        let filtered = receipts;
        
        // Date range filter
        if (state.dateRange.start || state.dateRange.end) {
            filtered = filtered.filter(receipt => {
                const date = receipt.transactionDateTime;
                if (!date) return false;
                
                if (state.dateRange.start && date < state.dateRange.start) return false;
                if (state.dateRange.end && date > state.dateRange.end) return false;
                
                return true;
            });
        }
        
        // Channel filter (warehouse/online)
        if (state.channel) {
            filtered = filtered.filter(receipt => {
                const channel = receipt.channel || receipt.receiptType || 'warehouse';
                // Normalize channel values
                if (state.channel === 'warehouse') {
                    return channel === 'warehouse' || channel === 'In-Warehouse' || channel === 'Gas Station';
                } else if (state.channel === 'online') {
                    return channel === 'online';
                }
                return true;
            });
        }
        
        // Warehouse filter
        if (state.warehouse !== null && state.warehouse !== 'all') {
            if (state.warehouse === 'ONLINE') {
                // Filter for online orders
                filtered = filtered.filter(r => 
                    r.channel === 'online' || 
                    r.documentType === 'ONLINE' || 
                    r.documentType === 'OnlineReceipts' ||
                    r.warehouseName === 'Online'
                );
            } else {
            const whNum = Number(state.warehouse);
            filtered = filtered.filter(r => r.warehouseNumber === whNum);
            }
        }
        
        // Membership number filter (works for both warehouse and online purchases)
        if (state.membershipNumber) {
            filtered = filtered.filter(receipt => {
                const receiptMembership = receipt.membershipNumber 
                    ? String(receipt.membershipNumber) 
                    : null;
                return receiptMembership === state.membershipNumber;
            });
        }
        
        // Transaction type filter
        if (state.transactionType && state.transactionType !== 'all') {
            filtered = filtered.filter(r => r.transactionType === state.transactionType);
        }
        
        // Search term filter
        if (state.searchTerm) {
            const term = state.searchTerm.toLowerCase();
            filtered = filtered.filter(receipt => {
                // Search in item names and numbers
                if (Array.isArray(receipt.itemArray)) {
                    return receipt.itemArray.some(item => {
                        return (
                            item.normalizedName.toLowerCase().includes(term) ||
                            item.itemNumber.includes(term)
                        );
                    });
                }
                return false;
            });
        }
        
        return filtered;
    }
    
    /**
     * Get active filters
     * @returns {Object} Current filter state
     */
    function getActiveFilters() {
        return {
            dateRange: { ...state.dateRange },
            warehouse: state.warehouse,
            searchTerm: state.searchTerm,
            transactionType: state.transactionType,
            preset: state.currentPreset,
            channel: state.channel,
            membershipNumber: state.membershipNumber
        };
    }
    
    /**
     * Clear all filters
     */
    function clearFilters() {
        state.dateRange = { start: null, end: null };
        state.warehouse = null;
        state.channel = null;
        state.membershipNumber = null;
        state.searchTerm = null;
        state.transactionType = null;
        state.currentPreset = 'all';
        
        ErrorHandler.debug('All filters cleared');
        EventBus.emit('filter:cleared', {});
        EventBus.emit('filter:changed', getActiveFilters());
    }
    
    /**
     * Get filtered receipts from DataStore
     * @returns {Array} Filtered receipts
     */
    function getFilteredReceipts() {
        const dataStore = App.modules.dataStore;
        if (!dataStore) {
            return [];
        }
        
        const allReceipts = dataStore.getReceipts();
        return applyFilters(allReceipts);
    }
    
    /**
     * Initialize with YTD filter
     */
    function init() {
        setPreset('all');
        ErrorHandler.debug('FilterManager initialized with YTD preset');
    }
    
    return {
        init,
        setDateRange,
        setWarehouse,
        setChannel,
        setMembershipNumber,
        setSearchTerm,
        setTransactionType,
        setPreset,
        applyFilters,
        getActiveFilters,
        getFilteredReceipts,
        clearFilters
    };
})();

// ===== STATS CALCULATOR MODULE =====
const StatsCalculator = (() => {
    /**
     * Calculate total statistics
     * @param {Array} receipts - Array of receipts
     * @returns {Object} Total statistics
     */
    function calculateTotals(receipts) {
        if (!Array.isArray(receipts) || receipts.length === 0) {
            return {
                totalSpent: 0,
                netSpent: 0,
                grossSpent: 0,
                totalItems: 0,
                totalReceipts: 0,
                warehouseVisits: 0,
                onlineOrders: 0,
                totalTaxes: 0,
                totalSavings: 0,
                salesReceipts: 0,
                refundReceipts: 0,
                refundAmount: 0,
                refundItemCount: 0,
                totalPurchaseCount: 0,
                uniqueItems: 0,
                netUniqueItems: 0,
                avgPricePerItem: 0
            };
        }
        
        const stats = {
            totalReceipts: receipts.length,
            warehouseVisits: 0,
            onlineOrders: 0,
            totalTaxes: 0,
            totalSavings: 0,
            salesReceipts: 0,
            refundReceipts: 0,
            refundAmount: 0,
            refundItemCount: 0,
            uniqueReturnedItems: 0,
            grossSpent: 0,
            refundSpent: 0,
            totalPurchaseCount: 0
        };
        
        const uniqueItemsSet = new Set();
        const uniqueReturnedItemsSet = new Set();
        // Track net quantities per item to determine net unique items
        const itemNetQuantities = new Map();
        
        receipts.forEach(receipt => {
            const isRefund = receipt.transactionType === 'Refund' || 
                           receipt.transactionType === 'Return' || 
                           receipt.transactionType === 'Returned' ||
                           (receipt.total || 0) < 0;
            
            const receiptTotal = receipt.total || 0;
            
            // Categorize by purchase channel
            const channel = receipt.channel || receipt.receiptType || 'warehouse';
            if (channel === 'online' || receipt.documentType === 'OnlineReceipts') {
                stats.onlineOrders++;
            } else if (channel !== 'gas_station') {
                stats.warehouseVisits++;
            }
            
            // Calculate gross vs refund amounts
            if (isRefund) {
                stats.refundReceipts++;
                stats.refundAmount += Math.abs(receiptTotal);
                stats.refundSpent -= Math.abs(receiptTotal); // Always subtract absolute value
            } else {
                stats.salesReceipts++;
                stats.grossSpent += receiptTotal;
            }
            
            // Taxes and savings (net of refunds)
            const receiptTax = receipt.taxes || 0;
            const receiptSavings = receipt.instantSavings || 0;
            if (isRefund) {
                // Subtract tax and savings for refunds
                stats.totalTaxes -= Math.abs(receiptTax);
                stats.totalSavings -= Math.abs(receiptSavings);
            } else {
                stats.totalTaxes += receiptTax;
                stats.totalSavings += receiptSavings;
            }
            
            // Calculate total purchase count (sum of quantities)
            if (receipt.itemArray && Array.isArray(receipt.itemArray)) {
                receipt.itemArray.forEach(item => {
                    const qty = Number(item.quantity) || 1;
                    const itemNum = item.itemNumber;
                    
                    // Add quantity to total purchase count or refund item count
                    if (isRefund) {
                        stats.refundItemCount += Math.abs(qty);
                        // Track unique returned items
                        if (itemNum) {
                            uniqueReturnedItemsSet.add(itemNum);
                        }
                    } else {
                        stats.totalPurchaseCount += qty;
                    }
                    
                    // Track unique items (all items ever seen)
                    if (itemNum) {
                        uniqueItemsSet.add(itemNum);
                        
                        // Track net quantities for net unique items calculation
                        const currentQty = itemNetQuantities.get(itemNum) || 0;
                        if (isRefund) {
                            itemNetQuantities.set(itemNum, currentQty - Math.abs(qty));
                        } else {
                            itemNetQuantities.set(itemNum, currentQty + qty);
                        }
                    }
                });
            }
        });
        
        // Calculate net spend (purchases - refunds)
        stats.netSpent = stats.grossSpent + stats.refundSpent; // refundSpent is negative
        stats.totalSpent = stats.netSpent; // Use net spend as the primary metric
        
        // Calculate unique items
        stats.uniqueItems = uniqueItemsSet.size;
        
        // Calculate unique returned items
        stats.uniqueReturnedItems = uniqueReturnedItemsSet.size;
        
        // Calculate net unique items (items with positive net quantity)
        stats.netUniqueItems = Array.from(itemNetQuantities.values())
            .filter(qty => qty > 0).length;
        
        // Average price per item (based on gross purchases, not net)
        stats.avgPricePerItem = stats.totalPurchaseCount > 0 
            ? stats.grossSpent / stats.totalPurchaseCount 
            : 0;
        
        // Round to 2 decimals
        stats.totalSpent = Math.round(stats.totalSpent * 100) / 100;
        stats.netSpent = Math.round(stats.netSpent * 100) / 100;
        stats.grossSpent = Math.round(stats.grossSpent * 100) / 100;
        stats.totalTaxes = Math.round(stats.totalTaxes * 100) / 100;
        stats.totalSavings = Math.round(stats.totalSavings * 100) / 100;
        stats.refundAmount = Math.round(stats.refundAmount * 100) / 100;
        stats.avgPricePerItem = Math.round(stats.avgPricePerItem * 100) / 100;
        
        return stats;
    }
    
    /**
     * Calculate average statistics
     * @param {Array} receipts - Array of receipts
     * @returns {Object} Average statistics
     */
    function calculateAverages(receipts) {
        if (!Array.isArray(receipts) || receipts.length === 0) {
            return {
                avgPerReceipt: 0,
                avgItemsPerReceipt: 0,
                avgSavingsPerReceipt: 0,
                minOrder: 0,
                maxOrder: 0
            };
        }
        
        const totals = calculateTotals(receipts);
        const receiptTotals = receipts.map(r => r.total || 0);
        
        return {
            // Use netSpent for average (which is stored in totalSpent after calculation)
            avgPerReceipt: Math.round((totals.netSpent / receipts.length) * 100) / 100,
            avgItemsPerReceipt: Math.round((totals.totalPurchaseCount / receipts.length) * 100) / 100,
            avgSavingsPerReceipt: Math.round((totals.totalSavings / receipts.length) * 100) / 100,
            minOrder: Math.round(Math.min(...receiptTotals) * 100) / 100,
            maxOrder: Math.round(Math.max(...receiptTotals) * 100) / 100
        };
    }
    
    /**
     * Get warehouse statistics
     * @param {Array} receipts - Array of receipts
     * @returns {Object} Warehouse statistics
     */
    function getWarehouseStats(receipts) {
        if (!Array.isArray(receipts) || receipts.length === 0) {
            return {
                uniqueWarehouses: 0,
                warehouseList: [],
                byWarehouse: {}
            };
        }
        
        const warehouseMap = new Map();
        
        // Helper: flexible date parsing for various receipt date formats
        function parseFlexibleDate(val) {
            if (!val) return null;
            if (val instanceof Date && !isNaN(val.getTime())) return val;
            if (val instanceof Date) return null;
            
            if (typeof val === 'string') {
                const trimmed = val.trim();
                if (!trimmed) return null;
                
                // Try native parse
                let d = new Date(trimmed);
                if (!isNaN(d.getTime())) return d;
                
                // Try replacing space with T
                if (trimmed.includes(' ')) {
                    d = new Date(trimmed.replace(' ', 'T'));
                    if (!isNaN(d.getTime())) return d;
                }
                
                // mm/dd/yyyy or mm/dd/yy
                const md = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
                if (md) {
                    const m = parseInt(md[1], 10) - 1;
                    const day = parseInt(md[2], 10);
                    let y = parseInt(md[3], 10);
                    if (y < 100) y += 2000;
                    d = new Date(y, m, day);
                    if (!isNaN(d.getTime())) return d;
                }
                
                // YYYYMMDD
                const ymd = trimmed.match(/^(\d{4})(\d{2})(\d{2})$/);
                if (ymd) {
                    d = new Date(parseInt(ymd[1], 10), parseInt(ymd[2], 10) - 1, parseInt(ymd[3], 10));
                    if (!isNaN(d.getTime())) return d;
                }
            }
            return null;
        }
        
        // Helper: normalize a receipt date (Date object) from any available field
        function getReceiptDate(receipt) {
            const candidates = [
                receipt.transactionDateTime,
                receipt.transactionDateISO,
                receipt.transactionDate,
                receipt._original?.transactionDateTime,
                receipt._original?.transactionDateISO,
                receipt._original?.transactionDate
            ];
            
            for (const val of candidates) {
                const d = parseFlexibleDate(val);
                if (d) return d;
            }
            return null;
        }
        
        // Helper: capture the first available raw date string for fallback display
        function getRawDateString(receipt) {
            const candidates = [
                receipt.transactionDateTime,
                receipt.transactionDateISO,
                receipt.transactionDate,
                receipt._original?.transactionDateTime,
                receipt._original?.transactionDateISO,
                receipt._original?.transactionDate
            ];
            for (const val of candidates) {
                if (typeof val === 'string' && val.trim().length > 0) {
                    return val.trim();
                }
            }
            return null;
        }
        
        receipts.forEach(receipt => {
            // Check if this is an online order
            const isOnline = receipt.channel === 'online' || 
                           receipt.documentType === 'ONLINE' || 
                           receipt.documentType === 'OnlineReceipts' ||
                           receipt.warehouseName === 'Online';
            const isGas = receipt.receiptType === 'Gas Station' || receipt.documentType === 'FuelReceipts';
            const receiptDate = getReceiptDate(receipt);
            const rawDate = receiptDate ? null : getRawDateString(receipt);
            
            // For online orders, use a special key to group them all together
            // For warehouse orders, use warehouseNumber
            const wh = isOnline ? 'ONLINE' : receipt.warehouseNumber;
            if (!wh) return;
            
            if (!warehouseMap.has(wh)) {
                warehouseMap.set(wh, {
                    warehouseNumber: isOnline ? 'ONLINE' : wh,
                    warehouseName: isOnline ? 'Online' : (receipt.warehouseName || ''),
                    warehouseCity: isOnline ? '' : (receipt.warehouseCity || ''),
                    warehouseState: isOnline ? '' : (receipt.warehouseState || ''),
                    isOnline,
                    receipts: [],
                    receiptCount: 0,
                    tripDates: new Set(),
                    totalSpent: 0,
                lastVisit: null,
                lastVisitRaw: null
                });
            }
            
            const whStats = warehouseMap.get(wh);
            whStats.receiptCount++;
            whStats.totalSpent += receipt.total || 0;
            whStats.receipts.push(receipt);
            if (rawDate) {
                whStats.lastVisitRaw = rawDate; // keep latest string seen; replaces prior
            }
            
            // Track trips as unique visit days for in-warehouse purchases (skip online/gas)
            if (!isOnline && !isGas && receiptDate) {
                const dateKey = receiptDate.toISOString().split('T')[0];
                whStats.tripDates.add(dateKey);
            }
            
            // Track last visit for all warehouse receipts (including gas) to show most recent visit
            if (!isOnline && receiptDate) {
                if (!whStats.lastVisit || receiptDate > whStats.lastVisit) {
                    whStats.lastVisit = receiptDate;
                }
            }
        });
        
        // Convert to array and sort by total spent
        const warehouseList = Array.from(warehouseMap.values())
            .map(wh => {
                const tripCountRaw = wh.tripDates.size;
                const tripCount = tripCountRaw || (wh.isOnline ? 0 : wh.receiptCount); // fallback when dates missing
                const totalSpent = Math.round(wh.totalSpent * 100) / 100;
                const avgPerTrip = Math.round(((wh.totalSpent) / (tripCount || 1)) * 100) / 100;
                const lastVisit = wh.lastVisit || wh.lastVisitRaw || null;
                return {
                    warehouseNumber: wh.warehouseNumber,
                    warehouseName: wh.warehouseName,
                    warehouseCity: wh.warehouseCity,
                    warehouseState: wh.warehouseState,
                    isOnline: wh.isOnline,
                    totalSpent,
                    tripCount,
                    avgPerTrip,
                    receiptCount: wh.receiptCount,
                    lastVisit
                };
            })
            .sort((a, b) => b.totalSpent - a.totalSpent);
        
        return {
            uniqueWarehouses: warehouseList.filter(w => !w.isOnline).length,
            warehouseList,
            byWarehouse: Object.fromEntries(
                warehouseList.map(wh => [wh.warehouseNumber, {
                    ...wh,
                    tripDates: undefined // strip sets
                }])
            )
        };
    }
    
    /**
     * Get monthly spending data
     * @param {Array} receipts - Array of receipts
     * @returns {Array} Monthly data
     */
    function getMonthlySpending(receipts) {
        if (!Array.isArray(receipts) || receipts.length === 0) {
            return [];
        }
        
        const monthMap = new Map();
        
        receipts.forEach(receipt => {
            if (!receipt.transactionDateTime) return;
            
            const date = new Date(receipt.transactionDateTime);
            const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthMap.has(yearMonth)) {
                monthMap.set(yearMonth, {
                    month: yearMonth,
                    total: 0,
                    count: 0,
                    items: 0,
                    savings: 0,
                    taxes: 0
                });
            }
            
            const monthData = monthMap.get(yearMonth);
            const receiptTotal = receipt.total || 0;
            const receiptSavings = receipt.instantSavings || 0;
            const receiptTax = Number(receipt.taxes) || 0;
            const isRefund = receipt.transactionType === 'Refund' || 
                           receipt.transactionType === 'Return' || 
                           receipt.transactionType === 'Returned' ||
                           receiptTotal < 0;
            
            monthData.total += receiptTotal;
            monthData.count++;
            monthData.items += receipt.totalItemCount || 0;
            
            // Keep savings and taxes net of refunds
            if (isRefund) {
                monthData.savings -= Math.abs(receiptSavings);
                monthData.taxes -= Math.abs(receiptTax);
            } else {
                monthData.savings += receiptSavings;
                monthData.taxes += receiptTax;
            }
        });
        
        // Convert to array and sort by month
        return Array.from(monthMap.values())
            .map(m => ({
                ...m,
                total: Math.round(m.total * 100) / 100,
                savings: Math.round(m.savings * 100) / 100,
                taxes: Math.round(m.taxes * 100) / 100
            }))
            .sort((a, b) => a.month.localeCompare(b.month));
    }
    
    /**
     * Get comprehensive statistics
     * @param {Array} receipts - Array of receipts
     * @param {Object} options - Optional calculation options
     * @returns {Object} All statistics
     */
    function calculateAll(receipts, options = {}) {
        const rewardOptions = options.rewards || {};
        return {
            totals: calculateTotals(receipts),
            averages: calculateAverages(receipts),
            warehouses: getWarehouseStats(receipts),
            monthly: getMonthlySpending(receipts),
            rewards: calculateExecutiveRewards(receipts, rewardOptions)
        };
    }
    
    /**
     * Calculate Executive Membership 2% rewards
     * Based on annual pre-tax warehouse merchandise subtotals
     * @param {Array} receipts - Array of receipts
     * @returns {Object} Rewards data by year
     */
    function calculateExecutiveRewards(receipts, options = {}) {
        const byYear = {};
        let totalReward = 0;
        
        const cycleStartMonth = Number(options.cycleStartMonth) || 1; // 1-12
        const cycleStartDay = Number(options.cycleStartDay) || 1;     // 1-31
        
        // Departments that don't qualify for 2% reward
        const excludedDepartments = new Set([
            75,  // Gift Cards/Services
            93   // Pharmacy (Rx), Over-the-Counter & Wellness
            // Note: Tobacco would be here if we had the department number
        ]);
        if (Array.isArray(options.additionalExcludedDepartments)) {
            options.additionalExcludedDepartments.forEach(dept => excludedDepartments.add(dept));
        }
        
        // Helper: map a date to its reward cycle year (cycle year = year of the cycle start it belongs to)
        function getCycleYear(date) {
            if (!(date instanceof Date) || isNaN(date.getTime())) return null;
            const startThisYear = new Date(date.getFullYear(), cycleStartMonth - 1, cycleStartDay);
            return date >= startThisYear ? date.getFullYear() : date.getFullYear() - 1;
        }
        
        receipts.forEach(receipt => {
            // Warehouse and online purchases qualify (exclude only gas)
            const channel = receipt.channel || receipt.receiptType || 'warehouse';
            const docType = receipt.documentType || '';
            const isGas = channel === 'gas_station' || 
                         channel === 'Gas Station' ||
                         docType === 'FuelReceipts' ||
                         receipt.receiptType === 'Gas Station';
            const isTravel = docType.toLowerCase().includes('travel') ||
                            (receipt.receiptType && receipt.receiptType.toLowerCase().includes('travel')) ||
                            (channel && channel.toLowerCase().includes('travel'));
            
            if (isGas || isTravel) {
                return;
            }
            
            // Only positive transactions (exclude refunds)
            const total = receipt.total || 0;
            if (total < 0) {
                return;
            }
            
            const date = receipt.transactionDateTime;
            const cycleYear = getCycleYear(date);
            if (cycleYear === null) return;
            
            if (!byYear[cycleYear]) {
                byYear[cycleYear] = {
                    subtotal: 0,
                    reward: 0
                };
            }
            
            // Calculate qualifying subtotal by examining items
            let qualifyingSubtotal = 0;
            if (Array.isArray(receipt.itemArray)) {
                receipt.itemArray.forEach(item => {
                    if (item.isDiscount) return;
                    
                    const dept = item.itemDepartmentNumber || 0;
                    const amount = Number(item.amount) || 0;
                    
                    // Skip excluded departments and negative amounts
                    if (excludedDepartments.has(dept) || amount < 0) {
                        return;
                    }
                    
                    qualifyingSubtotal += amount;
                });
            } else {
                // Fallback: if no itemArray, use receipt subtotal
                // (but this shouldn't happen with normalized receipts)
                qualifyingSubtotal = Math.abs(Number(receipt.subTotal) || 0);
            }
            
            byYear[cycleYear].subtotal += qualifyingSubtotal;
        });
        
        // Calculate 2% reward for each year (capped at $1,250 per Costco policy)
        Object.keys(byYear).forEach(year => {
            const rawReward = byYear[year].subtotal * 0.02;
            byYear[year].reward = Math.min(rawReward, 1250); // Costco caps at $1,250/year
            totalReward += byYear[year].reward;
        });
        
        return {
            byYear,
            totalReward,
            cycleStart: {
                month: cycleStartMonth,
                day: cycleStartDay
            }
        };
    }
    
    /**
     * Get top items by various criteria
     * @param {Array} receipts - Array of receipts
     * @param {number} n - Number of top items to return
     * @param {string} sortBy - Sort criteria: 'quantity', 'spending', 'frequency'
     * @returns {Array} Top items
     */
    function getTopItems(receipts, n = 10, sortBy = 'spending') {
        if (!Array.isArray(receipts) || receipts.length === 0) {
            return [];
        }
        
        const itemMap = new Map();
        
        // Aggregate item data
        receipts.forEach(receipt => {
            if (!Array.isArray(receipt.itemArray)) return;
            
            // Check if this is a refund receipt
            const isRefund = receipt.transactionType === 'Refund' || 
                           receipt.transactionType === 'Return' || 
                           receipt.transactionType === 'Returned' ||
                           (receipt.total || 0) < 0;
            
            receipt.itemArray.forEach(item => {
                if (item.isDiscount) return; // Skip discount items
                
                const itemNum = item.itemNumber;
                if (!itemMap.has(itemNum)) {
                    itemMap.set(itemNum, {
                        itemNumber: itemNum,
                        name: item.normalizedName,
                        image: item.fullItemImage || null,
                        totalQuantity: 0,
                        totalSpent: 0,
                        purchases: 0,
                        prices: [],
                        priceHistory: [], // Track price history for trends
                        avgPrice: 0,
                        minPrice: Infinity,
                        maxPrice: -Infinity,
                        firstPrice: null,
                        lastPrice: null
                    });
                }
                
                const itemStats = itemMap.get(itemNum);
                itemStats.totalQuantity += item.unit || 0;
                itemStats.totalSpent += item.amount || 0;
                itemStats.purchases++;
                itemStats.prices.push(item.unitPrice);
                
                // Only add to price history if this is NOT a refund receipt
                if (!isRefund) {
                itemStats.priceHistory.push({
                    date: receipt.transactionDateTime,
                    price: item.unitPrice
                });
                }
                
                itemStats.minPrice = Math.min(itemStats.minPrice, item.unitPrice);
                itemStats.maxPrice = Math.max(itemStats.maxPrice, item.unitPrice);
            });
        });
        
        // Calculate averages and prepare results
        const items = Array.from(itemMap.values())
            .map(item => {
                // Sort price history by date
                item.priceHistory.sort((a, b) => a.date - b.date);
                const firstPrice = item.priceHistory.length > 0 ? item.priceHistory[0].price : 0;
                const lastPrice = item.priceHistory.length > 0 ? item.priceHistory[item.priceHistory.length - 1].price : 0;
                
                return {
                    ...item,
                    totalSpent: Math.round(item.totalSpent * 100) / 100,
                    avgPrice: Math.round((item.totalSpent / item.totalQuantity) * 100) / 100,
                    minPrice: Math.round(item.minPrice * 100) / 100,
                    maxPrice: Math.round(item.maxPrice * 100) / 100,
                    priceChange: item.maxPrice - item.minPrice,
                    firstPrice: Math.round(firstPrice * 100) / 100,
                    lastPrice: Math.round(lastPrice * 100) / 100,
                    priceTrend: lastPrice - firstPrice // Positive = increase, Negative = decrease
                };
            })
            .filter(item => item.totalSpent > 0); // Exclude items with zero or negative net spending (fully refunded)
        
        // Sort based on criteria
        let sorted;
        switch (sortBy) {
            case 'quantity':
                sorted = items.sort((a, b) => b.totalQuantity - a.totalQuantity);
                break;
            case 'frequency':
                sorted = items.sort((a, b) => b.purchases - a.purchases);
                break;
            case 'spending':
            default:
                sorted = items.sort((a, b) => b.totalSpent - a.totalSpent);
                break;
        }
        
        return sorted.slice(0, n);
    }
    
    /**
     * Get most expensive items (by unit price)
     * @param {Array} receipts - Array of receipts
     * @param {number} n - Number of items to return
     * @returns {Array} Most expensive items
     */
    function getMostExpensive(receipts, n = 10) {
        if (!Array.isArray(receipts) || receipts.length === 0) {
            return [];
        }
        
        const allItems = [];
        
        receipts.forEach(receipt => {
            if (!Array.isArray(receipt.itemArray)) return;
            
            receipt.itemArray.forEach(item => {
                if (item.isDiscount) return;
                
                allItems.push({
                    itemNumber: item.itemNumber,
                    name: item.normalizedName,
                    unitPrice: item.unitPrice,
                    amount: item.amount,
                    date: receipt.transactionDateTime,
                    warehouse: receipt.warehouseNumber
                });
            });
        });
        
        return allItems
            .sort((a, b) => b.unitPrice - a.unitPrice)
            .slice(0, n);
    }
    
    /**
     * Get items with price increases
     * @param {Array} receipts - Array of receipts
     * @param {number} n - Number of items to return
     * @returns {Array} Items with price increases (sorted by biggest increase)
     */
    function getPriceIncreases(receipts, n = 10) {
        const items = getTopItems(receipts, 1000, 'spending'); // Get many items with price history
        
        return items
            .filter(item => item.priceTrend > 0 && item.purchases >= 2) // Only items with multiple purchases and price increase
            .sort((a, b) => b.priceTrend - a.priceTrend)
            .slice(0, n)
            .map(item => ({
                itemNumber: item.itemNumber,
                name: item.name,
                firstPrice: item.firstPrice,
                lastPrice: item.lastPrice,
                priceIncrease: item.priceTrend,
                percentIncrease: item.firstPrice > 0 ? Math.round((item.priceTrend / item.firstPrice) * 10000) / 100 : 0,
                avgPrice: item.avgPrice,
                maxPrice: item.maxPrice,
                purchases: item.purchases
            }));
    }
    
    /**
     * Get items with price decreases
     * @param {Array} receipts - Array of receipts
     * @param {number} n - Number of items to return
     * @returns {Array} Items with price decreases (sorted by biggest decrease)
     */
    function getPriceDecreases(receipts, n = 10) {
        const items = getTopItems(receipts, 1000, 'spending'); // Get many items with price history
        
        return items
            .filter(item => item.priceTrend < 0 && item.purchases >= 2) // Only items with multiple purchases and price decrease
            .sort((a, b) => a.priceTrend - b.priceTrend) // Sort ascending (most negative first)
            .slice(0, n)
            .map(item => ({
                itemNumber: item.itemNumber,
                name: item.name,
                firstPrice: item.firstPrice,
                lastPrice: item.lastPrice,
                priceDecrease: Math.abs(item.priceTrend),
                percentDecrease: item.firstPrice > 0 ? Math.round((Math.abs(item.priceTrend) / item.firstPrice) * 10000) / 100 : 0,
                avgPrice: item.avgPrice,
                minPrice: item.minPrice,
                purchases: item.purchases
            }));
    }
    
    /**
     * Get price history for a specific item
     * @param {string} itemNumber - Item number
     * @param {Array} receipts - Array of receipts (optional, uses DataStore if not provided)
     * @returns {Array} Price history points
     */
    function getPriceHistory(itemNumber, receipts = null) {
        const receiptsList = receipts || (App.modules.dataStore ? App.modules.dataStore.getReceipts() : []);
        
        if (!Array.isArray(receiptsList) || receiptsList.length === 0) {
            return [];
        }
        
        const pricePoints = [];
        
        receiptsList.forEach(receipt => {
            if (!Array.isArray(receipt.itemArray)) return;
            
            const item = receipt.itemArray.find(i => i.itemNumber === itemNumber);
            if (item && !item.isDiscount) {
                pricePoints.push({
                    date: receipt.transactionDateTime,
                    price: item.unitPrice,
                    quantity: item.unit,
                    amount: item.amount,
                    warehouse: receipt.warehouseNumber
                });
            }
        });
        
        return pricePoints.sort((a, b) => a.date - b.date);
    }
    
    /**
     * Get savings analysis
     * @param {Array} receipts - Array of receipts
     * @returns {Object} Savings statistics
     */
    function getSavingsAnalysis(receipts) {
        if (!Array.isArray(receipts) || receipts.length === 0) {
            return {
                totalSavings: 0,
                totalSpent: 0,
                savingsRate: 0,
                avgSavingsPerTrip: 0,
                tripsWithSavings: 0
            };
        }
        
        let totalSavings = 0;
        let totalSpent = 0;
        let tripsWithSavings = 0;
        
        receipts.forEach(receipt => {
            const savings = receipt.instantSavings || 0;
            totalSavings += savings;
            totalSpent += receipt.total || 0;
            if (savings > 0) tripsWithSavings++;
        });
        
        return {
            totalSavings: Math.round(totalSavings * 100) / 100,
            totalSpent: Math.round(totalSpent * 100) / 100,
            savingsRate: totalSpent > 0 ? Math.round((totalSavings / totalSpent) * 10000) / 100 : 0,
            avgSavingsPerTrip: Math.round((totalSavings / receipts.length) * 100) / 100,
            tripsWithSavings
        };
    }
    
    return {
        // Basic statistics
        calculateTotals,
        calculateAverages,
        getWarehouseStats,
        getMonthlySpending,
        calculateAll,
        // Advanced analytics
        getTopItems,
        getMostExpensive,
        getPriceHistory,
        getPriceIncreases,
        getPriceDecreases,
        getSavingsAnalysis,
        // Utility functions
        getDepartmentName
    };
})();

// ===== DATA STORE MODULE =====
const DataStore = (() => {
    // In-memory storage
    const state = {
        receipts: [],
        itemIndex: new Map(),  // itemNumber -> array of items
        warehouseSet: new Set(),
        dateRange: { min: null, max: null },
        statsCache: null
    };
    
    /**
     * Add receipts to the store
     * @param {Array} receipts - Array of normalized receipts
     */
    function addReceipts(receipts) {
        if (!Array.isArray(receipts)) {
            ErrorHandler.error('addReceipts: Input must be an array');
            return;
        }
        
        ErrorHandler.info(`Adding ${receipts.length} receipts to DataStore`);
        
        // Add to receipts array
        state.receipts.push(...receipts);
        
        // Rebuild indexes
        rebuildIndexes();
        
        // Clear stats cache
        state.statsCache = null;
        
        ErrorHandler.info(`DataStore now contains ${state.receipts.length} receipts`);
        
        // Emit event
        EventBus.emit('datastore:receiptsAdded', {
            count: receipts.length,
            total: state.receipts.length
        });
    }
    
    /**
     * Rebuild all indexes
     */
    function rebuildIndexes() {
        // Clear existing indexes
        state.itemIndex.clear();
        state.warehouseSet.clear();
        state.dateRange = { min: null, max: null };
        
        // Build item index and collect warehouses
        state.receipts.forEach(receipt => {
            // Index items
            if (Array.isArray(receipt.itemArray)) {
                receipt.itemArray.forEach(item => {
                    const itemNum = item.itemNumber;
                    if (!state.itemIndex.has(itemNum)) {
                        state.itemIndex.set(itemNum, []);
                    }
                    state.itemIndex.get(itemNum).push({
                        ...item,
                        receiptId: receipt.id,
                        receiptDate: receipt.transactionDateTime,
                        warehouseNumber: receipt.warehouseNumber
                    });
                });
            }
            
            // Add warehouse
            if (receipt.warehouseNumber) {
                state.warehouseSet.add(receipt.warehouseNumber);
            }
            
            // Update date range
            if (receipt.transactionDateTime) {
                const date = receipt.transactionDateTime;
                if (!state.dateRange.min || date < state.dateRange.min) {
                    state.dateRange.min = date;
                }
                if (!state.dateRange.max || date > state.dateRange.max) {
                    state.dateRange.max = date;
                }
            }
        });
        
        ErrorHandler.debug(`Indexes rebuilt: ${state.itemIndex.size} unique items, ${state.warehouseSet.size} warehouses`);
    }
    
    /**
     * Get receipts with optional filter
     * @param {Object} filter - Filter options
     * @returns {Array} Filtered receipts
     */
    function getReceipts(filter = null) {
        if (!filter) {
            return [...state.receipts];
        }
        
        let filtered = state.receipts;
        
        // Filter by date range
        if (filter.startDate || filter.endDate) {
            filtered = filtered.filter(receipt => {
                const date = receipt.transactionDateTime;
                if (!date) return false;
                
                if (filter.startDate && date < filter.startDate) return false;
                if (filter.endDate && date > filter.endDate) return false;
                
                return true;
            });
        }
        
        // Filter by warehouse
        if (filter.warehouseNumber) {
            filtered = filtered.filter(r => r.warehouseNumber === filter.warehouseNumber);
        }
        
        // Filter by transaction type
        if (filter.transactionType) {
            filtered = filtered.filter(r => r.transactionType === filter.transactionType);
        }
        
        // Filter by search term (item names)
        if (filter.searchTerm) {
            const term = filter.searchTerm.toLowerCase();
            filtered = filtered.filter(receipt => {
                return receipt.itemArray.some(item => {
                    return (
                        item.normalizedName.toLowerCase().includes(term) ||
                        item.itemNumber.includes(term)
                    );
                });
            });
        }
        
        return filtered;
    }
    
    /**
     * Get items by item number
     * @param {string} itemNumber - Item number
     * @returns {Array} Array of items
     */
    function getItemsByNumber(itemNumber) {
        return state.itemIndex.get(itemNumber) || [];
    }
    
    /**
     * Get all unique items
     * @returns {Map} Item index
     */
    function getItems() {
        return new Map(state.itemIndex);
    }
    
    /**
     * Get all warehouses
     * @returns {Set} Warehouse numbers
     */
    function getWarehouses() {
        return new Set(state.warehouseSet);
    }
    
    /**
     * Get date range of all receipts
     * @returns {Object} {min: Date, max: Date}
     */
    function getDateRange() {
        return { ...state.dateRange };
    }
    
    /**
     * Get receipt count
     * @returns {number} Number of receipts
     */
    function getReceiptCount() {
        return state.receipts.length;
    }
    
    /**
     * Get total spent across all receipts
     * @returns {number} Total amount
     */
    function getTotalSpent() {
        return state.receipts.reduce((sum, r) => sum + r.total, 0);
    }
    
    /**
     * Get a single receipt by ID
     * @param {string} id - Receipt ID
     * @returns {Object|null} Receipt or null
     */
    function getReceiptById(id) {
        return state.receipts.find(r => r.id === id) || null;
    }
    
    /**
     * Clear all data
     */
    function clear() {
        state.receipts = [];
        state.itemIndex.clear();
        state.warehouseSet.clear();
        state.dateRange = { min: null, max: null };
        state.statsCache = null;
        
        ErrorHandler.info('DataStore cleared');
        
        EventBus.emit('datastore:cleared', {});
    }
    
    /**
     * Get store statistics
     * @returns {Object} Statistics
     */
    function getStats() {
        return {
            receiptCount: state.receipts.length,
            uniqueItems: state.itemIndex.size,
            warehouseCount: state.warehouseSet.size,
            dateRange: state.dateRange,
            totalSpent: getTotalSpent()
        };
    }
    
    return {
        addReceipts,
        getReceipts,
        getReceiptById,
        getItems,
        getItemsByNumber,
        getWarehouses,
        getDateRange,
        getReceiptCount,
        getTotalSpent,
        getStats,
        clear
    };
})();

// ===== DATA PROCESSOR MODULE =====
const DataProcessor = (() => {
    const state = {
        selectedFiles: [],
        loadedFiles: [],
        parsedReceipts: [],
        totalSize: 0
    };
    
    // Receipt schema definition
    const RECEIPT_SCHEMA = {
        required: [
            // Note: transactionDate OR transactionDateISO OR transactionDateTime is required
            // This is validated with custom logic in validateReceipt
            'transactionType',
            'total',
            'itemArray',
            'warehouseNumber'
        ],
        optional: [
            'transactionDate',
            'transactionDateTime',
            'transactionDateISO',
            'warehouseName',
            'warehouseCity',
            'warehouseState',
            'subTotal',
            'taxes',
            'instantSavings',
            'tenderArray',
            'couponArray',
            'membershipNumber',
            'receiptType',
            'channel'
        ]
    };
    
    const ITEM_SCHEMA = {
        required: ['itemNumber', 'amount', 'unit'],
        optional: [
            'itemDescription01',
            'itemDescription02',
            'itemActualName',
            'itemUnitPriceAmount',
            'taxFlag',
            'itemDepartmentNumber'
        ]
    };
    
    /**
     * Parse date string to Date object
     * @param {string} dateStr - Date string (ISO 8601 or YYYY-MM-DD)
     * @returns {Date|null} Parsed date or null
     */
    function parseDate(dateStr) {
        if (!dateStr) return null;
        
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) {
                return null;
            }
            return date;
        } catch (error) {
            ErrorHandler.debug(`Failed to parse date: ${dateStr}`);
            return null;
        }
    }
    
    /**
     * Clean and standardize text field
     * @param {string} text - Text to clean
     * @returns {string} Cleaned text
     */
    function cleanText(text) {
        if (!text || typeof text !== 'string') return '';
        
        return text
            .trim()
            .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
            .replace(/\n+/g, ' ')   // Replace newlines with space
            .substring(0, 500);     // Limit length for security
    }
    
    /**
     * Generate unique receipt ID
     * @param {Object} receipt - Receipt object
     * @param {number} index - Receipt index
     * @returns {string} Unique ID
     */
    function generateReceiptId(receipt, index) {
        // Try to create a unique ID from receipt data
        const date = receipt.transactionDate || '';
        const warehouse = receipt.warehouseNumber || '';
        const transNum = receipt.transactionNumber || '';
        const total = receipt.total || '';
        
        if (transNum && warehouse && date) {
            return `${warehouse}-${date}-${transNum}`;
        }
        
        // Fallback: use hash of key fields
        const hashInput = `${date}-${warehouse}-${total}-${index}`;
        return `receipt-${btoa(hashInput).substring(0, 16)}`;
    }
    
    /**
     * Normalize a single item
     * @param {Object} item - Raw item object
     * @returns {Object} Normalized item
     */
    function normalizeItem(item) {
        // Handle unit - can be number (warehouse) or string like 'EA' (online)
        let unit = 0;
        if (typeof item.unit === 'number') {
            unit = item.unit;
        } else if (typeof item.unit === 'string') {
            // Online orders have 'EA', 'LB', etc. - default to 1
            const parsed = parseFloat(item.unit);
            unit = isNaN(parsed) ? 1 : parsed;
        } else {
            unit = 0;
        }
        
        const normalized = {
            // Core fields
            itemNumber: String(item.itemNumber || ''),
            amount: Number(item.amount) || 0,
            unit: unit,
            
            // Descriptions (cleaned)
            itemDescription01: cleanText(item.itemDescription01 || ''),
            itemDescription02: cleanText(item.itemDescription02 || ''),
            itemActualName: cleanText(item.itemActualName || ''),
            
            // Derived fields
            normalizedName: '',
            unitPrice: 0,
            isDiscount: false,
            
            // Optional fields
            taxFlag: item.taxFlag || null,
            itemDepartmentNumber: item.itemDepartmentNumber || null,
            itemUnitPriceAmount: item.itemUnitPriceAmount || null,
            
            // Fuel-specific fields (for gas station receipts)
            fuelUnitQuantity: item.fuelUnitQuantity !== undefined ? item.fuelUnitQuantity : null,
            fuelGradeCode: item.fuelGradeCode || null,
            fuelGradeDescription: item.fuelGradeDescription || null,
            fuelUomCode: item.fuelUomCode || null,
            
            // Additional metadata
            fullItemImage: item.fullItemImage || null,
            catEntryId: item.catEntryId || null
        };
        
        // Calculate unit price
        if (normalized.unit !== 0) {
            normalized.unitPrice = normalized.amount / normalized.unit;
        } else if (normalized.itemUnitPriceAmount) {
            normalized.unitPrice = Number(normalized.itemUnitPriceAmount);
        } else {
            normalized.unitPrice = normalized.amount;
        }
        
        // Round unit price to 2 decimals
        normalized.unitPrice = Math.round(normalized.unitPrice * 100) / 100;
        
        // Determine if this is a discount item (not a return/refund)
        // Warehouse discounts have item references like "/1337603" in their name fields
        // They also have negative amounts and negative quantities (or zero unit)
        const hasItemReference = (
            (normalized.itemActualName && normalized.itemActualName.startsWith('/')) ||
            (normalized.itemDescription01 && normalized.itemDescription01.startsWith('/')) ||
            (item.frenchItemDescription1 && item.frenchItemDescription1.startsWith('/'))
        );
        
        // Check if this is a return (negative amount AND negative quantity, but no item reference)
        const isReturn = normalized.amount < 0 && normalized.unit < 0 && !hasItemReference;
        
        // Discounts: negative amount AND (has item reference OR unit is zero/negative but not a return)
        normalized.isDiscount = normalized.amount < 0 && (hasItemReference || (!isReturn && normalized.unit >= 0));
        
        // For discount items, store the referenced item number
        if (normalized.isDiscount && hasItemReference) {
            const refMatch = (normalized.itemActualName || normalized.itemDescription01 || item.frenchItemDescription1 || '').match(/\/(\d+)/);
            normalized.discountAppliesTo = refMatch ? refMatch[1] : null;
        }
        
        // Create normalized name (prefer actual name, fallback to descriptions)
        if (normalized.itemActualName && !normalized.itemActualName.startsWith('/')) {
            normalized.normalizedName = normalized.itemActualName;
        } else if (normalized.itemDescription01 && !normalized.itemDescription01.startsWith('/')) {
            normalized.normalizedName = normalized.itemDescription01 +
                (normalized.itemDescription02 ? ' ' + normalized.itemDescription02 : '');
        } else if (normalized.isDiscount && normalized.discountAppliesTo) {
            normalized.normalizedName = `Discount on Item ${normalized.discountAppliesTo}`;
        } else {
            normalized.normalizedName = 'Item ' + normalized.itemNumber;
        }
        
        return normalized;
    }
    
    /**
     * Normalize a single receipt
     * @param {Object} receipt - Raw receipt object
     * @param {number} index - Receipt index
     * @param {string} sourceFile - Source filename
     * @returns {Object} Normalized receipt
     */
    function normalizeReceipt(receipt, index, sourceFile) {
        // Parse dates
        const transactionDate = parseDate(
            receipt.transactionDateISO || 
            receipt.transactionDateTime || 
            receipt.transactionDate
        );
        
        // Normalize transactionType: 'Delivered' (online) -> 'Sales'
        let transactionType = receipt.transactionType || 'Sales';
        if (transactionType === 'Delivered') {
            transactionType = 'Sales';
        }
        
        const normalized = {
            // Generated fields
            id: generateReceiptId(receipt, index),
            processedAt: new Date(),
            sourceFile: sourceFile,
            
            // Core fields
            transactionDate: receipt.transactionDate || null,
            transactionDateTime: transactionDate,
            transactionType: transactionType,
            
            // Warehouse information
            warehouseNumber: Number(receipt.warehouseNumber) || 0,
            warehouseName: (receipt.channel === 'online' || receipt.documentType === 'ONLINE' || receipt.documentType === 'OnlineReceipts') 
                ? 'Online' 
                : cleanText(receipt.warehouseName || ''),
            warehouseCity: cleanText(receipt.warehouseCity || ''),
            warehouseState: receipt.warehouseState || receipt.warehouseProvince || null,
            warehouseCountry: receipt.warehouseCountry || null,
            warehouseFullAddress: cleanText(receipt.warehouseFullAddress || ''),
            
            // Financial fields
            total: Number(receipt.total) || 0,
            subTotal: Number(receipt.subTotal) || 0,
            taxes: Number(receipt.taxes) || 0,
            instantSavings: Number(receipt.instantSavings) || 0,
            
            // Arrays
            itemArray: [],
            tenderArray: receipt.tenderArray || [],
            couponArray: receipt.couponArray || [],
            
            // Additional metadata
            membershipNumber: receipt.membershipNumber ? String(receipt.membershipNumber) : null,
            receiptType: receipt.receiptType || null,
            documentType: receipt.documentType || null,
            channel: receipt.channel || null,
            transactionNumber: receipt.transactionNumber || null,
            totalItemCount: receipt.totalItemCount || 0,
            
            // Subtaxes (if available)
            subTaxes: receipt.subTaxes || null,
            
            // Original receipt (for reference)
            _original: receipt
        };
        
        // Normalize all items
        if (Array.isArray(receipt.itemArray)) {
            normalized.itemArray = receipt.itemArray.map(item => normalizeItem(item));
        }
        
        // Update item count if not provided
        if (!normalized.totalItemCount) {
            normalized.totalItemCount = normalized.itemArray.length;
        }
        
        // Calculate instantSavings correctly
        // For online orders: use orderDiscountAmount field
        // For warehouse orders: sum up all discount items (negative amounts)
        const isOnlineOrder = receipt.channel === 'online' || 
                             receipt.documentType === 'ONLINE' || 
                             receipt.documentType === 'OnlineReceipts';
        
        if (isOnlineOrder && receipt.orderDiscountAmount) {
            normalized.instantSavings = Number(receipt.orderDiscountAmount) || 0;
        } else {
            // Sum up all discount items from itemArray
            let totalDiscounts = 0;
            normalized.itemArray.forEach(item => {
                if (item.isDiscount && item.amount < 0) {
                    totalDiscounts += Math.abs(item.amount);
                }
            });
            normalized.instantSavings = totalDiscounts;
        }
        
        return normalized;
    }
    
    /**
     * Merge receipts from multiple files with intelligent deduplication
     * @param {Array} receiptsArray - Array of receipt arrays
     * @returns {Array} Merged and deduplicated receipts
     */
    function mergeReceipts(receiptsArray) {
        const receiptMap = new Map();
        let duplicateCount = 0;
        let totalReceipts = 0;
        
        receiptsArray.forEach(receipts => {
            receipts.forEach(receipt => {
                totalReceipts++;
                
                // Use transactionBarcode as unique key
                const transactionBarcode = receipt._original?.transactionBarcode || receipt.id;
                const key = transactionBarcode;
                
                if (receiptMap.has(key)) {
                    duplicateCount++;
                    ErrorHandler.debug(`Duplicate receipt found: ${key}`);
                    
                    const existing = receiptMap.get(key);
                    
                    // Deduplication: prefer more complete data (longer itemArray)
                    if (receipt.itemArray.length > existing.itemArray.length) {
                        receiptMap.set(key, receipt);
                        ErrorHandler.debug(`  → Replacing with more complete data (${receipt.itemArray.length} vs ${existing.itemArray.length} items)`);
                    }
                } else {
                    // New unique receipt
                    receiptMap.set(key, receipt);
                }
            });
        });
        
        // Summary
        ErrorHandler.info(`Merge summary: ${totalReceipts} receipts from ${receiptsArray.length} file(s)`);
        if (duplicateCount > 0) {
            ErrorHandler.info(`Found and merged ${duplicateCount} duplicate receipts`);
        }
        
        const merged = Array.from(receiptMap.values());
        ErrorHandler.info(`Final dataset: ${merged.length} unique receipts`);
        
        return merged;
    }
    
    /**
     * Format file size for display
     * @param {number} bytes - File size in bytes
     * @returns {string} Formatted size
     */
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
    
    /**
     * Display selected files in the UI
     * @param {FileList} files - Selected files
     */
    function displayFileList(files) {
        const fileList = document.getElementById('file-list');
        if (!fileList) return;
        
        fileList.innerHTML = '';
        
        if (files.length === 0) {
            fileList.classList.add('hidden');
            return;
        }
        
        fileList.classList.remove('hidden');
        
        // Create a list of file items
        Array.from(files).forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <div>
                    <strong>${file.name}</strong>
                    <span style="color: var(--color-text-tertiary); font-size: var(--font-size-sm); margin-left: var(--spacing-sm);">
                        ${formatFileSize(file.size)}
                    </span>
                </div>
                <span style="color: var(--color-text-tertiary);">${file.type || 'application/json'}</span>
            `;
            fileList.appendChild(fileItem);
        });
        
        // Add summary
        const summary = document.createElement('div');
        summary.style.cssText = 'margin-top: var(--spacing-md); padding: var(--spacing-md); background-color: var(--color-surface); border-radius: var(--radius-md); text-align: center;';
        summary.innerHTML = `
            <strong>${files.length}</strong> file${files.length !== 1 ? 's' : ''} selected 
            (Total: <strong>${formatFileSize(state.totalSize)}</strong>)
        `;
        fileList.appendChild(summary);
        
        // Note: Process button removed - processing starts automatically after validation (FR8)
    }
    
    /**
     * Validate file selection
     * @param {FileList} files - Files to validate
     * @returns {Object} Validation result
     */
    function validateFiles(files) {
        const errors = [];
        const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB per file
        const MAX_TOTAL_SIZE = 100 * 1024 * 1024; // 100MB total
        let totalSize = 0;
        
        if (files.length === 0) {
            errors.push('No files selected');
            return { valid: false, errors };
        }
        
        Array.from(files).forEach((file, index) => {
            // Check file type
            if (!file.name.endsWith('.json')) {
                errors.push(`File ${index + 1} (${file.name}): Must be a JSON file`);
            }
            
            // Check individual file size
            if (file.size > MAX_FILE_SIZE) {
                errors.push(`File ${index + 1} (${file.name}): File size exceeds 50MB limit`);
            }
            
            // Check if file is empty
            if (file.size === 0) {
                errors.push(`File ${index + 1} (${file.name}): File is empty`);
            }
            
            totalSize += file.size;
        });
        
        // Check total size
        if (totalSize > MAX_TOTAL_SIZE) {
            errors.push(`Total file size (${formatFileSize(totalSize)}) exceeds 100MB limit`);
        }
        
        state.totalSize = totalSize;
        
        return {
            valid: errors.length === 0,
            errors,
            totalSize
        };
    }
    
    /**
     * Handle file selection
     * Automatically starts processing after successful validation (FR8 - process-on-select)
     * @param {FileList} files - Selected files
     */
    function handleFileSelection(files) {
        ErrorHandler.info(`${files.length} file(s) selected`);
        
        // Validate files
        const validation = validateFiles(files);
        
        if (!validation.valid) {
            const errorMessage = 'File validation failed:\n' + validation.errors.join('\n');
            ErrorHandler.handleError(errorMessage, 'File Loading');
            return;
        }
        
        // Store files
        state.selectedFiles = Array.from(files);
        
        // Display file list
        displayFileList(files);
        
        // Emit event
        EventBus.emit('files:validated', {
            files: state.selectedFiles,
            totalSize: state.totalSize,
            count: files.length
        });
        
        ErrorHandler.info('Files validated successfully');
        
        // FR8: Automatically start processing after successful validation
        // No separate "Process Files" button - processing begins immediately
        handleFileProcessing(files);
    }
    
    /**
     * Handle file processing (reading and parsing)
     * @param {FileList} files - Files to process
     */
    async function handleFileProcessing(files) {
        const uiController = App.modules.uiController;
        try {
            if (uiController) {
                uiController.showLoading(`Processing ${files.length} file(s)...`);
            }
            
            ErrorHandler.info('Starting file processing...');
            
            // Emit processing started event
            EventBus.emit('files:processingStarted', { count: files.length });
            
            // Step 1: Read all files
            if (uiController) {
                uiController.showLoading(`Reading ${files.length} file(s)...`);
            }
            const filePromises = Array.from(files).map((file, index) => {
                return readFile(file, index);
            });
            
            const readResults = await Promise.all(filePromises);
            
            // Filter out failed reads
            const successfulReads = readResults.filter(r => r.success);
            const failedReads = readResults.filter(r => !r.success);
            
            if (failedReads.length > 0) {
                ErrorHandler.warn(`${failedReads.length} file(s) failed to read`);
                failedReads.forEach(result => {
                    ErrorHandler.error(`Failed to read ${result.filename}`, result.error);
                });
            }
            
            if (successfulReads.length === 0) {
                throw new Error('No files were successfully read');
            }
            
            // Step 2: Parse JSON from each file
            if (uiController) {
                uiController.showLoading(`Parsing ${successfulReads.length} file(s)...`);
            }
            const parseResults = successfulReads.map(fileResult => {
                return parseJSON(fileResult.content, fileResult.filename);
            });
            
            const successfulParses = parseResults.filter(r => r.success);
            const failedParses = parseResults.filter(r => !r.success);
            
            if (failedParses.length > 0) {
                ErrorHandler.warn(`${failedParses.length} file(s) failed to parse`);
                failedParses.forEach(result => {
                    ErrorHandler.error(`Failed to parse ${result.filename}`, result.error);
                });
            }
            
            if (successfulParses.length === 0) {
                throw new Error('No files were successfully parsed');
            }
            
            // Step 3: Validate JSON structure
            if (uiController) {
                uiController.showLoading(`Validating ${successfulParses.length} file(s)...`);
            }
            const validationResults = successfulParses.map(parseResult => {
                return validateJSONStructure(parseResult.data, parseResult.filename);
            });
            
            const validFiles = validationResults.filter(r => r.valid);
            const invalidFiles = validationResults.filter(r => !r.valid);
            
            if (invalidFiles.length > 0) {
                ErrorHandler.warn(`${invalidFiles.length} file(s) failed validation`);
                invalidFiles.forEach(result => {
                    result.errors.slice(0, 10).forEach(err => ErrorHandler.error(err));
                    if (result.errors.length > 10) {
                        ErrorHandler.error(`... and ${result.errors.length - 10} more errors`);
                    }
                });
            }
            
            // Log errors from files that passed but had some invalid receipts
            validFiles.forEach(result => {
                if (result.invalidCount > 0 && result.errors.length > 0) {
                    ErrorHandler.warn(`${result.filename || 'File'}: ${result.invalidCount} receipt(s) failed validation`);
                    result.errors.slice(0, 10).forEach(err => ErrorHandler.error(err));
                    if (result.errors.length > 10) {
                        ErrorHandler.error(`... and ${result.errors.length - 10} more errors`);
                    }
                }
            });
            
            if (validFiles.length === 0) {
                throw new Error('No files passed validation. Please check file format.');
            }
            
            // Collect all valid receipts
            const rawReceipts = validFiles.flatMap(result => result.receipts);
            const totalReceipts = validFiles.reduce((sum, r) => sum + r.totalCount, 0);
            const validReceipts = validFiles.reduce((sum, r) => sum + r.validCount, 0);
            const invalidReceipts = validFiles.reduce((sum, r) => sum + r.invalidCount, 0);
            
            // Step 4: Normalize receipts
            if (uiController) {
                uiController.showLoading(`Normalizing ${validReceipts} receipts...`);
            }
            const normalizedReceipts = [];
            validFiles.forEach(fileResult => {
                fileResult.receipts.forEach((receipt, index) => {
                    const normalized = normalizeReceipt(receipt, index, fileResult.filename);
                    normalizedReceipts.push(normalized);
                });
            });
            
            // Step 5: Merge receipts (deduplicate)
            if (uiController) {
                uiController.showLoading(`Merging receipts...`);
            }
            const mergedReceipts = mergeReceipts([normalizedReceipts]);
            
            // Step 5.5: Filter out cancelled transactions
            const validTransactions = mergedReceipts.filter(receipt => {
                return receipt.transactionType !== 'Cancelled' && 
                       receipt.transactionType !== 'Canceled';
            });
            const cancelledCount = mergedReceipts.length - validTransactions.length;
            if (cancelledCount > 0) {
                ErrorHandler.info(`Filtered out ${cancelledCount} cancelled transactions`);
            }
            
            state.loadedFiles = successfulReads;
            state.parsedReceipts = validTransactions;
            
            ErrorHandler.info(`Successfully processed ${validFiles.length} file(s)`);
            ErrorHandler.info(`Total receipts: ${totalReceipts}, Valid: ${validReceipts}, Invalid: ${invalidReceipts}`);
            ErrorHandler.info(`Final merged receipts: ${validTransactions.length}`);
            
            // Step 6: Add to DataStore
            if (App.modules.dataStore) {
                if (uiController) {
                    uiController.showLoading(`Loading ${validTransactions.length} receipts into DataStore...`);
                }
                App.modules.dataStore.addReceipts(validTransactions);
            }
            
            // Emit files parsed event
            EventBus.emit('files:parsed', {
                files: validFiles,
                receipts: mergedReceipts,
                fileCount: validFiles.length,
                receiptCount: mergedReceipts.length,
                invalidCount: invalidReceipts,
                totalCount: totalReceipts
            });
            
            if (uiController) {
                uiController.hideLoading();
            }
            
            // Show detailed success message
            const message = `Successfully processed ${validFiles.length} file(s) with ${mergedReceipts.length} receipts` +
                (invalidReceipts > 0 ? ` (${invalidReceipts} invalid receipts skipped)` : '');
            ErrorHandler.info(message);
            
        } catch (error) {
            if (uiController) {
                uiController.hideLoading();
            }
            ErrorHandler.handleError(error, 'JSON Parsing');
        }
    }
    
    /**
     * Read a single file
     * @param {File} file - File to read
     * @param {number} index - File index
     * @returns {Promise<Object>} File content
     */
    function readFile(file, index) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const content = e.target.result;
                    ErrorHandler.debug(`Read ${file.name}: ${formatFileSize(content.length)} characters`);
                    
                    resolve({
                        success: true,
                        filename: file.name,
                        content: content,
                        size: file.size,
                        index: index
                    });
                } catch (error) {
                    resolve({
                        success: false,
                        filename: file.name,
                        error: error.message,
                        index: index
                    });
                }
            };
            
            reader.onerror = () => {
                resolve({
                    success: false,
                    filename: file.name,
                    error: 'Failed to read file',
                    index: index
                });
            };
            
            reader.readAsText(file);
        });
    }
    
    /**
     * Parse JSON content safely
     * @param {string} content - JSON string
     * @param {string} filename - Source filename
     * @returns {Object} Parse result
     */
    function parseJSON(content, filename) {
        try {
            const data = JSON.parse(content);
            ErrorHandler.debug(`Parsed JSON from ${filename}`);
            
            return {
                success: true,
                data: data,
                filename: filename
            };
        } catch (error) {
            ErrorHandler.error(`JSON parse error in ${filename}`, {
                message: error.message,
                position: error.message.match(/position (\d+)/)
            });
            
            return {
                success: false,
                error: `Invalid JSON format: ${error.message}`,
                filename: filename
            };
        }
    }
    
    /**
     * Validate a single receipt object
     * @param {Object} receipt - Receipt to validate
     * @param {number} index - Receipt index in array
     * @returns {Object} Validation result
     */
    function validateReceipt(receipt, index) {
        const errors = [];
        const warnings = [];
        
        // Check if receipt is an object
        if (!receipt || typeof receipt !== 'object') {
            errors.push(`Receipt ${index}: Not a valid object`);
            return { valid: false, errors, warnings };
        }
        
        // Check required fields
        RECEIPT_SCHEMA.required.forEach(field => {
            if (!(field in receipt) || receipt[field] === null || receipt[field] === undefined) {
                errors.push(`Receipt ${index}: Missing required field "${field}"`);
            }
        });
        
        // Validate at least one date field exists
        if (!receipt.transactionDate && !receipt.transactionDateISO && !receipt.transactionDateTime) {
            errors.push(`Receipt ${index}: Missing required date field (need transactionDate, transactionDateISO, or transactionDateTime)`);
        }
        
        // Validate specific field types
        if (receipt.transactionDate && typeof receipt.transactionDate !== 'string') {
            errors.push(`Receipt ${index}: transactionDate must be a string`);
        }
        
        // total can be number or empty string (cancelled orders)
        if (receipt.total !== null && receipt.total !== '' && typeof receipt.total !== 'number') {
            errors.push(`Receipt ${index}: total must be a number or empty string`);
        }
        
        if (receipt.warehouseNumber !== null && typeof receipt.warehouseNumber !== 'number') {
            errors.push(`Receipt ${index}: warehouseNumber must be a number`);
        }
        
        // Validate itemArray
        if (!Array.isArray(receipt.itemArray)) {
            errors.push(`Receipt ${index}: itemArray must be an array`);
        } else if (receipt.itemArray.length === 0) {
            warnings.push(`Receipt ${index}: itemArray is empty`);
        } else {
            // Validate items
            receipt.itemArray.forEach((item, itemIndex) => {
                const itemValidation = validateItem(item, index, itemIndex);
                errors.push(...itemValidation.errors);
                warnings.push(...itemValidation.warnings);
            });
        }
        
        // Validate tenderArray (optional)
        if (receipt.tenderArray && !Array.isArray(receipt.tenderArray)) {
            errors.push(`Receipt ${index}: tenderArray must be an array`);
        }
        
        // Validate couponArray (optional)
        if (receipt.couponArray && !Array.isArray(receipt.couponArray)) {
            errors.push(`Receipt ${index}: couponArray must be an array`);
        }
        
        // Validate transaction type
        if (receipt.transactionType) {
            const validTypes = ['Sales', 'Refund', 'Return', 'Delivered', 'Shipped', 'Cancelled', 'Returned'];
            if (!validTypes.includes(receipt.transactionType)) {
                warnings.push(`Receipt ${index}: Unexpected transactionType "${receipt.transactionType}"`);
            }
        }
        
        // Data consistency checks
        if (receipt.subTotal && receipt.taxes && receipt.total) {
            // For online orders, account for discounts (orderDiscountAmount)
            const discount = receipt.orderDiscountAmount || 0;
            const calculatedTotal = receipt.subTotal + receipt.taxes - discount;
            const difference = Math.abs(calculatedTotal - receipt.total);
            if (difference > 0.02) { // Allow 2 cent rounding difference
                warnings.push(`Receipt ${index}: Total (${receipt.total}) doesn't match subTotal + taxes - discount (${calculatedTotal})`);
            }
        }
        
        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }
    
    /**
     * Validate a single item object
     * @param {Object} item - Item to validate
     * @param {number} receiptIndex - Parent receipt index
     * @param {number} itemIndex - Item index in array
     * @returns {Object} Validation result
     */
    function validateItem(item, receiptIndex, itemIndex) {
        const errors = [];
        const warnings = [];
        
        if (!item || typeof item !== 'object') {
            errors.push(`Receipt ${receiptIndex}, Item ${itemIndex}: Not a valid object`);
            return { errors, warnings };
        }
        
        // Check required fields
        ITEM_SCHEMA.required.forEach(field => {
            if (!(field in item)) {
                errors.push(`Receipt ${receiptIndex}, Item ${itemIndex}: Missing required field "${field}"`);
            }
        });
        
        // Validate field types
        if (item.amount !== null && typeof item.amount !== 'number') {
            errors.push(`Receipt ${receiptIndex}, Item ${itemIndex}: amount must be a number`);
        }
        
        // unit can be number (warehouse) or string (online: 'EA', 'LB', etc.)
        if (item.unit !== null && typeof item.unit !== 'number' && typeof item.unit !== 'string') {
            errors.push(`Receipt ${receiptIndex}, Item ${itemIndex}: unit must be a number or string`);
        }
        
        if (item.itemNumber && typeof item.itemNumber !== 'string') {
            errors.push(`Receipt ${receiptIndex}, Item ${itemIndex}: itemNumber must be a string`);
        }
        
        // Warning for missing descriptions
        if (!item.itemDescription01 && !item.itemActualName) {
            warnings.push(`Receipt ${receiptIndex}, Item ${itemIndex}: No item description available`);
        }
        
        return { errors, warnings };
    }
    
    /**
     * Validate entire JSON data structure
     * @param {*} data - Parsed JSON data
     * @param {string} filename - Source filename
     * @returns {Object} Validation result
     */
    function validateJSONStructure(data, filename) {
        const errors = [];
        const warnings = [];
        
        // Check if data is an array
        if (!Array.isArray(data)) {
            errors.push(`${filename}: Root element must be an array of receipts`);
            return { valid: false, errors, warnings, receipts: [] };
        }
        
        // Check if array is empty
        if (data.length === 0) {
            errors.push(`${filename}: Receipt array is empty`);
            return { valid: false, errors, warnings, receipts: [] };
        }
        
        ErrorHandler.info(`Validating ${data.length} receipts from ${filename}`);
        
        // Validate each receipt
        const validReceipts = [];
        data.forEach((receipt, index) => {
            const validation = validateReceipt(receipt, index);
            
            if (validation.valid) {
                validReceipts.push(receipt);
            } else {
                errors.push(...validation.errors);
            }
            
            warnings.push(...validation.warnings);
        });
        
        // Summary
        ErrorHandler.info(`${filename}: ${validReceipts.length}/${data.length} receipts valid`);
        
        if (warnings.length > 0) {
            ErrorHandler.warn(`${filename}: ${warnings.length} validation warnings`);
            // Only log first 5 warnings to avoid console spam
            warnings.slice(0, 5).forEach(w => ErrorHandler.debug(w));
            if (warnings.length > 5) {
                ErrorHandler.debug(`... and ${warnings.length - 5} more warnings`);
            }
        }
        
        return {
            valid: validReceipts.length > 0,
            errors,
            warnings,
            receipts: validReceipts,
            totalCount: data.length,
            validCount: validReceipts.length,
            invalidCount: data.length - validReceipts.length,
            filename: filename
        };
    }
    
    /**
     * Get state information
     * @returns {Object} Current state
     */
    function getState() {
        return { ...state };
    }
    
    /**
     * Clear state
     */
    function clear() {
        state.selectedFiles = [];
        state.loadedFiles = [];
        state.parsedReceipts = [];
        state.totalSize = 0;
        
        const fileList = document.getElementById('file-list');
        if (fileList) {
            fileList.innerHTML = '';
            fileList.classList.add('hidden');
        }
        
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.value = '';
        }
        
        ErrorHandler.debug('DataProcessor state cleared');
    }
    
    return {
        handleFileSelection,
        handleFileProcessing,
        validateFiles,
        validateReceipt,
        validateItem,
        validateJSONStructure,
        parseJSON,
        normalizeReceipt,
        normalizeItem,
        mergeReceipts,
        formatFileSize,
        getState,
        clear
    };
})();
