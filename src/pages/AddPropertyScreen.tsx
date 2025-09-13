// AddPropertyScreen.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  IconButton,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  LinearProgress,
  Alert,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Radio,
  RadioGroup,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Snackbar,
  CircularProgress
} from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
import {
  PhotoCamera,
  AttachFile,
  Close,
  CheckCircle,
  Delete,
  LocationOn,
  Map,
  CreditCard,
  Smartphone,
  AttachMoney
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Theme } from '@mui/material/styles';

// Types
interface FormData {
  title: string;
  description: string;
  price: string;
  type: string;
  country: string;
  city: string;
  address: string;
  phone: string;
  transaction_type: string;
  rooms: string;
  bathrooms: string;
  surface: string;
  yearBuilt: string;
  floor: string;
  hasParking: boolean;
  furnished: boolean;
  hasGarden: boolean;
  hasPool: boolean;
  amenities: string[];
  images: string[];
}

interface Asset {
  uri: string;
  type: string;
  name: string;
  size?: number;
  file?: File;
  preview?: string;
  width?: number;
  height?: number;
}

// Styles personnalisés
const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.2s',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[4],
  },
}));

const AddPropertyScreen = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Asset[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<Asset[]>([]);
  const [selectedImage, setSelectedImage] = useState<null | Asset>(null);
  const [fullScreenDoc, setFullScreenDoc] = useState<null | Asset>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning',
  });

  // Liste des équipements disponibles
  const availableAmenities = [
    'Climatisation', 'Chauffage', 'Cuisine équipée', 'Ascenseur', 'Garde', 
    'Sécurité', 'Internet', 'Télévision', 'Meublé', 'Cave', 'Buanderie'
  ];

  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    price: '',
    type: 'Maison',
    country: 'Mali',
    city: '',
    address: '',
    phone: '',
    transaction_type: 'vente',
    rooms: '',
    bathrooms: '',
    surface: '',
    yearBuilt: '',
    floor: '',
    hasParking: false,
    furnished: false,
    hasGarden: false,
    hasPool: false,
    amenities: [],
    images: []
  });

  // États pour le système de paiement
  const [userPublishedCount, setUserPublishedCount] = useState(0);
  const [needsPayment, setNeedsPayment] = useState(false);
  const [paymentOption, setPaymentOption] = useState<'free' | 'paid'>('free');
  const [paymentAmount, setPaymentAmount] = useState(5000); // Prix dynamique depuis admin_settings
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'orange' | 'stripe' | 'paypal' | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [orangePhoneNumber, setOrangePhoneNumber] = useState('');
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const [showOptionalFields, setShowOptionalFields] = useState<boolean>(false);

  // Récupérer les paramètres admin et vérifier le nombre d'annonces publiées
  useEffect(() => {
    const fetchAdminSettingsAndCheckCount = async () => {
      if (!user) return;
      
      try {
        // Récupérer les paramètres admin
        const { data: adminSettings } = await supabase
          .from('admin_settings')
          .select('listing_price, free_listings_limit')
          .single();
        
        if (adminSettings?.listing_price) {
          setPaymentAmount(adminSettings.listing_price);
        }
        
        const freeListingsLimit = adminSettings?.free_listings_limit || 2;
        
        // Vérifier le nombre d'annonces publiées de l'utilisateur
        const { data: userProperties, error: countError } = await supabase
          .from('properties')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'published');

        if (!countError && userProperties) {
          const count = userProperties.length;
          setUserPublishedCount(count);
          setNeedsPayment(count >= freeListingsLimit);
          setPaymentOption(count >= freeListingsLimit ? 'paid' : 'free');
        }
      } catch (error) {
        console.error('Erreur lors du comptage des annonces:', error);
      }
    };

    fetchAdminSettingsAndCheckCount();
  }, [user]);
  const [citySearch, setCitySearch] = useState<string>('');
  const [location, setLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [showMap, setShowMap] = useState<boolean>(false);

  // Gestion de la sélection d'images
  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newImages = await Promise.all(
      Array.from(files).map(async (file) => {
        const preview = URL.createObjectURL(file);
        return {
          uri: preview,
          type: file.type,
          name: file.name,
          size: file.size,
          file,
          preview
        };
      })
    );

    setSelectedImages([...selectedImages, ...newImages]);
  };

  // Gestion de la sélection de documents
  const handleDocumentSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newDocs = await Promise.all(
      Array.from(files).map(async (file) => {
        const preview = URL.createObjectURL(file);
        return {
          uri: preview,
          type: file.type,
          name: file.name,
          size: file.size,
          file,
          preview
        };
      })
    );

    setSelectedDocuments([...selectedDocuments, ...newDocs]);
  };

  // Gestion de la suppression d'image
  const removeImage = (index: number) => {
    const newImages = [...selectedImages];
    URL.revokeObjectURL(newImages[index].uri);
    newImages.splice(index, 1);
    setSelectedImages(newImages);
  };

  // Gestion de la suppression de document
  const removeDocument = (index: number) => {
    const newDocs = [...selectedDocuments];
    URL.revokeObjectURL(newDocs[index].uri);
    newDocs.splice(index, 1);
    setSelectedDocuments(newDocs);
  };

  // Gestion du changement des champs du formulaire
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { name?: string; value: unknown } }) => {
    const { name, value } = e.target;
    if (name) {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Gestion des cases à cocher
  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;
    setFormData({
      ...formData,
      [name]: checked
    });
  };

  // Gestion des équipements
  const handleAmenityToggle = (amenity: string) => {
    setFormData(prev => {
      const amenities = [...(prev.amenities || [])];
      const index = amenities.indexOf(amenity);
      
      if (index === -1) {
        amenities.push(amenity);
      } else {
        amenities.splice(index, 1);
      }

      return {
        ...prev,
        amenities
      };
    });
  };

  // Affichage de l'aperçu en plein écran
  const handleImagePreview = (image: Asset) => {
    setSelectedImage(image);
  };

  const handleClosePreview = () => {
    setSelectedImage(null);
  };

  const handleCloseDocPreview = () => {
    setFullScreenDoc(null);
  };

  // Affichage du document en plein écran
  const handleDocPreview = (doc: Asset) => {
    setFullScreenDoc(doc);
  };

  // Fonction pour basculer l'affichage des champs optionnels
  const toggleOptionalFields = () => {
    setShowOptionalFields(!showOptionalFields);
  };

  // Fonction pour afficher la taille du fichier de manière lisible
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Fonction pour obtenir l'icône du type de fichier
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <PhotoCamera />;
    } else if (type.includes('pdf')) {
      return <AttachFile />;
    } else if (type.includes('word') || type.includes('document')) {
      return <AttachFile />;
    } else if (type.includes('excel') || type.includes('spreadsheet')) {
      return <AttachFile />;
    }
    return <AttachFile />;
  };

  // Fonction pour obtenir la couleur du badge en fonction du type de fichier
  const getFileBadgeColor = (type: string) => {
    if (type.startsWith('image/')) return 'primary';
    if (type.includes('pdf')) return 'error';
    if (type.includes('word') || type.includes('document')) return 'info';
    if (type.includes('excel') || type.includes('spreadsheet')) return 'success';
    return 'default';
  };

  // Fonction pour vérifier si un fichier est une image
  const isImage = (type: string) => {
    return type.startsWith('image/');
  };

  // Fonction pour obtenir le type de fichier
  const getFileType = (type: string) => {
    if (type.startsWith('image/')) return 'Image';
    if (type.includes('pdf')) return 'PDF';
    if (type.includes('word') || type.includes('document')) return 'Document Word';
    if (type.includes('excel') || type.includes('spreadsheet')) return 'Feuille de calcul';
    return 'Fichier';
  };

  // Fonction pour obtenir la position actuelle
  const getCurrentLocation = async () => {
    try {
      if (!navigator.geolocation) {
        setSnackbar({
          open: true,
          message: 'La géolocalisation n\'est pas supportée par ce navigateur',
          severity: 'error'
        });
        return;
      }

      setSnackbar({
        open: true,
        message: 'Récupération de votre position...',
        severity: 'info'
      });

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setLocation({ latitude, longitude });
          
          // Géocodage inverse avec l'API Geocoding de Google (comme la version mobile)
          try {
            const response = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY || ''}&language=fr`
            );
            
            if (response.ok) {
              const data = await response.json();
              if (data.results && data.results[0]) {
                const result = data.results[0];
                const addressComponents = result.address_components;
                
                // Extraire les composants d'adresse
                let city = '';
                let country = '';
                
                addressComponents.forEach((component: any) => {
                  if (component.types.includes('locality') || component.types.includes('administrative_area_level_2')) {
                    city = component.long_name;
                  }
                  if (component.types.includes('country')) {
                    country = component.long_name;
                  }
                });
                
                setFormData(prev => ({
                  ...prev,
                  address: result.formatted_address,
                  city: city || prev.city,
                  country: country || prev.country
                }));
                
                console.log('Adresse récupérée:', result.formatted_address);
              }
            } else {
              console.log('Géocodage non disponible, coordonnées sauvegardées uniquement');
            }
          } catch (geocodeError) {
            console.log('Géocodage non disponible, coordonnées sauvegardées uniquement');
          }

          setSnackbar({
            open: true,
            message: 'Position récupérée avec succès !',
            severity: 'success'
          });
          setShowMap(true);
        },
        (error) => {
          console.error('Erreur de géolocalisation:', error);
          let errorMessage = 'Impossible d\'obtenir votre position';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Permission de géolocalisation refusée';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Position non disponible';
              break;
            case error.TIMEOUT:
              errorMessage = 'Délai d\'attente dépassé';
              break;
          }
          
          setSnackbar({
            open: true,
            message: errorMessage,
            severity: 'error'
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    } catch (error) {
      console.error('Erreur lors de la récupération de la position:', error);
      setSnackbar({
        open: true,
        message: 'Erreur lors de la récupération de la position',
        severity: 'error'
      });
    }
  };

  // Fonction pour ouvrir dans Google Maps
  const openInGoogleMaps = () => {
    if (!location) return;
    
    const { latitude, longitude } = location;
    const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
    window.open(url, '_blank');
  };

  // Validation des champs obligatoires
  const validateForm = () => {
    if (!formData.title || !formData.price || !formData.city || !formData.country) {
      setSnackbar({ open: true, message: 'Veuillez remplir tous les champs obligatoires.', severity: 'error' });
      return false;
    }
    return true;
  };

  // Gérer le clic sur le bouton de paiement
  const handlePaymentClick = () => {
    if (!user) {
      setSnackbar({ open: true, message: 'Vous devez être connecté pour créer une annonce.', severity: 'error' });
      return;
    }

    if (!validateForm()) return;

    if (paymentOption === 'paid' && userPublishedCount >= 2) {
      setShowPaymentModal(true);
    } else {
      handleSubmit();
    }
  };

  // Sélectionner une méthode de paiement
  const selectPaymentMethod = (method: 'orange' | 'stripe' | 'paypal') => {
    setSelectedPaymentMethod(method);
    setShowPaymentForm(true);
  };

  // Traitement du paiement Orange Money
  const handleOrangePayment = async () => {
    if (!orangePhoneNumber || orangePhoneNumber.length < 8) {
      setSnackbar({ open: true, message: 'Veuillez saisir un numéro Orange Money valide.', severity: 'error' });
      return;
    }

    setPaymentLoading(true);
    try {
      // Simulation API Orange Money
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Ici vous intégrerez l'API Orange Money réelle
      console.log('Paiement Orange Money:', orangePhoneNumber, paymentAmount);
      
      setSnackbar({ open: true, message: 'Paiement Orange Money effectué avec succès !', severity: 'success' });
      setShowPaymentModal(false);
      await handleSubmit();
    } catch (error) {
      console.error('Erreur paiement Orange Money:', error);
      setSnackbar({ open: true, message: 'Erreur lors du paiement Orange Money.', severity: 'error' });
    } finally {
      setPaymentLoading(false);
    }
  };

  // Traitement du paiement Stripe
  const handleStripePayment = async () => {
    setPaymentLoading(true);
    try {
      // Simulation redirection Stripe
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Ici vous intégrerez Stripe Checkout
      console.log('Redirection vers Stripe Checkout');
      window.open('https://checkout.stripe.com/demo', '_blank');
      
      setSnackbar({ open: true, message: 'Redirection vers Stripe...', severity: 'info' });
    } catch (error) {
      console.error('Erreur Stripe:', error);
      setSnackbar({ open: true, message: 'Erreur lors de la redirection Stripe.', severity: 'error' });
    } finally {
      setPaymentLoading(false);
    }
  };

  // Traitement du paiement PayPal
  const handlePayPalPayment = async () => {
    setPaymentLoading(true);
    try {
      // Simulation redirection PayPal
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Ici vous intégrerez PayPal SDK
      console.log('Redirection vers PayPal');
      window.open('https://www.paypal.com/checkoutnow', '_blank');
      
      setSnackbar({ open: true, message: 'Redirection vers PayPal...', severity: 'info' });
    } catch (error) {
      console.error('Erreur PayPal:', error);
      setSnackbar({ open: true, message: 'Erreur lors de la redirection PayPal.', severity: 'error' });
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setSnackbar({ open: true, message: 'Envoi en cours...', severity: 'info' });

      // Validation des champs requis
      if (!user) {
        setSnackbar({ open: true, message: 'Vous devez être connecté pour créer une annonce.', severity: 'error' });
        return;
      }

      if (!formData.title || !formData.price || !formData.city || !formData.country) {
        setSnackbar({ open: true, message: 'Veuillez remplir tous les champs obligatoires.', severity: 'error' });
        return;
      }

      // Convertir les images en base64 (solution temporaire)
      const imageUrls = await Promise.all(
        selectedImages.map(async (image) => {
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const base64String = reader.result as string;
              console.log('[AddPropertyScreen] Image convertie en base64, taille:', base64String.length);
              resolve(base64String);
            };
            reader.onerror = () => {
              console.error('[AddPropertyScreen] Erreur lors de la conversion en base64');
              reject(new Error('Erreur conversion image'));
            };
            reader.readAsDataURL(image.file!);
          });
        })
      );

      // Convertir les documents en base64 (solution temporaire)
      const documentUrls = await Promise.all(
        selectedDocuments.map(async (doc) => {
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const base64String = reader.result as string;
              console.log('[AddPropertyScreen] Document converti en base64, taille:', base64String.length);
              resolve(base64String);
            };
            reader.onerror = () => {
              console.error('[AddPropertyScreen] Erreur lors de la conversion du document en base64');
              reject(new Error('Erreur conversion document'));
            };
            reader.readAsDataURL(doc.file!);
          });
        })
      );

      // Créer l'annonce
      const { data, error } = await supabase
        .from('properties')
        .insert([{
          title: formData.title,
          description: formData.description,
          price: parseInt(formData.price),
          type: formData.type,
          country: formData.country,
          city: formData.city,
          address: formData.address,
          phone: formData.phone,
          transaction_type: formData.transaction_type,
          rooms: formData.rooms ? parseInt(formData.rooms) : null,
          bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
          surface: formData.surface ? parseFloat(formData.surface) : null,
          year_built: formData.yearBuilt ? parseInt(formData.yearBuilt) : null,
          floor: formData.floor ? parseInt(formData.floor) : null,
          furnished: formData.furnished,
          has_parking: formData.hasParking,
          has_garden: formData.hasGarden,
          has_pool: formData.hasPool,
          amenities: formData.amenities,
          images: imageUrls,
          documents: documentUrls,
          latitude: location?.latitude || null,
          longitude: location?.longitude || null,
          status: 'pending',
          payment_status: paymentOption === 'paid' ? 'paid' : 'pending',
          user_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      // Message de succès selon le type de paiement
      const successMessage = paymentOption === 'paid' 
        ? 'Annonce créée et payée avec succès ! Elle sera visible après validation.'
        : userPublishedCount < 2 
          ? 'Annonce gratuite créée avec succès ! Elle sera visible après validation.'
          : 'Annonce créée avec succès ! Paiement requis après validation pour la publier.';

      setSnackbar({ 
        open: true, 
        message: successMessage, 
        severity: 'success' 
      });

      // Réinitialiser le formulaire
      setFormData({
        title: '',
        description: '',
        price: '',
        type: 'Maison',
        country: 'Mali',
        city: '',
        address: '',
        phone: '',
        transaction_type: 'vente',
        rooms: '',
        bathrooms: '',
        surface: '',
        yearBuilt: '',
        floor: '',
        hasParking: false,
        furnished: false,
        hasGarden: false,
        hasPool: false,
        amenities: [],
        images: []
      });
      
      setSelectedImages([]);
      setSelectedDocuments([]);

      // Rediriger vers la page d'accueil après 2 secondes
      setTimeout(() => {
        navigate('/');
      }, 2000);

    } catch (error) {
      console.error('Erreur lors de la création de l\'annonce:', error);
      setSnackbar({ 
        open: true, 
        message: error instanceof Error ? error.message : 'Une erreur est survenue', 
        severity: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
    <Typography variant="h4" component="h1" gutterBottom>
      Ajouter une propriété
    </Typography>

    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Informations générales
      </Typography>
      
      <Grid container spacing={2}>
        <Grid xs={12}>
          <TextField
            fullWidth
            label="Titre de l'annonce *"
            name="title"
            value={formData.title}
            onChange={handleChange}
            margin="normal"
            required
          />
        </Grid>

        <Grid xs={12} md={6}>
          <FormControl fullWidth margin="normal" required>
            <InputLabel>Type de transaction *</InputLabel>
            <Select
              name="transaction_type"
              value={formData.transaction_type}
              onChange={handleChange}
              label="Type de transaction *"
            >
              <MenuItem value="vente">À vendre</MenuItem>
              <MenuItem value="location">À louer</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid xs={12} md={6}>
          <TextField
            fullWidth
            label="Prix *"
            name="price"
            type="number"
            value={formData.price}
            onChange={handleChange}
            margin="normal"
            required
            InputProps={{
              endAdornment: (
                <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                  FCFA
                </Typography>
              ),
            }}
          />
        </Grid>

        <Grid xs={12} md={6}>
          <FormControl fullWidth margin="normal" required>
            <InputLabel>Type de bien *</InputLabel>
            <Select
              name="type"
              value={formData.type}
              onChange={handleChange}
              label="Type de bien *"
            >
              <MenuItem value="Maison">Maison</MenuItem>
              <MenuItem value="Appartement">Appartement</MenuItem>
              <MenuItem value="Terrain">Terrain</MenuItem>
              <MenuItem value="Bureau">Bureau</MenuItem>
              <MenuItem value="Local commercial">Local commercial</MenuItem>
              <MenuItem value="Autre">Autre</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid xs={12} md={6}>
          <TextField
            fullWidth
            label="Téléphone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            margin="normal"
          />
        </Grid>

        <Grid xs={12}>
          <TextField
            fullWidth
            label="Description *"
            name="description"
            value={formData.description}
            onChange={handleChange}
            margin="normal"
            multiline
            rows={4}
            required
          />
        </Grid>
      </Grid>
    </Paper>

    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Localisation
      </Typography>
      
      <Grid container spacing={2}>
        <Grid xs={12} md={6}>
          <TextField
            fullWidth
            label="Pays *"
            name="country"
            value={formData.country}
            onChange={handleChange}
            margin="normal"
            required
          />
        </Grid>
        
        <Grid xs={12} md={6}>
          <TextField
            fullWidth
            label="Ville *"
            name="city"
            value={formData.city}
            onChange={handleChange}
            margin="normal"
            required
          />
        </Grid>
        
        <Grid xs={12}>
          <TextField
            fullWidth
            label="Adresse complète"
            name="address"
            value={formData.address}
            onChange={handleChange}
            margin="normal"
          />
        </Grid>
        
        <Grid xs={12}>
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <Button
              variant="outlined"
              startIcon={<LocationOn />}
              onClick={getCurrentLocation}
              sx={{ flex: 1 }}
            >
              Utiliser ma position
            </Button>
            
            {location && (
              <Button
                variant="outlined"
                startIcon={<Map />}
                onClick={openInGoogleMaps}
                sx={{ flex: 1 }}
              >
                Voir sur Google Maps
              </Button>
            )}
          </Box>
          
          {location && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
              <Typography variant="body2" color="success.dark">
                Position enregistrée: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
              </Typography>
            </Box>
          )}
        </Grid>
      </Grid>
    </Paper>

    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Caractéristiques
      </Typography>
      
      <Grid container spacing={3}>
        <Grid xs={12} md={4}>
          <TextField
            fullWidth
            label="Surface (m²)"
            name="surface"
            type="number"
            value={formData.surface}
            onChange={handleChange}
            margin="normal"
          />
        </Grid>
        
        <Grid xs={12} md={4}>
          <TextField
            fullWidth
            label="Pièces"
            name="rooms"
            type="number"
            value={formData.rooms}
            onChange={handleChange}
            margin="normal"
          />
        </Grid>
        
        <Grid xs={12} md={4}>
          <TextField
            fullWidth
            label="Salles de bain"
            name="bathrooms"
            type="number"
            value={formData.bathrooms}
            onChange={handleChange}
            margin="normal"
          />
        </Grid>
        
        
        <Grid xs={12} md={4}>
          <TextField
            fullWidth
            label="Étage"
            name="floor"
            type="number"
            value={formData.floor}
            onChange={handleChange}
            margin="normal"
          />
        </Grid>
        <Grid xs={12} md={4}>
          <TextField
            fullWidth
            label="Année de construction"
            name="yearBuilt"
            type="number"
            value={formData.yearBuilt}
            onChange={handleChange}
            margin="normal"
          />
        </Grid>
        
        <Grid xs={12}>
          
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.furnished}
                onChange={handleCheckboxChange}
                name="furnished"
                color="primary"
              />
            }
            label="Meublé"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.hasParking}
                onChange={handleCheckboxChange}
                name="hasParking"
                color="primary"
              />
            }
            label="Parking"
          />
          
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.hasGarden}
                onChange={handleCheckboxChange}
                name="hasGarden"
                color="primary"
              />
            }
            label="Jardin"
          />
          
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.hasPool}
                onChange={handleCheckboxChange}
                name="hasPool"
                color="primary"
              />
            }
            label="Piscine"
          />
        </Grid>
        
        <Grid xs={12}>
          <Typography variant="subtitle1" gutterBottom>
            Équipements
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {availableAmenities.map((amenity) => (
              <Chip
                key={amenity}
                label={amenity}
                onClick={() => handleAmenityToggle(amenity)}
                color={formData.amenities?.includes(amenity) ? 'primary' : 'default'}
                variant={formData.amenities?.includes(amenity) ? 'filled' : 'outlined'}
              />
            ))}
          </Box>
        </Grid>
      </Grid>
    </Paper>

    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Photos
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Ajoutez jusqu'à 10 photos. La première photo sera la photo de couverture.
      </Typography>
      
      <input
        accept="image/*"
        style={{ display: 'none' }}
        id="image-upload"
        type="file"
        multiple
        onChange={handleImageSelect}
      />
      <label htmlFor="image-upload">
        <Button
          variant="outlined"
          component="span"
          startIcon={<PhotoCamera />}
          disabled={selectedImages.length >= 10}
          sx={{ mb: 2 }}
        >
          Ajouter des photos ({selectedImages.length}/10)
        </Button>
      </label>
      
      <Grid container spacing={2}>
        {selectedImages.map((image, index) => (
          <Grid xs={6} sm={4} md={3} key={index}>
            <Card>
              <CardMedia
                component="img"
                height="140"
                image={image.preview || image.uri}
                alt={`Image ${index + 1}`}
                onClick={() => handleImagePreview(image)}
                sx={{ cursor: 'pointer' }}
              />
              <CardActions>
                <Button
                  size="small"
                  color="error"
                  startIcon={<Delete />}
                  onClick={() => removeImage(index)}
                >
                  Supprimer
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Paper>

    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Documents (optionnel)
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Vous pouvez ajouter des documents comme des plans, des diagnostics, etc.
      </Typography>
      
      <input
        accept=".pdf,.doc,.docx,.xls,.xlsx"
        style={{ display: 'none' }}
        id="document-upload"
        type="file"
        multiple
        onChange={handleDocumentSelect}
      />
      <label htmlFor="document-upload">
        <Button
          variant="outlined"
          component="span"
          startIcon={<AttachFile />}
          sx={{ mb: 2 }}
        >
          Ajouter des documents
        </Button>
      </label>
      
      <List>
        {selectedDocuments.map((doc, index) => (
          <ListItem
            key={index}
            secondaryAction={
              <IconButton
                edge="end"
              aria-label="supprimer"
              onClick={() => removeDocument(index)}
            >
              <Delete />
            </IconButton>
          }
        >
          <ListItemIcon>
            {getFileIcon(doc.type)}
          </ListItemIcon>
          <ListItemText
            primary={doc.name}
            secondary={`${getFileType(doc.type)} • ${formatFileSize(doc.size || 0)}`}
          />
        </ListItem>
        ))}
      </List>
    </Paper>

    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Options de publication
      </Typography>
      
      {userPublishedCount < 2 ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Vous avez {userPublishedCount}/2 annonces gratuites publiées. Cette annonce sera gratuite !
        </Alert>
      ) : (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Vous avez déjà publié {userPublishedCount} annonces. Les annonces supplémentaires nécessitent un paiement de {paymentAmount.toLocaleString()} FCFA.
        </Alert>
      )}

      <Card sx={{ mt: 2 }}>
        <CardContent>
          <RadioGroup
            value={paymentOption}
            onChange={(e) => setPaymentOption(e.target.value as 'free' | 'paid')}
          >
            <FormControlLabel
              value="free"
              control={<Radio />}
              label={
                <Box>
                  <Typography variant="body1" fontWeight="bold">
                    {userPublishedCount < 2 ? 'Publication gratuite' : 'Attendre la validation'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {userPublishedCount < 2 
                      ? 'Votre annonce sera visible immédiatement après validation par un administrateur.'
                      : 'Votre annonce sera validée mais nécessitera un paiement pour être visible.'
                    }
                  </Typography>
                </Box>
              }
              disabled={false}
            />
            
            {userPublishedCount >= 2 && (
              <FormControlLabel
                value="paid"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1" fontWeight="bold">
                      Payer maintenant - {paymentAmount.toLocaleString()} FCFA
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Votre annonce sera visible immédiatement après validation. 
                      <strong> Attention : Le paiement ne sera effectué que si votre annonce est approuvée.</strong>
                    </Typography>
                  </Box>
                }
              />
            )}
          </RadioGroup>
        </CardContent>
      </Card>
    </Paper>

    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
    <Button
      variant="contained"
      color="primary"
      size="large"
      onClick={handlePaymentClick}
      disabled={loading}
      startIcon={loading ? <CircularProgress size={24} /> : <CheckCircle />}
    >
      {loading ? 'Publication en cours...' : 
       paymentOption === 'paid' && userPublishedCount >= 2 
         ? `Payer et publier (${paymentAmount.toLocaleString()} FCFA)`
         : 'Publier l\'annonce gratuitement'
      }
    </Button>
  </Box>

  {/* Modal de paiement */}
  <Dialog
    open={showPaymentModal}
    onClose={() => setShowPaymentModal(false)}
    maxWidth="sm"
    fullWidth
  >
    <DialogTitle>
      <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CreditCard />
        Choisissez votre mode de paiement
      </Typography>
    </DialogTitle>
    <DialogContent>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Montant à payer : <strong>{paymentAmount.toLocaleString()} FCFA</strong>
      </Typography>
      
      <Grid container spacing={2}>
        {/* Orange Money */}
        <Grid xs={12}>
          <Card 
            sx={{ 
              cursor: 'pointer',
              border: selectedPaymentMethod === 'orange' ? 2 : 1,
              borderColor: selectedPaymentMethod === 'orange' ? 'primary.main' : 'grey.300',
              '&:hover': { borderColor: 'primary.main' }
            }}
            onClick={() => !paymentLoading && selectPaymentMethod('orange')}
          >
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ 
                width: 50, 
                height: 50, 
                borderRadius: 1, 
                bgcolor: 'orange', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <Smartphone sx={{ color: 'white' }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6">Orange Money</Typography>
                <Typography variant="body2" color="text.secondary">
                  Paiement mobile sécurisé
                </Typography>
              </Box>
              {paymentLoading && selectedPaymentMethod === 'orange' && (
                <CircularProgress size={24} />
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Stripe */}
        <Grid xs={12}>
          <Card 
            sx={{ 
              cursor: 'pointer',
              border: selectedPaymentMethod === 'stripe' ? 2 : 1,
              borderColor: selectedPaymentMethod === 'stripe' ? 'primary.main' : 'grey.300',
              '&:hover': { borderColor: 'primary.main' }
            }}
            onClick={() => !paymentLoading && selectPaymentMethod('stripe')}
          >
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ 
                width: 50, 
                height: 50, 
                borderRadius: 1, 
                bgcolor: '#635bff', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <CreditCard sx={{ color: 'white' }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6">Stripe</Typography>
                <Typography variant="body2" color="text.secondary">
                  Carte bancaire (Visa, Mastercard)
                </Typography>
              </Box>
              {paymentLoading && selectedPaymentMethod === 'stripe' && (
                <CircularProgress size={24} />
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* PayPal */}
        <Grid xs={12}>
          <Card 
            sx={{ 
              cursor: 'pointer',
              border: selectedPaymentMethod === 'paypal' ? 2 : 1,
              borderColor: selectedPaymentMethod === 'paypal' ? 'primary.main' : 'grey.300',
              '&:hover': { borderColor: 'primary.main' }
            }}
            onClick={() => !paymentLoading && selectPaymentMethod('paypal')}
          >
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ 
                width: 50, 
                height: 50, 
                borderRadius: 1, 
                bgcolor: '#0070ba', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <AttachMoney sx={{ color: 'white' }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6">PayPal</Typography>
                <Typography variant="body2" color="text.secondary">
                  Paiement sécurisé PayPal
                </Typography>
              </Box>
              {paymentLoading && selectedPaymentMethod === 'paypal' && (
                <CircularProgress size={24} />
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Formulaire de paiement spécifique */}
      {showPaymentForm && selectedPaymentMethod && (
        <Box sx={{ mt: 3, p: 2, border: 1, borderColor: 'primary.main', borderRadius: 1 }}>
          {selectedPaymentMethod === 'orange' && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Paiement Orange Money
              </Typography>
              <TextField
                fullWidth
                label="Numéro Orange Money"
                placeholder="Ex: 77 12 34 56"
                value={orangePhoneNumber}
                onChange={(e) => setOrangePhoneNumber(e.target.value)}
                sx={{ mb: 2 }}
                inputProps={{ maxLength: 12 }}
              />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => setShowPaymentForm(false)}
                  disabled={paymentLoading}
                >
                  Retour
                </Button>
                <Button
                  variant="contained"
                  onClick={handleOrangePayment}
                  disabled={paymentLoading}
                  startIcon={paymentLoading ? <CircularProgress size={20} /> : <Smartphone />}
                >
                  {paymentLoading ? 'Paiement en cours...' : `Payer ${paymentAmount.toLocaleString()} FCFA`}
                </Button>
              </Box>
            </Box>
          )}

          {selectedPaymentMethod === 'stripe' && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Paiement par Carte Bancaire
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Vous serez redirigé vers la page sécurisée Stripe pour effectuer votre paiement.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => setShowPaymentForm(false)}
                  disabled={paymentLoading}
                >
                  Retour
                </Button>
                <Button
                  variant="contained"
                  onClick={handleStripePayment}
                  disabled={paymentLoading}
                  startIcon={paymentLoading ? <CircularProgress size={20} /> : <CreditCard />}
                >
                  {paymentLoading ? 'Redirection...' : `Payer ${paymentAmount.toLocaleString()} FCFA`}
                </Button>
              </Box>
            </Box>
          )}

          {selectedPaymentMethod === 'paypal' && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Paiement PayPal
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Vous serez redirigé vers PayPal pour effectuer votre paiement en toute sécurité.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => setShowPaymentForm(false)}
                  disabled={paymentLoading}
                >
                  Retour
                </Button>
                <Button
                  variant="contained"
                  onClick={handlePayPalPayment}
                  disabled={paymentLoading}
                  startIcon={paymentLoading ? <CircularProgress size={20} /> : <AttachMoney />}
                >
                  {paymentLoading ? 'Redirection...' : `Payer ${paymentAmount.toLocaleString()} FCFA`}
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      )}

      <Alert severity="info" sx={{ mt: 2 }}>
        <Typography variant="body2">
          <strong>Sécurité garantie :</strong> Le paiement ne sera effectué que si votre annonce est approuvée par nos administrateurs.
        </Typography>
      </Alert>
    </DialogContent>
  </Dialog>

  {/* Modal d'aperçu d'image */}
  <Dialog
    open={!!selectedImage}
    onClose={handleClosePreview}
    maxWidth="md"
    fullWidth
  >
    <DialogTitle>
      Aperçu de l'image
      <IconButton
        aria-label="fermer"
        onClick={handleClosePreview}
        sx={{
          position: 'absolute',
          right: 8,
          top: 8,
          color: (theme) => theme.palette.grey[500],
        }}
      >
        <Close />
      </IconButton>
    </DialogTitle>
    <DialogContent>
      <img
        src={selectedImage?.preview || selectedImage?.uri}
        alt="Aperçu"
        style={{ width: '100%', height: 'auto' }}
      />
    </DialogContent>
  </Dialog>

  {/* Snackbar pour les notifications */}
  <Snackbar
    open={snackbar.open}
    autoHideDuration={6000}
    onClose={() => setSnackbar({ ...snackbar, open: false })}
    anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
  >
    <Alert
      onClose={() => setSnackbar({ ...snackbar, open: false })}
      severity={snackbar.severity}
      sx={{ width: '100%' }}
    >
      {snackbar.message}
    </Alert>
  </Snackbar>
</Box>
  );
};

export default AddPropertyScreen;