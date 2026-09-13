export const inquiryStatuses = { pending:'New inquiry', read:'Reviewed', quote_sent:'Quote sent', confirmed:'Confirmed', accepted:'Accepted', rejected:'Declined', delivered:'Delivered' };
export const orderStatuses = { new:'New', approved:'Approved', shipped:'Shipped', delivered:'Delivered' };
export const stockStatuses = { 'in-stock':'In stock', 'low-stock':'Low stock', 'out-of-stock':'Out of stock' };
export const flag = value => value === true || value === 1 || value === '1';
export function filterRecords(rows, search = '', status = 'all', fields = []) {
  const term = search.trim().toLowerCase();
  return rows.filter(row => (status === 'all' || row.status === status) && fields.some(key => String(row[key] ?? '').toLowerCase().includes(term)));
}
export function dashboardMetrics(inquiries, orders, partners, now = new Date()) {
  const active = inquiries.filter(row => !flag(row.isDeleted));
  return { inquiries:active.filter(row => row.status === 'pending').length,
    quotes:active.filter(row => row.status === 'quote_sent').length,
    deliveries:orders.filter(row => { const date = new Date(row.updatedAt || row.createdAt); return row.status === 'delivered' && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth(); }).length,
    partners:partners.filter(row => row.status === 'active').length };
}
export function monthCounts(rows, now = new Date()) {
  return Array.from({length:6}, (_,index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    return { label:date.toLocaleDateString('en',{month:'short'}), count:rows.filter(row => { const submitted = new Date(row.createdAt); return submitted.getFullYear() === date.getFullYear() && submitted.getMonth() === date.getMonth(); }).length };
  });
}
export function csvCell(value) {
  let text = String(value ?? '');
  // Excel can interpret quoted text as a formula; neutralize executable prefixes.
  if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g,'""') + '"';
}
export function inventoryPayload(form) {
  const integer = name => { const raw = String(form.get(name) ?? '').trim(); const value = Number(raw); if (!raw || !Number.isSafeInteger(value) || value < 0 || value > 2147483647) throw new Error('Stock and threshold must be whole numbers from 0 to 2,147,483,647.'); return value; };
  const inventoryCount = integer('inventoryCount'), lowStockThreshold = integer('lowStockThreshold');
  return { inventoryCount, lowStockThreshold, stockStatus:form.get('stockStatus') === 'automatic' ? (inventoryCount === 0 ? 'out-of-stock' : inventoryCount <= lowStockThreshold ? 'low-stock' : 'in-stock') : form.get('stockStatus'), visible:form.get('visible') === 'on', supplierEmail:String(form.get('supplierEmail') || '').trim() };
}
