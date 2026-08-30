import React from 'react';
import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom';
import { ShopProvider } from './context/ShopContext';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Categories } from './components/Categories';
import { BestSellers } from './components/BestSellers';
import { PromoBanner } from './components/PromoBanner';
import { NewArrivals } from './components/NewArrivals';
import { Features } from './components/Features';
import { Reviews } from './components/Reviews';
import { Newsletter } from './components/Newsletter';
import { Footer } from './components/Footer';
import { ProductDetails } from './components/ProductDetails';
import { Cart } from './components/Cart';
import { Checkout } from './components/Checkout';
import { CategoryPage } from './components/CategoryPage';
import { AllProducts } from './components/AllProducts';
import { products } from './data/products';

function ProductPageWrapper() {
  const { id } = useParams<{ id: string }>();
  const product = products.find(p => p.id === id);
  
  if (!product) {
    return <div className="text-center py-20">Product not found</div>;
  }
  
  return <ProductDetails product={product} />;
}

function App() {
  return (
    <ShopProvider>
      <Router>
        <div className="min-h-screen bg-background">
          <Header />
          <main>
            <Routes>
              <Route path="/" element={
                <>
                  <Hero />
                  <Categories />
                  <BestSellers />
                  <PromoBanner />
                  <NewArrivals />
                  <Features />
                  <Reviews />
                  <Newsletter />
                </>
              } />
              <Route path="/products" element={<AllProducts />} />
              <Route path="/category/:category" element={<CategoryPage />} />
              <Route path="/product/:id" element={<ProductPageWrapper />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
            </Routes>
          </main>
          <Routes>
            <Route path="/" element={<Footer />} />
          </Routes>
        </div>
      </Router>
    </ShopProvider>
  );
}

export default App;
