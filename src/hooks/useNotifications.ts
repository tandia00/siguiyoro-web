import { useState, useEffect, useCallback } from 'react';
import { notificationService } from '../services/notificationService';

export const useNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  // Au chargement, vérifier l'état initial de la permission
  useEffect(() => {
    if (notificationService.isSupported()) {
      setPermission(notificationService.getPermissionStatus());
    }
  }, []);

  // Fonction pour demander la permission, initiée par l'utilisateur
  const requestPermission = useCallback(async () => {
    if (!notificationService.isSupported()) {
      return false;
    }

    const hasPermission = await notificationService.requestPermission();
    setPermission(notificationService.getPermissionStatus());
    
    if (hasPermission) {
        notificationService.showNotification('Notifications activées',
         { body: 'Vous recevrez maintenant les notifications de Siguiyoro.' });
    }

    return hasPermission;
  }, []);

  return {
    permission,
    requestPermission,
    isSupported: notificationService.isSupported(),
  };
};
