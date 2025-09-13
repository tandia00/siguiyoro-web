import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { 
  Settings, 
  Save, 
  ArrowLeft, 
  Users, 
  CreditCard,
  AlertCircle,
  CheckCircle,
  BarChart3
} from 'lucide-react';

interface AdminSettings {
  id?: string;
  free_listings_limit: number;
  listing_price: number;
  created_at?: string;
  updated_at?: string;
}

const AdminSettingsScreen: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AdminSettings>({ free_listings_limit: 2, listing_price: 5000 });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    fetchSettings();
  }, [isAdmin, navigate]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('admin_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erreur lors de la récupération des paramètres:', error);
        setMessage({ type: 'error', text: 'Erreur lors du chargement des paramètres' });
      } else if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error('Erreur:', error);
      setMessage({ type: 'error', text: 'Erreur lors du chargement des paramètres' });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      setMessage(null);

      const { data: existingData } = await supabase
        .from('admin_settings')
        .select('id')
        .single();

      let result;
      if (existingData) {
        // Mise à jour
        result = await supabase
          .from('admin_settings')
          .update({
            free_listings_limit: settings.free_listings_limit,
            listing_price: settings.listing_price,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingData.id)
          .select()
          .single();
      } else {
        // Création
        result = await supabase
          .from('admin_settings')
          .insert({
            free_listings_limit: settings.free_listings_limit,
            listing_price: settings.listing_price,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
      }

      if (result.error) {
        throw result.error;
      }

      setSettings(result.data);
      setMessage({ type: 'success', text: 'Paramètres sauvegardés avec succès' });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      setMessage({ type: 'error', text: 'Erreur lors de la sauvegarde des paramètres' });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: 'free_listings_limit' | 'listing_price', value: string) => {
    const numValue = parseInt(value) || 0;
    if (field === 'free_listings_limit') {
      if (numValue >= 0 && numValue <= 100) {
        setSettings(prev => ({ ...prev, free_listings_limit: numValue }));
      }
    } else if (field === 'listing_price') {
      if (numValue >= 0 && numValue <= 1000000) {
        setSettings(prev => ({ ...prev, listing_price: numValue }));
      }
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/admin')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-3">
                <Settings className="w-8 h-8 text-green-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Paramètres Administrateur</h1>
                  <p className="text-gray-600">Configuration des limites et règles de l'application</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Message de feedback */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center space-x-3 ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600" />
            )}
            <span className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
              {message.text}
            </span>
          </div>
        )}

        {/* Configuration des annonces gratuites */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center space-x-3 mb-6">
            <CreditCard className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900">Gestion des Annonces Gratuites</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label htmlFor="free-listings" className="block text-sm font-medium text-gray-700 mb-2">
                Nombre d'annonces gratuites par utilisateur
              </label>
              <div className="flex items-center space-x-4">
                <input
                  id="free-listings"
                  type="number"
                  min="0"
                  max="100"
                  value={settings.free_listings_limit}
                  onChange={(e) => handleInputChange('free_listings_limit', e.target.value)}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  disabled={loading || saving}
                />
                <span className="text-sm text-gray-600">
                  annonces gratuites par utilisateur
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Après avoir atteint cette limite, les utilisateurs devront payer pour publier de nouvelles annonces.
              </p>
            </div>

            {/* Configuration du prix d'annonce */}
            <div>
              <label htmlFor="listing-price" className="block text-sm font-medium text-gray-700 mb-2">
                Prix d'une annonce payante (FCFA)
              </label>
              <div className="flex items-center space-x-4">
                <input
                  id="listing-price"
                  type="number"
                  min="0"
                  max="1000000"
                  value={settings.listing_price}
                  onChange={(e) => handleInputChange('listing_price', e.target.value)}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  disabled={loading || saving}
                />
                <span className="text-sm text-gray-600">
                  FCFA par annonce
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Prix que les utilisateurs devront payer pour publier une annonce après avoir dépassé leur limite gratuite.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Users className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-blue-900 mb-1">
                    Impact de ce paramètre
                  </h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Les utilisateurs peuvent publier {settings.free_listings_limit} annonce(s) gratuitement</li>
                    <li>• Les annonces supplémentaires coûteront {settings.listing_price.toLocaleString()} FCFA</li>
                    <li>• Ces paramètres s'appliquent à tous les nouveaux utilisateurs</li>
                    <li>• Les annonces existantes ne sont pas affectées</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={saveSettings}
                disabled={saving || loading}
                className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Statistiques actuelles */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-3 mb-4">
            <BarChart3 className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900">Statistiques</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900">
                {settings.free_listings_limit}
              </div>
              <div className="text-sm text-gray-600">
                Annonces gratuites autorisées
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-orange-600">
                {settings.listing_price.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">
                Prix par annonce (FCFA)
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">
                Actif
              </div>
              <div className="text-sm text-gray-600">
                Système de limitation
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">
                Global
              </div>
              <div className="text-sm text-gray-600">
                Application à tous les utilisateurs
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsScreen;
