# Costco Spending Insights

A privacy-first, client-side web application for analyzing Costco purchase receipts.

## Overview

This tool processes Costco receipt data locally in your browser to provide comprehensive analytics on spending habits. It operates without a backend server, ensuring your financial data remains private and never leaves your device.

## Features

*   **Dashboard**: High-level statistics on net spending, visits, item counts, and savings.
*   **Trends**: Monthly spending analysis, savings tracking, and purchase frequency heatmaps.
*   **Item Analysis**: Top spending items, price evolution tracking, and frequently purchased products.
*   **Categories**: Department-level spending breakdown.
*   **Warehouse Analytics**: Comparison of spending across different warehouse locations.
*   **Gas Station Stats**: Detailed tracking of fuel spending, gallons purchased, and price trends.
*   **Taxes & Rewards**: Effective tax rate calculation and Executive Membership 2% reward tracking.

## Interface Preview

![Dashboard Overview](docs/images/dashboard-overview-placeholder.png)
*Figure 1: Main dashboard showing key statistics and spending trends.*

![Item Analysis](docs/images/item-analysis-placeholder.png)
*Figure 2: detailed item price tracking and purchase history.*

## Getting Started

### Option 1: Direct File Access
1.  Open `index.html` directly in your web browser.
2.  Note: Some browsers may restrict D3.js functionality when opening files directly. Use Option 2 if charts fail to load.

### Option 2: Local Web Server (Recommended)
Run a simple HTTP server from the project root:

```bash
# Python 3
python3 -m http.server 8000
```

Navigate to `http://localhost:8000` in your browser.

## Data Preparation

The application requires JSON files containing receipt data. We recommend using the **[Costco Receipts Downloader](https://chromewebstore.google.com/detail/costco-receipts-downloade/nnalnbomehfogoleegpfegaeoofheemn)** Chrome extension to export this data.

1.  **Install Extension**: Add the Costco Receipts Downloader to Chrome.
2.  **Export Data**: 
    *   Navigate to your Costco account.
    *   Use the extension to export **individual JSON files** for your receipts.
    *   **Note**: Export "Warehouse" and "Online" receipts separately to ensure the application parses them correctly.
3.  **Load Data**: Click "Select Receipt Files" in the application to load your exported JSON files.

### Supported File Types
*   **Warehouse**: In-store purchases, returns, and gas transactions.
*   **Online**: E-commerce orders and deliveries.

## Technical Details

*   **Architecture**: Single-page application (SPA) with no backend dependencies.
*   **Stack**: HTML5, CSS3, Vanilla JavaScript (ES6+).
*   **Visualization**: D3.js (v7) for interactive charts.
*   **Storage**: In-memory processing only; no local storage or database persistence.

## License

This project is for personal use and is not affiliated with Costco Wholesale Corporation.
