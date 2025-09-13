import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { 
  Flag, 
  User as UserIcon, 
  Calendar, 
  MessageSquare, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Eye,
  ArrowLeft,
  Home,
  Users,
  Trash2 // Ajout de l'icône de corbeille
} from 'lucide-react';
import { Report, User } from '../../types/index';

const AdminReportsPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);


  useEffect(() => {
    if (isAdmin) {
      fetchReports();
    }
  }, [isAdmin, statusFilter]);


  const fetchReports = async () => {
    try {
      console.log('[AdminReportsScreen] Début du chargement des signalements, filtre:', statusFilter);
      setLoading(true);
      
      // Vérifier d'abord si la table user_reports existe
      const { error: tableCheckError } = await supabase
        .from('user_reports')
        .select('id')
        .limit(1);

      if (tableCheckError) {
        console.error('[AdminReportsScreen] Erreur lors de la vérification de la table user_reports:', tableCheckError);
        console.log('[AdminReportsScreen] La table user_reports n\'existe peut-être pas encore');
        setReports([]);
        return;
      }

      console.log('[AdminReportsScreen] Table user_reports vérifiée, chargement des données');
      
      // Essayer une requête simplifiée sans les jointures
      const { data: reportsData, error } = await supabase
        .from('user_reports')
        .select('*')
        .eq('status', statusFilter)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[AdminReportsScreen] Erreur lors du chargement des signalements:', error);
        throw error;
      }

      console.log('[AdminReportsScreen] Signalements récupérés:', reportsData?.length || 0);
      
      // Charger les informations utilisateur séparément pour chaque signalement
      const enrichedReports = await Promise.all((reportsData || []).map(async (report: any) => {
        try {
          // Fonction utilitaire pour récupérer un profil avec gestion d'erreur
          const fetchProfile = async (userId: string) => {
            if (!userId) return { id: '', email: 'ID manquant', full_name: 'ID manquant' };
            try {
              const { data, error } = await supabase
                .from('profiles')
                .select('id, email, full_name')
                .eq('id', userId)
                .single();
              
              if (error) {
                // Si l'erreur est que le profil n'existe pas, c'est normal.
                if (error.code !== 'PGRST116') {
                  console.warn(`[AdminReportsScreen] Erreur lors de la récupération du profil ${userId}:`, error);
                }
                return { id: userId, email: 'Utilisateur inconnu', full_name: 'Utilisateur supprimé' };
              }
              return data;
            } catch (error) {
              console.error(`[AdminReportsScreen] Erreur critique lors de la récupération du profil ${userId}:`, error);
              return { id: userId, email: 'Erreur de chargement', full_name: 'Erreur de chargement' };
            }
          };

          // Récupérer les informations du signaleur
          const reporterData = await fetchProfile(report.reporter_id);
          
          // Récupérer les informations de l'utilisateur signalé
          const reportedData = await fetchProfile(report.reported_user_id);

          return {
            ...report,
            reporter: reporterData || undefined,
            reported: reportedData || undefined
          };
        } catch (err) {
          console.error('[AdminReportsScreen] Erreur lors de l\'enrichissement des données pour le signalement', report.id, err);
          return report;
        }
      }));

      console.log('[AdminReportsScreen] Signalements enrichis avec les données utilisateur');
      setReports(enrichedReports);
    } catch (error) {
      console.error('[AdminReportsScreen] Erreur chargement signalements:', error);
      // Si la table n'existe pas encore, on affiche une liste vide
      setReports([]);
    } finally {
      setLoading(false);
      console.log('[AdminReportsScreen] Chargement des signalements terminé');
    }
  };

  const updateReportStatus = async (reportId: string, status: 'resolved' | 'dismissed') => {
    try {
      console.log(`[AdminReportsScreen] Mise à jour du signalement ${reportId} vers le statut ${status}`);
      
      const { error } = await supabase
        .from('user_reports')
        .update({ status })
        .eq('id', reportId);

      if (error) {
        console.error('Erreur lors de la mise à jour du signalement:', error);
        alert('Une erreur est survenue lors de la mise à jour du signalement');
        return;
      }

      // Mettre à jour la liste des signalements
      setReports(prevReports => 
        prevReports.map(report => 
          report.id === reportId ? { ...report, status } : report
        )
      );

      // Si un signalement est sélectionné, le mettre à jour également
      if (selectedReport?.id === reportId) {
        setSelectedReport((prev: Report | null) => prev ? { ...prev, status } : null);
      }

      console.log(`[AdminReportsScreen] Signalement ${reportId} mis à jour avec succès`);
    } catch (error) {
      console.error('Erreur inattendue:', error);
      alert('Une erreur inattendue est survenue');
    }
  };

  const deleteReport = async (reportId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer définitivement ce signalement ? Cette action est irréversible.')) {
      return;
    }

    try {
      console.log(`[AdminReportsScreen] Suppression du signalement ${reportId}`);
      
      const { error } = await supabase
        .from('user_reports')
        .delete()
        .eq('id', reportId);

      if (error) {
        console.error('Erreur lors de la suppression du signalement:', error);
        alert('Une erreur est survenue lors de la suppression du signalement');
        return;
      }

      // Mettre à jour la liste des signalements
      setReports(prevReports => prevReports.filter(report => report.id !== reportId));

      // Fermer la modale si le signalement supprimé est celui qui est sélectionné
      if (selectedReport?.id === reportId) {
        setShowDetailModal(false);
        setSelectedReport(null);
      }

      console.log(`[AdminReportsScreen] Signalement ${reportId} supprimé avec succès`);
      alert('Le signalement a été supprimé avec succès');
    } catch (error) {
      console.error('Erreur inattendue lors de la suppression:', error);
      alert('Une erreur inattendue est survenue lors de la suppression');
    }
  };

  const getReasonLabel = (reason: string) => {
    const reasons: { [key: string]: string } = {
      'spam': 'Spam',
      'harassment': 'Harcèlement',
      'inappropriate': 'Contenu inapproprié',
      'fake': 'Faux profil',
      'scam': 'Arnaque',
      'other': 'Autre'
    };
    return reasons[reason] || reason;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'dismissed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'En attente';
      case 'resolved':
        return 'Résolu';
      case 'dismissed':
        return 'Rejeté';
      default:
        return status;
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
          <h1 className="text-3xl font-bold text-gray-900">Gestion des signalements</h1>
        </div>
        <p className="text-gray-600 mb-2">Gérer les signalements d'utilisateurs</p>
        
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <Flag className="w-8 h-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">En attente</p>
                <p className="text-2xl font-bold text-gray-900">
                  {reports.filter(r => r.status === 'pending').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Résolus</p>
                <p className="text-2xl font-bold text-gray-900">
                  {reports.filter(r => r.status === 'resolved').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <XCircle className="w-8 h-8 text-gray-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Rejetés</p>
                <p className="text-2xl font-bold text-gray-900">
                  {reports.filter(r => r.status === 'dismissed').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setStatusFilter('pending')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  statusFilter === 'pending'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                En attente
              </button>
              <button
                onClick={() => setStatusFilter('resolved')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  statusFilter === 'resolved'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Résolus
              </button>
              <button
                onClick={() => setStatusFilter('dismissed')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  statusFilter === 'dismissed'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Rejetés
              </button>
            </nav>
          </div>
        </div>

        {/* Liste des signalements */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {reports.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Signalement
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Signalé par
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Utilisateur signalé
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
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
                    {reports.map((report) => (
                      <tr key={report.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {getReasonLabel(report.reason)}
                            </div>
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {report.description}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <UserIcon className="w-5 h-5 text-gray-400 mr-2" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {report.reporter?.full_name || 'Utilisateur inconnu'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {report.reporter?.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <UserIcon className="w-5 h-5 text-gray-400 mr-2" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {report.reported?.full_name || 'Utilisateur inconnu'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {report.reported?.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {new Date(report.created_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(report.status)}`}>
                            {getStatusLabel(report.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setSelectedReport(report);
                                setShowDetailModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-900 flex items-center"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Voir
                            </button>
                            {statusFilter === 'pending' && (
                              <>
                                <button
                                  onClick={() => updateReportStatus(report.id, 'resolved')}
                                  className="text-green-600 hover:text-green-900 flex items-center"
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Résoudre
                                </button>
                                <button
                                  onClick={() => updateReportStatus(report.id, 'dismissed')}
                                  className="text-gray-600 hover:text-gray-900 flex items-center"
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Rejeter
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => deleteReport(report.id)}
                              className="text-red-600 hover:text-red-900 flex items-center"
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Flag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun signalement</h3>
                <p className="text-gray-600">
                  {statusFilter === 'pending' 
                    ? 'Aucun signalement en attente de traitement.'
                    : `Aucun signalement ${getStatusLabel(statusFilter).toLowerCase()}.`
                  }
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de détail */}
      {showDetailModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-xl font-bold text-gray-900">Détails du signalement</h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Motif</h4>
                <p className="text-gray-700">{getReasonLabel(selectedReport.reason)}</p>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                <p className="text-gray-700">{selectedReport.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Signalé par</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="font-medium">{selectedReport.reporter?.full_name || 'Nom non renseigné'}</p>
                    <p className="text-sm text-gray-600">{selectedReport.reporter?.email}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Utilisateur signalé</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="font-medium">{selectedReport.reported?.full_name || 'Nom non renseigné'}</p>
                    <p className="text-sm text-gray-600">{selectedReport.reported?.email}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Date de signalement</h4>
                <p className="text-gray-700">{new Date(selectedReport.created_at).toLocaleString()}</p>
              </div>

              {selectedReport.status === 'pending' && (
                <div className="flex flex-wrap gap-4 pt-4 border-t">
                <button
                  onClick={() => updateReportStatus(selectedReport.id, 'resolved')}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 flex items-center"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Marquer comme résolu
                </button>
                <button
                  onClick={() => updateReportStatus(selectedReport.id, 'dismissed')}
                  className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 flex items-center"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Rejeter le signalement
                </button>
                <button
                  onClick={() => deleteReport(selectedReport.id)}
                  className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 flex items-center"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer définitivement
                </button>
              </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReportsPage;
