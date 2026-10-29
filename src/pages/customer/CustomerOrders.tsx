import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Loader2,
  Package,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';
import { ApiError, apiRequest, formatGhs } from '../../lib/api';
import { getRememberedOrderIds } from '../../lib/orders';
import type { OrderView } from '../../types/orders';

function badge(order: OrderView) {
  if (order.paymentStatus === 'paid') {
    return { label: 'Paid', className: 'bg-green-100 text-green-700' };
  }
  if (order.paymentStatus === 'processing') {
    return { label: 'Approve on your phone', className: 'bg-blue-100 text-blue-700' };
  }
  if (order.paymentStatus === 'attention') {
    return { label: 'Needs attention', className: 'bg-red-100 text-red-700' };
  }
  if (order.paymentStatus === 'failed') {
    return order.orderStatus === 'cancelled'
      ? { label: 'Cancelled', className: 'bg-gray-100 text-gray-600' }
      : { label: 'Payment not confirmed', className: 'bg-red-100 text-red-700' };
  }
  return { label: 'Awaiting payment', className: 'bg-amber-100 text-amber-700' };
}

export const CustomerOrders = () => {
  const [orders, setOrders] = useState<OrderView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const ids = getRememberedOrderIds();
    if (!ids.length) {
      setOrders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<{ orders: OrderView[] }>(
        `/api/orders?ids=${encodeURIComponent(ids.join(','))}`
      );
      setOrders(data.orders);
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : 'Could not load your orders.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-screen bg-[#faf8f6] text-[#2d211b]">
      <header className="bg-white border-b border-[#eee5df]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-[68px] flex items-center justify-between">
          <Link to="/" className="text-sm font-semibold text-[#6f3d27]">
            NKAY Marketplace
          </Link>
          <Link to="/customer/cart" className="text-sm font-medium text-[#6f3d27] hover:underline">
            Cart
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">My orders</h1>
            <p className="text-sm text-[#806e64] mt-1">Orders placed on this device are listed here.</p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-[#e0d3ca] bg-white px-3 py-2 text-sm font-semibold text-[#6f3d27] hover:bg-[#fbf5f1] transition disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </button>
        </div>

        {loading && !orders.length && (
          <div className="mt-10 flex items-center justify-center gap-2 text-sm text-[#927f74]">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading your orders…
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 flex gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className="mt-10 bg-white border border-[#eee5df] rounded-2xl p-8 text-center">
            <ShoppingBag className="w-10 h-10 mx-auto text-[#6f3d27]" />
            <h2 className="text-xl font-bold mt-4">No orders yet</h2>
            <p className="text-sm text-[#806e64] mt-1.5">
              When you buy something, your orders will show up here with their payment status.
            </p>
            <Link
              to="/"
              className="inline-flex mt-6 bg-[#6f3d27] text-white rounded-xl px-5 py-3 font-semibold hover:bg-[#5d3524] transition"
            >
              Start shopping
            </Link>
          </div>
        )}

        {orders.length > 0 && (
          <div className="mt-6 space-y-3">
            {orders.map((order) => {
              const status = badge(order);
              const count = order.items.reduce((sum, item) => sum + item.quantity, 0);
              return (
                <Link
                  key={order.id}
                  to={`/order/${order.id}`}
                  className="block bg-white border border-[#eee5df] rounded-2xl p-4 sm:p-5 hover:border-[#c9b3a7] hover:shadow-sm transition"
                >
                  <div className="flex flex-wrap items-center gap-2 justify-between">
                    <div className="flex items-center gap-2.5">
                      <Package className="w-4 h-4 text-[#6f3d27]" />
                      <span className="font-semibold text-sm">{order.orderNumber}</span>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${status.className}`}>
                        {status.label}
                      </span>
                    </div>
                    <span className="text-xs text-[#927f74]">
                      {new Date(order.createdAt).toLocaleDateString('en-GH', { dateStyle: 'medium' })}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    {order.items.slice(0, 4).map((item) => (
                      <img
                        key={item.productId}
                        src={item.image}
                        alt={item.name}
                        className="w-12 h-12 rounded-lg object-cover bg-[#f1e7e0]"
                      />
                    ))}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate">{order.items.map((item) => item.name).join(', ')}</p>
                      <p className="text-xs text-[#927f74] mt-0.5">
                        {count} item{count === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-[#6f3d27]">{formatGhs(order.total)}</p>
                      <span className="text-xs text-[#6f3d27] inline-flex items-center gap-0.5">
                        View <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
