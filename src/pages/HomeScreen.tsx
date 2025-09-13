import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import PropertyCard from '../components/PropertyCard';
import { supabase } from '../lib/supabase';
import { Search, Grid, List, MapPin, Home as HomeIcon } from 'lucide-react';
import type { Property } from '../types';

const HomeScreen: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [transactionType, setTransactionType] = useState('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [favorites, setFavorites] = useState<string[]>([]);
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      console.log('Fetching properties...');
      
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .in('status', ['published', 'approved'])
        .order('created_at', { ascending: false });

      console.log('Supabase response:', { data, error, count: data?.length });

      if (error) {
        console.error('Error fetching properties:', error);
        // Essayer sans filtre de statut pour diagnostiquer
        const { data: allData, error: allError } = await supabase
          .from('properties')
          .select('*')
          .order('created_at', { ascending: false });
        
        console.log('All properties (no filter):', { allData, allError, count: allData?.length });
        setProperties(allData || []);
      } else {
        setProperties(data || []);
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProperties = properties.filter(property => {
    // Log des propriétés pour le débogage
    console.log('Propriété en cours de traitement:', {
      id: property.id,
      type: property.type,
      transaction_type: property.transaction_type,
      title: property.title
    });

    const matchesSearch = (property.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (property.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (property.address || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCity = !selectedCity || property.city === selectedCity;
    
    // Mappage des types de propriétés (français vers français avec gestion de la casse)
    const typeMapping: {[key: string]: string} = {
        'appartement': 'Appartement',
        'maison': 'Maison',
        'villa': 'Villa',
        'studio': 'Studio',
        'duplex': 'Duplex',
        'terrain': 'Terrain',
        'commerce': 'Commerce'
    };
    
    // Récupérer le type normalisé (avec première lettre en majuscule)
    const selectedTypeNormalized = selectedType 
      ? selectedType.charAt(0).toUpperCase() + selectedType.slice(1).toLowerCase()
      : '';
      
    const propertyType = property.type || '';
    const matchesType = !selectedType || propertyType === selectedTypeNormalized;
    
    console.log('Filtre type - Sélectionné:', selectedType, 
                'Normalisé:', selectedTypeNormalized, 
                'Type de propriété:', propertyType, 
                'Correspondance:', matchesType);
    
    // Mappage des types de transaction (français vers français avec gestion de la casse)
    const transactionMapping: {[key: string]: string} = {
        'vente': 'vente',
        'location': 'location'
    };
    
    const transactionTypeNormalized = transactionType 
      ? transactionType.toLowerCase() 
      : '';
      
    const propertyTransactionType = property.transaction_type?.toLowerCase() || '';
    const matchesTransaction = !transactionType || 
                             propertyTransactionType === transactionTypeNormalized;
    
    console.log('Filtre transaction - Sélectionné:', transactionType,
                'Normalisé:', transactionTypeNormalized,
                'Type de transaction:', propertyTransactionType,
                'Correspondance:', matchesTransaction);
    
    const matchesPrice = (!priceRange.min || (property.price && property.price >= parseInt(priceRange.min))) &&
                        (!priceRange.max || (property.price && property.price <= parseInt(priceRange.max)));

    const result = matchesSearch && matchesCity && matchesType && matchesTransaction && matchesPrice;
    
    if (result) {
      console.log('Propriété incluse dans les résultats:', property.id, property.title);
    } else {
      console.log('Propriété exclue - Raisons:', {
        matchesSearch,
        matchesCity,
        matchesType,
        matchesTransaction,
        matchesPrice
      });
    }

    return result;
  });
  
  // Logs de debug supprimés pour éviter les multiples rendus

  const cities = [...new Set(properties.map(p => p.city))];
  const propertyTypes = ['apartment', 'house', 'villa', 'studio', 'duplex', 'land'];

  const handleFavoriteToggle = (propertyId: string) => {
    setFavorites(prev => 
      prev.includes(propertyId) 
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

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
      <div className="space-y-6">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-8 text-white">
          <div className="flex items-center mb-4">
            <HomeIcon className="w-8 h-8 mr-3" />
            <h1 className="text-3xl font-bold">Trouvez votre propriété idéale au Mali</h1>
          </div>
          <p className="text-green-100 mb-6">Découvrez les meilleures offres immobilières dans tout le pays</p>
          
          {/* Search Bar */}
          <div className="bg-white rounded-xl p-6 text-gray-900 shadow-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                />
              </div>
              
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
              >
                <option value="">Toutes les villes</option>
                {cities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
              
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
              >
                <option value="">Tous les types</option>
                <option value="appartement">Appartement</option>
                <option value="maison">Maison</option>
                <option value="villa">Villa</option>
                <option value="studio">Studio</option>
                <option value="duplex">Duplex</option>
                <option value="terrain">Terrain</option>
              </select>

              <select
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
              >
                <option value="">Vente / Location</option>
                <option value="vente">Vente</option>
                <option value="location">Location</option>
              </select>
              
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="Prix min"
                  value={priceRange.min}
                  onChange={(e) => setPriceRange({...priceRange, min: e.target.value})}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                />
                <input
                  type="number"
                  placeholder="Prix max"
                  value={priceRange.max}
                  onChange={(e) => setPriceRange({...priceRange, max: e.target.value})}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Results Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Propriétés disponibles ({filteredProperties.length})
            </h2>
            <div className="flex items-center text-gray-600">
              <MapPin className="w-4 h-4 mr-1" />
              <span>{cities.length} villes</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Results */}
        {filteredProperties.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <HomeIcon className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 text-lg mb-2">Aucune propriété trouvée</p>
            <p className="text-gray-400">Essayez de modifier vos critères de recherche</p>
          </div>
        ) : (
          <div className={`grid gap-4 ${ // Augmentation du gap pour un meilleur espacement
            viewMode === 'grid' 
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 w-full' // 1 colonne sur mobile, 2 sur tablette, 3 sur desktop
              : 'grid-cols-1'
          }`}>
            {filteredProperties.map((property) => (
              <PropertyCard 
                key={property.id} 
                property={property}
                onPress={() => navigate(`/property/${property.id}`)}
                onFavoritePress={() => handleFavoriteToggle(property.id)}
                isFavorite={favorites.includes(property.id)}
                viewMode={viewMode}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default HomeScreen;