import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { 
  Heart, 
  Phone, 
  MessageCircle, 
  Share2, 
  CreditCard, 
  Flag, 
  Home, 
  Maximize, 
  Bed, 
  Bath,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Car,
  Trees,
  Waves,
  Sofa,
  Calendar,
  Building,
  MapPin,
  ExternalLink
} from 'lucide-react';

interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  city: string;
  country?: string;
  type: string;
  surface: number;
  rooms?: number;
  bathrooms?: number;
  transaction_type: 'sale' | 'rent';
  user_id: string;
  images?: string[];
  view_count?: number;
  // Champs supplémentaires
  floor?: number;
  year_built?: number;
  has_parking?: boolean;
  furnished?: boolean;
  has_garden?: boolean;
  has_pool?: boolean;
  amenities?: string[];
  latitude?: number;
  longitude?: number;
  profiles?: {
    id: string;
    full_name: string;
    phone: string;
    email: string;
    avatar_url?: string;
  };
}

const PropertyDetailsScreen = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);

  useEffect(() => {
    if (!id) {
      navigate('/');
      return;
    }
    fetchProperty();
  }, [id]);

  const fetchProperty = async () => {
    try {
      setLoading(true);
      
      // Récupérer la propriété
      const { data: propertyData, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (!propertyData) {
        navigate('/');
        return;
      }

      setProperty(propertyData);
      setIsOwner(Boolean(user && propertyData.user_id === user.id));
      
      // Récupérer les informations du propriétaire séparément
      if (propertyData.user_id) {
        console.log('[PropertyDetailsScreen] Tentative de récupération du profil utilisateur:', propertyData.user_id);
        
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, phone, email')
            .eq('id', propertyData.user_id)
            .single();
          
          if (profileError) {
            console.error('[PropertyDetailsScreen] Erreur lors de la récupération du profil:', profileError);
            console.log('[PropertyDetailsScreen] Détails de la requête:', {
              table: 'profiles',
              userId: propertyData.user_id,
              errorCode: profileError.code,
              errorMessage: profileError.message,
              errorDetails: profileError.details
            });
            
            // Utiliser un profil par défaut en cas d'erreur
            setProperty(prev => prev ? {
              ...prev,
              profiles: {
                id: propertyData.user_id,
                full_name: 'Propriétaire',
                phone: 'Non disponible',
                email: 'Non disponible'
              }
            } : null);
          } else {
            console.log('[PropertyDetailsScreen] Profil récupéré avec succès:', profileData);
            setProperty(prev => prev ? {
              ...prev,
              profiles: profileData
            } : null);
          }
        } catch (err) {
          console.error('[PropertyDetailsScreen] Exception lors de la récupération du profil:', err);
          // Utiliser un profil par défaut en cas d'exception
          setProperty(prev => prev ? {
            ...prev,
            profiles: {
              id: propertyData.user_id,
              full_name: 'Propriétaire',
              phone: 'Non disponible',
              email: 'Non disponible'
            }
          } : null);
        }
      }
      
      // Charger les images
      if (propertyData.images && propertyData.images.length > 0) {
        loadImages(propertyData.images);
      }
      
      // Vérifier le statut des favoris
      if (user) {
        checkFavoriteStatus();
      }
      
      // Incrémenter le compteur de vues si ce n'est pas le propriétaire
      if (user && propertyData.user_id !== user.id) {
        incrementViewCount();
      }
      
    } catch (error) {
      console.error('Error fetching property:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const loadImages = async (imageNames: string[]) => {
    try {
      const urls: string[] = [];
      
      for (const imageName of imageNames) {
        // Si l'URL est déjà complète ou est une data URL, l'utiliser directement
                if (imageName.startsWith('https://') || imageName.startsWith('data:image')) {
          urls.push(imageName);
        } else {
          const { data, error } = await supabase.storage
            .from('property-images')
            .createSignedUrl(imageName, 3600);
          
          if (!error && data?.signedUrl) {
            urls.push(data.signedUrl);
          }
        }
      }
      
      setImageUrls(urls);
    } catch (error) {
      console.error('Error loading images:', error);
    }
  };

  const checkFavoriteStatus = async () => {
    if (!user || !id) return;
    
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('property_id', id)
        .maybeSingle();

      if (!error) {
        setIsFavorite(Boolean(data));
      }
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };

  const incrementViewCount = async () => {
    try {
      await supabase.rpc('increment_view_count', {
        property_id: id
      });
    } catch (error) {
      console.error('Error incrementing view count:', error);
    }
  };

  const toggleFavorite = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    try {
      setFavoriteLoading(true);
      
      const { data, error } = await supabase
        .rpc('toggle_favorite_v2', { 
          property_uuid: id,
          user_uuid: user.id 
        });

      if (error) throw error;

      setIsFavorite(data !== null ? data : false);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleCall = (phone: string) => {
    if (!phone) {
      alert('Numéro de téléphone non disponible');
      return;
    }
    window.open(`tel:${phone}`, '_self');
  };

  const handleMessage = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (!property || !property.user_id) {
      alert('Impossible de contacter le propriétaire');
      return;
    }
    
    // Navigation vers l'écran de chat avec l'ID de la propriété et l'ID du propriétaire
    navigate(`/chat/${property.id}/${property.user_id}`);
    console.log(`[PropertyDetailsScreen] Navigation vers le chat: /chat/${property.id}/${property.user_id}`);
  };

  const handleShare = async () => {
    if (!property) return;
    
    try {
      const shareData = {
        title: property.title,
        text: `${property.title}\n${property.price.toLocaleString('fr-FR')} FCFA\n${property.city}`,
        url: window.location.href
      };

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
        alert('Lien copié dans le presse-papiers');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handlePayment = () => {
    // TODO: Implémenter la navigation vers le paiement
    alert('Fonctionnalité de paiement à implémenter');
  };

  const handleReport = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    // TODO: Implémenter le signalement
    alert('Fonctionnalité de signalement à implémenter');
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => 
      prev === imageUrls.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? imageUrls.length - 1 : prev - 1
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </Layout>
    );
  }

  if (!property) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">Propriété non trouvée</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Image Modal */}
        {imageModalVisible && (
          <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
            <button
              onClick={() => setImageModalVisible(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            >
              <X size={32} />
            </button>
            {imageUrls.length > 0 && (
              <img
                src={imageUrls[currentImageIndex]}
                alt={property.title}
                className="max-w-full max-h-full object-contain"
              />
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Colonne gauche - Image */}
          <div className="space-y-6">
            <div className="relative">
              {/* Image principale */}
              <div className="relative aspect-video bg-gray-200 rounded-lg overflow-hidden">
                {imageUrls.length > 0 ? (
                  <>
                    <img
                      src={imageUrls[currentImageIndex]}
                      alt={property.title}
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => setImageModalVisible(true)}
                    />
                    
                    {/* Navigation des images */}
                    {imageUrls.length > 1 && (
                      <>
                        <button
                          onClick={prevImage}
                          className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70"
                        >
                          <ChevronLeft size={20} />
                        </button>
                        <button
                          onClick={nextImage}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70"
                        >
                          <ChevronRight size={20} />
                        </button>
                        
                        {/* Indicateurs */}
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                          {imageUrls.map((_, index) => (
                            <button
                              key={index}
                              onClick={() => setCurrentImageIndex(index)}
                              className={`w-2 h-2 rounded-full ${
                                index === currentImageIndex ? 'bg-white' : 'bg-white bg-opacity-50'
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <Home size={48} className="mx-auto mb-2" />
                      <p>Aucune image disponible</p>
                    </div>
                  </div>
                )}

                {/* Badges */}
                <div className="absolute top-4 left-4 space-y-2">
                  {isOwner && (
                    <div className="bg-green-600 text-white px-3 py-1 rounded-full text-sm flex items-center space-x-1">
                      <Eye size={14} />
                      <span>Mon annonce</span>
                    </div>
                  )}
                  {property.view_count && property.view_count > 0 && (
                    <div className="bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm flex items-center space-x-1">
                      <Eye size={14} />
                      <span>{property.view_count}</span>
                    </div>
                  )}
                </div>

                {/* Bouton favori */}
                {!isOwner && (
                  <button
                    onClick={toggleFavorite}
                    disabled={favoriteLoading}
                    className="absolute top-4 right-4 bg-white bg-opacity-90 p-2 rounded-full hover:bg-opacity-100 transition-colors"
                  >
                    <Heart
                      size={20}
                      className={isFavorite ? 'text-red-500 fill-current' : 'text-gray-600'}
                    />
                  </button>
                )}
              </div>
            </div>

            {/* Informations du propriétaire */}
            {property.profiles && (
              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <h3 className="text-lg font-semibold mb-4">Propriétaire</h3>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden">
                    {property.profiles.avatar_url ? (
                      <img
                        src={property.profiles.avatar_url}
                        alt={property.profiles.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-gray-600 font-semibold">
                        {property.profiles.full_name?.charAt(0) || 'P'}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{property.profiles.full_name || 'Propriétaire'}</p>
                    <p className="text-gray-600 text-sm">{property.profiles.phone || 'Numéro non disponible'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Colonne droite - Détails */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <h1 className="text-2xl font-bold mb-2">{property.title}</h1>
              <p className="text-3xl font-bold text-green-600 mb-2">
                {property.price.toLocaleString('fr-FR')} FCFA
                {property.transaction_type === 'rent' ? ' /mois' : ''}
              </p>
              <p className="text-gray-600 mb-4">
                {property.country ? `${property.city}, ${property.country}` : property.city}
              </p>

              <div className="border-t pt-4 mb-4">
                <h3 className="text-lg font-semibold mb-3">Description</h3>
                <p className="text-gray-700 leading-relaxed">{property.description}</p>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-3">Caractéristiques</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                    <Home size={20} className="text-green-600" />
                    <span className="text-sm">{property.type}</span>
                  </div>
                  <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                    <Maximize size={20} className="text-green-600" />
                    <span className="text-sm">{property.surface} m²</span>
                  </div>
                  {property.rooms && (
                    <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                      <Bed size={20} className="text-green-600" />
                      <span className="text-sm">
                        {property.rooms} {property.rooms > 1 ? 'chambres' : 'chambre'}
                      </span>
                    </div>
                  )}
                  {property.bathrooms && (
                    <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                      <Bath size={20} className="text-green-600" />
                      <span className="text-sm">
                        {property.bathrooms} {property.bathrooms > 1 ? 'salles de bain' : 'salle de bain'}
                      </span>
                    </div>
                  )}
                  {property.floor && (
                    <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                      <Building size={20} className="text-green-600" />
                      <span className="text-sm">
                        {property.floor === 0 ? 'Rez-de-chaussée' : `${property.floor}${property.floor === 1 ? 'er' : 'ème'} étage`}
                      </span>
                    </div>
                  )}
                  {property.year_built && (
                    <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                      <Calendar size={20} className="text-green-600" />
                      <span className="text-sm">Construit en {property.year_built}</span>
                    </div>
                  )}
                </div>
                
                {/* Équipements et commodités */}
                {(property.has_parking || property.furnished || property.has_garden || property.has_pool) && (
                  <div className="mt-4">
                    <h4 className="text-md font-semibold mb-2">Équipements</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {property.has_parking && (
                        <div className="flex items-center space-x-2 p-2 bg-green-50 rounded-lg">
                          <Car size={16} className="text-green-600" />
                          <span className="text-sm">Parking</span>
                        </div>
                      )}
                      {property.furnished && (
                        <div className="flex items-center space-x-2 p-2 bg-green-50 rounded-lg">
                          <Sofa size={16} className="text-green-600" />
                          <span className="text-sm">Meublé</span>
                        </div>
                      )}
                      {property.has_garden && (
                        <div className="flex items-center space-x-2 p-2 bg-green-50 rounded-lg">
                          <Trees size={16} className="text-green-600" />
                          <span className="text-sm">Jardin</span>
                        </div>
                      )}
                      {property.has_pool && (
                        <div className="flex items-center space-x-2 p-2 bg-green-50 rounded-lg">
                          <Waves size={16} className="text-green-600" />
                          <span className="text-sm">Piscine</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Autres équipements */}
                {property.amenities && property.amenities.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-md font-semibold mb-2">Autres équipements</h4>
                    <div className="flex flex-wrap gap-2">
                      {property.amenities.map((amenity, index) => (
                        <span key={index} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Section Google Maps */}
            {(property.latitude && property.longitude) && (
              <div className="bg-white rounded-lg p-6 shadow-sm border mt-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <MapPin size={20} className="text-green-600 mr-2" />
                  Localisation
                </h3>
                <div className="space-y-3">
                  <p className="text-gray-600 text-sm">
                    {property.country ? `${property.city}, ${property.country}` : property.city}
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => window.open(`https://www.google.com/maps?q=${property.latitude},${property.longitude}`, '_blank')}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <ExternalLink size={16} />
                      <span>Voir sur Google Maps</span>
                    </button>
                    <button
                      onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${property.latitude},${property.longitude}`, '_blank')}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <MapPin size={16} />
                      <span>Itinéraire</span>
                    </button>
                  </div>
                  <div className="mt-4 bg-gray-100 rounded-lg p-4 text-center">
                    <MapPin size={48} className="text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 text-sm mb-2">
                      Coordonnées: {property.latitude?.toFixed(6)}, {property.longitude?.toFixed(6)}
                    </p>
                    <p className="text-gray-500 text-xs">
                      Utilisez les boutons ci-dessus pour voir la localisation sur Google Maps
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Barre d'actions en bas */}
        {!isOwner && (
          <div className="fixed bottom-16 md:bottom-6 left-0 md:left-1/2 right-0 md:transform md:-translate-x-1/2 bg-white shadow-lg border md:rounded-full px-2 md:px-6 py-3 z-10 w-full md:w-auto">
            <div className="flex items-center justify-around md:justify-start md:space-x-6">
              <button
                onClick={() => handleCall(property.profiles?.phone || '')}
                className="flex flex-col items-center space-y-1 text-green-600 hover:text-green-700"
              >
                <Phone size={18} />
                <span className="text-xs">Appeler</span>
              </button>
              
              <button
                onClick={handleMessage}
                className="flex flex-col items-center space-y-1 text-green-600 hover:text-green-700"
              >
                <MessageCircle size={18} />
                <span className="text-xs">Message</span>
              </button>
              
              <button
                onClick={handleShare}
                className="flex flex-col items-center space-y-1 text-green-600 hover:text-green-700"
              >
                <Share2 size={18} />
                <span className="text-xs">Partager</span>
              </button>
              
              <button
                onClick={handlePayment}
                className="flex flex-col items-center space-y-1 text-green-600 hover:text-green-700"
              >
                <CreditCard size={18} />
                <span className="text-xs">Payer</span>
              </button>
              
              <button
                onClick={handleReport}
                className="flex flex-col items-center space-y-1 text-red-600 hover:text-red-700"
              >
                <Flag size={18} />
                <span className="text-xs">Signaler</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PropertyDetailsScreen;
