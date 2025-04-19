import React, { createContext, useState, useContext, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Browse from './pages/Browse';
import MovieDetails from './pages/MovieDetails';
import TvShowDetails from './pages/TvShowDetails';
import Profile from './pages/Profile';
import Subscriptions from './pages/Subscriptions';
import NotFound from './pages/NotFound';

// Admin Pages
import AdminDashboard from './pages/Admin/Dashboard';
import AdminUsers from './pages/Admin/Users';
import AdminContent from './pages/Admin/Content';
import AdminSubscriptions from './pages/Admin/Subscriptions';
import AdminProfile from './pages/Admin/AdminProfile';

// Layout Components
import Navbar from './components/Layout/Navbar';
import Footer from './components/Layout/Footer';
import AdminSidebar from './components/Layout/AdminSidebar';

// Create a context for sidebar state
export const SidebarContext = createContext();

// SidebarProvider component
export const SidebarProvider = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <SidebarContext.Provider value={{ isCollapsed, toggleSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
};

// Custom hook to use sidebar context
export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

// Protected Routes Component
const ProtectedRoute = ({ children, requiredRoles = ['user', 'admin', 'superadmin'] }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  if (!requiredRoles.includes(user.role)) {
    return <Navigate to="/browse" />;
  }
  
  return children;
};

// Subscription Check Route
const SubscriptionRoute = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  // Allow admins and superadmins to access content without subscription
  if (user.role === 'admin' || user.role === 'superadmin') {
    return children;
  }
  
  // Regular users need EITHER a subscription OR an access code
  // Only redirect if they have neither
  if (user.hasSubscription === false && user.hasAccessCode === false) {
    return <Navigate to="/subscriptions" />;
  }
  
  return children;
};

// Admin Route Component
const AdminRoute = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { isCollapsed } = useSidebar();
  
  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  if (user.role !== 'admin' && user.role !== 'superadmin') {
    return <Navigate to="/browse" />;
  }
  
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex flex-grow">
        <AdminSidebar />
        <div className={`flex-1 transition-all duration-300 pt-14 ${isCollapsed ? 'ml-16' : 'ml-64'}`}>
          {children}
        </div>
      </div>
      <div className={`transition-all duration-300 ${isCollapsed ? 'ml-16' : 'ml-64'}`}>
        <Footer />
      </div>
    </div>
  );
};

// SuperAdmin Route Component - Only allows superadmins
const SuperAdminRoute = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { isCollapsed } = useSidebar();
  
  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  if (user.role !== 'superadmin') {
    return <Navigate to="/admin" />;
  }
  
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex flex-grow">
        <AdminSidebar />
        <div className={`flex-1 transition-all duration-300 pt-14 ${isCollapsed ? 'ml-16' : 'ml-64'}`}>
          {children}
        </div>
      </div>
      <div className={`transition-all duration-300 ${isCollapsed ? 'ml-16' : 'ml-64'}`}>
        <Footer />
      </div>
    </div>
  );
};

function App() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow pt-14">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            {/* Protected Routes */}
            <Route
              path="/browse"
              element={
                <ProtectedRoute>
                  <Browse />
                </ProtectedRoute>
              }
            />
            <Route
              path="/movie/:id"
              element={
                <SubscriptionRoute>
                  <MovieDetails />
                </SubscriptionRoute>
              }
            />
            <Route
              path="/tv/:id"
              element={
                <SubscriptionRoute>
                  <TvShowDetails />
                </SubscriptionRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route path="/subscriptions" element={<Subscriptions />} />
            
            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/profile"
              element={
                <AdminRoute>
                  <AdminProfile />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <SuperAdminRoute>
                  <AdminUsers />
                </SuperAdminRoute>
              }
            />
            <Route
              path="/admin/content"
              element={
                <AdminRoute>
                  <AdminContent />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/subscriptions"
              element={
                <AdminRoute>
                  <AdminSubscriptions />
                </AdminRoute>
              }
            />
            
            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        {/* Only render the Footer for non-admin routes */}
        <Routes>
          <Route path="/admin/*" element={null} />
          <Route path="*" element={<Footer />} />
        </Routes>
      </div>
    </SidebarProvider>
  );
}

export default App; 