class NotificationService {
  // Vérifie si l'API est supportée, de manière sûre
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  // Récupère le statut de la permission, de manière sûre
  getPermissionStatus(): NotificationPermission {
    if (!this.isSupported()) {
      return 'denied';
    }
    return Notification.permission;
  }

  // Demande la permission à l'utilisateur
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      console.warn('Notifications not supported.');
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  // Affiche une notification
  async showNotification(title: string, options?: NotificationOptions) {
    if (this.getPermissionStatus() !== 'granted') {
      console.warn('Permission for notifications not granted.');
      return;
    }

    new Notification(title, options);
  }
}

// Exporter une seule instance (singleton) pour être utilisée dans l'application
export const notificationService = new NotificationService();
