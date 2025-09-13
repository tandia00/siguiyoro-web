import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Property } from '../types';
import { Camera, Trash2 } from 'lucide-react';

const EditPropertyScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [formState, setFormState] = useState<Partial<Property>>({});
  const [newImages, setNewImages] = useState<File[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const fetchProperty = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      console.error('Error fetching property:', error);
      alert('Impossible de charger les informations de l\'annonce.');
      navigate('/my-properties');
    } else {
      setProperty(data as Property);
      setFormState(data as Property);
      setExistingImageUrls(data.images || []);
      setImagePreviews(data.images || []);
    }
    setLoading(false);
  }, [id, navigate]);

  useEffect(() => {
    fetchProperty();
  }, [fetchProperty]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setNewImages((prev) => [...prev, ...files]);
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setImagePreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const removeImage = (index: number, isExisting: boolean) => {
    if (isExisting) {
      setExistingImageUrls((prev) => prev.filter((_, i) => i !== index));
    } else {
      const newImageIndex = index - existingImageUrls.length;
      setNewImages((prev) => prev.filter((_, i) => i !== newImageIndex));
    }
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !property) return;
    setLoading(true);

    // Convert new images to base64
    const newImageUrls: string[] = [];
    for (const image of newImages) {
      try {
        const base64String = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Erreur conversion image'));
          reader.readAsDataURL(image);
        });
        newImageUrls.push(base64String);
        console.log('[EditPropertyScreen] Image convertie en base64, taille:', base64String.length);
      } catch (error) {
        console.error('Error converting image to base64:', error);
        alert("Erreur lors de la conversion d'une image.");
        setLoading(false);
        return;
      }
    }

    const updatedImageUrls = [...existingImageUrls, ...newImageUrls];

    const { error } = await supabase
      .from('properties')
      .update({
        ...formState,
        images: updatedImageUrls,
        price: Number(formState.price),
        bedrooms: Number(formState.bedrooms),
        bathrooms: Number(formState.bathrooms),
        surface: Number(formState.surface),
      })
      .eq('id', property.id);

    if (error) {
      console.error('Error updating property:', error);
      alert('Erreur lors de la mise à jour de l\'annonce.');
    } else {
      alert('Annonce mise à jour avec succès !');
      navigate('/my-properties');
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Modifier l'annonce</h1>
        <form onSubmit={handleSubmit} className="space-y-8 bg-white p-8 rounded-lg shadow-md">
          {/* Form fields are similar to AddPropertyScreen, but populated with formState */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Informations de base</h2>
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">Titre de l'annonce</label>
              <input type="text" id="title" name="title" value={formState.title || ''} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500" required />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
              <textarea id="description" name="description" value={formState.description || ''} onChange={handleInputChange} rows={4} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500" required></textarea>
            </div>
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700">Prix (FCFA)</label>
              <input type="number" id="price" name="price" value={formState.price || ''} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500" required />
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Détails du bien</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700">Type de bien</label>
                <select id="type" name="type" value={formState.type || 'house'} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500">
                  <option value="house">Maison</option>
                  <option value="apartment">Appartement</option>
                  <option value="villa">Villa</option>
                  <option value="studio">Studio</option>
                  <option value="duplex">Duplex</option>
                  <option value="land">Terrain</option>
                </select>
              </div>
              <div>
                <label htmlFor="transaction_type" className="block text-sm font-medium text-gray-700">Type de transaction</label>
                <select id="transaction_type" name="transaction_type" value={formState.transaction_type || 'sale'} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500">
                  <option value="sale">Vente</option>
                  <option value="rent">Location</option>
                </select>
              </div>
              <div>
                <label htmlFor="bedrooms" className="block text-sm font-medium text-gray-700">Chambres</label>
                <input type="number" id="bedrooms" name="bedrooms" value={formState.bedrooms || ''} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500" />
              </div>
              <div>
                <label htmlFor="bathrooms" className="block text-sm font-medium text-gray-700">Salles de bain</label>
                <input type="number" id="bathrooms" name="bathrooms" value={formState.bathrooms || ''} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500" />
              </div>
              <div>
                <label htmlFor="surface" className="block text-sm font-medium text-gray-700">Surface (m²)</label>
                <input type="number" id="surface" name="surface" value={formState.surface || ''} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Images</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative">
                  <img src={preview} alt={`preview ${index}`} className="w-full h-32 object-cover rounded-md" />
                  <button type="button" onClick={() => removeImage(index, index < existingImageUrls.length)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-4 p-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="text-center">
                <Camera className="mx-auto h-12 w-12 text-gray-400" />
                <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-green-600 hover:text-green-500">
                  <span>Ajouter des images</span>
                  <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple onChange={handleImageChange} accept="image/*" />
                </label>
              </div>
            </div>
          </div>

          <div className="pt-5 flex justify-end">
            <button type="button" onClick={() => navigate('/my-properties')} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit" disabled={loading} className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:bg-green-300">
              {loading ? 'Mise à jour...' : 'Mettre à jour l\'annonce'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default EditPropertyScreen;
