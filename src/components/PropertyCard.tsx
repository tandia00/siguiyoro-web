import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MapPin, Home as HomeIcon, Bath, Bed, Square, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Property } from '../types';

interface PropertyCardProps {
  property: Property;
  onPress: () => void;
  onFavoritePress: () => void;
  isFavorite: boolean;
  viewMode?: 'grid' | 'list';
  isUserProperty?: boolean;
  isViewed?: boolean;
  viewCount?: number;
}

const PropertyCard: React.FC<PropertyCardProps> = ({ 
  property, 
  onPress,
  onFavoritePress, 
  isFavorite = false,
  viewMode = 'grid',
  isUserProperty = false,
  viewCount
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    loadImage();
  }, [property.images]);

  const loadImage = async () => {
    if (property.images && property.images.length > 0) {
      const firstImage = property.images[0];
      
      // Si l'URL est déjà complète ou est une data URL, l'utiliser directement
      if (firstImage.startsWith('https://') || firstImage.startsWith('data:image')) {
        setImageUrl(firstImage);
        return;
      }

      try {
        const { data } = await supabase.storage
          .from('property-images')
          .createSignedUrl(firstImage, 3600);
        
        if (data?.signedUrl) {
          setImageUrl(data.signedUrl);
        }
      } catch (error) {
        console.error('Error loading image:', error);
        setImageError(true);
      }
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getPropertyTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      apartment: 'Appartement',
      house: 'Maison',
      villa: 'Villa',
      studio: 'Studio',
      duplex: 'Duplex',
      land: 'Terrain',
    };
    return types[type] || type;
  };

  const handleCardClick = () => {
    if (onPress) {
      onPress();
    }
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onFavoritePress) {
      onFavoritePress();
    }
  };

  return (
    <div 
      onClick={handleCardClick}
      className={`bg-white rounded-xl shadow-md overflow-hidden transform hover:scale-105 transition-all duration-300 cursor-pointer flex ${
        viewMode === 'grid' ? 'flex-col h-full min-h-[320px] max-w-full' : 'flex-row h-[180px]'
      } border border-gray-100 hover:shadow-lg`}
    >
      <div className={`relative ${viewMode === 'grid' ? 'w-full h-48' : 'w-1/3 h-full flex-shrink-0'}`}>
        <img
          src={imageUrl || '/placeholder-property.jpg'}
          alt={property.title}
          className={`w-full object-cover ${viewMode === 'grid' ? 'h-48' : 'h-full'}`}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = '/placeholder-property.jpg';
          }}
        />
        
        {/* Favorite Button */}
        <button
          onClick={handleFavoriteClick}
          className={`absolute top-3 right-3 p-2 rounded-full shadow-lg transition-all ${
            isFavorite ? 'bg-red-500 text-white' : 'bg-white text-gray-600 hover:bg-red-50'
          }`}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
        </button>

        {/* Transaction Type Badge */}
        <div className="absolute top-3 left-3 bg-green-600 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg">
          {property.transaction_type === 'sale' ? 'Vente' : 'Location'}
        </div>

        {/* View Count */}
        {(viewCount !== undefined || property.view_count) && (
          <div className="absolute bottom-3 left-3 bg-black bg-opacity-50 text-white px-2 py-1 rounded-full text-xs flex items-center">
            <Eye className="w-3 h-3 mr-1" />
            <span>{viewCount || property.view_count}</span>
          </div>
        )}

        {/* Status Badge for User Properties */}
        {isUserProperty && (
          <div className={`absolute bottom-3 right-3 px-2 py-1 rounded-full text-xs font-medium ${
            property.status === 'published' || property.status === 'active' 
              ? 'bg-green-500 text-white' 
              : property.status === 'pending'
              ? 'bg-yellow-500 text-white'
              : 'bg-red-500 text-white'
          }`}>
            {property.status === 'published' || property.status === 'active' ? 'Publié' :
             property.status === 'pending' ? 'En attente' : 'Rejeté'}
          </div>
        )}
      </div>

      <div className="p-3 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start mb-1">
            <span className="text-base font-bold text-green-600 whitespace-nowrap">
              {formatPrice(property.price)}
            </span>
          </div>

          <div className="flex items-center text-gray-500 mb-2">
            <MapPin className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
            <span className="text-xs truncate">{property.city}</span>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center">
              <HomeIcon className="w-3.5 h-3.5 mr-1" />
              <span>{getPropertyTypeLabel(property.type)}</span>
            </div>
            <div className="flex items-center">
              <Square className="w-3.5 h-3.5 mr-1" />
              <span>{property.surface}m²</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;
