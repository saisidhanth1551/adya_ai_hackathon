# WooCommerce MCP Server Overview

## What is the WooCommerce MCP Server?
The WooCommerce MCP Server is a service built using the Model Context Protocol (MCP) SDK. It enables structured, secure, and automated interaction with WooCommerce-based e-commerce stores. This server leverages the WooCommerce REST API to perform essential e-commerce operations and integrates smoothly with the Vanij Platform.

---

## Key Features
- ✅ Fetch recent orders with filtering options
- ✅ Retrieve detailed order information by ID
- ✅ Create new customer orders with duplicate detection
- ✅ List all available products
- ✅ Add new products with images and categories
- ✅ Delete products by ID
- ✅ Secure API communication using WooCommerce credentials

---

## Capabilities
| Capability            | Description                                                |
|-----------------------|------------------------------------------------------------|
| Order Retrieval       | Fetch recent orders, optionally filtered by date or status |
| Order Management      | Create new orders with validation to prevent duplicates    |
| Product Listing       | Retrieve all existing products                             |
| Product Management    | Add or remove products using structured input              |
| Secure Interaction    | Uses HTTP Basic Auth with Consumer Key & Secret            |

---

## Supported WooCommerce Versions
- Compatible with WooCommerce v3.5+ (REST API support required)
- Requires WordPress 5.0+ and WooCommerce plugin
- HTTPS-enabled site is mandatory for API interactions

---

## Security Notes
- Authenticated using **Consumer Key** and **Consumer Secret**
- Requires proper WooCommerce role permissions (Admin/Shop Manager)
- All communication must be secured via HTTPS

---

## Integration Use Cases
- E-commerce automation through MCP platform tools
- Order syncing and processing in multi-platform environments
- Inventory and product catalog management
- Real-time dashboard integration for WooCommerce analytics
- Streamlined content and commerce orchestration across services
