import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const MyStore = () => {
  const { business } = useAuth();

  if (!business) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="text-2xl font-bold mb-6">My Store</h1>
      <div className="bg-white rounded-xl p-6 shadow-card">
        <h2 className="text-xl font-semibold mb-4">{business.name}</h2>
        <p className="text-text-light mb-4">{business.description}</p>
        <div className="flex gap-3">
          <Link to="/business/store" className="px-4 py-2 bg-primary text-white rounded-lg">View Store</Link>
          <button className="px-4 py-2 border border-gray-200 rounded-lg">Edit Store</button>
        </div>
      </div>
    </div>
  );
};
