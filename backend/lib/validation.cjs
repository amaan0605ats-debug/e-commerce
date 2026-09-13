const STOCK_STATUSES = new Set(['in-stock', 'low-stock', 'out-of-stock']);
const ORDER_STATUSES = new Set(['new', 'approved', 'shipped', 'delivered']);
const INQUIRY_STATUSES = new Set(['pending', 'read', 'accepted', 'rejected', 'quote_sent', 'confirmed', 'delivered']);

function isNonNegativeInteger(value) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 2147483647;
}

function isBoolean(value) {
  return value === true || value === false || value === 0 || value === 1;
}

function isEmail(value) {
  return typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validateInventory({ stockStatus, visible, inventoryCount, lowStockThreshold, supplierEmail }) {
  if (stockStatus !== undefined && !STOCK_STATUSES.has(stockStatus)) return 'Invalid stock status';
  if (visible !== undefined && !isBoolean(visible)) return 'Visibility must be true or false';
  if (inventoryCount !== undefined && !isNonNegativeInteger(inventoryCount)) return 'Inventory must be a non-negative whole number';
  if (lowStockThreshold !== undefined && !isNonNegativeInteger(lowStockThreshold)) return 'Low stock threshold must be a non-negative whole number';
  if (supplierEmail !== undefined && supplierEmail !== '' && !isEmail(supplierEmail)) return 'Invalid supplier email';
  return null;
}

module.exports = { STOCK_STATUSES, ORDER_STATUSES, INQUIRY_STATUSES, isNonNegativeInteger, isBoolean, isEmail, validateInventory };
