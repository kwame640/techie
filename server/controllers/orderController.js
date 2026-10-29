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
  adminHubtelSettings,
  checkMobileMoneyStatus,
  callbackReference,
  getHubtelConfig,
  initiateMobileMoneyPayment,
  isHubtelConfigured,
  providerById,
  publicHubtelSettings,
  toLocalMsisdn,
} from '../services/hubtelService.js';

const MAX_ITEMS = 20;
const MAX_QUANTITY = 99;

// A wallet prompt usually lives for about two minutes. We never send a second
// prompt while Hubtel still reports the first one as outstanding, and we never
// send prompts closer together than this even after a definitive failure.
const PROMPT_RETRY_MS = 150 * 1000;
const PROMPT_MIN_INTERVAL_MS = 20 * 1000;
const MAX_PAYMENT_ATTEMPTS = 5;

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
    paymentPhone: order.paymentPhone || null,
    paymentReference: order.paymentReference || order.orderNumber || null,
    hubtelTransactionId: order.hubtelTransactionId || null,
    paymentPromptedAt: order.paymentPromptedAt || null,
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

    if (!isHubtelConfigured()) {
      throw httpError(
        503,
        'Mobile money payments are not set up yet. Please contact NKAY to complete this order.',
        'PAYMENTS_NOT_CONFIGURED',
        { missing: getHubtelConfig().missing }
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
      paymentChannel: 'mobile_money',
      paymentProvider: null,
      paymentPhone: null,
      paymentReference: null,
      paymentReferences: [],
      hubtelTransactionId: null,
      paymentPromptedAt: null,
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
  return res.json({ success: true, settings: publicHubtelSettings() });
}

export function getAdminPaymentSettings(_req, res) {
  return res.json({ success: true, settings: adminHubtelSettings() });
}

/**
 * Applies a Hubtel-confirmed paid result to an order.
 *
 * This function is deliberately synchronous: the final "is it paid?" check,
 * stock reservation and order write all happen in the same event-loop tick.
 * Two concurrent callbacks therefore cannot both decrement stock — the second
 * sees `paymentStatus: 'paid'` and returns without touching inventory.
 *
 * `verification` comes from checkMobileMoneyStatus(), never from a callback
 * body or the browser.
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
  const transactionId = verification.transactionId || current.hubtelTransactionId || null;
  const paidPesewas = Number.isFinite(verification.amountPesewas) ? verification.amountPesewas : null;
  const currency = String(verification.currency || '').toUpperCase();
  const expectedPesewas = Math.round(Number(current.totalPesewas) || 0);

  const mismatchReason = (() => {
    if (!(paidPesewas > 0)) {
      return 'Hubtel confirmed a payment but did not return a valid amount. Please contact NKAY support — do not pay again.';
    }
    if (currency !== 'GHS') {
      return `Hubtel confirmed a payment in ${currency || 'an unknown currency'} instead of GHS. Please contact NKAY support — do not pay again.`;
    }
    if (paidPesewas !== expectedPesewas) {
      return `Hubtel confirmed ${toGhs(paidPesewas)} but this order total is ${toGhs(expectedPesewas)}. Please contact NKAY support — do not pay again.`;
    }
    return '';
  })();

  if (mismatchReason) {
    const updated = updateOrder(current.id, {
      paymentStatus: 'attention',
      orderStatus: 'new',
      hubtelTransactionId: transactionId,
      amountPaidPesewas: paidPesewas || null,
      paymentCurrency: currency || null,
      paymentCheckedAt: nowIso,
      paymentVerifiedAt: nowIso,
      paymentVerifiedBy: actor,
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
      paymentStatus: 'attention',
      orderStatus: 'new',
      hubtelTransactionId: transactionId,
      amountPaidPesewas: paidPesewas,
      paymentCurrency: currency,
      paymentCheckedAt: nowIso,
      paymentVerifiedAt: nowIso,
      paymentVerifiedBy: actor,
      paidAt: nowIso,
      stockReservedAt: null,
      failureReason: reason,
    });
    return { order: updated, state: 'attention', message: reason };
  }

  const updated = updateOrder(current.id, {
    paymentStatus: 'paid',
    orderStatus: 'confirmed',
    hubtelTransactionId: transactionId,
    amountPaidPesewas: paidPesewas,
    paymentCurrency: currency,
    paymentCheckedAt: nowIso,
    paymentVerifiedAt: nowIso,
    paymentVerifiedBy: actor,
    paidAt: nowIso,
    stockReservedAt: nowIso,
    failureReason: null,
  });
  return { order: updated, state: 'paid', message: 'Payment confirmed.' };
}

/**
 * Re-queries Hubtel and records the authoritative result for an order.
 * Never trusts a callback payload, a browser flag, or a cached status.
 */
async function verifyPaymentForOrder(order, actor) {
  const reference = order.paymentReference || order.orderNumber;
  if (!reference) {
    return { order, state: 'pending', message: 'This order has no payment reference yet.' };
  }

  const verification = await checkMobileMoneyStatus({
    reference,
    transactionId: order.hubtelTransactionId,
  });

  if (!verification.ok) {
    if (verification.state === 'mismatch') {
      const reason = 'Hubtel returned payment details that do not match this order. Please contact NKAY support — do not pay again.';
      const updated = updateOrder(order.id, {
        paymentStatus: 'attention',
        paymentCheckedAt: new Date().toISOString(),
        failureReason: reason,
      });
      return { order: updated, state: 'attention', message: reason };
    }
    // Network/provider trouble is temporary: keep the order exactly as it is
    // and let the next poll or the reconciler try again.
    return {
      order,
      state: 'unavailable',
      message: 'We could not reach Hubtel to confirm this payment yet. This page will keep checking.',
    };
  }

  if (verification.state === 'paid') {
    return applyVerifiedPayment(order.id, verification, actor);
  }

  const nowIso = new Date().toISOString();

  if (verification.state === 'refunded') {
    const reason = 'Hubtel reports this payment was refunded. Contact NKAY support if you need help with this order.';
    const updated = updateOrder(order.id, {
      paymentStatus: 'failed',
      orderStatus: 'new',
      paymentCheckedAt: nowIso,
      failureReason: reason,
    });
    return { order: updated, state: 'failed', message: reason };
  }

  if (verification.state === 'failed') {
    const reason = 'The mobile money payment was not completed. You can try again with the button below.';
    const updated = updateOrder(order.id, {
      paymentStatus: 'failed',
      orderStatus: 'new',
      hubtelTransactionId: verification.transactionId || order.hubtelTransactionId || null,
      paymentCheckedAt: nowIso,
      failureReason: order.failureReason || reason,
    });
    return { order: updated, state: 'failed', message: updated.failureReason };
  }

  // Pending / unknown: Hubtel has not reached a final state. Record the check
  // so the UI and reconciler can see progress without changing the outcome.
  const updated = updateOrder(order.id, {
    paymentCheckedAt: nowIso,
    hubtelTransactionId: verification.transactionId || order.hubtelTransactionId || null,
  });
  return {
    order: updated,
    state: 'pending',
    message: 'Waiting for you to approve the prompt on your phone.',
  };
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
    if (!isHubtelConfigured()) {
      throw httpError(
        503,
        'Mobile money payments are not set up yet. Please contact NKAY to complete this order.',
        'PAYMENTS_NOT_CONFIGURED',
        { missing: getHubtelConfig().missing }
      );
    }

    const provider = providerById(req.body?.provider);
    if (!provider) {
      throw httpError(400, 'Choose the mobile money wallet you will pay from.', 'INVALID_PROVIDER', {
        provider: 'Choose MTN MoMo, Telecel Cash or AT Money.',
      });
    }

    const walletPhone = toLocalMsisdn(req.body?.phone || order.paymentPhone || order.customerPhone);
    if (!walletPhone) {
      throw httpError(400, 'Enter a valid Ghana mobile money number.', 'INVALID_PAYMENT_PHONE', {
        phone: 'Enter a valid Ghana mobile money number, e.g. 055 123 4567.',
      });
    }

    const now = Date.now();
    const attempts = Number(order.paymentAttempts) || 0;
    const promptedAt = order.paymentPromptedAt ? Date.parse(order.paymentPromptedAt) : 0;
    const reference = order.paymentReference || order.orderNumber;

    // Always ask Hubtel for the truth before prompting again. This prevents a
    // second charge when the first prompt was already approved.
    if (order.paymentStatus === 'processing' || order.paymentStatus === 'failed' || order.hubtelTransactionId) {
      const verification = await checkMobileMoneyStatus({
        reference,
        transactionId: order.hubtelTransactionId,
      });

      if (verification.ok && verification.state === 'paid') {
        const applied = applyVerifiedPayment(order.id, verification, 'hubtel');
        return res.json({
          success: true,
          order: publicOrder(applied.order),
          alreadyPaid: true,
          state: applied.state,
          message: applied.message,
        });
      }

      if (verification.ok && verification.state === 'pending' && now - promptedAt < PROMPT_RETRY_MS) {
        return res.status(409).json({
          success: false,
          error: 'A payment prompt is already waiting on your phone. Approve it, then check again.',
          code: 'PAYMENT_PROMPT_ACTIVE',
          order: publicOrder(order),
        });
      }
    }

    if (attempts >= MAX_PAYMENT_ATTEMPTS) {
      throw httpError(
        429,
        'Too many payment attempts for this order. Contact NKAY support with your order number.',
        'TOO_MANY_PAYMENT_ATTEMPTS'
      );
    }
    if (promptedAt && now - promptedAt < PROMPT_MIN_INTERVAL_MS) {
      const waitSec = Math.max(1, Math.ceil((PROMPT_MIN_INTERVAL_MS - (now - promptedAt)) / 1000));
      throw httpError(429, `Please wait ${waitSec} seconds before requesting another prompt.`, 'PAYMENT_PROMPT_COOLDOWN', {
        waitSec,
      });
    }

    const result = await initiateMobileMoneyPayment({
      orderNumber: reference,
      amountPesewas: order.totalPesewas,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: walletPhone,
      provider: provider.id,
      description: `NKAY order ${order.orderNumber}`,
    });

    const promptedIso = new Date().toISOString();

    if (result.state === 'rejected') {
      const updated = updateOrder(order.id, {
        paymentStatus: 'failed',
        paymentProvider: provider.id,
        paymentPhone: walletPhone,
        paymentAttempts: attempts + 1,
        paymentCheckedAt: promptedIso,
        failureReason: result.message || 'Hubtel declined the payment request.',
      });
      return res.json({
        success: true,
        order: publicOrder(updated),
        promptSent: false,
        state: 'failed',
        message: updated.failureReason,
      });
    }

    const uncertain = result.state !== 'accepted';
    const updated = updateOrder(order.id, {
      paymentStatus: 'processing',
      orderStatus: 'new',
      paymentProvider: provider.id,
      paymentPhone: walletPhone,
      hubtelTransactionId: result.transactionId || order.hubtelTransactionId || null,
      paymentPromptedAt: promptedIso,
      paymentAttempts: attempts + 1,
      paymentCheckedAt: promptedIso,
      failureReason: null,
    });

    return res.status(202).json({
      success: true,
      order: publicOrder(updated),
      promptSent: true,
      state: 'processing',
      uncertain,
      message: uncertain
        ? 'The request reached Hubtel but we did not get a confirmation. Check your phone and approve the prompt if it appears — do not pay twice.'
        : `Approve the ${provider.name} prompt on ${walletPhone}.`,
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
    if (!isHubtelConfigured()) {
      throw httpError(
        503,
        'Mobile money payments are not set up yet. Please contact NKAY to complete this order.',
        'PAYMENTS_NOT_CONFIGURED'
      );
    }

    const result = await verifyPaymentForOrder(order, 'hubtel');
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
    if (!isHubtelConfigured()) {
      throw httpError(
        503,
        'Hubtel is not configured on this server.',
        'PAYMENTS_NOT_CONFIGURED',
        { missing: getHubtelConfig().missing }
      );
    }

    const result = await verifyPaymentForOrder(order, req.adminEmail || 'admin');
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
 * Hubtel calls this after the customer approves or declines the prompt.
 * The payload is treated as a hint only: we look up the order by the
 * reference and re-query the status endpoint before changing anything.
 */
export async function handleHubtelCallback(req, res) {
  try {
    const config = getHubtelConfig();
    if (config.callbackToken) {
      const provided = String(req.query?.token || req.headers['x-hubtel-token'] || '').trim();
      if (provided !== config.callbackToken) {
        return res.status(401).json({ success: false, error: 'Invalid callback token.' });
      }
    }

    const reference =
      callbackReference(req.body) ||
      String(req.body?.ClientReference || req.body?.clientReference || req.body?.reference || '').trim();

    if (!reference) {
      return res.json({ success: true, ignored: true });
    }

    const order = getOrderByReference(reference);
    if (!order) {
      // Unknown reference: acknowledge so Hubtel does not keep retrying.
      return res.json({ success: true, ignored: true });
    }
    if (order.paymentStatus === 'paid') {
      return res.json({ success: true, alreadyPaid: true });
    }

    const result = await verifyPaymentForOrder(order, 'hubtel-callback');
    console.log(
      `Hubtel callback for ${order.orderNumber}: ${result.state}`
    );
    return res.json({ success: true, state: result.state, alreadyPaid: result.state === 'paid' });
  } catch (error) {
    // Always acknowledge callbacks we cannot process; Hubtel retries
    // aggressively and the reconciler will catch up independently.
    console.error('Hubtel callback error:', error);
    return res.json({ success: true, ignored: true });
  }
}

/**
 * Reconciles live payments that have not received a usable callback.
 * Safe to call repeatedly and from a timer; it never prompts a wallet and
 * never marks an order paid without a fresh Hubtel status check.
 */
let reconciling = false;
export async function reconcilePendingPayments({ maxAgeMs = 24 * 60 * 60 * 1000, limit = 25 } = {}) {
  if (reconciling) return { checked: 0, skipped: true };
  if (!isHubtelConfigured()) return { checked: 0, skipped: true };

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
