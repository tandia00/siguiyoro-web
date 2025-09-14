export interface InAppNotification {
  id: string;
  title: string;
  body: string;
  timestamp: Date;
  read: boolean;
  link?: string;
}

class NotificationService {
  // --- Properties ---
  private inAppNotifications: InAppNotification[] = [];
  private listeners: ((notifications: InAppNotification[]) => void)[] = [];

  // --- Push Notifications ---

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

  // Affiche une notification push
  async showNotification(title: string, options?: NotificationOptions) {
    if (this.getPermissionStatus() !== 'granted') {
      console.warn('Permission for notifications not granted.');
      return;
    }

    new Notification(title, options);
  }

  // --- In-App Notifications ---

  subscribe(callback: (notifications: InAppNotification[]) => void) {
    this.listeners.push(callback);
    // Envoyer l'état actuel immédiatement
    callback(this.inAppNotifications);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyListeners() {
    for (const listener of this.listeners) {
      listener(this.inAppNotifications);
    }
  }

  addInAppNotification(notification: Omit<InAppNotification, 'id' | 'timestamp' | 'read'>) {
    const newNotification: InAppNotification = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      read: false,
      ...notification,
    };

    this.inAppNotifications.unshift(newNotification); // Add to the beginning
    this.notifyListeners();
  }

  getUnreadCount(): number {
    return this.inAppNotifications.filter(n => !n.read).length;
  }

  markAllAsRead() {
    this.inAppNotifications.forEach(n => n.read = true);
    this.notifyListeners();
  }
}

export const notificationService = new NotificationService();
