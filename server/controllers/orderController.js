import {
  getCatalogueMeta,
  getProduct,
  getBusiness,
  getDeliveryFeePesewas,
  hydrateStock,
} from '../models/productCatalogModel.js';
import {
  createOrder as persistOrder,
  finalizePaidOrder,
  getOrderById,
  getOrderByPaymentToken,
  findByIdempotencyKey,
  getOrderByReference,
  orderStoreInfo,
  updateOrder,
  listOrders as listStoredOrders,
  listOrdersByPaymentStatus,
  newOrderId,
} from '../models/orderModel.js';
import {
  adminMoMoSettings,
  createRequestToPay,
  getMoMoConfig,
  isMoMoConfigured,
  publicMoMoSettings,
  queryTransaction,
  toMsisdn,
} from '../services/momoService.js';
import { randomBytes, randomUUID } from 'crypto';

const MAX_ITEMS = 20;
const MAX_QUANTITY = 99;

// MTN MoMo pushes a PIN prompt to the customer's phone. We reuse an
// outstanding request instead of sending a second prompt, and never send more
// than this many prompts for a single order.
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

export async function quoteOrder(req, res) {
  try {
    await hydrateStock();
    const items = normalizeItems(req.body?.items);
    const deliveryMethod = req.body?.deliveryMethod === 'pickup' ? 'pickup' : 'home';
    const quote = buildQuote(items, deliveryMethod);
    return res.json({ success: true, quote: publicQuote(quote, deliveryMethod) });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function createOrder(req, res) {
  try {
    const idempotencyKey = String(req.body?.idempotencyKey || '').trim();
    if (idempotencyKey) {
      const existing = await findByIdempotencyKey(idempotencyKey);
      if (existing) {
        return res.status(200).json({ success: true, order: publicOrder(existing), reused: true });
      }
    }

    if (!isMoMoConfigured()) {
      throw httpError(
        503,
        'Mobile money payments are not set up yet. Please contact NKAY to complete this order.',
        'PAYMENTS_NOT_CONFIGURED',
        { missing: getMoMoConfig().missing }
      );
    }

    // Fail closed on serverless: /tmp is not shared between instances and is
    // wiped on redeploy, so an order created there could disappear after the
    // customer has paid.
    const store = orderStoreInfo();
    if (process.env.VERCEL && !store.durable) {
      throw httpError(
        503,
        'Checkout is temporarily unavailable. Please contact NKAY to complete this order.',
        'ORDER_STORAGE_NOT_CONFIGURED',
        { storage: store.mode }
      );
    }

    await hydrateStock();
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

    const order = await persistOrder({
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
      paymentChannel: 'mtn_momo',
      paymentProvider: 'mtn_momo',
      paymentMethod: null,
      paymentPhone: null,
      paymentReference: null,
      paymentReferences: [],
      paymentToken: null,
      paymentTokens: [],
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

export async function getOrder(req, res) {
  const order = await getOrderById(String(req.params.id || ''));
  if (!order) {
    return res.status(404).json({ success: false, error: 'Order not found.', code: 'ORDER_NOT_FOUND' });
  }
  res.setHeader('Cache-Control', 'no-store');
  return res.json({ success: true, order: publicOrder(order) });
}

export async function listCustomerOrders(req, res) {
  // Orders are looked up by their unguessable ID (a capability token), which
  // lets guests see the orders they created without exposing other customers'
  // data by email.
  const ids = String(req.query.ids || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 50);
  const orders = (await Promise.all(ids.map((id) => getOrderById(id))))
    .filter(Boolean)
    .map(publicOrder);
  res.setHeader('Cache-Control', 'no-store');
  return res.json({ success: true, orders });
}

export function getPaymentSettings(_req, res) {
  return res.json({ success: true, settings: publicMoMoSettings() });
}

export function getAdminPaymentSettings(_req, res) {
  return res.json({ success: true, settings: adminMoMoSettings() });
}

function paymentReferenceMatches(order, reference) {
  const needle = String(reference || '').trim();
  if (!needle) return false;
  if (needle === order.orderNumber) return true;
  if (needle === order.paymentReference) return true;
  return Array.isArray(order.paymentReferences) && order.paymentReferences.includes(needle);
}

function paymentTokenMatches(order, token) {
  const needle = String(token || '').trim();
  if (!needle) return false;
  if (needle === order.paymentToken) return true;
  return Array.isArray(order.paymentTokens) && order.paymentTokens.includes(needle);
}

/**
 * Resolves the MTN reference id to query for this order.
 * A reference supplied by the browser/callback is only accepted when it
 * belongs to this order, so one customer can never trigger a lookup against
 * another.
 */
function resolvePaymentToken(order, suppliedToken) {
  const supplied = String(suppliedToken || '').trim();
  if (supplied) {
    if (!paymentTokenMatches(order, supplied)) {
      throw httpError(400, 'The payment token does not match this order.', 'PAYMENT_TOKEN_MISMATCH');
    }
    return supplied;
  }
  return String(order.paymentToken || '').trim();
}

/**
 * Applies an MTN-verified paid result to an order.
 *
 * The final "is it paid?" check, stock decrement and order write happen inside
 * one Firestore transaction (see finalizePaidOrder). Two callbacks arriving at
 * the same moment on different serverless instances therefore serialise: one
 * commits, the other sees `paymentStatus: 'paid'` and leaves inventory alone.
 *
 * `verification` comes from the MTN status API, never from a callback body,
 * the browser or a query string.
 */
async function applyVerifiedPayment(orderId, verification, actor) {
  const current = await getOrderById(orderId);
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
  const expectedCurrency = String(getMoMoConfig().currency || current.currency || 'GHS').toUpperCase();

  const mismatchReason = (() => {
    if (!(paidPesewas > 0)) {
      return 'MTN confirmed a payment but did not return a valid amount. Please contact NKAY support — do not pay again.';
    }
    if (currency !== expectedCurrency) {
      return `MTN confirmed a payment in ${currency || 'an unknown currency'} instead of ${expectedCurrency}. Please contact NKAY support — do not pay again.`;
    }
    if (paidPesewas !== expectedPesewas) {
      return `MTN confirmed ${toGhs(paidPesewas)} but this order total is ${toGhs(expectedPesewas)}. Please contact NKAY support — do not pay again.`;
    }
    return '';
  })();

  const paymentDetails = {
    paymentProvider: 'mtn_momo',
    paymentChannel: 'mtn_momo',
    paymentMethod: 'mtn_momo',
    paymentTransactionId: transactionId,
    paymentToken: verification.token || current.paymentToken || null,
    amountPaidPesewas: paidPesewas || null,
    paymentCurrency: currency || null,
    paymentCheckedAt: nowIso,
    paymentVerifiedAt: nowIso,
    paymentVerifiedBy: actor,
  };

  if (mismatchReason) {
    const updated = await updateOrder(current.id, {
      ...paymentDetails,
      paymentStatus: 'attention',
      orderStatus: 'new',
      failureReason: mismatchReason,
    });
    return { order: updated, state: 'attention', message: mismatchReason };
  }

  // The customer really did pay. Stock is only decremented now, and only once.
  const result = await finalizePaidOrder(current.id, paymentDetails, current.items || []);
  if (result.state === 'missing') {
    return { order: null, state: 'missing', message: 'Order not found.' };
  }
  if (result.state === 'already_paid') {
    return { order: result.order, state: 'paid', message: 'Payment was already confirmed.' };
  }
  if (result.state === 'attention') {
    return { order: result.order, state: 'attention', message: result.reason };
  }
  return { order: result.order, state: 'paid', message: 'Payment confirmed.' };
}

/**
 * Re-queries MTN and records the authoritative result for an order.
 * Never trusts a callback payload, the browser, or a query string.
 */
async function verifyPaymentForOrder(order, actor, { token } = {}) {
  const paymentToken = resolvePaymentToken(order, token);
  if (!paymentToken) {
    return {
      order,
      state: 'pending',
      message: 'This order has no payment request yet. Start the payment again.',
    };
  }

  const verification = await queryTransaction(paymentToken);

  if (!verification.ok) {
    if (verification.reason === 'not_configured') {
      return { order, state: 'unavailable', message: 'MTN Mobile Money is not configured on this server.' };
    }
    if (verification.reason === 'credentials') {
      return {
        order,
        state: 'unavailable',
        message: 'MTN rejected this server’s MoMo credentials. Contact NKAY support with your order number.',
      };
    }
    if (verification.reason === 'not_found') {
      return {
        order,
        state: 'pending',
        message: 'MTN has not registered this payment request yet. We will keep checking.',
      };
    }
    // Network/provider trouble is temporary: keep the order exactly as it is
    // and let the next poll or the reconciler try again.
    return {
      order,
      state: 'unavailable',
      message: 'We could not reach MTN to confirm this payment yet. This page will keep checking.',
    };
  }

  if (verification.token && !paymentTokenMatches(order, verification.token)) {
    const reason = 'MTN returned payment details for a different request. Please contact NKAY support — do not pay again.';
    const updated = await updateOrder(order.id, {
      paymentStatus: 'attention',
      paymentCheckedAt: new Date().toISOString(),
      failureReason: reason,
    });
    return { order: updated, state: 'attention', message: reason };
  }

  if (verification.orderReference && !paymentReferenceMatches(order, verification.orderReference)) {
    const reason = 'MTN returned payment details that do not match this order. Please contact NKAY support — do not pay again.';
    const updated = await updateOrder(order.id, {
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
    paymentProvider: 'mtn_momo',
    paymentChannel: 'mtn_momo',
    paymentMethod: 'mtn_momo',
    paymentTransactionId: verification.transactionId || order.paymentTransactionId || null,
    paymentToken: verification.token || order.paymentToken || null,
    paymentCheckedAt: nowIso,
  };

  if (verification.state === 'failed') {
    const reason = verification.resultText
      ? `MTN did not complete this payment (${verification.resultText}). You can try again — you have not been charged.`
      : 'The payment was not completed. You can try again — you have not been charged.';
    const updated = await updateOrder(order.id, {
      ...transactionDetails,
      paymentStatus: 'failed',
      orderStatus: 'new',
      failureReason: reason,
    });
    return { order: updated, state: 'failed', message: reason };
  }

  const expiresAt = order.paymentLinkExpiresAt ? Date.parse(order.paymentLinkExpiresAt) : 0;
  if (expiresAt && expiresAt < Date.now()) {
    const reason = 'The MTN MoMo payment request expired. You can start a new payment — you have not been charged.';
    const updated = await updateOrder(order.id, {
      ...transactionDetails,
      paymentStatus: 'failed',
      orderStatus: 'new',
      failureReason: reason,
    });
    return { order: updated, state: 'failed', message: reason };
  }

  // Pending or an unrecognised result: MTN has not reached a final state.
  // Record the check so the UI and reconciler can see progress without
  // changing the outcome.
  const updated = await updateOrder(order.id, transactionDetails);
  return {
    order: updated,
    state: 'pending',
    message: 'Waiting for you to approve the MTN MoMo prompt on your phone.',
  };
}

function newPaymentReference(orderNumber) {
  return `${orderNumber}-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`;
}

export async function initiateOrderPayment(req, res) {
  try {
    const order = await getOrderById(String(req.params.id || '').trim());
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
    if (!isMoMoConfigured()) {
      throw httpError(
        503,
        'Mobile money payments are not set up yet. Please contact NKAY to complete this order.',
        'PAYMENTS_NOT_CONFIGURED',
        { missing: getMoMoConfig().missing }
      );
    }

    const config = getMoMoConfig();
    const now = Date.now();
    const attempts = Number(order.paymentAttempts) || 0;
    const expiresAt = order.paymentLinkExpiresAt ? Date.parse(order.paymentLinkExpiresAt) : 0;
    const livePrompt = Boolean(
      order.paymentStatus === 'processing' &&
        order.paymentToken &&
        (!expiresAt || expiresAt > now)
    );

    // Reuse an outstanding prompt instead of sending a second one.
    if (livePrompt) {
      return res.json({
        success: true,
        order: publicOrder(order),
        state: 'processing',
        reused: true,
        paymentPhone: order.paymentPhone || toMsisdn(order.customerPhone),
        message: `A payment request is already waiting on ${order.paymentPhone || order.customerPhone}. Approve the MTN MoMo prompt on your phone.`,
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

    const payerPhone = toMsisdn(order.customerPhone);
    if (!/^233\d{9}$/.test(payerPhone)) {
      throw httpError(
        400,
        'Enter a valid Ghana MTN MoMo number on this order before paying.',
        'INVALID_PAYMENT_PHONE'
      );
    }

    const txRef = newPaymentReference(order.orderNumber);
    // The reference id is the MTN idempotency key. It is persisted BEFORE the
    // charge request so a retry after a lost response reuses it instead of
    // sending a second debit.
    const referenceId = randomUUID();
    const createdIso = new Date().toISOString();
    const promptMs = Math.max(5, Number(config.promptMinutes) || 10) * 60 * 1000;
    const previousReferences = Array.isArray(order.paymentReferences) ? order.paymentReferences : [];
    const previousTokens = Array.isArray(order.paymentTokens) ? order.paymentTokens : [];

    const updated = await updateOrder(order.id, {
      paymentStatus: 'processing',
      orderStatus: 'new',
      paymentProvider: 'mtn_momo',
      paymentChannel: 'mtn_momo',
      paymentMethod: 'mtn_momo',
      paymentPhone: payerPhone,
      paymentReference: txRef,
      paymentReferences: [...new Set([...previousReferences, txRef])],
      paymentToken: referenceId,
      paymentTokens: [...new Set([...previousTokens, referenceId])],
      paymentLink: null,
      paymentLinkCreatedAt: createdIso,
      paymentLinkExpiresAt: new Date(now + promptMs).toISOString(),
      paymentTransactionId: null,
      paymentCheckedAt: createdIso,
      paymentAttempts: attempts + 1,
      failureReason: null,
    });

    try {
      await createRequestToPay({
        referenceId,
        orderReference: txRef,
        amountPesewas: order.totalPesewas,
        currency: config.currency,
        customerPhone: payerPhone,
        orderNumber: order.orderNumber,
        description: `NKAY order ${order.orderNumber}`,
      });
    } catch (error) {
      // Definite rejections are recorded on the order. An ambiguous network or
      // provider failure stays `processing` so the status poll can still settle
      // the reference that MTN may have accepted.
      const ambiguous =
        error.code === 'PAYMENT_PROVIDER_UNREACHABLE' || error.code === 'PAYMENT_PROVIDER_ERROR';
      if (!ambiguous) {
        await updateOrder(order.id, {
          paymentStatus: 'failed',
          orderStatus: 'new',
          paymentCheckedAt: new Date().toISOString(),
          failureReason: error.message || 'MTN rejected the payment request.',
        });
      }
      throw error;
    }

    return res.status(201).json({
      success: true,
      order: publicOrder((await getOrderById(order.id)) || updated),
      paymentPhone: payerPhone,
      state: 'processing',
      message: `Payment request sent to ${payerPhone}. Approve the MTN MoMo prompt on your phone.`,
    });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function verifyOrderPayment(req, res) {
  try {
    const order = await getOrderById(String(req.params.id || '').trim());
    if (!order) {
      throw httpError(404, 'Order not found.', 'ORDER_NOT_FOUND');
    }
    if (order.paymentStatus === 'paid') {
      return res.json({ success: true, order: publicOrder(order), state: 'paid', message: 'Payment confirmed.' });
    }
    if (!isMoMoConfigured()) {
      throw httpError(
        503,
        'Mobile money payments are not set up yet. Please contact NKAY to complete this order.',
        'PAYMENTS_NOT_CONFIGURED'
      );
    }

    const token = String(req.body?.token || '').trim();
    const result = await verifyPaymentForOrder(order, 'mtn-momo', { token });
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
    const order = await getOrderById(String(req.params.id || '').trim());
    if (!order) {
      throw httpError(404, 'Order not found.', 'ORDER_NOT_FOUND');
    }
    if (!isMoMoConfigured()) {
      throw httpError(
        503,
        'MTN Mobile Money is not configured on this server.',
        'PAYMENTS_NOT_CONFIGURED',
        { missing: getMoMoConfig().missing }
      );
    }

    const token = String(req.body?.token || '').trim();
    const result = await verifyPaymentForOrder(order, req.adminEmail || 'admin', { token });
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
 * MTN calls this URL after a payment attempt when a callback host is
 * registered. The payload is treated as a hint only: it is unsigned, so we
 * look up the order and then re-query MTN's status API before changing
 * anything.
 */
export async function handleMoMoCallback(req, res) {
  try {
    const referenceId = String(
      req.body?.referenceId ||
        req.body?.reference_id ||
        req.query?.referenceId ||
        req.query?.reference_id ||
        ''
    ).trim();
    const reference = String(
      req.body?.externalId ||
        req.body?.external_id ||
        req.query?.externalId ||
        req.query?.external_id ||
        ''
    ).trim();

    if (!referenceId && !reference) {
      return res.json({ success: true, ignored: true });
    }

    const order =
      (referenceId ? await getOrderByPaymentToken(referenceId) : null) ||
      (reference ? await getOrderByReference(reference) : null);
    if (!order) {
      // Unknown reference: acknowledge so MTN does not keep retrying.
      return res.json({ success: true, ignored: true });
    }
    if (order.paymentStatus === 'paid') {
      return res.json({ success: true, alreadyPaid: true });
    }

    // Only query with a reference we know belongs to this order; otherwise
    // fall back to the order's own latest reference.
    const usableReference =
      referenceId && paymentTokenMatches(order, referenceId) ? referenceId : undefined;
    const result = await verifyPaymentForOrder(order, 'mtn-callback', { token: usableReference });
    console.log(`MTN MoMo callback for ${order.orderNumber}: ${result.state}`);
    return res.json({ success: true, state: result.state, alreadyPaid: result.state === 'paid' });
  } catch (error) {
    // Always acknowledge callbacks we cannot process; MTN retries and the
    // reconciler / page poll will catch up independently.
    console.error('MTN MoMo callback error:', error);
    return res.json({ success: true, ignored: true });
  }
}

/**
 * Reconciles live payments that have not received a usable callback.
 * Safe to call repeatedly and from a timer; it never sends a new prompt and
 * never marks an order paid without a fresh MTN status query.
 */
let reconciling = false;
export async function reconcilePendingPayments({ maxAgeMs = 24 * 60 * 60 * 1000, limit = 25 } = {}) {
  if (reconciling) return { checked: 0, skipped: true };
  if (!isMoMoConfigured()) return { checked: 0, skipped: true };

  reconciling = true;
  try {
    const orders = await listOrdersByPaymentStatus(['processing'], {
      updatedSinceMs: Date.now() - maxAgeMs,
      limit,
    });
    let checked = 0;
    for (const order of orders) {
      if (!order.paymentToken) continue;
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

export async function listAllOrders(req, res) {
  const orders = (await listStoredOrders(req.query.limit)).map(publicOrder);
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
