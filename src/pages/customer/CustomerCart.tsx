import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2, ShieldCheck } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { formatGhc } from '../../lib/utils';

export const CustomerCart = () => {
  const { cart, updateQuantity, removeFromCart, cartTotal, cartCount } = useShop();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#faf8f6] text-[#2d211b]">
      <header className="bg-white border-b border-[#eee5df]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-[68px] flex items-center justify-between">
          <Link to="/" className="text-sm font-semibold text-[#6f3d27] flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> NKAY Marketplace
          </Link>
          <Link to="/customer/orders" className="text-sm font-medium text-[#6f3d27] hover:underline">
            My orders
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-bold">Your cart</h1>
        <p className="text-sm text-[#806e64] mt-1">
          {cartCount} item{cartCount === 1 ? '' : 's'} ready for checkout.
        </p>

        {cart.length === 0 ? (
          <div className="mt-8 bg-white border border-[#eee5df] rounded-2xl p-8 text-center">
            <ShoppingBag className="w-10 h-10 mx-auto text-[#6f3d27]" />
            <h2 className="text-xl font-bold mt-4">Your cart is empty</h2>
            <p className="text-sm text-[#806e64] mt-1.5">Browse the marketplace and add something you like.</p>
            <Link
              to="/"
              className="inline-flex mt-6 bg-[#6f3d27] text-white rounded-xl px-5 py-3 font-semibold hover:bg-[#5d3524] transition"
            >
              Continue shopping
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid lg:grid-cols-[1fr_340px] gap-6 items-start">
            <section className="bg-white border border-[#eee5df] rounded-2xl divide-y divide-[#f1ebe7]">
              {cart.map((item) => (
                <div key={item.product.id} className="p-4 sm:p-5 flex gap-3 sm:gap-4">
                  <Link to={`/product/${item.product.id}`} className="shrink-0">
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover bg-[#f1e7e0]"
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/product/${item.product.id}`}
                      className="text-sm sm:text-base font-semibold leading-snug line-clamp-2 hover:text-[#6f3d27]"
                    >
                      {item.product.name}
                    </Link>
                    <p className="text-xs text-[#927f74] mt-1">
                      {item.product.category}
                      {item.selectedColor ? ` · ${item.selectedColor}` : ''}
                      {item.selectedSize ? ` · ${item.selectedSize}` : ''}
                    </p>
                    <p className="text-sm font-bold text-[#6f3d27] mt-1.5">
                      {formatGhc(item.product.price)}
                    </p>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="inline-flex items-center rounded-lg border border-[#e7ddd7]">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          aria-label="Decrease quantity"
                          className="w-9 h-9 flex items-center justify-center text-[#806e64] hover:text-[#6f3d27]"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          aria-label="Increase quantity"
                          disabled={item.quantity >= 99}
                          className="w-9 h-9 flex items-center justify-center text-[#806e64] hover:text-[#6f3d27] disabled:opacity-40"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#a08b80] hover:text-red-600 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>
                  </div>
                  <div className="text-right text-sm font-bold shrink-0">
                    {formatGhc(item.product.price * item.quantity)}
                  </div>
                </div>
              ))}
            </section>

            <aside className="bg-white border border-[#eee5df] rounded-2xl p-5 lg:sticky lg:top-24">
              <h2 className="text-lg font-bold">Order summary</h2>
              <div className="mt-4 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#927f74]">Subtotal</span>
                  <span>{formatGhc(cartTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#927f74]">Delivery fee</span>
                  <span className="text-[#927f74]">Calculated at checkout</span>
                </div>
                <div className="flex justify-between border-t border-[#f1ebe7] pt-3 text-base font-bold">
                  <span>Estimated total</span>
                  <span className="text-[#6f3d27]">{formatGhc(cartTotal)}</span>
                </div>
              </div>

              <button
                onClick={() => navigate('/customer/checkout')}
                className="mt-5 w-full rounded-xl bg-[#6f3d27] px-4 py-3.5 text-sm font-semibold text-white hover:bg-[#5d3524] transition"
              >
                Proceed to checkout
              </button>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-[#9a887d]">
                <ShieldCheck className="w-3.5 h-3.5" /> Final prices and stock are confirmed at checkout.
              </p>
              <Link
                to="/"
                className="mt-3 block text-center text-xs font-semibold text-[#6f3d27] hover:underline"
              >
                Continue shopping
              </Link>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
};
