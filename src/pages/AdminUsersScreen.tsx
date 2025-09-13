import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Search, 
  UserCheck, 
  UserX, 
  Filter, 
  MoreVertical, 
  Shield, 
  Mail,
  Phone,
  Calendar,
  AlertTriangle,
  ArrowLeft,
  Home,
  Flag
} from 'lucide-react';
import { User } from '../types/index';

const AdminUsersScreen: React.FC = () => {
  const { user: currentUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      console.log('[AdminUsersScreen] Début du chargement des utilisateurs');
      setLoading(true);
      
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[AdminUsersScreen] Erreur lors de la requête profiles:', error);
        throw error;
      }

      console.log('[AdminUsersScreen] Profils récupérés:', profiles?.length || 0);

      // Normaliser les données utilisateur
      const normalizedUsers = profiles?.map(profile => {
        const normalizedUser = {
          ...profile,
          user_type: profile.user_type?.toLowerCase() || 'client',
          is_disabled: profile.is_disabled || false
        };
        return normalizedUser;
      }) || [];

      console.log('[AdminUsersScreen] Utilisateurs normalisés:', normalizedUsers.length);
      setUsers(normalizedUsers);
    } catch (error) {
      console.error('[AdminUsersScreen] Erreur chargement utilisateurs:', error);
    } finally {
      setLoading(false);
      console.log('[AdminUsersScreen] Chargement des utilisateurs terminé');
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    console.log(`[AdminUsersScreen] Déclenchement de toggleUserStatus pour l'utilisateur ${userId}. Statut actuel : ${currentStatus}`);
    try {
      console.log(`[AdminUsersScreen] Tentative de ${currentStatus ? 'activation' : 'désactivation'} de l'utilisateur:`, userId);
      
      const { error } = await supabase
        .from('profiles')
        .update({ is_disabled: !currentStatus })
        .eq('id', userId);

      if (error) {
        console.error('[AdminUsersScreen] Erreur lors de la mise à jour du statut:', error);
        throw error;
      }

      console.log(`[AdminUsersScreen] Statut de l'utilisateur mis à jour avec succès: ${!currentStatus ? 'désactivé' : 'activé'}`);

      // Mettre à jour l'état local
      setUsers(users.map(u => {
        if (u.id === userId) {
          console.log(`[AdminUsersScreen] Mise à jour locale de l'utilisateur ${u.id} de ${u.is_disabled || false} à ${!currentStatus}`);
          return { ...u, is_disabled: !currentStatus };
        } else {
          return u;
        }
      }));
    } catch (error) {
      console.error('[AdminUsersScreen] Erreur mise à jour statut:', error);
      alert('Erreur lors de la mise à jour du statut utilisateur');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.phone && user.phone.includes(searchTerm));

    const matchesType = typeFilter === 'all' || user.user_type === typeFilter;
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && !user.is_disabled) ||
      (statusFilter === 'disabled' && user.is_disabled);

    return matchesSearch && matchesType && matchesStatus;
  });

  const getUserTypeColor = (type: string) => {
    switch (type) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'merchant':
        return 'bg-blue-100 text-blue-800';
      case 'client':
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  const getUserTypeLabel = (type: string) => {
    switch (type) {
      case 'admin':
        return 'Administrateur';
      case 'merchant':
        return 'Commerçant';
      case 'client':
      default:
        return 'Client';
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Accès non autorisé</h1>
          <p className="text-gray-600">Vous n'avez pas les droits d'administration.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* En-tête */}
        <div className="flex items-center mb-2">
          <button 
            onClick={() => navigate('/admin')} 
            className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Retour à l'administration"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des utilisateurs</h1>
        </div>
        <p className="text-gray-600 mb-2">Gérer les comptes utilisateurs</p>
        
        {/* Navigation entre les écrans d'administration */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button 
            onClick={() => navigate('/admin')} 
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Home className="w-4 h-4 mr-2" />
            Propriétés
          </button>
          <button 
            onClick={() => navigate('/admin/users')} 
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Users className="w-4 h-4 mr-2" />
            Utilisateurs
          </button>
          <button 
            onClick={() => navigate('/admin/reports')} 
            className="flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
          >
            <Flag className="w-4 h-4 mr-2" />
            Signalements
          </button>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{users.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Clients</p>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter(u => u.user_type === 'client').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Commerçants</p>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter(u => u.user_type === 'merchant').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <Shield className="w-8 h-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Admins</p>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter(u => u.user_type === 'admin').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtres et recherche */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Barre de recherche */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, email ou téléphone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                />
              </div>
            </div>

            {/* Filtre par type */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
            >
              <option value="all">Tous les types</option>
              <option value="client">Clients</option>
              <option value="merchant">Commerçants</option>
              <option value="admin">Administrateurs</option>
            </select>

            {/* Filtre par statut */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actifs</option>
              <option value="disabled">Désactivés</option>
            </select>
          </div>
        </div>

        {/* Liste des utilisateurs */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Utilisateur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Inscription
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                            <Users className="w-5 h-5 text-gray-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.full_name || 'Nom non renseigné'}
                            </div>
                            <div className="text-sm text-gray-500">{user.email || 'Email non renseigné'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getUserTypeColor(user.user_type)}`}>
                          {getUserTypeLabel(user.user_type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <Mail className="w-4 h-4 mr-1" />
                          {user.email || 'Email non renseigné'}
                        </div>
                        {user.phone && (
                          <div className="flex items-center mt-1">
                            <Phone className="w-4 h-4 mr-1" />
                            {user.phone}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Date inconnue'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.is_disabled 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {user.is_disabled ? 'Désactivé' : 'Actif'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => toggleUserStatus(user.id, user.is_disabled || false)}
                            className={`px-3 py-1 rounded text-xs ${
                              user.is_disabled
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'bg-red-600 text-white hover:bg-red-700'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                            disabled={user.id === currentUser?.id || user.user_type === 'admin'}
                          >
                            {user.is_disabled ? 'Activer' : 'Désactiver'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun utilisateur trouvé</h3>
                <p className="text-gray-600">Aucun utilisateur ne correspond aux critères de recherche.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsersScreen;
