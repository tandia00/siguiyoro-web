import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase'; // Correction du chemin
import { MdPalette, MdNotifications, MdAccountBalanceWallet, MdDeleteForever, MdLogout, MdInfo, MdChevronRight } from 'react-icons/md';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';

export default function SettingsScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { permission, requestPermission, isSupported } = useNotifications();

  const getPermissionText = () => {
    if (!isSupported) return 'Non supportées';
    switch (permission) {
      case 'granted': return 'Activées';
      case 'denied': return 'Bloquées';
      default: return 'Désactivées';
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.')) {
      if (!user) {
        alert('Utilisateur non trouvé.');
        return;
      }
      try {
        // La suppression en cascade devrait être configurée dans Supabase
        // pour simplifier ce processus. Pour l'instant, nous ne supprimons
        // que le profil et laissons Supabase Auth gérer la suppression de l'utilisateur.
        const { error: profileError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', user.id);

        if (profileError) throw profileError;

        // La fonction admin pour supprimer l'utilisateur n'est pas directement accessible côté client.
        // La meilleure pratique est de créer une fonction Edge Supabase pour gérer cela.
        // Pour l'instant, on se contente de déconnecter l'utilisateur.
        alert('Votre compte a été supprimé.');
        await supabase.auth.signOut();
        navigate('/auth');

      } catch (error: any) {
        console.error('Erreur lors de la suppression du compte:', error);
        alert(`Une erreur est survenue: ${error.message}`);
      }
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/auth');
    } catch (error: any) {
      alert(`Erreur lors de la déconnexion: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <main className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Paramètres</h1>

        {/* Section Apparence */}
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Apparence</h2>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 flex justify-between items-center border-b border-gray-200">
              <div className="flex items-center">
                <MdPalette className="h-6 w-6 text-gray-500 mr-4" />
                <div>
                  <p className="font-medium">Thème</p>
                  <p className="text-sm text-gray-500">Système</p>
                </div>
              </div>
              <MdChevronRight className="h-6 w-6 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Section Notifications */}
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Notifications</h2>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 flex justify-between items-center">
              <div className="flex items-center">
                <MdNotifications className="h-6 w-6 text-gray-500 mr-4" />
                <div>
                  <p className="font-medium">Notifications push</p>
                  <p className="text-sm text-gray-500">{getPermissionText()}</p>
                </div>
              </div>
              <label htmlFor="notifications-switch" className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  id="notifications-switch"
                  className="sr-only peer"
                  checked={permission === 'granted'}
                  onChange={requestPermission}
                  disabled={!isSupported || permission === 'denied'}
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-green-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Section Compte */}
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Compte</h2>
          <div className="bg-white rounded-lg shadow overflow-hidden">
             <button onClick={() => navigate('/personal-info')} className="w-full text-left p-4 flex justify-between items-center border-b border-gray-200 hover:bg-gray-50">
              <div className="flex items-center">
                <MdAccountBalanceWallet className="h-6 w-6 text-gray-500 mr-4" />
                <p className="font-medium">Informations personnelles</p>
              </div>
              <MdChevronRight className="h-6 w-6 text-gray-400" />
            </button>
            <button onClick={handleDeleteAccount} className="w-full text-left p-4 flex items-center border-b border-gray-200 hover:bg-gray-50">
              <MdDeleteForever className="h-6 w-6 text-red-500 mr-4" />
              <p className="font-medium text-red-600">Supprimer le compte</p>
            </button>
            <button onClick={handleSignOut} className="w-full text-left p-4 flex items-center hover:bg-gray-50">
              <MdLogout className="h-6 w-6 text-red-500 mr-4" />
              <p className="font-medium text-red-600">Se déconnecter</p>
            </button>
          </div>
        </div>

        {/* Section À propos */}
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">À propos</h2>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 flex justify-between items-center">
                <div className="flex items-center">
                  <MdInfo className="h-6 w-6 text-gray-500 mr-4" />
                  <div>
                    <p className="font-medium">Version de l'application</p>
                    <p className="text-sm text-gray-500">1.0.0 (Web)</p>
                  </div>
                </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
