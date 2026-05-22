import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import AIStudio from './pages/AIStudio';
import Analytics from './pages/Analytics';
import AccountProfile from './pages/AccountProfile';
import StoreSettings from './pages/StoreSettings';
import Orders from './pages/Orders';
import Customers from './pages/Customers';

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="dashboard" element={<Navigate to="/" replace />} />
            <Route path="products" element={<Products />} />
            <Route path="add-product" element={<Products />} />
            <Route path="ai-studio" element={<Navigate to="/ai-insights" replace />} />
            <Route path="ai-insights" element={<AIStudio />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="orders" element={<Orders />} />
            <Route path="customers" element={<Customers />} />
            <Route path="profile" element={<AccountProfile />} />
            <Route path="settings" element={<StoreSettings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
