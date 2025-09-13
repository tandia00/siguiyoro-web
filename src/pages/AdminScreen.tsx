import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { 
  Eye, 
  CheckCircle, 
  XCircle, 
  FileText, 
  Image as ImageIcon, 
  AlertTriangle,
  Users,
  BarChart3,
  Home,
  ArrowLeft,
  Flag,
  Settings
} from 'lucide-react';
import { Property, User } from '../types/index';

type PropertyWithProfile = Property & { profile?: Partial<User> };

const AdminScreen: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [properties, setProperties] = useState<PropertyWithProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (isAdmin) {
      fetchProperties();
    }
  }, [isAdmin, statusFilter]);

  const fetchProperties = async () => {
    try {
      console.log('[AdminScreen] Début du chargement des propriétés, filtre:', statusFilter);
      setLoading(true);
      
      const { data: properties, error } = await supabase
        .from('properties')
        .select(`*`)
        .eq('status', statusFilter)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[AdminScreen] Erreur lors de la requête properties:', error);
        throw error;
      }

      console.log('[AdminScreen] Propriétés récupérées:', properties?.length || 0);

      if (!properties) {
        console.log('[AdminScreen] Aucune propriété trouvée');
        setProperties([]);
        return;
      }

      // Récupérer les profils des utilisateurs
      const userIds = properties.map(p => p.user_id);
      console.log('[AdminScreen] Récupération des profils pour', userIds.length, 'utilisateurs');
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profilesError) {
        console.error('[AdminScreen] Erreur lors de la récupération des profils:', profilesError);
      }

      console.log('[AdminScreen] Profils récupérés:', profiles?.length || 0);

      const propertiesWithProfiles = properties.map(property => {
        const userProfile = profiles?.find(p => p.id === property.user_id);
        if (!userProfile) {
          console.log('[AdminScreen] Profil non trouvé pour l\'utilisateur:', property.user_id);
        }
        return {
          ...property,
          profile: userProfile
        };
      });

      console.log('[AdminScreen] Propriétés enrichies avec les profils utilisateur');
      setProperties(propertiesWithProfiles);
    } catch (error) {
      console.error('[AdminScreen] Erreur chargement propriétés:', error);
    } finally {
      setLoading(false);
      console.log('[AdminScreen] Chargement des propriétés terminé');
    }
  };

  const verifyProperty = async (propertyId: string, field: string) => {
    try {
      console.log(`[AdminScreen] Vérification du champ ${field} pour la propriété ${propertyId}`);
      
      const fieldMap: Record<string, string> = {
        'title': 'title_verified',
        'description': 'description_verified',
        'image': 'images_verified',
        'document': 'documents_verified'
      };

      const updateField = fieldMap[field];
      if (!updateField) {
        console.error(`[AdminScreen] Champ inconnu à vérifier: ${field}`);
        return;
      }

      console.log(`[AdminScreen] Mise à jour du champ ${updateField} à true`);

      const { error } = await supabase
        .from('properties')
        .update({
          [updateField]: true,
          verified_by: user?.id,
          verified_at: new Date().toISOString()
        })
        .eq('id', propertyId);

      if (error) {
        console.error('[AdminScreen] Erreur lors de la mise à jour de la propriété:', error);
        throw error;
      }

      console.log(`[AdminScreen] Champ ${field} vérifié avec succès`);
      
      // Mise à jour de l'état local au lieu de recharger toutes les données
      setProperties(prevProperties => 
        prevProperties.map(prop => 
          prop.id === propertyId 
            ? { ...prop, [updateField]: true }
            : prop
        )
      );
    } catch (error) {
      console.error('[AdminScreen] Erreur vérification:', error);
    }
  };

  const updatePropertyStatus = async (propertyId: string, status: string) => {
    try {
      console.log(`[AdminScreen] Mise à jour du statut de la propriété ${propertyId} vers ${status}`);
      
      const property = properties.find(p => p.id === propertyId);
      if (!property) {
        console.error(`[AdminScreen] Propriété ${propertyId} non trouvée dans l'état local`);
        return;
      }

      // Vérifier que tous les champs sont validés pour approuver
      if (status === 'approved') {
        console.log('[AdminScreen] Vérification des champs avant approbation');
        console.log('[AdminScreen] État des vérifications:', {
          titre: property.title_verified,
          description: property.description_verified,
          images: property.images_verified,
          documents: property.documents_verified,
          type: property.type
        });
        
        const allFieldsVerified = 
          property.title_verified && 
          property.description_verified && 
          property.images_verified && 
          (property.documents_verified || property.type !== 'land');

        if (!allFieldsVerified) {
          console.warn('[AdminScreen] Tous les champs ne sont pas vérifiés, approbation impossible');
          alert('Tous les champs doivent être vérifiés avant d\'approuver la propriété.');
          return;
        }
        
        console.log('[AdminScreen] Tous les champs sont vérifiés, approbation possible');
        
        // Récupérer les paramètres admin pour la limite d'annonces gratuites
        const { data: adminSettings } = await supabase
          .from('admin_settings')
          .select('free_listings_limit')
          .single();
        
        const freeListingsLimit = adminSettings?.free_listings_limit || 2;
        
        // Vérifier le nombre d'annonces publiées de l'utilisateur
        const { data: userProperties, error: countError } = await supabase
          .from('properties')
          .select('id')
          .eq('user_id', property.user_id)
          .eq('status', 'published');

        if (countError) {
          console.error('[AdminScreen] Erreur lors du comptage des propriétés:', countError);
        }

        const publishedCount = userProperties?.length || 0;
        console.log(`[AdminScreen] L'utilisateur ${property.user_id} a ${publishedCount} annonces publiées`);

        // Si moins que la limite d'annonces gratuites, publier directement (gratuit)
        if (publishedCount < freeListingsLimit) {
          status = 'published';
          console.log(`[AdminScreen] Publication gratuite (${publishedCount}/${freeListingsLimit} annonces)`);
        } else {
          // Vérifier si l'utilisateur a déjà payé pour cette annonce
          if (property.payment_status === 'paid') {
            status = 'published';
            console.log('[AdminScreen] Publication payée, annonce publiée directement');
          } else {
            console.log(`[AdminScreen] Plus de ${freeListingsLimit} annonces et pas de paiement, reste en approved`);
          }
        }
      }

      const updateData: any = { status };
      
      // Auto-valider les documents pour les biens non-terrain
      if (property.type !== 'land' && !property.documents_verified) {
        console.log('[AdminScreen] Auto-validation des documents pour un bien non-terrain');
        updateData.documents_verified = true;
      }

      console.log('[AdminScreen] Données de mise à jour:', updateData);

      const { error } = await supabase
        .from('properties')
        .update(updateData)
        .eq('id', propertyId);

      if (error) {
        console.error('[AdminScreen] Erreur lors de la mise à jour du statut:', error);
        throw error;
      }

      console.log(`[AdminScreen] Statut de la propriété ${propertyId} mis à jour avec succès vers ${status}`);
      
      // Mise à jour de l'état local au lieu de recharger toutes les données
      setProperties(prevProperties => 
        prevProperties.map(prop => 
          prop.id === propertyId 
            ? { ...prop, status, ...updateData }
            : prop
        )
      );
    } catch (error) {
      console.error('[AdminScreen] Erreur mise à jour statut:', error);
    }
  };

  const handleReject = async () => {
    try {
      console.log('[AdminScreen] Tentative de rejet de la propriété:', selectedPropertyId);
      
      if (!selectedPropertyId || !rejectReason.trim()) {
        console.warn('[AdminScreen] Rejet impossible: ID manquant ou raison vide');
        alert('Veuillez fournir une raison de rejet');
        return;
      }

      console.log('[AdminScreen] Raison du rejet:', rejectReason.trim());

      const { error } = await supabase
        .from('properties')
        .update({
          status: 'rejected',
          rejection_reason: rejectReason.trim()
        })
        .eq('id', selectedPropertyId);

      if (error) {
        console.error('[AdminScreen] Erreur lors du rejet de la propriété:', error);
        throw error;
      }

      console.log('[AdminScreen] Propriété rejetée avec succès');
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedPropertyId(null);
      
      // Mise à jour de l'état local au lieu de recharger toutes les données
      setProperties(prevProperties => 
        prevProperties.map(prop => 
          prop.id === selectedPropertyId 
            ? { ...prop, status: 'rejected', rejection_reason: rejectReason.trim() }
            : prop
        )
      );
    } catch (error) {
      console.error('[AdminScreen] Erreur rejet:', error);
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
            onClick={() => navigate('/')} 
            className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Retour à l'accueil"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Administration</h1>
        </div>
        <p className="text-gray-600 mb-2">Gestion des propriétés et utilisateurs</p>
        
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
          <button 
            onClick={() => navigate('/admin/settings')} 
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Settings className="w-4 h-4 mr-2" />
            Paramètres
          </button>
        </div>

        {/* Navigation des onglets */}
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
                En attente ({properties.filter(p => p.status === 'pending').length})
              </button>
              <button
                onClick={() => setStatusFilter('approved')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  statusFilter === 'approved'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Approuvées
              </button>
              <button
                onClick={() => setStatusFilter('rejected')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  statusFilter === 'rejected'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Rejetées
              </button>
            </nav>
          </div>
        </div>

        {/* Liste des propriétés */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {properties.map((property) => (
              <div key={property.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                {/* En-tête de la propriété */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{property.title}</h3>
                    <p className="text-gray-600">
                      {property.price.toLocaleString()} FCFA • {property.city} • {property.type}
                    </p>
                    <p className="text-sm text-gray-500">
                      Par {property.profile?.full_name || property.profile?.email || 'Utilisateur inconnu'}
                    </p>
                  </div>
                  {property.view_count > 0 && (
                    <div className="flex items-center text-sm text-gray-500">
                      <Eye className="w-4 h-4 mr-1" />
                      {property.view_count} vues
                    </div>
                  )}
                </div>

                {/* Sections de vérification */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Titre */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">Titre</h4>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        property.title_verified 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {property.title_verified ? 'Vérifié' : 'Non vérifié'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{property.title}</p>
                    {!property.title_verified && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          verifyProperty(property.id, 'title');
                        }}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                      >
                        Vérifier
                      </button>
                    )}
                  </div>

                  {/* Description */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">Description</h4>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        property.description_verified 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {property.description_verified ? 'Vérifié' : 'Non vérifié'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-3">{property.description}</p>
                    {!property.description_verified && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          verifyProperty(property.id, 'description');
                        }}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                      >
                        Vérifier
                      </button>
                    )}
                  </div>

                  {/* Images */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">Images</h4>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        property.images_verified 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {property.images_verified ? 'Vérifié' : 'Non vérifié'}
                      </span>
                    </div>
                    {property.images && property.images.length > 0 ? (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2 mb-3">
                          {property.images.slice(0, 3).map((imageUrl: string, index: number) => (
                            <div key={index} className="relative">
                              <img
                                src={imageUrl}
                                alt={`Propriété ${index + 1}`}
                                className="w-16 h-16 object-cover rounded cursor-pointer border-2 border-gray-200 hover:border-blue-500"
                                onClick={() => setSelectedImage(imageUrl)}
                                onError={(e) => {
                                  console.error('Erreur chargement image:', imageUrl);
                                  e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMCAyMEg0NFY0NEgyMFYyMFoiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIi8+CjxjaXJjbGUgY3g9IjI4IiBjeT0iMjgiIHI9IjMiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTIwIDM2TDI4IDI4TDM2IDM2TDQ0IDI4VjQ0SDIwVjM2WiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K';
                                }}
                              />
                              {property.images.length > 3 && index === 2 && (
                                <div className="absolute inset-0 bg-black bg-opacity-50 rounded flex items-center justify-center text-white text-xs font-medium">
                                  +{property.images.length - 3}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setSelectedImage(property.images[0])}
                            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                          >
                            Voir l'image
                          </button>
                          {!property.images_verified && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                verifyProperty(property.id, 'image');
                              }}
                              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                            >
                              Vérifier
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Aucune image</p>
                    )}
                  </div>

                  {/* Documents */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">Documents</h4>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        property.documents_verified 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {property.documents_verified ? 'Vérifié' : 'Non vérifié'}
                      </span>
                    </div>
                    {property.documents && property.documents.length > 0 ? (
                      <div className="space-y-2">
                        {property.documents.map((doc: string, index: number) => (
                          <div key={index}>
                            <a
                              href={doc}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700 inline-block mr-2"
                            >
                              Document {index + 1}
                            </a>
                          </div>
                        ))}
                        {!property.documents_verified && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              verifyProperty(property.id, 'document');
                            }}
                            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                          >
                            Vérifier
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">
                        {property.type === 'land' ? 'Aucun document' : 'Documents non requis'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {statusFilter === 'pending' && (
                  <div className="flex space-x-4 mt-6 pt-4 border-t">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        updatePropertyStatus(property.id, 'approved');
                      }}
                      className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 flex items-center"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approuver
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPropertyId(property.id);
                        setShowRejectModal(true);
                      }}
                      className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 flex items-center"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Rejeter
                    </button>
                  </div>
                )}
              </div>
            ))}

            {properties.length === 0 && (
              <div className="text-center py-12">
                <Home className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune propriété</h3>
                <p className="text-gray-600">Aucune propriété trouvée pour ce statut.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal d'image */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="max-w-4xl max-h-full p-4">
            <img
              src={selectedImage}
              alt="Propriété"
              className="max-w-full max-h-full object-contain"
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* Modal de rejet */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Rejeter la propriété</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Raison du rejet..."
              className="w-full p-3 border border-gray-300 rounded-lg resize-none h-32"
            />
            <div className="flex space-x-4 mt-4">
              <button
                onClick={handleReject}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                Rejeter
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                  setSelectedPropertyId(null);
                }}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminScreen;
