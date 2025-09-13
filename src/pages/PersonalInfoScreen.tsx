import React, { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { MdChevronLeft } from 'react-icons/md';

// --- Data ---
// On pourrait externaliser ces données dans un fichier séparé pour plus de clarté
const africanCountries = [
  'Mali', 'Sénégal', 'Côte d\'Ivoire', 'Burkina Faso', 'Guinée', 'Niger', 'Mauritanie',
  'Algérie', 'Angola', 'Bénin', 'Botswana', 'Burundi', 'Cameroun', 'Cap-Vert', 
  'République centrafricaine', 'Comores', 'Congo', 'République démocratique du Congo',
  'Djibouti', 'Égypte', 'Érythrée', 'Éthiopie', 'Gabon', 'Gambie', 'Ghana', 'Guinée-Bissau',
  'Guinée équatoriale', 'Kenya', 'Lesotho', 'Liberia', 'Libye', 'Madagascar', 'Malawi',
  'Maroc', 'Maurice', 'Mozambique', 'Namibie', 'Nigeria', 'Ouganda', 'Rwanda',
  'Sao Tomé-et-Principe', 'Seychelles', 'Sierra Leone', 'Somalie', 'Soudan', 'Soudan du Sud',
  'Swaziland', 'Tanzanie', 'Tchad', 'Togo', 'Tunisie', 'Zambie', 'Zimbabwe'
].sort();

const westernCountries = [
  'France', 'Allemagne', 'Royaume-Uni', 'États-Unis', 'Canada', 'Espagne', 'Portugal',
  'Italie', 'Belgique', 'Pays-Bas', 'Suisse', 'Autriche', 'Irlande', 'Danemark', 'Norvège',
  'Suède', 'Finlande', 'Islande', 'Luxembourg', 'Australie', 'Nouvelle-Zélande'
].sort();

const otherCountries = [
  'Chine', 'Japon', 'Corée du Sud', 'Inde', 'Russie', 'Brésil', 'Argentine', 'Mexique',
  'Indonésie', 'Malaisie', 'Singapour', 'Thaïlande', 'Vietnam', 'Philippines', 'Pakistan',
  'Bangladesh', 'Sri Lanka', 'Népal', 'Iran', 'Irak', 'Arabie saoudite', 'Émirats arabes unis',
  'Qatar', 'Koweït', 'Oman', 'Bahreïn', 'Jordanie', 'Liban', 'Israël', 'Turquie'
].sort();

const cities: { [key: string]: { label: string, value: string }[] } = {
  'Mali': [
    { label: 'Bamako', value: 'Bamako' }, { label: 'Sikasso', value: 'Sikasso' },
    { label: 'Ségou', value: 'Segou' }, { label: 'Mopti', value: 'Mopti' },
    { label: 'Koutiala', value: 'Koutiala' }, { label: 'Kayes', value: 'Kayes' },
    { label: 'Gao', value: 'Gao' }, { label: 'Kidal', value: 'Kidal' },
    { label: 'Tombouctou', value: 'Tombouctou' }, { label: 'San', value: 'San' },
    { label: 'Koulikoro', value: 'Koulikoro' }, { label: 'Kati', value: 'Kati' },
  ],
  'France': [
    { label: 'Paris', value: 'Paris' }, { label: 'Marseille', value: 'Marseille' },
    { label: 'Lyon', value: 'Lyon' }, { label: 'Toulouse', value: 'Toulouse' },
    { label: 'Nice', value: 'Nice' }, { label: 'Nantes', value: 'Nantes' },
  ],
};

const isWesternCountry = (country: string) => westernCountries.includes(country);

// --- Helper Components ---
const InputField = ({ label, id, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input id={id} {...props} className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm disabled:bg-gray-100" />
  </div>
);

const SelectField = ({ label, id, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string, children: React.ReactNode }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <select id={id} {...props} className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md bg-white">
      {children}
    </select>
  </div>
);

// --- Main Component ---
export default function PersonalInfoScreen() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [streetNumber, setStreetNumber] = useState('');
  const [streetName, setStreetName] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      if (user) {
        setLoading(true);
        try {
          const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
          if (error) throw error;

          if (data) {
            setEmail(user.email || '');
            setFullName(data.full_name || '');
            setPhone(data.phone || '');
            setCountry(data.country || '');
            setCity(data.city || '');
            setStreetNumber(data.street_number || '');
            setStreetName(data.street_name || '');
          }
        } catch (error: any) {
          console.error('Erreur de chargement du profil:', error);
          alert(`Erreur: ${error.message}`);
        } finally {
          setLoading(false);
        }
      }
    };

    loadProfile();
  }, [user]);

  useEffect(() => {
    setCity('');
  }, [country]);

  const handleUpdateProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!country || !city) {
      alert('Veuillez sélectionner un pays et une ville.');
      return;
    }
    if (isWesternCountry(country) && (!streetNumber || !streetName)) {
      alert('Pour les pays occidentaux, l\'adresse complète est requise.');
      return;
    }

    setLoading(true);
    try {
      const updates = {
        id: user.id,
        full_name: fullName,
        phone,
        country,
        city,
        street_number: isWesternCountry(country) ? streetNumber : null,
        street_name: isWesternCountry(country) ? streetName : null,
        updated_at: new Date(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);
      if (error) throw error;

      alert('Profil mis à jour avec succès !');
      navigate('/profile');
    } catch (error: any) {
      alert(`Erreur lors de la mise à jour: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-200 mr-2">
            <MdChevronLeft size={24} className="text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Informations Personnelles</h1>
        </div>

        <form onSubmit={handleUpdateProfile} className="bg-white p-6 rounded-lg shadow space-y-6">
          <InputField label="Email" id="email" type="email" value={email} disabled />
          <InputField label="Nom complet" id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <InputField label="Téléphone" id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />

          <SelectField label="Pays" id="country" value={country} onChange={(e) => setCountry(e.target.value)} required>
            <option value="">Sélectionner un pays</option>
            <optgroup label="Afrique">
              {africanCountries.map(c => <option key={c} value={c}>{c}</option>)}
            </optgroup>
            <optgroup label="Occident">
              {westernCountries.map(c => <option key={c} value={c}>{c}</option>)}
            </optgroup>
            <optgroup label="Autres">
              {otherCountries.map(c => <option key={c} value={c}>{c}</option>)}
            </optgroup>
          </SelectField>

          {country && (
            cities[country] ? (
              <SelectField label="Ville" id="city" value={city} onChange={(e) => setCity(e.target.value)} required>
                <option value="">Sélectionner une ville</option>
                {cities[country].map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </SelectField>
            ) : (
              <InputField label="Ville" id="city" type="text" value={city} onChange={(e) => setCity(e.target.value)} required />
            )
          )}

          {isWesternCountry(country) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <InputField label="N° de rue" id="streetNumber" type="text" value={streetNumber} onChange={(e) => setStreetNumber(e.target.value)} required />
              </div>
              <div className="md:col-span-2">
                <InputField label="Nom de la rue" id="streetName" type="text" value={streetName} onChange={(e) => setStreetName(e.target.value)} required />
              </div>
            </div>
          )}

          <div className="pt-4">
            <button type="submit" disabled={loading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed">
              {loading ? 'Mise à jour...' : 'Mettre à jour'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}