# Smart Warehouse Operations — MVP

This is a lightweight hackathon MVP demonstrating a smart warehouse order fulfillment flow, built with **Node.js/Express** backend.

## Quick Start

```bash
npm install
npm start
```

Open http://localhost:8000/ to view the dashboard.

## Features Implemented

- **Inventory & Sample Data** — SKU management with locations, quantities, and reorder points
- **Order Management** — Sample orders with priorities
- **Smart Allocation Algorithm** — Prioritizes orders, allocates available stock, flags backorders, and suggests reallocations from low-priority to high-priority orders
- **Reorder Suggestions** — Automatically recommends restocking items below reorder point
- **Simple Dashboard** — View inventory, orders, and run allocation engine
- **REST API** — Full backend endpoints for integration

## API Endpoints

- `GET /api/inventory` — List all inventory items
- `GET /api/orders` — List all orders
- `POST /api/allocate` — Run smart allocation algorithm
- `POST /api/pick/:order_id` — Mark order as picked
- `POST /api/dispatch/:order_id` — Dispatch order and update inventory
- `GET /api/analytics` — Dashboard analytics (pending orders, stockouts, low stock)

## Next Steps to Enhance

- Persistent storage (SQLite/MongoDB)
- Advanced allocation policies (batching, zone-based picking)
- Picking optimization & route planning
- Real-time analytics dashboard
- User authentication & multi-warehouse support
