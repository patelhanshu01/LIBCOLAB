import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import axios from 'axios';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import LibrarianDashboard from './pages/LibrarianDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import ParentDashboard from './pages/ParentDashboard';
import BooksPage from './pages/BooksPage';
import CoursesPage, { CourseDetailPage } from './pages/CoursesPage';
import CertificatesPage from './pages/CertificatesPage';
import CartPage from './pages/CartPage';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on role
    switch (user.role) {
      case 'admin':
        return <Navigate to="/admin" replace />;
      case 'librarian':
        return <Navigate to="/librarian" replace />;
      case 'teacher':
        return <Navigate to="/teacher" replace />;
      case 'parent':
        return <Navigate to="/parent" replace />;
      default:
        return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
};

// Public Route (redirect if logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    switch (user.role) {
      case 'admin':
        return <Navigate to="/admin" replace />;
      case 'librarian':
        return <Navigate to="/librarian" replace />;
      case 'teacher':
        return <Navigate to="/teacher" replace />;
      case 'parent':
        return <Navigate to="/parent" replace />;
      default:
        return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
};

// Seed data on app load
const SeedData = () => {
  useEffect(() => {
    const seedDatabase = async () => {
      try {
        await axios.post(`${API}/seed`);
        console.log('Database seeded successfully');
      } catch (error) {
        // Ignore if already seeded
        if (!error.response?.data?.message?.includes('Already')) {
          console.log('Seed attempted:', error.response?.data?.message || 'Database ready');
        }
      }
    };
    seedDatabase();
  }, []);

  return null;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={
        <PublicRoute>
          <LandingPage />
        </PublicRoute>
      } />
      <Route path="/login" element={
        <PublicRoute>
          <LoginPage />
        </PublicRoute>
      } />
      <Route path="/register" element={
        <PublicRoute>
          <RegisterPage />
        </PublicRoute>
      } />

      {/* Books - Public but enhanced when logged in */}
      <Route path="/books" element={<BooksPage />} />

      {/* Student Routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute allowedRoles={['student']}>
          <StudentDashboard />
        </ProtectedRoute>
      } />
      <Route path="/courses" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'admin']}>
          <CoursesPage />
        </ProtectedRoute>
      } />
      <Route path="/courses/:courseId" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'admin']}>
          <CourseDetailPage />
        </ProtectedRoute>
      } />
      <Route path="/certificates" element={
        <ProtectedRoute allowedRoles={['student']}>
          <CertificatesPage />
        </ProtectedRoute>
      } />
      <Route path="/cart" element={
        <ProtectedRoute allowedRoles={['student']}>
          <CartPage />
        </ProtectedRoute>
      } />

      {/* Admin Routes */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminDashboard />
        </ProtectedRoute>
      } />
      <Route path="/admin/*" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminDashboard />
        </ProtectedRoute>
      } />

      {/* Librarian Routes */}
      <Route path="/librarian" element={
        <ProtectedRoute allowedRoles={['librarian']}>
          <LibrarianDashboard />
        </ProtectedRoute>
      } />
      <Route path="/librarian/*" element={
        <ProtectedRoute allowedRoles={['librarian']}>
          <LibrarianDashboard />
        </ProtectedRoute>
      } />

      {/* Teacher Routes */}
      <Route path="/teacher" element={
        <ProtectedRoute allowedRoles={['teacher']}>
          <TeacherDashboard />
        </ProtectedRoute>
      } />
      <Route path="/teacher/*" element={
        <ProtectedRoute allowedRoles={['teacher']}>
          <TeacherDashboard />
        </ProtectedRoute>
      } />

      {/* Parent Routes */}
      <Route path="/parent" element={
        <ProtectedRoute allowedRoles={['parent']}>
          <ParentDashboard />
        </ProtectedRoute>
      } />

      {/* Profile - accessible by all authenticated users */}
      <Route path="/profile" element={
        <ProtectedRoute>
          <StudentDashboard />
        </ProtectedRoute>
      } />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <SeedData />
          <AppRoutes />
          <Toaster 
            position="bottom-right" 
            richColors 
            closeButton
            toastOptions={{
              style: {
                fontFamily: 'Inter, sans-serif',
              },
            }}
          />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
