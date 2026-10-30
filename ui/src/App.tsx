import { Route, Routes } from "react-router-dom";
import Layout from "./components/layout/Layout";
import Home from "./pages/Home";
import Products from "./pages/Products";
import Contact from "./pages/Contact";
import Placeholder from "./pages/Placeholder";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import RefundPolicy from "./pages/RefundPolicy";
import ShippingPolicy from "./pages/ShippingPolicy";
import TermsOfService from "./pages/TermsOfService";
import Account from "./pages/Account";
import Admin from "./pages/Admin";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import About from "./pages/About";
import ProductDetails from "./pages/ProductDetails";
import TrackOrder from "./pages/TrackOrder";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="products" element={<Products />} />
        <Route path="contact" element={<Contact />} />
        <Route path="account" element={<Account />} />
        <Route path="admin" element={<Admin />} />
        <Route path="cart" element={<Cart />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="track-order" element={<TrackOrder />} />
        <Route path="about" element={<About />} />
        <Route path="products/:slug" element={<ProductDetails />} />
        <Route path="policies/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="policies/refund-policy" element={<RefundPolicy />} />
        <Route path="policies/return-policy" element={<RefundPolicy />} />
        <Route path="policies/shipping-policy" element={<ShippingPolicy />} />
        <Route path="policies/terms-of-service" element={<TermsOfService />} />
        <Route path="policies/:slug" element={<Placeholder title="Policy" />} />
        <Route path="*" element={<Placeholder title="Page not found" />} />
      </Route>
    </Routes>
  );
}
