import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import { 
  User, 
  CreditCard, 
  Settings, 
  Plus, 
  Heart, 
  Home, 
  History, 
  Shield,
  LogOut,
  ChevronRight
} from 'lucide-react';

interface MenuOption {
  title: string;
  subtitle: string;
  icon: React.ComponentType<any>;
  onPress: () => void;
  badge?: number;
}

const ProfileScreen: React.FC = () => {
  const { user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
    const [hasProperties, setHasProperties] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;

    try {

      // Vérifier si l'utilisateur a des propriétés
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (!propertiesError) {
        setHasProperties(propertiesData && propertiesData.length > 0);
      }


    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const menuOptions: MenuOption[] = [
    {
      title: 'Informations personnelles',
      subtitle: user?.full_name || 'Non renseigné',
      icon: User,
      onPress: () => navigate('/personal-info')
    },
    {
      title: 'Moyen de paiement',
      subtitle: 'Gérer vos moyens de paiement',
      icon: CreditCard,
      onPress: () => navigate('/payment-methods')
    },
    ...(isAdmin ? [{
      title: 'Administration',
      subtitle: 'Gérer les annonces et les utilisateurs',
      icon: Shield,
      onPress: () => navigate('/admin')
    }] : []),
    {
      title: 'Paramètres',
      subtitle: 'Préférences de l\'application',
      icon: Settings,
      onPress: () => navigate('/settings')
    },
    {
      title: 'Ajouter une annonce',
      subtitle: 'Publier un nouveau bien',
      icon: Plus,
      onPress: () => navigate('/add-property')
    },
    {
      title: 'Mes favoris',
      subtitle: 'Biens sauvegardés',
      icon: Heart,
      onPress: () => navigate('/favorites')
    },
    ...(hasProperties ? [{
      title: 'Mes annonces',
      subtitle: 'Gérer mes biens',
      icon: Home,
      onPress: () => navigate('/my-properties')
    }] : []),
    {
      title: 'Historique de recherche',
      subtitle: 'Vos recherches récentes',
      icon: History,
      onPress: () => navigate('/search-history')
    }
  ];

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {user?.full_name || 'Utilisateur'}
              </h1>
              <p className="text-gray-600">{user?.email}</p>
              <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full mt-1 capitalize">
                {user?.user_type}
              </span>
            </div>
          </div>
        </div>

        {/* Menu Options */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {menuOptions.map((option, index) => {
            const IconComponent = option.icon;
            return (
              <button
                key={index}
                onClick={option.onPress}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <IconComponent className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-medium text-gray-900">{option.title}</h3>
                    <p className="text-sm text-gray-500">{option.subtitle}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {option.badge && (
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      {option.badge}
                    </span>
                  )}
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Logout Button */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center space-x-2 p-4 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Se déconnecter</span>
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default ProfileScreen;
