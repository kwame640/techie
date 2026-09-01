import { sampleOrders } from '../../data/marketplaceData';

export const OrderManagement = () => {
  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="text-2xl font-bold mb-6">Orders</h1>
      <div className="bg-white rounded-xl shadow-card">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-text-light">Order ID</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-text-light">Customer</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-text-light">Amount</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-text-light">Status</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-text-light">Date</th>
            </tr>
          </thead>
          <tbody>
            {sampleOrders.map((order) => (
              <tr key={order.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{order.id}</td>
                <td className="px-6 py-4">{order.customerName}</td>
                <td className="px-6 py-4 font-medium">GH₵{order.total}</td>
                <td className="px-6 py-4">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    order.orderStatus === 'new' ? 'bg-orange-100 text-orange-700' :
                    order.orderStatus === 'delivered' ? 'bg-green-100 text-green-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {order.orderStatus.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-text-light">
                  {new Date(order.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
