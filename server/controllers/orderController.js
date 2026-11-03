import { getCatalogueMeta, getProduct, getBusiness, getDeliveryFeePesewas, reserveStock } from '../models/productCatalogModel.js';
import {
  createOrder as persistOrder,
  getOrderById,
  findByIdempotencyKey,
  getOrderByReference,
  updateOrder,
  listOrders as listStoredOrders,
  listOrdersByPaymentStatus,
  newOrderId,
} from '../models/orderModel.js';
import {
  adminFlutterwaveSettings,
  createPaymentLink,
  getFlutterwaveConfig,
  isFlutterwaveConfigured,
  paymentRedirectUrl,
  publicFlutterwaveSettings,
  verifyTransactionById,
  verifyTransactionByReference,
  verifyWebhookSignature,
} from '../services/flutterwaveService.js';
import { randomBytes } from 'crypto';

const MAX_ITEMS = 20;
const MAX_QUANTITY = 99;

// A hosted Flutterwave payment link lives for FLW_SESSION_MINUTES (60 by
// default). We reuse the live link instead of creating a new one, and never
// create more than this many links for a single order.
const MAX_PAYMENT_ATTEMPTS = 5;
const PAYMENT_LINK_MIN_INTERVAL_MS = 20 * 1000;

function httpError(status, message, code, details) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  error.details = details;
  return error;
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function normalizePhone(value) {
  return String(value || '').replace(/[^\d+]/g, '');
}

function isPhone(value) {
  const phone = normalizePhone(value);
  return /^0\d{9}$/.test(phone) || /^233\d{9}$/.test(phone) || /^\+233\d{9}$/.test(phone);
}

function normalizeItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw httpError(400, 'Your order is empty.', 'EMPTY_ORDER');
  }
  if (rawItems.length > MAX_ITEMS) {
    throw httpError(400, `An order can contain at most ${MAX_ITEMS} different products.`, 'TOO_MANY_ITEMS');
  }

  const merged = new Map();
  for (const raw of rawItems) {
    const productId = String(raw?.productId || '').trim();
    const quantity = Number(raw?.quantity);
    if (!productId) {
      throw httpError(400, 'Each order item needs a product.', 'INVALID_ITEM');
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      throw httpError(400, `Quantity must be a whole number between 1 and ${MAX_QUANTITY}.`, 'INVALID_QUANTITY');
    }
    merged.set(productId, (merged.get(productId) || 0) + quantity);
  }
  return [...merged.entries()].map(([productId, quantity]) => ({ productId, quantity }));
}

function normalizeDelivery(rawDelivery) {
  const method = rawDelivery?.method === 'pickup' ? 'pickup' : 'home';
  return {
    method,
    region: String(rawDelivery?.region || '').trim(),
    city: String(rawDelivery?.city || '').trim(),
    area: String(rawDelivery?.area || '').trim(),
    streetAddress: String(rawDelivery?.streetAddress || '').trim(),
    digitalAddress: String(rawDelivery?.digitalAddress || '').trim(),
    landmark: String(rawDelivery?.landmark || '').trim(),
    notes: String(rawDelivery?.notes || '').trim(),
  };
}

function validateDelivery(delivery) {
  if (delivery.method === 'pickup') return;
  const missing = [];
  if (!delivery.region) missing.push('region');
  if (!delivery.city) missing.push('city');
  if (!delivery.area) missing.push('area');
  if (!delivery.streetAddress) missing.push('street address');
  if (missing.length) {
    throw httpError(400, `Please provide your delivery ${missing.join(', ')}.`, 'INVALID_DELIVERY');
  }
}

function buildQuote(items, deliveryMethod) {
  const currency = getCatalogueMeta().currency || 'GHS';
  const lines = [];

  for (const item of items) {
    const product = getProduct(item.productId);
    if (!product) {
      throw httpError(400, 'One of the products in your order is no longer available.', 'PRODUCT_UNAVAILABLE', {
        productId: item.productId,
      });
    }
    if (product.status !== 'active') {
      throw httpError(400, `${product.name} is not available for sale right now.`, 'PRODUCT_UNAVAILABLE', {
        productId: product.id,
      });
    }
    if (product.stock < item.quantity) {
      throw httpError(409, product.stock === 0
        ? `${product.name} is out of stock.`
        : `Only ${product.stock} of ${product.name} left in stock.`, 'INSUFFICIENT_STOCK', {
        productId: product.id,
        available: product.stock,
      });
    }
    if (!(product.pricePesewas > 0)) {
      throw httpError(400, `${product.name} does not have a valid price.`, 'INVALID_PRICE', {
        productId: product.id,
      });
    }

    const business = getBusiness(product.businessId);
    lines.push({
      productId: product.id,
      name: product.name,
      image: product.image,
      businessId: product.businessId,
      businessName: product.businessName,
      businessPhone: business?.phone || '',
      pickupLocation: business?.pickupLocation || '',
      quantity: item.quantity,
      unitPricePesewas: product.pricePesewas,
      originalPricePesewas: product.originalPricePesewas,
      lineTotalPesewas: product.pricePesewas * item.quantity,
      availableStock: product.stock,
    });
  }

  const subtotalPesewas = lines.reduce((sum, line) => sum + line.lineTotalPesewas, 0);
  const deliveryFeePesewas = getDeliveryFeePesewas(deliveryMethod);
  const totalPesewas = subtotalPesewas + deliveryFeePesewas;

  return { currency, lines, subtotalPesewas, deliveryFeePesewas, totalPesewas };
}

function toGhs(pesewas) {
  return Math.round(Number(pesewas || 0)) / 100;
}

function publicQuote(quote, deliveryMethod) {
  return {
    currency: quote.currency,
    deliveryMethod,
    lines: quote.lines.map((line) => ({
      productId: line.productId,
      name: line.name,
      image: line.image,
      businessId: line.businessId,
      businessName: line.businessName,
      businessPhone: line.businessPhone,
      pickupLocation: line.pickupLocation,
      quantity: line.quantity,
      unitPrice: toGhs(line.unitPricePesewas),
      originalUnitPrice: line.originalPricePesewas ? toGhs(line.originalPricePesewas) : null,
      lineTotal: toGhs(line.lineTotalPesewas),
      availableStock: line.availableStock,
    })),
    subtotal: toGhs(quote.subtotalPesewas),
    deliveryFee: toGhs(quote.deliveryFeePesewas),
    total: toGhs(quote.totalPesewas),
  };
}

export function publicOrder(order) {
  if (!order) return null;
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    currency: order.currency || 'GHS',
    customer: {
      name: order.customerName,
      phone: order.customerPhone,
      email: order.customerEmail,
    },
    items: (order.items || []).map((item) => ({
      productId: item.productId,
      name: item.productName,
      image: item.productImage,
      businessId: item.businessId,
      businessName: item.businessName,
      quantity: item.quantity,
      unitPrice: toGhs(item.unitPricePesewas),
      lineTotal: toGhs(item.lineTotalPesewas),
    })),
    subtotal: toGhs(order.subtotalPesewas),
    deliveryFee: toGhs(order.deliveryFeePesewas),
    total: toGhs(order.totalPesewas),
    paymentStatus: order.paymentStatus,
    paymentChannel: order.paymentChannel || null,
    paymentProvider: order.paymentProvider || null,
    paymentMethod: order.paymentMethod || null,
    paymentPhone: order.paymentPhone || null,
    paymentReference: order.paymentReference || order.orderNumber || null,
    paymentLink: order.paymentLink || null,
    paymentLinkCreatedAt: order.paymentLinkCreatedAt || null,
    paymentLinkExpiresAt: order.paymentLinkExpiresAt || null,
    paymentTransactionId: order.paymentTransactionId || null,
    paymentCheckedAt: order.paymentCheckedAt || null,
    paymentAttempts: Number(order.paymentAttempts) || 0,
    amountPaid: order.amountPaidPesewas ? toGhs(order.amountPaidPesewas) : null,
    paymentVerifiedAt: order.paymentVerifiedAt || null,
    paymentVerifiedBy: order.paymentVerifiedBy || null,
    failureReason: order.failureReason || null,
    orderStatus: order.orderStatus,
    delivery: order.delivery,
  };
}

export function quoteOrder(req, res) {
  try {
    const items = normalizeItems(req.body?.items);
    const deliveryMethod = req.body?.deliveryMethod === 'pickup' ? 'pickup' : 'home';
    const quote = buildQuote(items, deliveryMethod);
    return res.json({ success: true, quote: publicQuote(quote, deliveryMethod) });
  } catch (error) {
    return sendError(res, error);
  }
}

export function createOrder(req, res) {
  try {
    const idempotencyKey = String(req.body?.idempotencyKey || '').trim();
    if (idempotencyKey) {
      const existing = findByIdempotencyKey(idempotencyKey);
      if (existing) {
        return res.status(200).json({ success: true, order: publicOrder(existing), reused: true });
      }
    }

    if (!isFlutterwaveConfigured()) {
      throw httpError(
        503,
        'Card and mobile money payments are not set up yet. Please contact NKAY to complete this order.',
        'PAYMENTS_NOT_CONFIGURED',
        { missing: getFlutterwaveConfig().missing }
      );
    }

    const items = normalizeItems(req.body?.items);
    const customerName = String(req.body?.customer?.name || '').trim();
    const customerPhone = String(req.body?.customer?.phone || '').trim();
    const customerEmail = String(req.body?.customer?.email || '').trim().toLowerCase();
    const delivery = normalizeDelivery(req.body?.delivery);
    const customerId = String(req.body?.customer?.id || '').trim();

    const fieldErrors = {};
    if (customerName.length < 2) fieldErrors.name = 'Enter your full name.';
    if (!isPhone(customerPhone)) fieldErrors.phone = 'Enter a valid Ghana phone number.';
    if (!isEmail(customerEmail)) fieldErrors.email = 'Enter a valid email address.';
    if (Object.keys(fieldErrors).length) {
      throw httpError(400, 'Please check your contact details.', 'INVALID_CUSTOMER', fieldErrors);
    }
    validateDelivery(delivery);

    if (delivery.method === 'home' && !delivery.region) {
      throw httpError(400, 'Please choose a delivery region.', 'INVALID_DELIVERY');
    }

    const quote = buildQuote(items, delivery.method);
    const orderId = newOrderId();

    const order = persistOrder({
      id: orderId,
      customerId: customerId || null,
      customerName,
      customerPhone: normalizePhone(customerPhone),
      customerEmail,
      items: quote.lines.map((line) => ({
        productId: line.productId,
        productName: line.name,
        productImage: line.image,
        businessId: line.businessId,
        businessName: line.businessName,
        quantity: line.quantity,
        unitPricePesewas: line.unitPricePesewas,
        lineTotalPesewas: line.lineTotalPesewas,
      })),
      subtotalPesewas: quote.subtotalPesewas,
      deliveryFeePesewas: quote.deliveryFeePesewas,
      totalPesewas: quote.totalPesewas,
      currency: quote.currency,
      delivery,
      idempotencyKey: idempotencyKey || null,
      paymentStatus: 'pending',
      orderStatus: 'new',
      paymentChannel: 'flutterwave',
      paymentProvider: 'flutterwave',
      paymentMethod: null,
      paymentPhone: null,
      paymentReference: null,
      paymentReferences: [],
      paymentLink: null,
      paymentLinkCreatedAt: null,
      paymentLinkExpiresAt: null,
      paymentTransactionId: null,
      paymentCheckedAt: null,
      paymentAttempts: 0,
      amountPaidPesewas: null,
      paymentCurrency: null,
      paymentVerifiedAt: null,
      paymentVerifiedBy: null,
      paidAt: null,
      stockReservedAt: null,
      failureReason: null,
    });

    return res.status(201).json({ success: true, order: publicOrder(order) });
  } catch (error) {
    return sendError(res, error);
  }
}

export function getOrder(req, res) {
  const order = getOrderById(String(req.params.id || ''));
  if (!order) {
    return res.status(404).json({ success: false, error: 'Order not found.', code: 'ORDER_NOT_FOUND' });
  }
  res.setHeader('Cache-Control', 'no-store');
  return res.json({ success: true, order: publicOrder(order) });
}

export function listCustomerOrders(req, res) {
  // Orders are looked up by their unguessable ID (a capability token), which
  // lets guests see the orders they created without exposing other customers'
  // data by email.
  const ids = String(req.query.ids || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 50);
  const orders = ids
    .map((id) => getOrderById(id))
    .filter(Boolean)
    .map(publicOrder);
  res.setHeader('Cache-Control', 'no-store');
  return res.json({ success: true, orders });
}

export function getPaymentSettings(_req, res) {
  return res.json({ success: true, settings: publicFlutterwaveSettings() });
}

export function getAdminPaymentSettings(_req, res) {
  return res.json({ success: true, settings: adminFlutterwaveSettings() });
}

function paymentReferenceMatches(order, txRef) {
  const reference = String(txRef || '').trim();
  if (!reference) return false;
  if (reference === order.orderNumber) return true;
  if (reference === order.paymentReference) return true;
  return Array.isArray(order.paymentReferences) && order.paymentReferences.includes(reference);
}

/**
 * Applies a Flutterwave-verified paid result to an order.
 *
 * This function is deliberately synchronous: the final "is it paid?" check,
 * stock reservation and order write all happen in the same event-loop tick.
 * Two concurrent webhooks therefore cannot both decrement stock — the second
 * sees `paymentStatus: 'paid'` and returns without touching inventory.
 *
 * `verification` comes from verifyTransactionById/ByReference(), never from a
 * webhook body or the browser.
 */
function applyVerifiedPayment(orderId, verification, actor) {
  const current = getOrderById(orderId);
  if (!current) return { order: null, state: 'missing', message: 'Order not found.' };
  if (current.paymentStatus === 'paid') {
    return { order: current, state: 'paid', message: 'Payment was already confirmed.' };
  }
  if (verification.state !== 'paid') {
    return { order: current, state: verification.state, message: 'Payment is not confirmed yet.' };
  }

  const nowIso = new Date().toISOString();
  const transactionId = verification.transactionId || current.paymentTransactionId || null;
  const paidPesewas = Number.isFinite(verification.amountPesewas) ? verification.amountPesewas : null;
  const currency = String(verification.currency || '').toUpperCase();
  const expectedPesewas = Math.round(Number(current.totalPesewas) || 0);

  const mismatchReason = (() => {
    if (!(paidPesewas > 0)) {
      return 'Flutterwave confirmed a payment but did not return a valid amount. Please contact NKAY support — do not pay again.';
    }
    if (currency !== 'GHS') {
      return `Flutterwave confirmed a payment in ${currency || 'an unknown currency'} instead of GHS. Please contact NKAY support — do not pay again.`;
    }
    if (paidPesewas !== expectedPesewas) {
      return `Flutterwave confirmed ${toGhs(paidPesewas)} but this order total is ${toGhs(expectedPesewas)}. Please contact NKAY support — do not pay again.`;
    }
    return '';
  })();

  const paymentDetails = {
    paymentProvider: 'flutterwave',
    paymentChannel: 'flutterwave',
    paymentMethod: verification.paymentMethod || current.paymentMethod || null,
    paymentTransactionId: transactionId,
    amountPaidPesewas: paidPesewas || null,
    paymentCurrency: currency || null,
    paymentCheckedAt: nowIso,
    paymentVerifiedAt: nowIso,
    paymentVerifiedBy: actor,
  };

  if (mismatchReason) {
    const updated = updateOrder(current.id, {
      ...paymentDetails,
      paymentStatus: 'attention',
      orderStatus: 'new',
      failureReason: mismatchReason,
    });
    return { order: updated, state: 'attention', message: mismatchReason };
  }

  // The customer really did pay. Stock is only decremented now, and only once.
  const reservation = reserveStock(current.items);
  if (!reservation.ok) {
    const names = reservation.failures.map((failure) => failure.productName || failure.productId).join(', ');
    const reason = `Payment was received, but stock ran out for: ${names}. NKAY support will contact you about a refund — do not pay again.`;
    const updated = updateOrder(current.id, {
      ...paymentDetails,
      paymentStatus: 'attention',
      orderStatus: 'new',
      paidAt: nowIso,
      stockReservedAt: null,
      failureReason: reason,
    });
    return { order: updated, state: 'attention', message: reason };
  }

  const updated = updateOrder(current.id, {
    ...paymentDetails,
    paymentStatus: 'paid',
    orderStatus: 'confirmed',
    paidAt: nowIso,
    stockReservedAt: nowIso,
    failureReason: null,
  });
  return { order: updated, state: 'paid', message: 'Payment confirmed.' };
}

/**
 * Re-queries Flutterwave and records the authoritative result for an order.
 * Never trusts a webhook payload, a redirect query string, or a browser flag.
 */
async function verifyPaymentForOrder(order, actor, { transactionId } = {}) {
  const reference = String(order.paymentReference || order.orderNumber || '').trim();
  const lookupId = String(transactionId || order.paymentTransactionId || '').trim();
  if (!reference && !lookupId) {
    return { order, state: 'pending', message: 'This order has no payment reference yet.' };
  }

  const verification = lookupId
    ? await verifyTransactionById(lookupId)
    : await verifyTransactionByReference(reference);

  if (!verification.ok) {
    // Network/provider trouble is temporary: keep the order exactly as it is
    // and let the next poll or the reconciler try again.
    return {
      order,
      state: 'unavailable',
      message: 'We could not reach Flutterwave to confirm this payment yet. This page will keep checking.',
    };
  }

  if (verification.txRef && !paymentReferenceMatches(order, verification.txRef)) {
    const reason = 'Flutterwave returned payment details that do not match this order. Please contact NKAY support — do not pay again.';
    const updated = updateOrder(order.id, {
      paymentStatus: 'attention',
      paymentCheckedAt: new Date().toISOString(),
      failureReason: reason,
    });
    return { order: updated, state: 'attention', message: reason };
  }

  if (
    order.paymentTransactionId &&
    verification.transactionId &&
    String(order.paymentTransactionId) !== String(verification.transactionId)
  ) {
    const reason = 'Flutterwave returned a different transaction for this order. Please contact NKAY support — do not pay again.';
    const updated = updateOrder(order.id, {
      paymentStatus: 'attention',
      paymentCheckedAt: new Date().toISOString(),
      failureReason: reason,
    });
    return { order: updated, state: 'attention', message: reason };
  }

  if (verification.state === 'paid') {
    return applyVerifiedPayment(order.id, verification, actor);
  }

  const nowIso = new Date().toISOString();
  const transactionDetails = {
    paymentProvider: 'flutterwave',
    paymentChannel: 'flutterwave',
    paymentMethod: verification.paymentMethod || order.paymentMethod || null,
    paymentTransactionId: verification.transactionId || order.paymentTransactionId || null,
    paymentCheckedAt: nowIso,
  };

  if (verification.state === 'refunded') {
    const reason = 'Flutterwave reports this payment was refunded. Contact NKAY support if you need help with this order.';
    const updated = updateOrder(order.id, {
      ...transactionDetails,
      paymentStatus: 'failed',
      orderStatus: 'new',
      failureReason: reason,
    });
    return { order: updated, state: 'failed', message: reason };
  }

  if (verification.state === 'failed') {
    const reason = verification.processorResponse
      ? `The payment was not completed (${verification.processorResponse}). You can try again.`
      : 'The payment was not completed. You can try again — you have not been charged.';
    const updated = updateOrder(order.id, {
      ...transactionDetails,
      paymentStatus: 'failed',
      orderStatus: 'new',
      failureReason: reason,
    });
    return { order: updated, state: 'failed', message: reason };
  }

  const expiresAt = order.paymentLinkExpiresAt ? Date.parse(order.paymentLinkExpiresAt) : 0;
  if (expiresAt && expiresAt < Date.now()) {
    const reason = 'The Flutterwave payment session expired. You can start a new payment — you have not been charged.';
    const updated = updateOrder(order.id, {
      ...transactionDetails,
      paymentStatus: 'failed',
      orderStatus: 'new',
      failureReason: reason,
    });
    return { order: updated, state: 'failed', message: reason };
  }

  // Pending / unknown: Flutterwave has not reached a final state. Record the
  // check so the UI and reconciler can see progress without changing the outcome.
  const updated = updateOrder(order.id, transactionDetails);
  return {
    order: updated,
    state: 'pending',
    message: 'Waiting for Flutterwave to confirm your payment.',
  };
}

function newPaymentReference(orderNumber) {
  return `${orderNumber}-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`;
}

export async function initiateOrderPayment(req, res) {
  try {
    const order = getOrderById(String(req.params.id || '').trim());
    if (!order) {
      throw httpError(404, 'Order not found.', 'ORDER_NOT_FOUND');
    }
    if (order.paymentStatus === 'paid') {
      return res.json({ success: true, order: publicOrder(order), alreadyPaid: true });
    }
    if (order.paymentStatus === 'attention') {
      throw httpError(
        409,
        order.failureReason || 'This payment needs NKAY support to review it. Please do not pay again.',
        'PAYMENT_NEEDS_ATTENTION'
      );
    }
    if (!isFlutterwaveConfigured()) {
      throw httpError(
        503,
        'Card and mobile money payments are not set up yet. Please contact NKAY to complete this order.',
        'PAYMENTS_NOT_CONFIGURED',
        { missing: getFlutterwaveConfig().missing }
      );
    }

    const now = Date.now();
    const attempts = Number(order.paymentAttempts) || 0;
    const expiresAt = order.paymentLinkExpiresAt ? Date.parse(order.paymentLinkExpiresAt) : 0;
    const liveLink = Boolean(
      order.paymentStatus === 'processing' && order.paymentLink && (!expiresAt || expiresAt > now)
    );

    // Reuse an unexpired checkout link instead of creating a second one.
    if (liveLink) {
      return res.json({
        success: true,
        order: publicOrder(order),
        paymentLink: order.paymentLink,
        state: 'processing',
        reused: true,
        message: 'Continue your payment on Flutterwave.',
      });
    }

    if (attempts >= MAX_PAYMENT_ATTEMPTS) {
      throw httpError(
        429,
        'Too many payment attempts for this order. Contact NKAY support with your order number.',
        'TOO_MANY_PAYMENT_ATTEMPTS'
      );
    }

    const lastCreatedAt = order.paymentLinkCreatedAt ? Date.parse(order.paymentLinkCreatedAt) : 0;
    if (lastCreatedAt && now - lastCreatedAt < PAYMENT_LINK_MIN_INTERVAL_MS) {
      const waitSec = Math.max(1, Math.ceil((PAYMENT_LINK_MIN_INTERVAL_MS - (now - lastCreatedAt)) / 1000));
      throw httpError(
        429,
        `Please wait ${waitSec} seconds before starting another payment.`,
        'PAYMENT_LINK_COOLDOWN',
        { waitSec }
      );
    }

    if (!paymentRedirectUrl(order.id)) {
      throw httpError(
        503,
        'The payment return URL is not configured on this server.',
        'PAYMENTS_NOT_CONFIGURED',
        { missing: getFlutterwaveConfig().missing }
      );
    }

    const txRef = newPaymentReference(order.orderNumber);
    const created = await createPaymentLink({
      txRef,
      amountPesewas: order.totalPesewas,
      currency: order.currency || 'GHS',
      customer: {
        name: order.customerName,
        email: order.customerEmail,
        phone: order.customerPhone,
      },
      orderId: order.id,
      orderNumber: order.orderNumber,
      description: `NKAY order ${order.orderNumber}`,
    });

    const createdIso = new Date().toISOString();
    const sessionMs = Math.max(5, Number(getFlutterwaveConfig().sessionMinutes) || 60) * 60 * 1000;
    const previousReferences = Array.isArray(order.paymentReferences) ? order.paymentReferences : [];
    const updated = updateOrder(order.id, {
      paymentStatus: 'processing',
      orderStatus: 'new',
      paymentProvider: 'flutterwave',
      paymentChannel: 'flutterwave',
      paymentMethod: null,
      paymentPhone: order.customerPhone,
      paymentReference: txRef,
      paymentReferences: [...new Set([...previousReferences, txRef])],
      paymentLink: created.link,
      paymentLinkCreatedAt: createdIso,
      paymentLinkExpiresAt: new Date(now + sessionMs).toISOString(),
      paymentTransactionId: null,
      paymentCheckedAt: createdIso,
      paymentAttempts: attempts + 1,
      failureReason: null,
    });

    return res.status(201).json({
      success: true,
      order: publicOrder(updated),
      paymentLink: created.link,
      state: 'processing',
      message: 'Redirecting you to Flutterwave to complete payment.',
    });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function verifyOrderPayment(req, res) {
  try {
    const order = getOrderById(String(req.params.id || '').trim());
    if (!order) {
      throw httpError(404, 'Order not found.', 'ORDER_NOT_FOUND');
    }
    if (order.paymentStatus === 'paid') {
      return res.json({ success: true, order: publicOrder(order), state: 'paid', message: 'Payment confirmed.' });
    }
    if (!isFlutterwaveConfigured()) {
      throw httpError(
        503,
        'Card and mobile money payments are not set up yet. Please contact NKAY to complete this order.',
        'PAYMENTS_NOT_CONFIGURED'
      );
    }

    const transactionId = String(req.body?.transactionId || '').trim();
    const result = await verifyPaymentForOrder(order, 'flutterwave', { transactionId });
    return res.json({
      success: true,
      order: publicOrder(result.order),
      state: result.state,
      message: result.message,
    });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function recheckOrderPayment(req, res) {
  try {
    const order = getOrderById(String(req.params.id || '').trim());
    if (!order) {
      throw httpError(404, 'Order not found.', 'ORDER_NOT_FOUND');
    }
    if (!isFlutterwaveConfigured()) {
      throw httpError(
        503,
        'Flutterwave is not configured on this server.',
        'PAYMENTS_NOT_CONFIGURED',
        { missing: getFlutterwaveConfig().missing }
      );
    }

    const transactionId = String(req.body?.transactionId || '').trim();
    const result = await verifyPaymentForOrder(order, req.adminEmail || 'admin', { transactionId });
    return res.json({
      success: true,
      order: publicOrder(result.order),
      state: result.state,
      message: result.message,
    });
  } catch (error) {
    return sendError(res, error);
  }
}

/**
 * Flutterwave calls this after a charge completes.
 * The payload is treated as a hint only: we look up the order by tx_ref and
 * re-query the transaction verification endpoint before changing anything.
 */
export async function handleFlutterwaveWebhook(req, res) {
  try {
    if (!verifyWebhookSignature(req.get('verif-hash'))) {
      return res.status(401).json({ success: false, error: 'Invalid webhook signature.' });
    }

    const event = String(req.body?.event || '').trim();
    const data = req.body?.data && typeof req.body.data === 'object' ? req.body.data : {};
    if (event !== 'charge.completed') {
      return res.json({ success: true, ignored: true });
    }

    const txRef = String(data.tx_ref || '').trim();
    const transactionId = data.id != null ? String(data.id) : '';
    if (!txRef) {
      return res.json({ success: true, ignored: true });
    }

    const order = getOrderByReference(txRef);
    if (!order) {
      // Unknown reference: acknowledge so Flutterwave does not keep retrying.
      return res.json({ success: true, ignored: true });
    }
    if (order.paymentStatus === 'paid') {
      return res.json({ success: true, alreadyPaid: true });
    }

    const result = await verifyPaymentForOrder(order, 'flutterwave-webhook', { transactionId });
    console.log(`Flutterwave webhook for ${order.orderNumber}: ${result.state}`);
    return res.json({ success: true, state: result.state, alreadyPaid: result.state === 'paid' });
  } catch (error) {
    // Always acknowledge callbacks we cannot process; Flutterwave retries
    // aggressively and the reconciler will catch up independently.
    console.error('Flutterwave webhook error:', error);
    return res.json({ success: true, ignored: true });
  }
}

/**
 * Reconciles live payments that have not received a usable webhook.
 * Safe to call repeatedly and from a timer; it never creates a payment link
 * and never marks an order paid without a fresh Flutterwave verification.
 */
let reconciling = false;
export async function reconcilePendingPayments({ maxAgeMs = 24 * 60 * 60 * 1000, limit = 25 } = {}) {
  if (reconciling) return { checked: 0, skipped: true };
  if (!isFlutterwaveConfigured()) return { checked: 0, skipped: true };

  reconciling = true;
  try {
    const orders = listOrdersByPaymentStatus(['processing'], {
      updatedSinceMs: Date.now() - maxAgeMs,
      limit,
    });
    let checked = 0;
    for (const order of orders) {
      if (!order.paymentReference) continue;
      try {
        await verifyPaymentForOrder(order, 'reconciler');
        checked += 1;
      } catch (error) {
        console.error(`Reconcile failed for ${order.orderNumber}:`, error.message);
      }
    }
    return { checked };
  } finally {
    reconciling = false;
  }
}

export function listAllOrders(req, res) {
  const orders = listStoredOrders(req.query.limit).map(publicOrder);
  return res.json({ success: true, orders });
}

function sendError(res, error) {
  const status = error.status || 500;
  if (status >= 500 && error.code !== 'PAYMENTS_NOT_CONFIGURED') {
    console.error('Order/payment error:', error);
  }
  return res.status(status).json({
    success: false,
    error: error.message || 'Something went wrong.',
    code: error.code || undefined,
    details: error.details || undefined,
  });
}
