import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import HomeScreen from './pages/HomeScreen';
import AuthScreen from './pages/AuthScreen';
import ProfileScreen from './pages/ProfileScreen';
import UserManagementScreen from './pages/UserManagementScreen';
import PropertyDetailsScreen from './pages/PropertyDetailsScreen';
import MessagesScreen from './pages/MessagesScreen';
import ChatScreen from './pages/ChatScreen';
import AdminScreen from './pages/AdminScreen';
import AdminUsersScreen from './pages/AdminUsersScreen';
import AdminReportsPage from './pages/Admin/AdminReportsPage';
import AdminSettingsScreen from './pages/AdminSettingsScreen';
import SettingsScreen from './pages/SettingsScreen';
import PersonalInfoScreen from './pages/PersonalInfoScreen';
import FavoritesScreen from './pages/FavoritesScreen';
const MyPropertiesScreen = lazy(() => import('./pages/MyPropertiesScreen'));
const AddPropertyScreen = lazy(() => import('./pages/AddPropertyScreen'));
const EditPropertyScreen = lazy(() => import('./pages/EditPropertyScreen'));
import './index.css';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/auth" replace />;
};

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    }>
      <Routes>
      <Route 
        path="/auth" 
        element={user ? <Navigate to="/" replace /> : <AuthScreen />} 
      />
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <HomeScreen />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/profile" 
        element={
          <ProtectedRoute>
            <ProfileScreen />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/users" 
        element={
          <ProtectedRoute>
            <UserManagementScreen />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/property/:id" 
        element={
          <ProtectedRoute>
            <PropertyDetailsScreen />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/messages" 
        element={
          <ProtectedRoute>
            <MessagesScreen />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/chat/:propertyId/:recipientId" 
        element={
          <ProtectedRoute>
            <ChatScreen />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute>
            <AdminScreen />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/users" 
        element={
          <ProtectedRoute>
            <AdminUsersScreen />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/reports" 
        element={
          <ProtectedRoute>
            <AdminReportsPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/settings" 
        element={
          <ProtectedRoute>
            <AdminSettingsScreen />
          </ProtectedRoute>
        } 
      />
      <Route path="/my-properties" element={<ProtectedRoute><MyPropertiesScreen /></ProtectedRoute>} />
      <Route path="/add-property" element={<ProtectedRoute><AddPropertyScreen /></ProtectedRoute>} />
      <Route path="/edit-property/:id" element={<ProtectedRoute><EditPropertyScreen /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsScreen /></ProtectedRoute>} />
      <Route path="/personal-info" element={<ProtectedRoute><PersonalInfoScreen /></ProtectedRoute>} />
      <Route path="/favorites" element={<ProtectedRoute><FavoritesScreen /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
