const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('static'));

// Sample in-memory inventory
const inventory = {
  "SKU-100": { sku: "SKU-100", name: "Widget A", qty: 50, location: "A1", reorder_point: 20, damaged: 0 },
  "SKU-200": { sku: "SKU-200", name: "Widget B", qty: 7, location: "B3", reorder_point: 10, damaged: 1 },
  "SKU-300": { sku: "SKU-300", name: "Gadget X", qty: 0, location: "C2", reorder_point: 5, damaged: 0 }
};

// Sample in-memory orders
const orders = {
  "ORD-001": { id: "ORD-001", priority: 1, items: [{ sku: "SKU-100", qty: 10 }, { sku: "SKU-200", qty: 5 }], status: "created", created_at: new Date(), allocated: {} },
  "ORD-002": { id: "ORD-002", priority: 2, items: [{ sku: "SKU-200", qty: 5 }], status: "created", created_at: new Date(), allocated: {} },
  "ORD-003": { id: "ORD-003", priority: 3, items: [{ sku: "SKU-300", qty: 2 }], status: "created", created_at: new Date(), allocated: {} }
};

// Allocation logic
function allocateOrders() {
  // Sort orders by priority then created_at
  const sortedOrders = Object.values(orders).sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.created_at - b.created_at;
  });

  const allocations = {};
  const suggestions = [];

  // Copy inventory quantities for tentative allocation
  const tempStock = {};
  for (const [sku, item] of Object.entries(inventory)) {
    tempStock[sku] = item.qty - (item.damaged || 0);
  }

  // Allocate to orders
  for (const o of sortedOrders) {
    allocations[o.id] = { allocated: {}, backorder: {} };
    for (const item of o.items) {
      const avail = tempStock[item.sku] || 0;
      const take = Math.min(avail, item.qty);
      if (take > 0) {
        allocations[o.id].allocated[item.sku] = take;
        tempStock[item.sku] = avail - take;
      }
      if (take < item.qty) {
        allocations[o.id].backorder[item.sku] = item.qty - take;
      }
    }
  }

  // Reorder suggestions
  for (const [sku, item] of Object.entries(inventory)) {
    const qty = item.qty - (item.damaged || 0);
    if (qty <= item.reorder_point) {
      const desired = Math.max(item.reorder_point * 2 - qty, 1);
      suggestions.push({ sku, current_qty: qty, reorder_qty: desired });
    }
  }

  // Reallocation hints for high-priority shortages
  const reallocation_hints = [];
  for (const o of sortedOrders) {
    if (Object.keys(allocations[o.id].backorder).length > 0) {
      for (const [sku, needed] of Object.entries(allocations[o.id].backorder)) {
        let remaining = needed;
        for (const other of sortedOrders) {
          if (other.priority > o.priority && (allocations[other.id].allocated[sku] || 0) > 0) {
            const available = allocations[other.id].allocated[sku];
            const move = Math.min(available, remaining);
            if (move > 0) {
              reallocation_hints.push({
                from_order: other.id,
                to_order: o.id,
                sku,
                qty: move,
                reason: "higher-priority shortage"
              });
              remaining -= move;
              allocations[other.id].allocated[sku] -= move;
              if (remaining <= 0) break;
            }
          }
        }
      }
    }
  }

  return { allocations, reorder_suggestions: suggestions, reallocation_hints };
}

// Routes
app.get('/api/inventory', (req, res) => {
  res.json(Object.values(inventory));
});

app.get('/api/orders', (req, res) => {
  res.json(Object.values(orders));
});

app.post('/api/allocate', (req, res) => {
  const result = allocateOrders();
  res.json(result);
});

app.post('/api/pick/:order_id', (req, res) => {
  const { order_id } = req.params;
  if (!orders[order_id]) {
    return res.status(404).json({ error: "Order not found" });
  }
  orders[order_id].status = "picked";
  res.json({ order_id, status: "picked" });
});

app.post('/api/dispatch/:order_id', (req, res) => {
  const { order_id } = req.params;
  if (!orders[order_id]) {
    return res.status(404).json({ error: "Order not found" });
  }
  const alloc_result = allocateOrders().allocations[order_id] || {};
  const allocated = alloc_result.allocated || {};
  
  for (const [sku, q] of Object.entries(allocated)) {
    if (inventory[sku]) {
      inventory[sku].qty = Math.max(0, inventory[sku].qty - q);
    }
  }
  
  orders[order_id].status = "dispatched";
  res.json({ order_id, status: "dispatched", applied_allocations: allocated });
});

app.get('/api/analytics', (req, res) => {
  const total_orders = Object.keys(orders).length;
  const pending = Object.values(orders).filter(o => o.status !== "dispatched").length;
  const low_stock = Object.values(inventory).filter(i => (i.qty - (i.damaged || 0)) <= i.reorder_point);
  const stockouts = Object.values(inventory).filter(i => (i.qty - (i.damaged || 0)) === 0);
  
  res.json({
    total_orders,
    pending_orders: pending,
    low_stock_count: low_stock.length,
    stockouts: stockouts.map(s => s.sku)
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'static', 'index.html'));
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Smart Warehouse MVP running on http://localhost:${PORT}`);
});
