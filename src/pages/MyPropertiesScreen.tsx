import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Property } from '../types';
import { AlertTriangle, Edit, Eye, Plus, Trash2 } from 'lucide-react';

const MyPropertiesScreen: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  const fetchUserProperties = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user properties:', error);
    } else {
      setProperties(data as Property[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchUserProperties();
  }, [fetchUserProperties]);

  useEffect(() => {
    if (activeFilter === 'all') {
      setFilteredProperties(properties);
    } else {
      setFilteredProperties(properties.filter(p => p.status === activeFilter));
    }
  }, [activeFilter, properties]);

  const handleDelete = async (propertyId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette annonce ?')) {
      const { error } = await supabase.from('properties').delete().match({ id: propertyId });
      if (error) {
        alert('Erreur lors de la suppression de l\'annonce.');
        console.error('Error deleting property:', error);
      } else {
        alert('Annonce supprimée avec succès.');
        setProperties(prev => prev.filter(p => p.id !== propertyId));
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full">En attente</span>;
      case 'approved':
        return <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">Approuvée</span>;
      case 'rejected':
        return <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">Rejetée</span>;
      default:
        return null;
    }
  };

  const FilterButton: React.FC<{ filter: string; label: string }> = ({ filter, label }) => (
    <button
      onClick={() => setActiveFilter(filter)}
      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
        activeFilter === filter
          ? 'bg-green-600 text-white'
          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
      }`}>
      {label}
    </button>
  );

  const renderPropertyCard = (property: Property) => (
    <div key={property.id} className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col">
      <img src={property.images[0] || 'https://via.placeholder.com/300x200'} alt={property.title} className="w-full h-32 object-cover" />
      <div className="p-2 flex-grow">
        <div className="flex justify-between items-start mb-1">
          {getStatusBadge(property.status)}
          <div className="flex items-center text-gray-500">
            <Eye className="w-3 h-3 mr-1" />
            <span className="text-xs">{property.view_count || 0}</span>
          </div>
        </div>
        <h3 className="font-bold text-sm mb-1 truncate">{property.title}</h3>
        <p className="text-green-600 font-semibold text-xs mb-1">{property.price.toLocaleString()} FCFA</p>
        <p className="text-gray-600 text-xs truncate">{property.city}</p>
      </div>
      <div className="p-2 bg-gray-50 border-t border-gray-200 flex justify-around">
        <button 
          onClick={() => navigate(`/edit-property/${property.id}`)} 
          className="flex items-center p-2 text-blue-600 hover:bg-blue-100 rounded-md transition-colors">
          <Edit className="w-4 h-4" />
        </button>
        <button 
          onClick={() => handleDelete(property.id)} 
          className="flex items-center p-2 text-red-600 hover:bg-red-100 rounded-md transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold text-gray-900">Mes annonces</h1>
          <div className="flex flex-wrap items-center gap-2">
            <FilterButton filter="all" label="Toutes" />
            <FilterButton filter="pending" label="En attente" />
            <FilterButton filter="approved" label="Approuvées" />
            <FilterButton filter="rejected" label="Rejetées" />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          </div>
        ) : filteredProperties.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProperties.map(renderPropertyCard)}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-lg shadow-sm">
             <AlertTriangle className="mx-auto h-12 w-12 text-yellow-400" />
            <h2 className="mt-4 text-xl font-semibold text-gray-700">Aucune annonce trouvée</h2>
            <p className="text-gray-500 mt-2">Vous n'avez aucune annonce correspondant à ce filtre.</p>
            {activeFilter === 'all' && (
               <button
                onClick={() => navigate('/add-property')}
                className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                <Plus className="-ml-1 mr-2 h-5 w-5" />
                Ajouter une annonce
              </button>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default MyPropertiesScreen;
