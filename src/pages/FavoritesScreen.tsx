import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import PropertyCard from '../components/PropertyCard';
import Layout from '../components/Layout';
import { Property } from '../types';

// Interface pour les données brutes retournées par la RPC
interface RawFavorite {
  favorite_id: string;
  property_id: string;
  property_title: string;
  property_price: number;
  property_city: string;
  property_type: 'apartment' | 'house' | 'villa' | 'studio' | 'duplex' | 'land';
  property_images: string[];
  property_surface: number;
  property_transaction_type: 'sale' | 'rent';
  property_view_count: number;
  property_status: 'pending' | 'approved' | 'rejected' | 'published' | 'active';
  // Ajoutez d'autres champs si nécessaire
}

export default function FavoritesScreen() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<Property[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadFavorites = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .rpc('get_user_favorites_v2', { user_uuid: user.id });

      if (error) throw error;

      // Transformer les données brutes en objets Property
      const formattedFavorites = (data || []).map((fav: RawFavorite) => ({
        id: fav.property_id,
        title: fav.property_title,
        price: fav.property_price,
        city: fav.property_city,
        type: fav.property_type,
        images: fav.property_images,
        surface: fav.property_surface,
        transaction_type: fav.property_transaction_type,
        view_count: fav.property_view_count,
        status: fav.property_status,
        // Remplir les autres champs requis par l'interface Property avec des valeurs par défaut
        created_at: new Date().toISOString(),
        description: '',
        address: '',
        bedrooms: 0,
        bathrooms: 0,
        rooms: 0,
        phone: '',
        user_id: user.id,
      }));

      setFavorites(formattedFavorites);
    } catch (error: any) {
      console.error('Erreur lors du chargement des favoris:', error);
      alert(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleToggleFavorite = async (propertyId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.rpc('toggle_favorite_v2', { 
        property_uuid: propertyId, 
        user_uuid: user.id 
      });

      if (error) throw error;

      // Recharger les favoris après la modification
      loadFavorites();
    } catch (error: any) {
      console.error('Erreur lors de la modification du favori:', error);
      alert(`Erreur: ${error.message}`);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      );
    }

    if (favorites.length === 0) {
      return (
        <div className="text-center py-20">
          <h2 className="text-xl font-semibold text-gray-700">Aucun favori pour le moment</h2>
          <p className="text-gray-500 mt-2">Les propriétés que vous ajoutez en favori apparaîtront ici.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {favorites.map((fav) => (
          <PropertyCard
            key={fav.id}
            property={fav}
            onPress={() => navigate(`/property/${fav.id}`)}
            onFavoritePress={() => handleToggleFavorite(fav.id)}
            isFavorite={true}
          />
        ))}
      </div>
    );
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Mes Favoris</h1>
        {renderContent()}
      </div>
    </Layout>
  );
}
