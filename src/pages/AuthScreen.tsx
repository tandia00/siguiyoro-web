import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Mail, Lock, User, Phone, ArrowLeft } from 'lucide-react';
import logo from '../assets/Sigui (2).jpg';

const AuthScreen: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    phone: '',
    user_type: 'client' as 'client' | 'merchant'
  });
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (showForgotPassword) {
        // Handle forgot password
        if (!formData.email) {
          setError('Veuillez entrer votre email');
          return;
        }
        // Here you would implement forgot password logic
        alert('Un email de réinitialisation a été envoyé à votre adresse.');
        setShowForgotPassword(false);
      } else if (isLogin) {
        const { error } = await signIn(formData.email, formData.password);
        if (error) {
          setError(error.message || 'Erreur de connexion');
        } else {
          navigate('/');
        }
      } else {
        // Validation for registration
        if (!formData.full_name || !formData.email || !formData.password || !formData.confirmPassword) {
          setError('Veuillez remplir tous les champs obligatoires');
          return;
        }
        if (formData.password !== formData.confirmPassword) {
          setError('Les mots de passe ne correspondent pas');
          return;
        }
        if (formData.password.length < 6) {
          setError('Le mot de passe doit contenir au moins 6 caractères');
          return;
        }
        
        const { error } = await signUp(formData.email, formData.password, {
          full_name: formData.full_name,
          phone: formData.phone,
          user_type: formData.user_type
        });
        if (error) {
          setError(error.message || 'Erreur lors de l\'inscription');
        } else {
          setError('');
          alert('Inscription réussie ! Vérifiez votre email pour confirmer votre compte.');
        }
      }
    } catch (err) {
      setError('Une erreur inattendue s\'est produite');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      full_name: '',
      phone: '',
      user_type: 'client'
    });
    setError('');
    setShowForgotPassword(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-green-600 text-white p-6 relative">
          {(showForgotPassword || !isLogin) && (
            <button
              onClick={() => {
                if (showForgotPassword) {
                  setShowForgotPassword(false);
                } else {
                  setIsLogin(true);
                  resetForm();
                }
              }}
              className="absolute left-4 top-6 p-2 hover:bg-green-700 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="text-center">
            <img src={logo} alt="Sigui Agence Immobilière" className="w-full h-32 mb-4 object-contain" />
            <p className="text-green-100 mt-2">
              {showForgotPassword ? 'Réinitialiser le mot de passe' :
               isLogin ? 'Connectez-vous à votre compte' : 'Créez votre compte'}
            </p>
          </div>
        </div>

        {/* Form Container */}
        <div className="p-8">

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-colors"
                  placeholder="votre@email.com"
                />
              </div>
            </div>

            {/* Password */}
            {!showForgotPassword && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mot de passe *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required={!showForgotPassword}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-colors"
                    placeholder="••••••••"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            )}

            {/* Confirm Password for Registration */}
            {!isLogin && !showForgotPassword && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmer le mot de passe *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-colors"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            )}

            {/* Registration fields */}
            {!isLogin && !showForgotPassword && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom complet *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      required
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-colors"
                      placeholder="Votre nom complet"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Téléphone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-colors"
                      placeholder="+223 XX XX XX XX"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type de compte *
                  </label>
                  <select
                    name="user_type"
                    value={formData.user_type}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-colors bg-white"
                  >
                    <option value="client">Client</option>
                    <option value="merchant">Commerçant</option>
                  </select>
                </div>
              </>
            )}

            {/* Forgot Password Link */}
            {isLogin && !showForgotPassword && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-green-600 hover:text-green-700 text-sm font-medium transition-colors"
                >
                  Mot de passe oublié ?
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  {showForgotPassword ? 'Envoi...' : isLogin ? 'Connexion...' : 'Inscription...'}
                </div>
              ) : (
                showForgotPassword ? 'Envoyer le lien' : isLogin ? 'Se connecter' : 'S\'inscrire'
              )}
            </button>
          </form>

          {/* Toggle */}
          {!showForgotPassword && (
            <div className="mt-6 text-center">
              <p className="text-gray-600 text-sm mb-2">
                {isLogin ? "Pas encore de compte ?" : "Déjà un compte ?"}
              </p>
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  resetForm();
                }}
                className="text-green-600 hover:text-green-700 font-medium transition-colors"
              >
                {isLogin ? "S'inscrire" : "Se connecter"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
