import { useEffect, useState, useRef } from 'react';
import { notificationService } from '../services/notificationService';
import { useAuth } from '../contexts/AuthContext';

export const useNotifications = () => {
  const { user } = useAuth();
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionRequested, setPermissionRequested] = useState(false);
  const welcomeNotificationSent = useRef(false);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user || !notificationService.isSupported()) return;

    // Réinitialiser si l'utilisateur a changé
    if (userIdRef.current !== user.id) {
      userIdRef.current = user.id;
      welcomeNotificationSent.current = false;
    }

    // Vérifier la permission actuelle
    const currentPermission = notificationService.getPermissionStatus();
    setHasPermission(currentPermission === 'granted');

    // Demander la permission automatiquement si pas encore demandée
    if (currentPermission === 'default' && !permissionRequested) {
      requestPermission();
    }
  }, [user, permissionRequested]);

  const requestPermission = async () => {
    if (!notificationService.isSupported()) {
      console.warn('Les notifications ne sont pas supportées sur ce navigateur');
      return false;
    }

    setPermissionRequested(true);
    
    try {
      const granted = await notificationService.requestPermission();
      setHasPermission(granted);
      
      // Envoyer la notification de bienvenue seulement une fois
      if (granted && !welcomeNotificationSent.current) {
        welcomeNotificationSent.current = true;
        await notificationService.notify(
          'Notifications activées',
          'Vous recevrez maintenant des notifications pour les nouveaux messages',
          'success'
        );
      }
      
      return granted;
    } catch (error) {
      console.error('Erreur lors de la demande de permission:', error);
      return false;
    }
  };

  return {
    hasPermission,
    requestPermission,
    isSupported: notificationService.isSupported(),
    permissionStatus: notificationService.getPermissionStatus()
  };
};
