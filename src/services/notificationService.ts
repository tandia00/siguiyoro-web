import { supabase } from '../lib/supabase';

export interface NotificationData {
  id: string;
  title: string;
  body: string;
  icon?: string;
  data?: any;
  timestamp: Date;
  read: boolean;
}

class NotificationService {
  private permission: NotificationPermission = 'default';
  private notifications: NotificationData[] = [];
  private listeners: ((notifications: NotificationData[]) => void)[] = [];

  constructor() {
    this.initializePermission();
  }

  // Initialiser les permissions de notification
  private initializePermission() {
    if (this.isSupported()) {
      this.permission = Notification.permission;
      console.log('[NotificationService] Permission actuelle:', this.permission);
    }
  }

  // Demander la permission pour les notifications
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('[NotificationService] Les notifications ne sont pas supportées');
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    try {
      this.permission = await Notification.requestPermission();
      console.log('[NotificationService] Nouvelle permission:', this.permission);
      return this.permission === 'granted';
    } catch (error) {
      console.error('[NotificationService] Erreur lors de la demande de permission:', error);
      return false;
    }
  }

  // Afficher une notification browser
  async showBrowserNotification(title: string, options: NotificationOptions = {}) {
    if (this.permission !== 'granted') {
      console.warn('[NotificationService] Permission refusée pour les notifications');
      return;
    }

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options
      });

      // Auto-fermer après 5 secondes
      setTimeout(() => {
        notification.close();
      }, 5000);

      return notification;
    } catch (error) {
      console.error('[NotificationService] Erreur lors de l\'affichage de la notification:', error);
    }
  }

  // Ajouter une notification dans l'app
  addInAppNotification(notification: Omit<NotificationData, 'id' | 'timestamp' | 'read'>) {
    const newNotification: NotificationData = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      read: false
    };

    this.notifications.unshift(newNotification);
    
    // Limiter à 50 notifications
    if (this.notifications.length > 50) {
      this.notifications = this.notifications.slice(0, 50);
    }

    this.notifyListeners();
    console.log('[NotificationService] Nouvelle notification ajoutée:', newNotification);
  }

  // Marquer une notification comme lue
  markAsRead(notificationId: string) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.notifyListeners();
      console.log('[NotificationService] Notification marquée comme lue:', notificationId);
    }
  }

  // Marquer toutes les notifications comme lues
  markAllAsRead() {
    this.notifications.forEach(n => n.read = true);
    this.notifyListeners();
    console.log('[NotificationService] Toutes les notifications marquées comme lues');
  }

  // Supprimer une notification
  removeNotification(notificationId: string) {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.notifyListeners();
    console.log('[NotificationService] Notification supprimée:', notificationId);
  }

  // Obtenir toutes les notifications
  getNotifications(): NotificationData[] {
    return [...this.notifications];
  }

  // Obtenir le nombre de notifications non lues
  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  // S'abonner aux changements de notifications
  subscribe(callback: (notifications: NotificationData[]) => void) {
    this.listeners.push(callback);
    // Envoyer immédiatement l'état actuel
    callback(this.getNotifications());
    
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  // Notifier tous les écouteurs
  private notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.getNotifications());
      } catch (error) {
        console.error('[NotificationService] Erreur lors de la notification des écouteurs:', error);
      }
    });
  }

  // Notification pour nouveau message
  async notifyNewMessage(senderName: string, messageContent: string, propertyTitle: string) {
    const title = `Nouveau message de ${senderName}`;
    const body = `${messageContent}\n📍 ${propertyTitle}`;

    // Notification browser
    await this.showBrowserNotification(title, {
      body,
      tag: 'new-message',
      requireInteraction: false
    });

    // Notification in-app
    this.addInAppNotification({
      title,
      body,
      icon: '💬',
      data: {
        type: 'message',
        senderName,
        messageContent,
        propertyTitle
      }
    });
  }

  // Notification pour nouvelle propriété
  async notifyNewProperty(propertyTitle: string, location: string, price: string) {
    const title = 'Nouvelle propriété disponible';
    const body = `${propertyTitle}\n📍 ${location}\n💰 ${price}`;

    await this.showBrowserNotification(title, {
      body,
      tag: 'new-property'
    });

    this.addInAppNotification({
      title,
      body,
      icon: '🏠',
      data: {
        type: 'property',
        propertyTitle,
        location,
        price
      }
    });
  }

  // Notification générale
  async notify(title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
    const icons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };

    await this.showBrowserNotification(title, {
      body: message,
      tag: `notification-${type}`
    });

    this.addInAppNotification({
      title,
      body: message,
      icon: icons[type],
      data: { type }
    });
  }

  // Vérifier si les notifications sont supportées
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  // Obtenir le statut de permission
  getPermissionStatus(): NotificationPermission {
    if (this.isSupported()) {
        return Notification.permission;
    }
    return 'denied'; // Retourner 'denied' si non supporté
  }
}

// Instance singleton
export const notificationService = new NotificationService();
