// ===== UI CONTROLLER MODULE =====
const UIController = (() => {
    // DOM element cache
    const elements = {
        fileInput: null,
        fileInputSection: null,
        dashboardContent: null,
        loadingOverlay: null,
        loadingText: null,
        errorContainer: null,
        errorMessage: null,
        errorClose: null,
        datePreset: null,
        dateStartGroup: null,
        dateEndGroup: null,
        srAnnouncements: null
    };
    
    // User-configurable reward cycle start (defaults to calendar year)
    let rewardCycleConfig = { month: 1, day: 1 };
    
    /**
     * Announce message to screen readers
     * @param {string} message - Message to announce
     */
    function announceToScreenReader(message) {
        if (!elements.srAnnouncements) {
            elements.srAnnouncements = document.getElementById('sr-announcements');
        }
        if (elements.srAnnouncements) {
            elements.srAnnouncements.textContent = message;
            // Clear after announcement
            setTimeout(() => {
                elements.srAnnouncements.textContent = '';
            }, 1000);
        }
    }
    
    /**
     * Cache DOM elements
     */
    function cacheElements() {
        elements.fileInput = document.getElementById('file-input');
        elements.fileInputSection = document.getElementById('file-input-section');
        elements.dashboardContent = document.getElementById('dashboard-content');
        elements.loadingOverlay = document.getElementById('loading-overlay');
        elements.loadingText = document.getElementById('loading-text');
        elements.errorContainer = document.getElementById('error-container');
        elements.errorMessage = document.getElementById('error-message');
        elements.errorClose = document.getElementById('error-close');
        elements.datePreset = document.getElementById('date-preset');
        elements.dateStartGroup = document.getElementById('date-start-group');
        elements.dateEndGroup = document.getElementById('date-end-group');
    }
    
    /**
     * Get reward calculation options based on user-configured cycle start
     */
    function getRewardOptions() {
        return {
            cycleStartMonth: rewardCycleConfig.month,
            cycleStartDay: rewardCycleConfig.day
        };
    }
    
    /**
     * Update reward cycle config and sync input UI
     */
    function setRewardCycle(month, day) {
        rewardCycleConfig = {
            month: Math.min(12, Math.max(1, Number(month) || 1)),
            day: Math.min(31, Math.max(1, Number(day) || 1))
        };
        
        const input = document.getElementById('reward-cycle-start');
        if (input) {
            const year = new Date().getFullYear();
            const mm = String(rewardCycleConfig.month).padStart(2, '0');
            const dd = String(rewardCycleConfig.day).padStart(2, '0');
            input.value = `${year}-${mm}-${dd}`;
        }
    }
    
    /**
     * Bind all event listeners
     */
    function bindEvents() {
        // Error close button
        if (elements.errorClose) {
            elements.errorClose.addEventListener('click', () => {
                if (elements.errorContainer) {
                    elements.errorContainer.classList.remove('active');
                }
            });
        }
        
        // Date preset selector
        if (elements.datePreset) {
            elements.datePreset.addEventListener('change', (e) => {
                const isCustom = e.target.value === 'custom';
                if (elements.dateStartGroup && elements.dateEndGroup) {
                    elements.dateStartGroup.style.display = isCustom ? 'flex' : 'none';
                    elements.dateEndGroup.style.display = isCustom ? 'flex' : 'none';
                }
                
                // Apply preset to FilterManager
                if (App.modules.filterManager) {
                    App.modules.filterManager.setPreset(e.target.value);
                }
            });
        }
        
        // Custom date range inputs
        const dateStart = document.getElementById('date-start');
        const dateEnd = document.getElementById('date-end');
        
        if (dateStart && dateEnd) {
            const applyCustomDateRange = () => {
                const start = dateStart.value ? new Date(dateStart.value) : null;
                const end = dateEnd.value ? new Date(dateEnd.value) : null;
                
                if (App.modules.filterManager && (start || end)) {
                    App.modules.filterManager.setDateRange(start, end);
                }
            };
            
            dateStart.addEventListener('change', applyCustomDateRange);
            dateEnd.addEventListener('change', applyCustomDateRange);
        }
        
        // Channel filter (warehouse/online)
        const channelFilter = document.getElementById('channel-filter');
        const membershipFilterGroup = document.getElementById('membership-filter-group');
        const warehouseFilterGroup = document.querySelector('.filter-group:has(#warehouse-filter)');
        
        if (channelFilter) {
            channelFilter.addEventListener('change', (e) => {
                if (App.modules.filterManager) {
                    App.modules.filterManager.setChannel(e.target.value);
                }
                
                const isOnlineOnly = e.target.value === 'online';
                
                // Show/hide warehouse filter - not relevant for online purchases
                if (warehouseFilterGroup) {
                    warehouseFilterGroup.style.display = isOnlineOnly ? 'none' : 'flex';
                    
                    // Reset warehouse filter when switching to online
                    if (isOnlineOnly) {
                        const warehouseFilter = document.getElementById('warehouse-filter');
                        if (warehouseFilter) {
                            warehouseFilter.value = 'all';
                            if (App.modules.filterManager) {
                                App.modules.filterManager.setWarehouse(null);
                            }
                        }
                    }
                }
                
                // Membership filter is always visible - both warehouse and online orders have it
            });
        }
        
        // Warehouse filter
        const warehouseFilter = document.getElementById('warehouse-filter');
        if (warehouseFilter) {
            warehouseFilter.addEventListener('change', (e) => {
                if (App.modules.filterManager) {
                    const value = e.target.value === 'all' ? null : Number(e.target.value);
                    App.modules.filterManager.setWarehouse(value);
                }
            });
        }
        
        // Membership filter
        const membershipFilter = document.getElementById('membership-filter');
        if (membershipFilter) {
            membershipFilter.addEventListener('change', (e) => {
                if (App.modules.filterManager) {
                    App.modules.filterManager.setMembershipNumber(e.target.value);
                }
            });
        }
        
        // Trips tab: include online toggle
        const includeOnlineToggle = document.getElementById('warehouse-include-online');
        if (includeOnlineToggle) {
            includeOnlineToggle.addEventListener('change', () => {
                const receipts = App.modules.filterManager?.getFilteredReceipts() || [];
                renderTripsCharts(receipts);
            });
        }
        
        // Clear filters button
        const clearFiltersBtn = document.getElementById('clear-filters-btn');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                if (App.modules.filterManager) {
                    App.modules.filterManager.clearFilters();
                    // Reset UI elements
                    if (elements.datePreset) elements.datePreset.value = 'all';
                    if (channelFilter) channelFilter.value = 'all';
                    if (warehouseFilter) warehouseFilter.value = 'all';
                    if (membershipFilter) membershipFilter.value = 'all';
                    if (warehouseFilterGroup) warehouseFilterGroup.style.display = 'flex';
                    if (dateStart) dateStart.value = '';
                    if (dateEnd) dateEnd.value = '';
                }
            });
        }
        
        // File input change
        if (elements.fileInput) {
            elements.fileInput.addEventListener('change', (e) => {
                const files = e.target.files;
                if (files && files.length > 0) {
                    // Handle file selection through DataProcessor
                    if (App.modules.dataProcessor) {
                        App.modules.dataProcessor.handleFileSelection(files);
                    }
                    EventBus.emit('files:selected', { files });
                }
            });
        }
        
        // Rewards cycle start override (defaults to calendar year)
        const rewardCycleInput = document.getElementById('reward-cycle-start');
        const resetRewardCycleBtn = document.getElementById('reset-reward-cycle');
        if (rewardCycleInput) {
            // Initialize with default config
            setRewardCycle(rewardCycleConfig.month, rewardCycleConfig.day);
            
            rewardCycleInput.addEventListener('change', () => {
                if (!rewardCycleInput.value) return;
                const parsed = new Date(rewardCycleInput.value);
                if (!isNaN(parsed.getTime())) {
                    setRewardCycle(parsed.getMonth() + 1, parsed.getDate());
                    updateDashboard();
                }
            });
        }
        if (resetRewardCycleBtn) {
            resetRewardCycleBtn.addEventListener('click', () => {
                setRewardCycle(1, 1);
                updateDashboard();
            });
        }
        
        ErrorHandler.debug('Event listeners bound');
        
        // Subscribe to data events
        subscribeToDataEvents();
    }
    
    /**
     * Subscribe to data-related events
     */
    function subscribeToDataEvents() {
        // When files are parsed and loaded into DataStore
        EventBus.on('files:parsed', (eventData) => {
            ErrorHandler.info(`Files parsed event received: ${eventData.receiptCount} receipts`);
            console.log('Event data:', eventData);
            initializeDashboard();
        });
        
        // When data is added to store
        EventBus.on('datastore:receiptsAdded', (eventData) => {
            ErrorHandler.info(`DataStore receipts added: ${eventData.count} receipts`);
        });
        
        // When filters change, update dashboard (debounced for performance)
        const debouncedUpdate = debounce(() => {
            ErrorHandler.debug('Filters changed, updating dashboard (debounced)');
            updateDashboard();
        }, 150);
        
        EventBus.on('filter:changed', debouncedUpdate);
        
        // Handle item clicks for drilldown
        EventBus.on('chart:itemClicked', (eventData) => {
            ErrorHandler.debug(`Item clicked: ${eventData.itemName}`);
            const receipts = App.modules.filterManager?.getFilteredReceipts() || [];
            if (App.modules.visualizationManager?.showItemDrillDown) {
                App.modules.visualizationManager.showItemDrillDown(eventData.data, receipts);
            }
        });
        
        // Handle month clicks for filtering
        EventBus.on('chart:monthClicked', (eventData) => {
            ErrorHandler.debug(`Month clicked: ${eventData.month}`);
            // Could implement month filtering here
        });
    }
    
    /**
     * Initialize dashboard with data
     */
    function initializeDashboard() {
        try {
            console.log('=== INITIALIZING DASHBOARD ===');
            console.log('File input section:', elements.fileInputSection);
            console.log('Dashboard content:', elements.dashboardContent);
            
            // Hide file input section
            if (elements.fileInputSection) {
                elements.fileInputSection.classList.add('hidden');
                console.log('File input section hidden');
            }
            
            // Show dashboard content
            if (elements.dashboardContent) {
                elements.dashboardContent.classList.remove('hidden');
                console.log('Dashboard content shown');
            }
            
            // Populate warehouse filter dropdown
            populateWarehouseFilter();
            
            // Populate membership filter dropdown
            populateMembershipFilter();
            
            // Initialize filter from dropdown values
            initializeFiltersFromUI();
            
            // Update dashboard with initial data
            updateDashboard();
            
            ErrorHandler.info('Dashboard initialized');
            console.log('=== DASHBOARD INITIALIZATION COMPLETE ===');
        } catch (error) {
            console.error('Dashboard initialization error:', error);
            ErrorHandler.handleError(error, 'Dashboard Initialization');
        }
    }
    
    /**
     * Initialize filters from UI dropdown values
     */
    function initializeFiltersFromUI() {
        const datePreset = document.getElementById('date-preset');
        const channelFilter = document.getElementById('channel-filter');
        const warehouseFilterGroup = document.querySelector('.filter-group:has(#warehouse-filter)');
        
        if (datePreset && App.modules.filterManager) {
            const presetValue = datePreset.value;
            ErrorHandler.debug(`Initializing filter with preset: ${presetValue}`);
            App.modules.filterManager.setPreset(presetValue);
        }
        
        if (channelFilter && App.modules.filterManager) {
            const channelValue = channelFilter.value;
            if (channelValue !== 'all') {
                App.modules.filterManager.setChannel(channelValue);
            }
            
            // Set initial visibility of warehouse filter (hide for online only)
            const isOnlineOnly = channelValue === 'online';
            
            if (warehouseFilterGroup) {
                warehouseFilterGroup.style.display = isOnlineOnly ? 'none' : 'flex';
            }
            
            // Membership filter is always visible - both channels have it
        }
    }
    
    /**
     * Populate warehouse filter dropdown
     */
    function populateWarehouseFilter() {
        const warehouseFilter = document.getElementById('warehouse-filter');
        const dataStore = App.modules.dataStore;
        
        if (!warehouseFilter || !dataStore) return;
        
        const warehouses = dataStore.getWarehouses();
        const receipts = dataStore.getReceipts();
        
        // Clear existing options (except "All")
        warehouseFilter.innerHTML = '<option value="all">All Warehouses</option>';
        
        // Add warehouse options
        warehouses.forEach(whNum => {
            const receipt = receipts.find(r => r.warehouseNumber === whNum);
            const whName = receipt ? receipt.warehouseName : '';
            const whCity = receipt ? receipt.warehouseCity : '';
            
            const option = document.createElement('option');
            option.value = whNum;
            option.textContent = `${whNum} - ${whName || 'Unknown'}${whCity ? ' (' + whCity + ')' : ''}`;
            warehouseFilter.appendChild(option);
        });
    }
    
    /**
     * Populate membership filter dropdown
     */
    function populateMembershipFilter() {
        const membershipFilter = document.getElementById('membership-filter');
        const membershipFilterGroup = document.getElementById('membership-filter-group');
        const dataStore = App.modules.dataStore;
        
        if (!membershipFilter || !dataStore) return;
        
        const receipts = dataStore.getReceipts();
        
        // Get unique membership numbers across all receipts (warehouse, gas, online)
        const membershipNumbers = new Set();
        receipts.forEach(receipt => {
            if (!receipt.membershipNumber) return;
            membershipNumbers.add(String(receipt.membershipNumber));
        });
        
        // Clear existing options
        membershipFilter.innerHTML = '<option value="all">All Members</option>';
        
        // Add membership options
        Array.from(membershipNumbers).sort().forEach(memberNum => {
            const option = document.createElement('option');
            option.value = memberNum;
            option.textContent = `Member ${memberNum}`;
            membershipFilter.appendChild(option);
        });
        
        // Show the filter group when we have membership data
        if (membershipFilterGroup) {
            membershipFilterGroup.style.display = membershipNumbers.size > 0 ? 'flex' : 'none';
        }
        
        ErrorHandler.debug(`Populated ${membershipNumbers.size} membership numbers`);
    }
    
    /**
     * Update dashboard with current filter state
     */
    function updateDashboard() {
        try {
            console.log('=== UPDATING DASHBOARD ===');
            const filterManager = App.modules.filterManager;
            const statsCalculator = App.modules.statsCalculator;
            const vizManager = App.modules.visualizationManager;
            
            console.log('Modules:', { filterManager, statsCalculator, vizManager });
            
            if (!filterManager || !statsCalculator) {
                ErrorHandler.warn('Required modules not initialized');
                return;
            }
            
            // Get filtered receipts
            const receipts = filterManager.getFilteredReceipts();
            console.log(`Filtered receipts: ${receipts.length}`);
            
            if (receipts.length === 0) {
                ErrorHandler.warn('No receipts match current filters');
                showEmptyState();
                return;
            }
            
            // Calculate statistics
            console.log('Calculating statistics...');
            const stats = statsCalculator.calculateAll(receipts, { rewards: getRewardOptions() });
            console.log('Stats calculated:', stats);
            
            // Update statistics cards
            console.log('Updating stats display...');
            updateStatsDisplay(stats);
            
            // Update charts
            if (vizManager) {
                console.log('Updating charts...');
                updateCharts(stats, receipts);
            } else {
                console.warn('VisualizationManager not available');
            }
            
            // Update price tracking tables
            console.log('Updating price tracking...');
            updatePriceTracking(receipts);
            
            // Update shopping behavior analytics
            console.log('Updating shopping behavior...');
            updateShoppingBehavior(receipts);

            // Update Gas Stats
            console.log('Updating gas stats...');
            updateGasStats(receipts);
            
            ErrorHandler.debug(`Dashboard updated with ${receipts.length} receipts`);
            console.log('=== DASHBOARD UPDATE COMPLETE ===');
            
            // Announce update to screen readers
            announceToScreenReader(`Dashboard updated with ${receipts.length} receipts`);
        } catch (error) {
            console.error('Dashboard update error:', error);
            ErrorHandler.handleError(error, 'Dashboard Update');
        }
    }
    
    /**
     * Update statistics display
     * @param {Object} stats - Calculated statistics
     */
    function updateStatsDisplay(stats) {
        // Total purchase count (quantity)
        const totalPurchaseEl = document.getElementById('stat-total-purchase');
        if (totalPurchaseEl) {
            totalPurchaseEl.textContent = stats.totals.totalPurchaseCount.toLocaleString();
        }
        
        // Unique items with net unique items in sublabel
        const uniqueItemsEl = document.getElementById('stat-unique-items');
        if (uniqueItemsEl) {
            uniqueItemsEl.textContent = stats.totals.uniqueItems.toLocaleString();
        }
        
        const netUniqueEl = document.getElementById('stat-net-unique');
        if (netUniqueEl) {
            netUniqueEl.textContent = `${stats.totals.netUniqueItems.toLocaleString()} net items`;
        }
        
        // Total visits (receipts) with breakdown
        const totalVisitsEl = document.getElementById('stat-total-visits');
        if (totalVisitsEl) {
            totalVisitsEl.textContent = stats.totals.totalReceipts.toLocaleString();
        }
        
        const visitsBreakdownEl = document.getElementById('stat-visits-breakdown');
        if (visitsBreakdownEl) {
            visitsBreakdownEl.textContent = `${stats.totals.warehouseVisits} warehouse · ${stats.totals.onlineOrders} online`;
        }
        
        // Basket size (items per receipt)
        const itemsPerReceiptEl = document.getElementById('stat-items-per-receipt');
        const itemsPerReceiptNoteEl = document.getElementById('stat-items-per-receipt-note');
        if (itemsPerReceiptEl) {
            const itemsPerReceipt = stats.totals.totalReceipts > 0 
                ? stats.totals.totalPurchaseCount / stats.totals.totalReceipts 
                : 0;
            const displayPrecision = itemsPerReceipt >= 10 ? 0 : 1;
            itemsPerReceiptEl.textContent = itemsPerReceipt.toLocaleString('en-US', {minimumFractionDigits: displayPrecision, maximumFractionDigits: displayPrecision});
        }
        if (itemsPerReceiptNoteEl) {
            itemsPerReceiptNoteEl.textContent = stats.totals.totalReceipts > 0 
                ? 'items per receipt' 
                : 'no receipts yet';
        }
        
        // Total spent (net) with gross in sublabel
        const totalSpentEl = document.getElementById('stat-total-spent');
        if (totalSpentEl) {
            totalSpentEl.textContent = `$${stats.totals.netSpent.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        }
        
        const grossSpentEl = document.getElementById('stat-gross-spent');
        if (grossSpentEl) {
            grossSpentEl.textContent = `$${stats.totals.grossSpent.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} gross`;
        }
        
        // Average price per item
        const avgPurchaseEl = document.getElementById('stat-avg-purchase');
        if (avgPurchaseEl) {
            avgPurchaseEl.textContent = `$${stats.totals.avgPricePerItem.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        }
        
        // Avg per receipt (use net spend for average)
        const avgVisitEl = document.getElementById('stat-avg-visit');
        if (avgVisitEl) {
            const avgPerReceipt = stats.totals.totalReceipts > 0 
                ? stats.totals.netSpent / stats.totals.totalReceipts 
                : 0;
            avgVisitEl.textContent = `$${avgPerReceipt.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        }
        
        // Total savings
        const totalSavingsEl = document.getElementById('stat-total-savings');
        if (totalSavingsEl) {
            totalSavingsEl.textContent = `$${stats.totals.totalSavings.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        }
        
        // Refunds
        const refundsEl = document.getElementById('stat-refunds');
        if (refundsEl) {
            refundsEl.textContent = stats.totals.refundReceipts || 0;
        }
        
        const refundAmountEl = document.getElementById('stat-refund-amount');
        if (refundAmountEl) {
            const refundAmount = stats.totals.refundAmount || 0;
            const refundItems = stats.totals.refundItemCount || 0;
            const uniqueReturned = stats.totals.uniqueReturnedItems || 0;
            refundAmountEl.textContent = `$${Math.abs(refundAmount).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} · ${refundItems} items · ${uniqueReturned} unique`;
        }
        
        // Return rate (refund receipts ÷ total receipts)
        const returnRateEl = document.getElementById('stat-return-rate');
        const returnRateNoteEl = document.getElementById('stat-return-rate-note');
        const refundReceipts = stats.totals.refundReceipts || 0;
        const totalReceipts = stats.totals.totalReceipts || 0;
        if (returnRateEl) {
            const returnRate = totalReceipts > 0 ? (refundReceipts / totalReceipts) * 100 : 0;
            returnRateEl.textContent = `${returnRate.toFixed(1)}%`;
        }
        if (returnRateNoteEl) {
            returnRateNoteEl.textContent = totalReceipts > 0 
                ? `${refundReceipts} of ${totalReceipts} receipts` 
                : 'no receipts yet';
        }
        
        // Executive rewards
        const execRewardEl = document.getElementById('stat-exec-reward');
        if (execRewardEl) {
            const totalReward = stats.rewards?.totalReward || 0;
            execRewardEl.textContent = `$${totalReward.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        }
        
        // Populate rewards table
        const rewardsSection = document.getElementById('rewards-section');
        const rewardsTableBody = document.getElementById('rewards-table-body');
        if (rewardsTableBody && stats.rewards?.byYear) {
            const years = Object.keys(stats.rewards.byYear).sort((a, b) => b - a);
            
            if (years.length > 0) {
                rewardsSection.style.display = 'block';
                rewardsTableBody.innerHTML = years.map(year => {
                    const data = stats.rewards.byYear[year];
                    return `
                        <tr style="border-bottom: 1px solid var(--color-border);">
                            <td style="padding: 0.75rem; font-weight: 600;">${year}</td>
                            <td style="padding: 0.75rem; text-align: right; color: var(--color-text-secondary);">
                                $${data.subtotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                            </td>
                            <td style="padding: 0.75rem; text-align: right; font-weight: 600; color: #16a34a;">
                                +$${data.reward.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                            </td>
                        </tr>
                    `;
                }).join('');
            }
        }
    }
    
    /**
     * Update price tracking tables
     * @param {Array} receipts - Filtered receipts
     */
    function updatePriceTracking(receipts) {
        const statsCalc = App.modules.statsCalculator;
        if (!statsCalc) return;
        
        const priceTrackingSection = document.getElementById('price-tracking-section');
        
        // Get price tracking data
        const topSpending = statsCalc.getTopItems(receipts, 10, 'spending');
        const priceIncreases = statsCalc.getPriceIncreases(receipts, 10);
        const priceDecreases = statsCalc.getPriceDecreases(receipts, 10);
        
        // Show section if we have any data
        if (topSpending.length > 0 || priceIncreases.length > 0 || priceDecreases.length > 0) {
            priceTrackingSection.style.display = 'block';
        }
        
        // Update Top Spending table
        const topSpendingBody = document.getElementById('top-spending-table-body');
        if (topSpendingBody) {
            if (topSpending.length > 0) {
                topSpendingBody.innerHTML = topSpending.map(item => `
                    <tr style="border-bottom: 1px solid var(--color-border);">
                        <td style="padding: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                            ${item.image ? `<img src="${item.image}" alt="${item.name || 'Item'}" style="width: 40px; height: 40px; object-fit: contain; border: 1px solid var(--color-border); border-radius: 6px; background: white;">` : ''}
                            <div>
                            <div style="font-weight: 500; color: var(--color-text-primary); font-size: 0.85rem;">${item.name || 'Unknown'}</div>
                            <div style="font-size: 0.7rem; color: var(--color-text-tertiary);">#${item.itemNumber}</div>
                            </div>
                        </td>
                        <td style="padding: 0.5rem; text-align: right; font-weight: 600; color: #d97706;">
                            $${item.totalSpent.toFixed(2)}
                        </td>
                        <td style="padding: 0.5rem; text-align: right; color: var(--color-text-secondary);">
                            $${item.avgPrice.toFixed(2)}
                        </td>
                        <td style="padding: 0.5rem; text-align: right; color: var(--color-text-secondary);">
                            ${item.purchases}
                        </td>
                    </tr>
                `).join('');
            } else {
                topSpendingBody.innerHTML = '<tr><td colspan="4" style="padding: 1rem; text-align: center; color: var(--color-text-tertiary);">No data</td></tr>';
            }
        }
        
        // Update Price Increases table
        const increaseBody = document.getElementById('price-increase-body');
        if (increaseBody) {
            if (priceIncreases.length > 0) {
                increaseBody.innerHTML = priceIncreases.map(item => `
                    <tr style="border-bottom: 1px solid var(--color-border);">
                        <td style="padding: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                            ${item.image ? `<img src="${item.image}" alt="${item.name || 'Item'}" style="width: 40px; height: 40px; object-fit: contain; border: 1px solid var(--color-border); border-radius: 6px; background: white;">` : ''}
                            <div>
                                <div style="font-weight: 500; color: var(--color-text-primary); font-size: 0.85rem;">${item.name || 'Unknown'}</div>
                                <div style="font-size: 0.7rem; color: var(--color-text-tertiary);">#${item.itemNumber}</div>
                            </div>
                        </td>
                        <td style="padding: 0.5rem; text-align: right; color: var(--color-text-secondary); font-size: 0.85rem;">
                            $${item.firstPrice.toFixed(2)} → $${item.lastPrice.toFixed(2)}
                        </td>
                        <td style="padding: 0.5rem; text-align: right; font-weight: 600; color: #dc2626;">
                            +$${item.priceIncrease.toFixed(2)}
                            ${item.percentIncrease > 0 ? `<div style="font-size: 0.7rem;">(+${item.percentIncrease.toFixed(1)}%)</div>` : ''}
                        </td>
                    </tr>
                `).join('');
            } else {
                increaseBody.innerHTML = '<tr><td colspan="3" style="padding: 1rem; text-align: center; color: var(--color-text-tertiary);">No price increases found</td></tr>';
            }
        }
        
        // Update Price Decreases table
        const decreaseBody = document.getElementById('price-decrease-body');
        if (decreaseBody) {
            if (priceDecreases.length > 0) {
                decreaseBody.innerHTML = priceDecreases.map(item => `
                    <tr style="border-bottom: 1px solid var(--color-border);">
                        <td style="padding: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                            ${item.image ? `<img src="${item.image}" alt="${item.name || 'Item'}" style="width: 40px; height: 40px; object-fit: contain; border: 1px solid var(--color-border); border-radius: 6px; background: white;">` : ''}
                            <div>
                                <div style="font-weight: 500; color: var(--color-text-primary); font-size: 0.85rem;">${item.name || 'Unknown'}</div>
                                <div style="font-size: 0.7rem; color: var(--color-text-tertiary);">#${item.itemNumber}</div>
                            </div>
                        </td>
                        <td style="padding: 0.5rem; text-align: right; color: var(--color-text-secondary); font-size: 0.85rem;">
                            $${item.firstPrice.toFixed(2)} → $${item.lastPrice.toFixed(2)}
                        </td>
                        <td style="padding: 0.5rem; text-align: right; font-weight: 600; color: #16a34a;">
                            -$${item.priceDecrease.toFixed(2)}
                            ${item.percentDecrease > 0 ? `<div style="font-size: 0.7rem;">(-${item.percentDecrease.toFixed(1)}%)</div>` : ''}
                        </td>
                    </tr>
                `).join('');
            } else {
                decreaseBody.innerHTML = '<tr><td colspan="3" style="padding: 1rem; text-align: center; color: var(--color-text-tertiary);">No price decreases found</td></tr>';
            }
        }
    }
    
    /**
     * Update shopping behavior analytics
     * Note: In the new tabbed layout, these elements are spread across different tabs.
     * This function updates what's available; tab-specific rendering handles the rest.
     * @param {Array} receipts - Filtered receipts
     */
    function updateShoppingBehavior(receipts) {
        const statsCalc = App.modules.statsCalculator;
        if (!statsCalc || receipts.length === 0) return;
        
        // Calculate shopping frequency (shown in Trends tab) - only warehouse visits
        // Count unique shopping days, not total receipts (since you might have multiple receipts per day)
        const warehouseReceipts = receipts.filter(r => {
            const channel = r.channel || r.receiptType || 'warehouse';
            const isGas = r.receiptType === 'Gas Station' || r.documentType === 'FuelReceipts';
            const isOnline = channel === 'online' || r.documentType === 'OnlineReceipts';
            return !isGas && !isOnline;
        });
        
        const dates = warehouseReceipts.map(r => r.transactionDateTime).filter(d => d);
        if (dates.length > 0) {
            // Get unique shopping days (same day = 1 trip, even with multiple receipts)
            const uniqueDates = new Set(
                dates.map(d => d.toISOString().split('T')[0])
            );
            const uniqueTrips = uniqueDates.size;
            
            dates.sort((a, b) => a - b);
            const firstDate = dates[0];
            const lastDate = dates[dates.length - 1];
            const daysDiff = (lastDate - firstDate) / (1000 * 60 * 60 * 24);
            
            // If all receipts are on the same day, or less than a month apart, use different calculation
            if (daysDiff < 30) {
                // For short periods, just show the trip count
                const freqEl = document.getElementById('shopping-frequency');
                if (freqEl) freqEl.textContent = `${uniqueTrips}`;
                const sublabel = freqEl?.nextElementSibling;
                if (sublabel) sublabel.textContent = daysDiff < 1 ? 'trip(s) total' : `trip(s) in ${Math.round(daysDiff)} days`;
            } else {
            const monthsDiff = daysDiff / 30.44; // Average days per month
                const frequency = monthsDiff > 0 ? uniqueTrips / monthsDiff : uniqueTrips;
                
                const freqEl = document.getElementById('shopping-frequency');
                if (freqEl) freqEl.textContent = frequency.toFixed(1);
                const sublabel = freqEl?.nextElementSibling;
                if (sublabel) sublabel.textContent = 'trips per month';
            }
        }
        
        // Calculate tax metrics using stats (net of refunds)
        const stats = statsCalc ? statsCalc.calculateAll(receipts) : null;
        
        if (stats && stats.totals) {
            // Effective tax rate = Net Taxes / Net Spending
            const netTaxes = Math.max(0, stats.totals.totalTaxes);
            const netSpending = Math.max(0, stats.totals.netSpent);
            const taxRate = netSpending > 0 ? (netTaxes / netSpending) * 100 : 0;
            
            const taxRateEl = document.getElementById('tax-rate');
            if (taxRateEl) taxRateEl.textContent = taxRate.toFixed(2) + '%';
            
            const totalTaxEl = document.getElementById('total-tax');
            if (totalTaxEl) totalTaxEl.textContent = `$${netTaxes.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
            
            // Also update overview tab cards
            const taxRateOverviewEl = document.getElementById('tax-rate-overview');
            if (taxRateOverviewEl) taxRateOverviewEl.textContent = taxRate.toFixed(2) + '%';
            
            const totalTaxOverviewEl = document.getElementById('total-tax-overview');
            if (totalTaxOverviewEl) totalTaxOverviewEl.textContent = `$${netTaxes.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        }
        
        // Find best discount (largest single discount amount)
        let bestDiscount = 0;
        let bestDiscountItem = '—';
        receipts.forEach(r => {
            // For online orders, treat orderDiscountAmount as a single discount
            const isOnlineOrder = r.channel === 'online' || 
                                 r.documentType === 'ONLINE' || 
                                 r.documentType === 'OnlineReceipts';
            
            if (isOnlineOrder && r._original && r._original.orderDiscountAmount) {
                const discount = Number(r._original.orderDiscountAmount) || 0;
                if (discount > bestDiscount) {
                    bestDiscount = discount;
                    // Find the item(s) in this order
                if (r.itemArray && r.itemArray.length > 0) {
                        const nonDiscountItems = r.itemArray.filter(i => !i.isDiscount);
                        if (nonDiscountItems.length === 1) {
                            bestDiscountItem = nonDiscountItems[0].normalizedName || 'Online Item';
                        } else if (nonDiscountItems.length > 1) {
                            bestDiscountItem = `${nonDiscountItems[0].normalizedName || 'Item'} (+${nonDiscountItems.length - 1} more)`;
                        } else {
                            bestDiscountItem = 'Online Order';
                        }
                    } else {
                        bestDiscountItem = 'Online Order';
                    }
                }
            }
            
            // Check individual discount items (warehouse receipts)
            if (r.itemArray) {
                r.itemArray.forEach(item => {
                    if (item.isDiscount && item.amount < 0) {
                        const discountAmt = Math.abs(item.amount);
                        if (discountAmt > bestDiscount) {
                            bestDiscount = discountAmt;
                            // Try to find the item this discount applies to
                            if (item.discountAppliesTo) {
                                const targetItem = r.itemArray.find(i => i.itemNumber === item.discountAppliesTo);
                                if (targetItem && targetItem.normalizedName) {
                                    bestDiscountItem = targetItem.normalizedName;
                                } else {
                                    bestDiscountItem = `Item ${item.discountAppliesTo}`;
                                }
                            } else {
                                bestDiscountItem = item.normalizedName || 'Discount Item';
                            }
                }
            }
        });
            }
        });
        const bestDiscountEl = document.getElementById('best-discount');
        if (bestDiscountEl) bestDiscountEl.textContent = `$${bestDiscount.toFixed(2)}`;
        const bestDiscountItemEl = document.getElementById('best-discount-item');
        if (bestDiscountItemEl) bestDiscountItemEl.textContent = bestDiscountItem;
        
        // Also update overview tab cards
        const bestDiscountOverviewEl = document.getElementById('best-discount-overview');
        if (bestDiscountOverviewEl) bestDiscountOverviewEl.textContent = `$${bestDiscount.toFixed(2)}`;
        const bestDiscountItemOverviewEl = document.getElementById('best-discount-item-overview');
        if (bestDiscountItemOverviewEl) bestDiscountItemOverviewEl.textContent = bestDiscountItem;
        
        // Tax by department (shown in Categories tab) - only update if element exists
        const taxByDept = calculateTaxByDepartment(receipts);
        const taxBody = document.getElementById('tax-by-dept-body');
        if (taxBody && taxByDept.length > 0) {
            const statsCalc = App.modules.statsCalculator;
            taxBody.innerHTML = taxByDept.slice(0, 15).map(item => {
                const deptName = statsCalc?.getDepartmentName ? statsCalc.getDepartmentName(item.department) : `Dept ${item.department}`;
                return `
                <tr style="border-bottom: 1px solid var(--color-border);">
                    <td style="padding: 0.5rem; font-weight: 500;">
                        ${deptName}
                    </td>
                    <td style="padding: 0.5rem; color: var(--color-text-secondary); font-size: 0.8rem;">
                        ${item.warehouse}
                    </td>
                    <td style="padding: 0.5rem; text-align: right; font-weight: 600; color: #7c3aed;">
                        $${item.totalTax.toFixed(2)}
                    </td>
                    <td style="padding: 0.5rem; text-align: right; color: var(--color-text-secondary);">
                        ${item.taxRate.toFixed(1)}%
                    </td>
                </tr>
            `;
            }).join('');
        } else if (taxBody) {
            taxBody.innerHTML = '<tr><td colspan="4" style="padding: 1rem; text-align: center; color: var(--color-text-tertiary);">No tax data</td></tr>';
        }
    }
    
    /**
     * Update frequent items table with detailed stats
     * @param {Array} receipts - Filtered receipts
     */
    function updateFrequentItemsTable(receipts) {
        const statsCalc = App.modules.statsCalculator;
        if (!statsCalc) return;
        
        const tableBody = document.getElementById('frequent-items-table-body');
        if (!tableBody) return;
        
        // Get top items by frequency
        const frequentItems = statsCalc.getTopItems(receipts, 10, 'frequency');
        
        // Calculate repurchase cycles for all items
        const repurchaseCycles = calculateRepurchaseCycles(receipts);
        const cycleMap = new Map(repurchaseCycles.map(item => [item.itemNumber, item.avgDays]));
        
        if (frequentItems.length > 0) {
            tableBody.innerHTML = frequentItems.map(item => {
                const repurchaseDays = cycleMap.get(item.itemNumber);
                const repurchaseText = repurchaseDays ? `${repurchaseDays} days` : 'N/A';
                
                return `
                    <tr style="border-bottom: 1px solid var(--color-border);">
                        <td style="padding: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                            ${item.image ? `<img src="${item.image}" alt="${item.name || 'Item'}" style="width: 40px; height: 40px; object-fit: contain; border: 1px solid var(--color-border); border-radius: 6px; background: white;">` : ''}
                            <div>
                                <div style="font-weight: 500; color: var(--color-text-primary); font-size: 0.85rem;">${item.name || 'Unknown'}</div>
                                <div style="font-size: 0.7rem; color: var(--color-text-tertiary);">#${item.itemNumber}</div>
                            </div>
                        </td>
                        <td style="padding: 0.5rem; text-align: right; font-weight: 600; color: #3b82f6;">
                            ${item.purchases}
                        </td>
                        <td style="padding: 0.5rem; text-align: right; color: var(--color-text-secondary);">
                            $${item.avgPrice.toFixed(2)}
                        </td>
                        <td style="padding: 0.5rem; text-align: right; color: var(--color-text-tertiary); font-size: 0.8rem;">
                            $${item.minPrice.toFixed(2)}
                        </td>
                        <td style="padding: 0.5rem; text-align: right; color: var(--color-text-tertiary); font-size: 0.8rem;">
                            $${item.maxPrice.toFixed(2)}
                        </td>
                        <td style="padding: 0.5rem; text-align: right; color: var(--color-text-secondary);">
                            ${repurchaseText}
                        </td>
                    </tr>
                `;
            }).join('');
        } else {
            tableBody.innerHTML = '<tr><td colspan="6" style="padding: 1rem; text-align: center; color: var(--color-text-tertiary);">No data</td></tr>';
        }
    }
    
    /**
     * Calculate repurchase cycles for frequent items
     */
    function calculateRepurchaseCycles(receipts) {
        const itemPurchases = new Map();
        
        receipts.forEach(receipt => {
            if (!receipt.itemArray) return;
            
            receipt.itemArray.forEach(item => {
                if (item.isDiscount || !item.itemNumber) return;
                
                if (!itemPurchases.has(item.itemNumber)) {
                    itemPurchases.set(item.itemNumber, {
                        itemNumber: item.itemNumber,
                        name: item.normalizedName,
                        dates: []
                    });
                }
                
                itemPurchases.get(item.itemNumber).dates.push(receipt.transactionDateTime);
            });
        });
        
        const cycles = [];
        itemPurchases.forEach((data, itemNumber) => {
            if (data.dates.length >= 3) { // Need at least 3 purchases for meaningful cycle
                data.dates.sort((a, b) => a - b);
                
                // Calculate average days between purchases
                let totalDays = 0;
                for (let i = 1; i < data.dates.length; i++) {
                    const daysDiff = (data.dates[i] - data.dates[i-1]) / (1000 * 60 * 60 * 24);
                    totalDays += daysDiff;
                }
                const avgDays = Math.round(totalDays / (data.dates.length - 1));
                
                cycles.push({
                    itemNumber: data.itemNumber,
                    name: data.name,
                    avgDays: avgDays,
                    purchases: data.dates.length
                });
            }
        });
        
        return cycles.sort((a, b) => b.purchases - a.purchases);
    }
    
    /**
     * Calculate tax by department
     */
    function calculateTaxByDepartment(receipts) {
        const deptWarehouseMap = new Map();
        
        receipts.forEach(receipt => {
            if (!receipt.itemArray) return;
            
            // Check if this is a refund receipt
            const isRefund = receipt.transactionType === 'Refund' || 
                           receipt.transactionType === 'Return' || 
                           receipt.transactionType === 'Returned' ||
                           (receipt.total || 0) < 0;
            
            const receiptTax = Number(receipt.taxes) || 0;
            const receiptSubtotal = Math.abs(Number(receipt.subTotal) || 0);
            const warehouseName = receipt.warehouseName || receipt.warehouse || 'Unknown';
            
            receipt.itemArray.forEach(item => {
                if (item.isDiscount) return;
                
                const dept = item.itemDepartmentNumber || 0;
                const itemAmount = Math.abs(Number(item.amount) || 0); // Use absolute value
                
                // Proportional tax allocation (always positive proportion)
                const itemTax = receiptSubtotal > 0 ? (itemAmount / receiptSubtotal) * Math.abs(receiptTax) : 0;
                
                // Create compound key: dept|warehouse
                const key = `${dept}|${warehouseName}`;
                
                if (!deptWarehouseMap.has(key)) {
                    deptWarehouseMap.set(key, {
                        department: dept,
                        warehouse: warehouseName,
                        totalTax: 0,
                        totalSpent: 0
                    });
                }
                
                const data = deptWarehouseMap.get(key);
                // Net aggregation: subtract for refunds
                if (isRefund) {
                    data.totalTax -= itemTax;
                    data.totalSpent -= itemAmount;
                } else {
                data.totalTax += itemTax;
                data.totalSpent += itemAmount;
                }
            });
        });
        
        return Array.from(deptWarehouseMap.values())
            .filter(item => item.totalSpent > 0) // Only show departments with net spending
            .map(item => ({
                ...item,
                totalTax: Math.max(0, item.totalTax), // Ensure non-negative
                totalSpent: Math.max(0, item.totalSpent),
                taxRate: item.totalSpent > 0 ? (Math.max(0, item.totalTax) / Math.max(0, item.totalSpent)) * 100 : 0
            }))
            .sort((a, b) => {
                // Sort by department first, then by warehouse
                if (a.department !== b.department) {
                    return a.department - b.department;
                }
                return a.warehouse.localeCompare(b.warehouse);
            });
    }
    
    /**
     * Render shopping days heat map
     */
    function renderShoppingDaysChart(receipts) {
        const dayCount = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat (unique visit days)
        const daySpent = [0, 0, 0, 0, 0, 0, 0];
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        // Filter for warehouse visits only (exclude gas and online)
        const warehouseReceipts = receipts.filter(r => {
            const channel = r.channel || r.receiptType || 'warehouse';
            const isGas = r.receiptType === 'Gas Station' || r.documentType === 'FuelReceipts';
            const isOnline = channel === 'online' || r.documentType === 'OnlineReceipts';
            return !isGas && !isOnline;
        });
        
        // Map date -> {spent, counted}
        const dayMap = new Map();
        warehouseReceipts.forEach(receipt => {
            if (!receipt.transactionDateTime) return;
            const date = receipt.transactionDateTime;
            const dateKey = date.toISOString().split('T')[0];
            const day = date.getDay();
            
            if (!dayMap.has(dateKey)) {
                dayMap.set(dateKey, { day, spent: 0, counted: false });
            }
            const d = dayMap.get(dateKey);
            d.spent += Math.abs(Number(receipt.total) || 0);
        });
        
        // Aggregate unique visit days per weekday
        dayMap.forEach(({ day, spent }) => {
            dayCount[day] += 1;
            daySpent[day] += spent;
        });
        
        const container = document.getElementById('shopping-days-chart');
        if (!container) return;
        
        const maxCount = Math.max(...dayCount);
        
        container.innerHTML = dayNames.map((dayName, i) => {
            const percentage = maxCount > 0 ? (dayCount[i] / maxCount) * 100 : 0;
            const intensity = Math.round(percentage);
            const avgSpent = dayCount[i] > 0 ? daySpent[i] / dayCount[i] : 0;
            
            return `
                <div style="display: flex; align-items: center; margin-bottom: 0.5rem;">
                    <div style="width: 80px; font-size: 0.85rem; color: var(--color-text-secondary);">${dayName}</div>
                    <div style="flex: 1; height: 30px; background: linear-gradient(90deg, #2563eb ${percentage}%, #e5e7eb ${percentage}%); border-radius: 4px; display: flex; align-items: center; padding-left: 10px;">
                        <span style="font-size: 0.85rem; font-weight: 600; color: ${percentage > 50 ? 'white' : 'var(--color-text-primary)'};">
                            ${dayCount[i]} trips${dayCount[i] > 0 ? ` • $${avgSpent.toFixed(0)} avg` : ''}
                        </span>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    /**
     * Update charts for the currently active tab only
     * Other tabs will render their charts when they become visible
     * @param {Object} stats - Calculated statistics
     * @param {Array} receipts - Filtered receipts
     */
    function updateCharts(stats, receipts) {
        const vizManager = App.modules.visualizationManager;
        const statsCalc = App.modules.statsCalculator;
        
        if (!vizManager) {
            console.error('VisualizationManager not available');
            return;
        }
        
        // Get the currently active tab
        const activeTab = document.querySelector('.tab-content.active');
        const activeTabId = activeTab ? activeTab.id.replace('tab-', '') : 'overview';
        
        console.log('Updating charts for active tab:', activeTabId);
        
        // Only render charts for the active tab
        // Other tabs will render when they become visible via switchToTab
        switch (activeTabId) {
            case 'overview':
                // Overview tab has no charts, just stats (already updated via updateStatsDisplay)
                break;
                
            case 'trends':
                renderTrendsCharts(receipts);
                break;
                
            case 'items':
                renderItemsCharts(receipts);
                break;
                
            case 'categories':
                renderCategoriesCharts(receipts);
                break;
                
            case 'trips':
                renderTripsCharts(receipts);
                break;
                
            case 'gas':
                updateGasStats(receipts);
                break;
                
            case 'taxes':
                renderTaxesCharts(receipts, stats);
                break;
        }
        
        // Mark the active tab as rendered
        renderedTabs.add(activeTabId);
    }
    
    
    /**
     * Show empty state when no data matches filters
     */
    function showEmptyState() {
        ErrorHandler.info('No data matches current filters');
        // Could add visual feedback here
    }
    
    /**
     * Show loading overlay
     * @param {string} message - Loading message
     */
    function showLoading(message = 'Processing...') {
        if (elements.loadingOverlay) {
            elements.loadingOverlay.classList.add('active');
        }
        if (elements.loadingText) {
            elements.loadingText.textContent = message;
        }
        EventBus.emit('ui:loadingShown', { message });
    }
    
    /**
     * Hide loading overlay
     */
    function hideLoading() {
        if (elements.loadingOverlay) {
            elements.loadingOverlay.classList.remove('active');
        }
        EventBus.emit('ui:loadingHidden', {});
    }
    
    /**
     * Show error message
     * @param {string} message - Error message
     */
    function showError(message) {
        if (elements.errorContainer && elements.errorMessage) {
            elements.errorMessage.textContent = message;
            elements.errorContainer.classList.add('active');
        }
    }
    
    /**
     * Show success message (using browser notification style)
     * @param {string} message - Success message
     */
    function showSuccess(message) {
        ErrorHandler.info(message);
        // Could implement a toast notification here
    }
    
    /**
     * Update statistics display
     * @param {Object} stats - Statistics object
     */
    function updateStats(stats) {
        // Will be fully implemented when StatsCalculator is ready
        ErrorHandler.debug('Stats update requested', stats);
        EventBus.emit('ui:statsUpdated', { stats });
    }
    
    /**
     * Reset UI to initial state
     */
    function reset() {
        if (elements.fileInputSection) {
            elements.fileInputSection.classList.remove('hidden');
        }
        if (elements.dashboardContent) {
            elements.dashboardContent.classList.add('hidden');
        }
        if (elements.fileInput) {
            elements.fileInput.value = '';
        }
        ErrorHandler.debug('UI reset to initial state');
    }
    
    /**
     * Initialize UI Controller
     */
    function init() {
        cacheElements();
        bindEvents();
        setupTabs();
        setupResizeHandler();
        ErrorHandler.debug('UIController initialized');
    }

    /**
     * Setup window resize handler with throttling for performance
     */
    function setupResizeHandler() {
        const throttledResize = throttle(() => {
            // Resize charts in the active tab
            const activeTab = document.querySelector('.tab-content.active');
            if (activeTab) {
                const tabId = activeTab.id.replace('tab-', '');
                resizeTabCharts(tabId);
            }
        }, 250);
        
        window.addEventListener('resize', throttledResize);
    }

    /**
     * Track which tabs have been rendered (for lazy rendering)
     */
    const renderedTabs = new Set(['overview']); // Overview is rendered by default
    
    /**
     * Setup Tab Navigation with lazy rendering and chart lifecycle management
     * Implements FR3 (tabbed navigation) and handles hidden-tab chart rendering (Task 6)
     */
    function setupTabs() {
        const tabs = document.querySelectorAll('.tab-btn');
        const tabsNav = document.querySelector('.tabs-nav');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                switchToTab(tab.dataset.tab);
            });
        });
        
        // Keyboard navigation for tabs (accessibility - NFR3)
        if (tabsNav) {
            tabsNav.addEventListener('keydown', (e) => {
                const tabsArray = Array.from(tabs);
                const currentIndex = tabsArray.findIndex(t => t.classList.contains('active'));
                let newIndex = currentIndex;
                
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    newIndex = (currentIndex + 1) % tabsArray.length;
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    newIndex = (currentIndex - 1 + tabsArray.length) % tabsArray.length;
                } else if (e.key === 'Home') {
                    e.preventDefault();
                    newIndex = 0;
                } else if (e.key === 'End') {
                    e.preventDefault();
                    newIndex = tabsArray.length - 1;
                }
                
                if (newIndex !== currentIndex) {
                    tabsArray[newIndex].focus();
                    switchToTab(tabsArray[newIndex].dataset.tab);
                }
            });
        }
    }
    
    /**
     * Switch to a specific tab with lazy chart rendering
     * @param {string} tabId - The tab identifier (e.g., 'overview', 'trends', 'items')
     */
    function switchToTab(tabId) {
        const tabs = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        
        // Update button states
        tabs.forEach(t => {
            const isActive = t.dataset.tab === tabId;
            t.classList.toggle('active', isActive);
            t.setAttribute('aria-selected', isActive);
        });
        
        // Update content visibility
        tabContents.forEach(content => {
            const isActive = content.id === `tab-${tabId}`;
            content.classList.toggle('active', isActive);
        });
        
        // Emit tab change event for chart lifecycle management
        EventBus.emit('ui:tabChanged', { tabId });
        
        // Lazy render charts for this tab if not already rendered
        if (!renderedTabs.has(tabId)) {
            renderTabCharts(tabId);
            renderedTabs.add(tabId);
        } else {
            // Tab already rendered - just trigger resize for charts
            resizeTabCharts(tabId);
        }
        
        ErrorHandler.debug(`Switched to tab: ${tabId}`);
        
        // Announce tab change to screen readers
        const tabNames = {
            'overview': 'Overview',
            'trends': 'Trends',
            'items': 'Items and Prices',
            'categories': 'Categories',
            'trips': 'Trips and Warehouses',
            'gas': 'Gas',
            'taxes': 'Taxes and Rewards'
        };
        announceToScreenReader(`Switched to ${tabNames[tabId] || tabId} tab`);
    }

    /**
     * Render charts for a specific tab (lazy rendering)
     * @param {string} tabId - The tab identifier
     */
    function renderTabCharts(tabId) {
        if (!App.modules.filterManager) return;
        
        const receipts = App.modules.filterManager.getFilteredReceipts();
        
        switch (tabId) {
            case 'trends':
                // Spending trend, savings, calendar heatmap, shopping days
                renderTrendsCharts(receipts);
                break;
            case 'items':
                // Top items, frequent items, price tracking
                renderItemsCharts(receipts);
                break;
            case 'categories':
                // Category breakdown
                renderCategoriesCharts(receipts);
                break;
            case 'trips':
                // Warehouse comparison
                renderTripsCharts(receipts);
                break;
            case 'gas':
                // Gas stats and charts
                updateGasStats(receipts);
                break;
            case 'taxes':
                // Tax stats and rewards
                {
                    const statsCalc = App.modules.statsCalculator;
                    const stats = statsCalc ? statsCalc.calculateAll(receipts, { rewards: getRewardOptions() }) : null;
                    renderTaxesCharts(receipts, stats);
                }
                break;
        }
    }
    
    /**
     * Resize charts in a specific tab (for when tab becomes visible)
     * @param {string} tabId - The tab identifier
     */
    function resizeTabCharts(tabId) {
        // Trigger resize on VisualizationManager if available
        if (App.modules.visualizationManager) {
            // Small delay to ensure container dimensions are correct
            setTimeout(() => {
                // Use tab-specific resize to avoid resizing hidden charts
                if (App.modules.visualizationManager.resizeChartsInTab) {
                    App.modules.visualizationManager.resizeChartsInTab(tabId);
                } else {
                    // Fallback to general resize (but it now checks visibility)
                    App.modules.visualizationManager.resizeCharts();
                }
            }, 50);
        }
        
        // Special handling for gas tab
        if (tabId === 'gas' && App.modules.filterManager) {
            const receipts = App.modules.filterManager.getFilteredReceipts();
            updateGasStats(receipts);
        }
    }
    
    /**
     * Render charts for Trends tab
     */
    function renderTrendsCharts(receipts) {
        const vizManager = App.modules.visualizationManager;
        const statsCalc = App.modules.statsCalculator;
        if (!vizManager || !statsCalc) return;
        
        // Spending trend chart
        const monthlyData = statsCalc.getMonthlySpending(receipts);
        if (monthlyData && monthlyData.length > 0) {
            vizManager.createChart('spending-trend', 'spending-trend-chart', 'spending-trend', monthlyData);
            vizManager.createChart('savings-trend', 'savings-chart', 'savings-trend', monthlyData);
        }
        
        // Calendar heatmap
        vizManager.createChart('calendar-heatmap', 'calendar-heatmap', 'calendar-heatmap', receipts);
        
        // Shopping days chart
        renderShoppingDaysChart(receipts);
        
        // Shopping frequency stats - count unique shopping days (not total receipts)
        const warehouseReceipts = receipts.filter(r => {
            const channel = r.channel || r.receiptType || 'warehouse';
            const isGas = r.receiptType === 'Gas Station' || r.documentType === 'FuelReceipts';
            const isOnline = channel === 'online' || r.documentType === 'OnlineReceipts';
            return !isGas && !isOnline;
        });
        
        const dates = warehouseReceipts.map(r => r.transactionDateTime).filter(d => d);
        if (dates.length > 0) {
            // Get unique shopping days
            const uniqueDates = new Set(
                dates.map(d => d.toISOString().split('T')[0])
            );
            const uniqueTrips = uniqueDates.size;
            
            dates.sort((a, b) => a - b);
            const firstDate = dates[0];
            const lastDate = dates[dates.length - 1];
            const daysDiff = (lastDate - firstDate) / (1000 * 60 * 60 * 24);
            
            // If all receipts are on the same day, or less than a month apart, use different calculation
            if (daysDiff < 30) {
                const freqEl = document.getElementById('shopping-frequency');
                if (freqEl) freqEl.textContent = `${uniqueTrips}`;
                const sublabel = freqEl?.nextElementSibling;
                if (sublabel) sublabel.textContent = daysDiff < 1 ? 'trip(s) total' : `trip(s) in ${Math.round(daysDiff)} days`;
            } else {
                const monthsDiff = daysDiff / 30.44;
                const frequency = monthsDiff > 0 ? uniqueTrips / monthsDiff : uniqueTrips;
                const freqEl = document.getElementById('shopping-frequency');
                if (freqEl) freqEl.textContent = frequency.toFixed(1);
                const sublabel = freqEl?.nextElementSibling;
                if (sublabel) sublabel.textContent = 'trips per month';
            }
        }
    }
    
    /**
     * Render charts for Items & Prices tab
     */
    function renderItemsCharts(receipts) {
        const vizManager = App.modules.visualizationManager;
        const statsCalc = App.modules.statsCalculator;
        if (!vizManager || !statsCalc) return;
        
        // Top items chart
        const topItems = statsCalc.getTopItems(receipts, 10, 'spending');
        vizManager.createChart('top-items', 'top-items-chart', 'top-items', topItems);
        
        // Frequent items table
        updateFrequentItemsTable(receipts);
        
        // Price tracking tables (reuse existing function)
        updatePriceTracking(receipts);
        
        // Price evolution chart - show top 10 most frequent items (excluding gas)
        // Filter out gas receipts before getting items
        const nonGasReceipts = receipts.filter(r => {
            const channel = r.channel || r.receiptType || '';
            const docType = r.documentType || '';
            const isGas = channel === 'gas_station' || 
                         channel === 'Gas Station' ||
                         docType === 'FuelReceipts' ||
                         r.receiptType === 'Gas Station';
            return !isGas;
        });
        
        // Get most frequent items (excluding gas)
        const frequentItems = statsCalc.getTopItems(nonGasReceipts, 10, 'frequency');
        
        // Filter to only items with price history (at least 2 purchases)
        const itemsWithHistory = frequentItems
            .filter(item => item.priceHistory && item.priceHistory.length >= 2);
        
        vizManager.createChart('price-evolution', 'price-evolution-chart', 'price-evolution', itemsWithHistory);
    }
    
    /**
     * Render charts for Categories tab
     */
    function renderCategoriesCharts(receipts) {
        const vizManager = App.modules.visualizationManager;
        if (!vizManager) return;
        
        // Category breakdown chart
        vizManager.createChart('category-breakdown', 'category-chart', 'category-breakdown', receipts);
        
        // Tax by department table (reuse existing calculation)
        const taxByDept = calculateTaxByDepartment(receipts);
        const taxBody = document.getElementById('tax-by-dept-body');
        if (taxBody && taxByDept.length > 0) {
            const statsCalc = App.modules.statsCalculator;
            const sorted = [...taxByDept].sort((a, b) => b.totalTax - a.totalTax);
            const totalTax = sorted.reduce((sum, item) => sum + (item.totalTax || 0), 0);
            taxBody.innerHTML = sorted.slice(0, 10).map(item => {
                const deptName = statsCalc?.getDepartmentName ? statsCalc.getDepartmentName(item.department) : `Dept ${item.department}`;
                const share = totalTax > 0 ? (item.totalTax / totalTax * 100) : 0;
                return `
                <tr>
                    <td>${deptName}</td>
                    <td>${item.warehouse}</td>
                    <td class="num">$${item.totalTax.toFixed(2)}</td>
                    <td class="num">${item.taxRate.toFixed(1)}%</td>
                    <td class="num">${share.toFixed(1)}%</td>
                </tr>
            `;
            }).join('');
        }
    }
    
    /**
     * Render charts for Trips & Warehouses tab
     */
    function renderTripsCharts(receipts) {
        const vizManager = App.modules.visualizationManager;
        const statsCalc = App.modules.statsCalculator;
        if (!vizManager || !statsCalc) return;
        
        const includeOnlineToggle = document.getElementById('warehouse-include-online');
        const includeOnline = includeOnlineToggle ? includeOnlineToggle.checked : false;
        
        // Warehouse comparison chart
        const warehouseStats = statsCalc.getWarehouseStats(receipts);
        const warehouseListForChart = warehouseStats && warehouseStats.warehouseList
            ? warehouseStats.warehouseList.filter(w => includeOnline || !w.isOnline)
            : [];
        if (warehouseStats && warehouseListForChart) {
            vizManager.createChart('warehouse-comparison', 'warehouse-chart', 'warehouse-comparison', warehouseListForChart);
        }
        
        // Update warehouse stats
        updateWarehouseStats(receipts, warehouseStats, includeOnline);
    }
    
    /**
     * Update warehouse stats in Trips tab
     */
    function updateWarehouseStats(receipts, warehouseStats, includeOnline = false) {
        const warehouseList = warehouseStats?.warehouseList || [];
        const warehouseOnly = warehouseList.filter(w => !w.isOnline);
        
        // Count warehouse trips (unique visit days) and online orders
        let onlineOrders = 0;
        const warehouseTrips = warehouseOnly.reduce((sum, wh) => sum + (wh.tripCount || 0), 0);
        receipts.forEach(r => {
            const channel = r.channel || r.receiptType || 'warehouse';
            const isOnline = channel === 'online' || r.documentType === 'OnlineReceipts';
            if (isOnline) onlineOrders++;
        });
        
        // Update DOM
        const uniqueWarehousesEl = document.getElementById('unique-warehouses');
        if (uniqueWarehousesEl) {
            uniqueWarehousesEl.textContent = warehouseOnly.length || 0;
        }
        
        const warehouseTripsEl = document.getElementById('warehouse-trips');
        if (warehouseTripsEl) {
            warehouseTripsEl.textContent = warehouseTrips;
        }
        
        const onlineOrdersEl = document.getElementById('online-orders');
        if (onlineOrdersEl) {
            onlineOrdersEl.textContent = onlineOrders;
        }
        
        // Find most visited warehouse
        const mostVisitedEl = document.getElementById('most-visited-warehouse');
        const mostVisitedCountEl = document.getElementById('most-visited-count');
        if (mostVisitedEl) {
            const topWarehouse = warehouseOnly.reduce((max, wh) => 
                (wh.tripCount || 0) > (max?.tripCount || 0) ? wh : max, null);
            
            if (topWarehouse) {
                const name = topWarehouse.warehouseCity || `#${topWarehouse.warehouseNumber}`;
                mostVisitedEl.textContent = name;
                if (mostVisitedCountEl) {
                    const trips = topWarehouse.tripCount || 0;
                    const receiptsCount = topWarehouse.receiptCount || 0;
                    mostVisitedCountEl.textContent = `${trips} trips · ${receiptsCount} receipts`;
                }
            } else {
                mostVisitedEl.textContent = '—';
                if (mostVisitedCountEl) mostVisitedCountEl.textContent = '0 trips';
            }
        }
        
        renderWarehouseTable(warehouseStats, includeOnline);
    }
    
    /**
     * Render warehouse detail table
     */
    function renderWarehouseTable(warehouseStats, includeOnline = false) {
        const tbody = document.getElementById('warehouse-table-body');
        if (!tbody) return;
        
        const rows = (warehouseStats?.warehouseList || []).filter(w => includeOnline || !w.isOnline);
        if (rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="padding: 1rem; text-align: center; color: var(--color-text-tertiary);">No warehouse data</td></tr>';
            return;
        }
        
        const formatMoney = (val) => `$${Number(val || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        const formatDate = (date) => {
            if (!date) return '—';
            if (typeof date === 'string') {
                const dStr = date.trim();
                const d = new Date(dStr);
                if (!isNaN(d.getTime())) {
                    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                }
                return dStr; // fall back to raw string if unparsable
            }
            const d = date;
            return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        };
        
        tbody.innerHTML = rows.map(w => {
            const location = w.isOnline 
                ? 'Online'
                : `${w.warehouseName || 'Warehouse'} #${w.warehouseNumber}${w.warehouseCity ? ' · ' + w.warehouseCity + (w.warehouseState ? ', ' + w.warehouseState : '') : ''}`;
            const trips = w.tripCount || 0;
            const receipts = w.receiptCount || 0;
            return `
                <tr style="border-bottom: 1px solid var(--color-border);">
                    <td style="padding: 0.6rem;">${location}</td>
                    <td style="padding: 0.6rem; text-align: right;">${trips}</td>
                    <td style="padding: 0.6rem; text-align: right;">${receipts}</td>
                    <td style="padding: 0.6rem; text-align: right;">${formatMoney(w.totalSpent || 0)}</td>
                    <td style="padding: 0.6rem; text-align: right;">${formatMoney(w.avgPerTrip || 0)}</td>
                    <td style="padding: 0.6rem; text-align: right; color: var(--color-text-secondary);">${formatDate(w.lastVisit)}</td>
                </tr>
            `;
        }).join('');
    }
    
    /**
     * Render charts for Taxes & Rewards tab
     */
    function renderTaxesCharts(receipts, precomputedStats = null) {
        const statsCalc = App.modules.statsCalculator;
        const vizManager = App.modules.visualizationManager;
        if (!statsCalc) return;
        
        const formatMoney = (val) => `$${Number(val || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        const stats = precomputedStats || statsCalc.calculateAll(receipts, { rewards: getRewardOptions() });
        const totals = stats.totals || {};
        const netTaxes = Math.max(0, totals.totalTaxes || 0);
        const netSpending = Math.max(0, totals.netSpent || 0);
        
        // Update tax KPIs
        const taxRateEl = document.getElementById('tax-rate');
        if (taxRateEl) {
            const taxRate = netSpending > 0 ? (netTaxes / netSpending * 100) : 0;
            taxRateEl.textContent = `${taxRate.toFixed(2)}%`;
        }
        
        const totalTaxEl = document.getElementById('total-tax');
        if (totalTaxEl) {
            totalTaxEl.textContent = formatMoney(netTaxes);
        }
        
        const totalSavingsStatEl = document.getElementById('total-savings-stat');
        if (totalSavingsStatEl) {
            const netSavings = Math.max(0, totals.totalSavings || 0);
            totalSavingsStatEl.textContent = formatMoney(netSavings);
        }
        
        // Avg tax per receipt (net of refunds)
        const avgTaxPerReceiptEl = document.getElementById('avg-tax-per-receipt');
        if (avgTaxPerReceiptEl) {
            const receiptCount = totals.totalReceipts || 0;
            const avgTax = receiptCount > 0 ? netTaxes / receiptCount : 0;
            avgTaxPerReceiptEl.textContent = formatMoney(avgTax);
        }
        
        // Update best discount (largest single discount amount)
        let bestDiscount = 0;
        let bestDiscountItem = '—';
        receipts.forEach(r => {
            const isOnlineOrder = r.channel === 'online' || 
                                 r.documentType === 'ONLINE' || 
                                 r.documentType === 'OnlineReceipts';
            
            if (isOnlineOrder && r._original && r._original.orderDiscountAmount) {
                const discount = Number(r._original.orderDiscountAmount) || 0;
                if (discount > bestDiscount) {
                    bestDiscount = discount;
                    if (r.itemArray && r.itemArray.length > 0) {
                        const nonDiscountItems = r.itemArray.filter(i => !i.isDiscount);
                        if (nonDiscountItems.length === 1) {
                            bestDiscountItem = nonDiscountItems[0].normalizedName || 'Online Item';
                        } else if (nonDiscountItems.length > 1) {
                            bestDiscountItem = `${nonDiscountItems[0].normalizedName || 'Item'} (+${nonDiscountItems.length - 1} more)`;
                        } else {
                            bestDiscountItem = 'Online Order';
                        }
                    } else {
                        bestDiscountItem = 'Online Order';
                    }
                }
            }
            
            if (r.itemArray) {
                r.itemArray.forEach(item => {
                    if (item.isDiscount && item.amount < 0) {
                        const discountAmt = Math.abs(item.amount);
                        if (discountAmt > bestDiscount) {
                            bestDiscount = discountAmt;
                            if (item.discountAppliesTo) {
                                const targetItem = r.itemArray.find(i => i.itemNumber === item.discountAppliesTo);
                                if (targetItem && targetItem.normalizedName) {
                                    bestDiscountItem = targetItem.normalizedName;
                                } else {
                                    bestDiscountItem = `Item ${item.discountAppliesTo}`;
                                }
                            } else {
                                bestDiscountItem = item.normalizedName || 'Discount Item';
                            }
                        }
                    }
                });
            }
        });
        const bestDiscountEl = document.getElementById('best-discount');
        if (bestDiscountEl) bestDiscountEl.textContent = `$${bestDiscount.toFixed(2)}`;
        const bestDiscountItemEl = document.getElementById('best-discount-item');
        if (bestDiscountItemEl) bestDiscountItemEl.textContent = bestDiscountItem;
        
        // Tax trend chart (effective tax rate)
        if (vizManager && stats.monthly?.length) {
            vizManager.createChart('tax-rate-trend', 'tax-rate-chart', 'tax-rate-trend', stats.monthly);
        }
        
        // Tax by department (top list + table)
        const taxByDept = calculateTaxByDepartment(receipts);
        const taxBody = document.getElementById('tax-by-dept-body');
        const taxTopList = document.getElementById('tax-top-list');
        const taxScopeLabel = document.getElementById('taxes-scope-label');
        const taxTableFootnote = document.getElementById('tax-table-footnote');
        
        if (taxScopeLabel) {
            taxScopeLabel.textContent = 'Net of refunds · all channels';
        }
        
        const sortedTax = [...taxByDept].sort((a, b) => b.totalTax - a.totalTax);
        const totalTaxForShare = netTaxes > 0 ? netTaxes : sortedTax.reduce((sum, item) => sum + (item.totalTax || 0), 0);
        
        if (taxTopList) {
            if (sortedTax.length === 0) {
                taxTopList.innerHTML = '<p style="color: var(--color-text-tertiary);">No tax data available.</p>';
            } else {
                const statsCalc = App.modules.statsCalculator;
                const topFive = sortedTax.slice(0, 5);
                taxTopList.innerHTML = topFive.map((item, idx) => {
                    const deptName = statsCalc?.getDepartmentName ? statsCalc.getDepartmentName(item.department) : `Dept ${item.department}`;
                    const share = totalTaxForShare > 0 ? ((item.totalTax / totalTaxForShare) * 100) : 0;
                    return `
                        <div class="top-row">
                            <span class="top-rank">${idx + 1}</span>
                            <div class="top-body">
                                <div class="top-title">${deptName} · ${item.warehouse}</div>
                                <div class="top-meta">
                                    Tax ${formatMoney(item.totalTax)} · Rate ${item.taxRate.toFixed(1)}% · ${share.toFixed(1)}% of total tax
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }
        
        if (taxBody) {
            if (sortedTax.length === 0) {
                taxBody.innerHTML = '<tr><td colspan="5" style="padding: 1rem; text-align: center; color: var(--color-text-tertiary);">No tax data</td></tr>';
            } else {
                const statsCalc = App.modules.statsCalculator;
                const rows = sortedTax.slice(0, 10).map(item => {
                    const deptName = statsCalc?.getDepartmentName ? statsCalc.getDepartmentName(item.department) : `Dept ${item.department}`;
                    const share = totalTaxForShare > 0 ? ((item.totalTax / totalTaxForShare) * 100) : 0;
                    return `
                        <tr>
                            <td>${deptName}</td>
                            <td>${item.warehouse}</td>
                            <td class="num">${formatMoney(item.totalTax)}</td>
                            <td class="num">${item.taxRate.toFixed(1)}%</td>
                            <td class="num">${share.toFixed(1)}%</td>
                        </tr>
                    `;
                }).join('');
                taxBody.innerHTML = rows;
            }
        }
        
        if (taxTableFootnote) {
            const totalDepartments = sortedTax.length;
            taxTableFootnote.textContent = totalDepartments > 10 
                ? `Showing top 10 of ${totalDepartments} department/warehouse combinations by tax dollars.`
                : 'Showing top 10 departments by tax dollars.';
        }
        
        // Rewards tracker with configurable cycle
        const rewards = stats.rewards || {};
        const cycleStart = rewards.cycleStart || rewardCycleConfig;
        const currentDate = new Date();
        const getCycleYear = (date) => {
            const startThisYear = new Date(date.getFullYear(), (cycleStart.month || 1) - 1, cycleStart.day || 1);
            return date >= startThisYear ? date.getFullYear() : date.getFullYear() - 1;
        };
        const activeCycleYear = getCycleYear(currentDate);
        const activeCycle = rewards.byYear ? rewards.byYear[activeCycleYear] : null;
        const qualifyingSpend = activeCycle?.subtotal || 0;
        const rewardAmount = activeCycle?.reward || 0;
        const capRemaining = Math.max(0, 1250 - rewardAmount);
        const progressPct = Math.min(100, rewardAmount > 0 ? (rewardAmount / 1250) * 100 : 0);
        
        const rewardSpendEl = document.getElementById('reward-qualifying-spend');
        const rewardProjectedEl = document.getElementById('reward-projected');
        const rewardCapRemainingEl = document.getElementById('reward-cap-remaining');
        const rewardProgressBar = document.getElementById('reward-progress-bar');
        const rewardProgressLabel = document.getElementById('reward-progress-label');
        const rewardProgressCap = document.getElementById('reward-progress-cap');
        
        if (rewardSpendEl) rewardSpendEl.textContent = formatMoney(qualifyingSpend);
        if (rewardProjectedEl) rewardProjectedEl.textContent = formatMoney(rewardAmount);
        if (rewardCapRemainingEl) rewardCapRemainingEl.textContent = formatMoney(capRemaining);
        if (rewardProgressBar) rewardProgressBar.style.width = `${progressPct.toFixed(1)}%`;
        if (rewardProgressLabel) rewardProgressLabel.textContent = `${progressPct.toFixed(1)}% of $1,250 cap`;
        if (rewardProgressCap) rewardProgressCap.textContent = `Cap remaining: ${formatMoney(capRemaining)}`;
        
        // Update rewards table
        const rewardsTableBody = document.getElementById('rewards-table-body');
        if (rewardsTableBody && rewards.byYear) {
            const years = Object.keys(rewards.byYear).sort((a, b) => b - a);
            if (years.length > 0) {
                rewardsTableBody.innerHTML = years.map(year => {
                    const data = rewards.byYear[year];
                    return `
                        <tr>
                            <td>${year} (start ${String(cycleStart.month).padStart(2, '0')}/${String(cycleStart.day).padStart(2, '0')})</td>
                            <td class="num">${formatMoney(data.subtotal)}</td>
                            <td class="num">+${formatMoney(data.reward)}</td>
                        </tr>
                    `;
                }).join('');
            } else {
                rewardsTableBody.innerHTML = '<tr><td colspan="3" style="padding: 1rem; text-align: center; color: var(--color-text-tertiary);">No rewards data</td></tr>';
            }
        }
    }

    /**
     * Update Gas Statistics and Charts
     */
    function updateGasStats(receipts) {
        console.log('updateGasStats called with', receipts.length, 'receipts');
        
        // Filter for gas receipts if not already filtered
        const gasReceipts = receipts.filter(r => 
            r.receiptType === 'Gas Station' || 
            r.documentType === 'FuelReceipts' ||
            (r.itemArray && r.itemArray.some(i => i.itemDescription01 && i.itemDescription01.includes('GAS')))
        );
        
        console.log('Found', gasReceipts.length, 'gas receipts');
        if (gasReceipts.length > 0) {
            console.log('Sample gas receipt:', gasReceipts[0]);
        }
        
        // Calculate Stats
        let totalSpent = 0;
        let totalGallons = 0;
        let locations = new Set();
        let monthlySpendByStation = {};
        let priceHistory = [];
        let fillups = [];
        let stationStats = {};
        let latestDate = null;

        const now = new Date();
        const dayMs = 24 * 60 * 60 * 1000;
        const recentCutoff = new Date(now.getTime() - 90 * dayMs);
        const priorCutoff = new Date(now.getTime() - 180 * dayMs);

        gasReceipts.forEach(r => {
            const receiptTotal = Number(r.total) || 0;
            totalSpent += receiptTotal;
            const station = r.warehouseName || r.channel || 'Unknown';
            locations.add(station);
            
            // Monthly Spend by station (for stacking)
            const date = new Date(r.transactionDateISO || r.transactionDate);
            if (!latestDate || date > latestDate) latestDate = date;
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlySpendByStation[monthKey] = monthlySpendByStation[monthKey] || {};
            
            // Track receipt-level gallons/price for recent table
            let receiptGallons = 0;
            let receiptPricePerGal = null;
            let receiptGrade = 'Regular';
            
            // Extract Gallons and Price
            if (r.itemArray) {
                r.itemArray.forEach(item => {
                    // Gas item usually has "GAL" or similar
                    // Sample: fuelUnitQuantity: 11.202, itemUnitPriceAmount: 4.369
                    if (item.fuelUnitQuantity !== null && item.fuelUnitQuantity !== undefined) {
                        const gallons = Number(item.fuelUnitQuantity);
                        const price = Number(item.itemUnitPriceAmount);
                        console.log('Found fuel:', gallons, 'gal @', price, '/gal');
                        receiptGallons += gallons;
                        if (price > 0) {
                            priceHistory.push({
                                date: date,
                                price: price,
                                grade: item.fuelGradeDescription || 'Regular',
                                warehouse: station,
                                gallons: gallons,
                                total: gallons * price
                            });
                            receiptPricePerGal = price;
                            receiptGrade = item.fuelGradeDescription || 'Regular';
                        }
                    } else if (item.itemDescription01 && item.itemDescription01.includes('GAL')) {
                        // Fallback parsing if JSON structure varies
                        // "11.202 GAL Regular"
                        const match = item.itemDescription01.match(/([\d\.]+)\s*GAL/);
                        if (match) {
                            receiptGallons += Number(match[1]);
                        }
                    }
                });
            }

            // Accumulate station stats
            stationStats[station] = stationStats[station] || {spent: 0, gallons: 0, visits: 0};
            stationStats[station].spent += receiptTotal;
            stationStats[station].gallons += receiptGallons;
            stationStats[station].visits += 1;

            // Monthly spend by station (sum dollars, track gallons for tooltip)
            monthlySpendByStation[monthKey][station] = monthlySpendByStation[monthKey][station] || {amount: 0, gallons: 0};
            monthlySpendByStation[monthKey][station].amount += receiptTotal;
            monthlySpendByStation[monthKey][station].gallons += receiptGallons;

            // Aggregate totals
            totalGallons += receiptGallons;

            // Recent fill-ups (use receipt-level snapshot)
            fillups.push({
                date,
                warehouse: station,
                grade: receiptGrade,
                gallons: receiptGallons,
                price: receiptPricePerGal,
                total: receiptTotal
            });
        });

        const avgPrice = totalGallons > 0 ? (totalSpent / totalGallons) : 0;

        console.log('Gas Stats Summary:', {
            totalSpent,
            totalGallons,
            avgPrice,
            visits: gasReceipts.length,
            locations: locations.size,
            priceHistoryLength: priceHistory.length
        });

        // Helpers
        const setText = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        const setChange = (id, recentVal, priorVal, labelPrefix = 'Last 90d vs prior') => {
            const el = document.getElementById(id);
            if (!el) return;
            const colorNeutral = 'var(--color-text-tertiary)';
            if (!priorVal && !recentVal) {
                el.textContent = `${labelPrefix}: —`;
                el.style.color = colorNeutral;
                return;
            }
            if (!priorVal && recentVal) {
                el.textContent = `${labelPrefix}: ▲ new`;
                el.style.color = 'var(--color-success)';
                return;
            }
            if (!priorVal) {
                el.textContent = `${labelPrefix}: —`;
                el.style.color = colorNeutral;
                return;
            }
            const diff = recentVal - priorVal;
            const pct = priorVal !== 0 ? (diff / priorVal) * 100 : 0;
            const arrow = diff >= 0 ? '▲' : '▼';
            const color = diff >= 0 ? 'var(--color-success)' : 'var(--color-error)';
            el.textContent = `${labelPrefix}: ${arrow} ${Math.abs(pct).toFixed(1)}%`;
            el.style.color = color;
        };

        // Period splits for sparks
        const getPeriodTotals = (arr) => {
            let spent = 0, gallons = 0, visits = 0, locationsSet = new Set();
            arr.forEach(r => {
                const station = r.warehouseName || r.channel || 'Unknown';
                const receiptTotal = Number(r.total) || 0;
                let receiptGallons = 0;
                if (r.itemArray) {
                    r.itemArray.forEach(item => {
                        if (item.fuelUnitQuantity !== null && item.fuelUnitQuantity !== undefined) {
                            receiptGallons += Number(item.fuelUnitQuantity);
                        } else if (item.itemDescription01 && item.itemDescription01.includes('GAL')) {
                            const match = item.itemDescription01.match(/([\d\.]+)\s*GAL/);
                            if (match) receiptGallons += Number(match[1]);
                        }
                    });
                }
                spent += receiptTotal;
                gallons += receiptGallons;
                visits += 1;
                locationsSet.add(station);
            });
            const avgPrice = gallons > 0 ? spent / gallons : 0;
            return {spent, gallons, visits, locations: locationsSet.size, avgPrice};
        };

        const recentReceipts = gasReceipts.filter(r => {
            const d = new Date(r.transactionDateISO || r.transactionDate);
            return d >= recentCutoff;
        });
        const priorReceipts = gasReceipts.filter(r => {
            const d = new Date(r.transactionDateISO || r.transactionDate);
            return d < recentCutoff && d >= priorCutoff;
        });

        const recentStats = getPeriodTotals(recentReceipts);
        const priorStats = getPeriodTotals(priorReceipts);

        // Update UI
        setText('gas-total-spent', `$${totalSpent.toLocaleString('en-US', {minimumFractionDigits: 2})}`);
        setText('gas-total-gallons', `${totalGallons.toLocaleString('en-US', {maximumFractionDigits: 1})} gal`);
        setText('gas-avg-price', `$${avgPrice.toFixed(3)}`);
        setText('gas-visits', gasReceipts.length);
        setText('gas-locations', locations.size);

        setChange('gas-total-spent-change', recentStats.spent, priorStats.spent);
        setChange('gas-total-gallons-change', recentStats.gallons, priorStats.gallons);
        setChange('gas-avg-price-change', recentStats.avgPrice, priorStats.avgPrice);
        setChange('gas-visits-change', recentStats.visits, priorStats.visits, 'Last 90d visits vs prior');
        setChange('gas-locations-change', recentStats.locations, priorStats.locations, 'Last 90d stations vs prior');
        
        // Also update overview tab cards
        setText('gas-total-spent-overview', `$${totalSpent.toLocaleString('en-US', {minimumFractionDigits: 2})}`);
        setText('gas-total-gallons-overview', `${totalGallons.toLocaleString('en-US', {maximumFractionDigits: 1})} gal`);
        setText('gas-avg-price-overview', `$${avgPrice.toFixed(3)}`);

        // Render Charts & tables
        renderGasPriceChart(priceHistory);
        renderGasMonthlyChart(monthlySpendByStation, latestDate);
        renderGasRecentTable(fillups);
        renderGasLocationTable(stationStats);
    }

    function renderGasPriceChart(data) {
        const container = document.getElementById('gas-price-history-chart');
        if (!container) return;
        // TODO: Extend Gas tab with station scorecard, recent fill-ups table, and weekday/weekend splits.
        
        // Clear container
        container.innerHTML = '';
        
        if (data.length === 0) {
            container.innerHTML = '<p style="text-align:center;padding:2rem;color:var(--color-text-tertiary);">No gas data available</p>';
            return;
        }

        // Group by grade for multi-series trend (grade-aware)
        const grouped = d3.group(data, d => d.grade || 'Regular');
        const grades = Array.from(grouped.keys()).sort();
        const color = d3.scaleOrdinal()
            .domain(grades)
            .range([
                '#ef4444', // red
                '#3b82f6', // blue
                '#10b981', // green
                '#f59e0b', // amber
                '#8b5cf6', // purple
                '#ec4899'  // pink
            ]);
        const visibility = {};
        grades.forEach(g => { visibility[g] = true; });

        const margin = {top: 20, right: 30, bottom: 30, left: 50};
        const width = container.clientWidth - margin.left - margin.right;
        const height = 300 - margin.top - margin.bottom;

        const svg = d3.select(container).append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const x = d3.scaleTime().range([0, width]);
        const y = d3.scaleLinear().range([height, 0]);

        x.domain(d3.extent(data, d => d.date));
        // Set Y domain with some padding
        const prices = data.map(d => d.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        y.domain([minPrice * 0.95, maxPrice * 1.05]);

        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x));

        svg.append("g")
            .call(d3.axisLeft(y).tickFormat(d => `$${d.toFixed(2)}`));

        const sanitize = (g) => g.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();

        // Draw one line per grade
        const valueline = d3.line()
            .x(d => x(d.date))
            .y(d => y(d.price));

        const tooltip = (() => {
            let el = document.getElementById('chart-tooltip');
            if (!el) {
                el = document.createElement('div');
                el.id = 'chart-tooltip';
                el.className = 'chart-tooltip';
                el.style.display = 'none';
                document.body.appendChild(el);
            }
            return el;
        })();

        const showTip = (html, evt) => {
            tooltip.innerHTML = html;
            tooltip.style.display = 'block';
            const pad = 12;
            tooltip.style.left = `${evt.pageX + pad}px`;
            tooltip.style.top = `${evt.pageY + pad}px`;
        };
        const hideTip = () => { tooltip.style.display = 'none'; };

        grades.forEach(grade => {
            const series = grouped.get(grade).slice().sort((a, b) => a.date - b.date);
            svg.append("path")
                .data([series])
                .attr("class", `line line-${sanitize(grade)}`)
                .attr("fill", "none")
                .attr("stroke", color(grade))
                .attr("stroke-width", 2)
                .attr("d", valueline);

            // Add dots with enriched tooltips
            svg.selectAll(`.dot-${sanitize(grade)}`)
                .data(series)
                .enter().append("circle")
                .attr("class", `dot dot-${sanitize(grade)}`)
                .attr("cx", d => x(d.date))
                .attr("cy", d => y(d.price))
                .attr("r", 4)
                .attr("fill", color(grade))
                .on("mousemove", (event, d) => {
                    const html = [
                        `<strong>${d.grade || 'Regular'}</strong> @ $${d.price.toFixed(3)}/gal`,
                        d.date ? d.date.toLocaleDateString() : '',
                        `Gallons: ${d.gallons !== undefined ? d.gallons.toFixed(2) : '—'}`,
                        `Total: $${d.total !== undefined ? d.total.toFixed(2) : '—'}`,
                        `Station: ${d.warehouse || '—'}`
                    ].filter(Boolean).join('<br>');
                    showTip(html, event);
                })
                .on("mouseout", hideTip);
        });

        // Legend for grades
        const legend = svg.append("g")
            .attr("transform", `translate(0,${-margin.top / 2})`);

        grades.forEach((grade, idx) => {
            const g = legend.append("g").attr("transform", `translate(${idx * 120},0)`);
            g.append("rect")
                .attr("width", 12)
                .attr("height", 12)
                .attr("fill", color(grade))
                .attr("rx", 2)
                .attr("ry", 2);
            g.append("text")
                .attr("x", 18)
                .attr("y", 10)
                .style("font-size", "12px")
                .style("fill", "var(--color-text-primary)")
                .text(grade);
            g.style("cursor", "pointer")
                .on("click", () => {
                    visibility[grade] = !visibility[grade];
                    const display = visibility[grade] ? null : "none";
                    svg.selectAll(`.line-${sanitize(grade)}`).style("display", display);
                    svg.selectAll(`.dot-${sanitize(grade)}`).style("display", display);
                    g.select("rect").style("opacity", visibility[grade] ? 1 : 0.35);
                    g.select("text").style("opacity", visibility[grade] ? 1 : 0.5);
                });
        });
    }

    function renderGasMonthlyChart(monthlyDataByStation, latestDate) {
        const container = document.getElementById('gas-spending-chart');
        if (!container) return;
        
        container.innerHTML = '';
        
        const monthsAll = Object.keys(monthlyDataByStation).sort();
        let months = monthsAll;
        let last12Start = null;
        if (latestDate) {
            last12Start = new Date(latestDate);
            last12Start.setMonth(last12Start.getMonth() - 11);
            months = monthsAll.filter(m => {
                const [year, month] = m.split('-').map(Number);
                const d = new Date(year, month - 1, 1);
                return d >= last12Start;
            });
        }

        if (months.length === 0) {
            container.innerHTML = '<p style="text-align:center;padding:2rem;color:var(--color-text-tertiary);">No gas data available</p>';
            return;
        }

        const spendSubtitle = document.getElementById('gas-spend-subtitle');
        if (spendSubtitle) {
            spendSubtitle.textContent = latestDate ? 'Showing last 12 months (current filters)' : 'Showing available months (current filters)';
        }

        // Compute top stations by spend
        const stationTotals = {};
        months.forEach(m => {
            Object.entries(monthlyDataByStation[m]).forEach(([station, val]) => {
                stationTotals[station] = (stationTotals[station] || 0) + (val.amount || 0);
            });
        });
        const topStations = Object.entries(stationTotals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([station]) => station);

        // Normalize data with "Other" bucket
        const data = months.map(month => {
            const entry = { month };
            const meta = {};
            const stations = monthlyDataByStation[month] || {};
            let otherAmount = 0;
            let otherGallons = 0;
            Object.entries(stations).forEach(([station, val]) => {
                if (topStations.includes(station)) {
                    entry[station] = val.amount || 0;
                    meta[station] = { amount: val.amount || 0, gallons: val.gallons || 0 };
                } else {
                    otherAmount += val.amount || 0;
                    otherGallons += val.gallons || 0;
                }
            });
            if (otherAmount > 0) {
                entry['Other'] = otherAmount;
                meta['Other'] = { amount: otherAmount, gallons: otherGallons };
            }
            entry._meta = meta;
            return entry;
        });

        const keys = Object.keys(data[0]).filter(k => k !== 'month' && k !== '_meta');

        const margin = {top: 20, right: 20, bottom: 50, left: 60};
        const width = container.clientWidth - margin.left - margin.right;
        const height = 300 - margin.top - margin.bottom;

        const svg = d3.select(container).append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const x = d3.scaleBand().range([0, width]).padding(0.2);
        const y = d3.scaleLinear().range([height, 0]);
        const color = d3.scaleOrdinal()
            .domain(keys)
            .range(d3.schemeTableau10);

        x.domain(data.map(d => d.month));
        const maxSum = d3.max(data, d => keys.reduce((sum, k) => sum + (d[k] || 0), 0));
        y.domain([0, maxSum * 1.1]);

        const stack = d3.stack().keys(keys)(data);

        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x).tickFormat(d => {
                const [year, month] = d.split('-');
                const date = new Date(parseInt(year), parseInt(month) - 1);
                return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            }))
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end");

        svg.append("g")
            .call(d3.axisLeft(y).tickFormat(d => `$${d}`));

        const layer = svg.selectAll(".layer")
            .data(stack)
            .enter().append("g")
            .attr("class", "layer")
            .attr("fill", d => color(d.key));

        const tooltip = (() => {
            let el = document.getElementById('chart-tooltip');
            if (!el) {
                el = document.createElement('div');
                el.id = 'chart-tooltip';
                el.className = 'chart-tooltip';
                el.style.display = 'none';
                document.body.appendChild(el);
            }
            return el;
        })();
        const showTip = (html, evt) => {
            tooltip.innerHTML = html;
            tooltip.style.display = 'block';
            const pad = 12;
            tooltip.style.left = `${evt.pageX + pad}px`;
            tooltip.style.top = `${evt.pageY + pad}px`;
        };
        const hideTip = () => { tooltip.style.display = 'none'; };

        layer.selectAll("rect")
            .data(d => d)
            .enter().append("rect")
            .attr("x", (d, i) => x(data[i].month))
            .attr("width", x.bandwidth())
            .attr("y", d => y(d[1]))
            .attr("height", d => y(d[0]) - y(d[1]))
            .on("mousemove", (event, d) => {
                const station = d3.select(event.currentTarget.parentNode).datum().key;
                const i = Array.from(event.currentTarget.parentNode.children).indexOf(event.currentTarget);
                const meta = data[i]._meta[station] || {amount: d[1]-d[0], gallons: 0};
                const html = [
                    `<strong>${data[i].month}</strong>`,
                    station,
                    `$${(meta.amount || (d[1]-d[0])).toFixed(2)}`,
                    `Gallons: ${meta.gallons ? meta.gallons.toFixed(2) : '—'}`
                ].join('<br>');
                showTip(html, event);
            })
            .on("mouseout", hideTip);

        // Legend
        const legend = svg.append("g")
            .attr("transform", `translate(0,${-margin.top / 2})`);
        keys.forEach((key, idx) => {
            const g = legend.append("g").attr("transform", `translate(${idx * 130},0)`);
            g.append("rect")
                .attr("width", 12)
                .attr("height", 12)
                .attr("fill", color(key))
                .attr("rx", 2)
                .attr("ry", 2);
            g.append("text")
                .attr("x", 18)
                .attr("y", 10)
                .style("font-size", "12px")
                .style("fill", "var(--color-text-primary)")
                .text(key);
        });
    }

    function renderGasRecentTable(fillups) {
        const body = document.getElementById('gas-recent-fillups-body');
        if (!body) return;
        if (!fillups || fillups.length === 0) {
            body.innerHTML = '<tr><td colspan="6" style="padding:0.75rem;text-align:center;color:var(--color-text-tertiary);">No gas data available</td></tr>';
            return;
        }
        const rows = fillups
            .slice()
            .sort((a, b) => b.date - a.date)
            .slice(0, 10)
            .map(f => `
                <tr style="border-bottom: 1px solid var(--color-border);">
                    <td style="padding: 0.5rem;">${f.date.toLocaleDateString()}</td>
                    <td style="padding: 0.5rem;">${f.warehouse}</td>
                    <td style="padding: 0.5rem;">${f.grade || 'Regular'}</td>
                    <td style="padding: 0.5rem; text-align: right;">${(f.gallons || 0).toLocaleString('en-US', {maximumFractionDigits: 2, minimumFractionDigits: 2})} gal</td>
                    <td style="padding: 0.5rem; text-align: right;">${f.price ? `$${f.price.toFixed(3)}` : '—'}</td>
                    <td style="padding: 0.5rem; text-align: right;">$${(f.total || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                </tr>
            `).join('');
        body.innerHTML = rows;
    }

    function renderGasLocationTable(stationStats) {
        const body = document.getElementById('gas-location-avg-body');
        if (!body) return;
        const entries = Object.entries(stationStats || {});
        if (entries.length === 0) {
            body.innerHTML = '<tr><td colspan="4" style="padding:0.75rem;text-align:center;color:var(--color-text-tertiary);">No gas data available</td></tr>';
            return;
        }
        const stations = entries.map(([name, val]) => ({
            name,
            avgPrice: val.gallons > 0 ? val.spent / val.gallons : 0,
            gallons: val.gallons,
            visits: val.visits
        })).sort((a, b) => b.visits - a.visits).slice(0, 3);
        const best = Math.min(...stations.map(s => s.avgPrice));
        const worst = Math.max(...stations.map(s => s.avgPrice));

        body.innerHTML = stations.map(s => `
            <tr style="border-bottom: 1px solid var(--color-border);">
                <td style="padding: 0.5rem;">${s.name}</td>
                <td style="padding: 0.5rem; text-align: right; color: ${s.avgPrice === best ? 'var(--color-success)' : s.avgPrice === worst ? 'var(--color-error)' : 'inherit'};">
                    $${s.avgPrice.toFixed(3)}
                </td>
                <td style="padding: 0.5rem; text-align: right;">${s.gallons.toLocaleString('en-US', {maximumFractionDigits: 1})} gal</td>
                <td style="padding: 0.5rem; text-align: right;">${s.visits}</td>
            </tr>
        `).join('');
    }
    
    return {
        init,
        initializeDashboard,
        updateDashboard,
        showLoading,
        hideLoading,
        showError,
        showSuccess,
        updateStats,
        reset,
        elements
    };
})();
