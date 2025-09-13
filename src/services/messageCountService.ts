import { supabase } from '../lib/supabase';

export interface UnreadCount {
  conversationKey: string;
  count: number;
}

class MessageCountService {
  private listeners: Map<string, (counts: UnreadCount[]) => void> = new Map();
  private currentUserId: string | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private lastCounts: Map<string, number> = new Map();
  private processedMessageIds: Set<string> = new Set();

  // Démarrer le service de comptage pour un utilisateur
  startCountingForUser(userId: string) {
    if (this.currentUserId === userId && this.intervalId) {
      return; // Déjà démarré pour cet utilisateur
    }

    this.stopCounting();
    this.currentUserId = userId;
    this.lastCounts.clear();
    this.processedMessageIds.clear();

    // Compter immédiatement
    this.updateCounts();

    // Puis compter toutes les 5 secondes
    this.intervalId = setInterval(() => {
      this.updateCounts();
    }, 5000);
  }

  // Arrêter le service de comptage
  stopCounting() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.currentUserId = null;
    this.lastCounts.clear();
  }

  // Notifier tous les écouteurs des changements
  private notifyListeners() {
    const countsArray = Array.from(this.lastCounts.entries()).map(([conversationKey, count]) => ({
      conversationKey,
      count
    }));
    
    console.log('[MessageCountService] Notification des écouteurs avec les comptages:', countsArray);

    for (const listener of this.listeners.values()) {
      try {
        listener(countsArray);
      } catch (error) {
        console.error('[MessageCountService] Erreur lors de la notification d\'un écouteur:', error);
      }
    }
  }

  // S'abonner aux mises à jour de comptage
  subscribe(key: string, callback: (counts: UnreadCount[]) => void) {
    this.listeners.set(key, callback);
    
    // Retourner une fonction de désabonnement
    return () => {
      this.listeners.delete(key);
    };
  }

  // Marquer les messages comme lus pour une conversation
  async markAsRead(propertyId: string, otherUserId: string) {
    console.log(`[MessageCountService] markAsRead(propertyId: ${propertyId}, otherUserId: ${otherUserId})`);
    if (!this.currentUserId) {
      console.log('[MessageCountService] Aucun utilisateur connecté, impossible de marquer comme lus');
      return;
    }

    try {
      console.log(`[MessageCountService] Mise à jour directe des messages`, {
        property_id: propertyId,
        sender_id: otherUserId,
        receiver_id: this.currentUserId
      });
      
      // Utiliser la fonction SQL corrigée
      const { data, error } = await supabase.rpc('mark_messages_as_read_fixed', {
        p_property_id: propertyId,
        p_sender_id: otherUserId,
        p_receiver_id: this.currentUserId
      });
      
      if (error) {
        console.error('[MessageCountService] Erreur lors de la mise à jour:', error);
      } else {
        console.log(`[MessageCountService] Messages mis à jour avec succès`);
        
        // Mettre à jour le cache local immédiatement
        const conversationKey = `${propertyId}-${otherUserId}`;
        this.lastCounts.set(conversationKey, 0);
        this.notifyListeners();
        
        // Forcer une mise à jour complète des compteurs
        await this.updateCounts();
      }
    } catch (error) {
      console.error('Erreur lors du marquage des messages comme lus:', error);
    }
  }

  // Forcer une mise à jour du comptage
  forceUpdate() {
    if (this.currentUserId) {
      this.updateCounts();
    }
  }

  // Fonction de débogage pour vérifier l'état des messages
  async debugMessages(propertyId: string, otherUserId: string) {
    if (!this.currentUserId) return;
    
    console.log(`[MessageCountService] DEBUG - Vérification des messages pour propertyId=${propertyId}, otherUserId=${otherUserId}, currentUserId=${this.currentUserId}`);
    
    const { data: allMessages, error } = await supabase
      .from('messages')
      .select('id, content, sender_id, receiver_id, read, created_at')
      .eq('property_id', propertyId)
      .or(`and(sender_id.eq.${otherUserId},receiver_id.eq.${this.currentUserId}),and(sender_id.eq.${this.currentUserId},receiver_id.eq.${otherUserId})`)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.error('[MessageCountService] DEBUG - Erreur:', error);
    } else {
      console.log('[MessageCountService] DEBUG - Messages récents:', allMessages);
      allMessages?.forEach(msg => {
        console.log(`[MessageCountService] DEBUG - Message ${msg.id}: de=${msg.sender_id}, vers=${msg.receiver_id}, lu=${msg.read}, contenu="${msg.content}"`);
      });
    }
  }

  // Obtenir le comptage pour une conversation spécifique
  async getCountForConversation(propertyId: string, otherUserId: string): Promise<number> {
    console.log(`[MessageCountService] getCountForConversation(propertyId: ${propertyId}, otherUserId: ${otherUserId})`);
    if (!this.currentUserId) {
      console.log('[MessageCountService] Aucun utilisateur connecté, retourne 0');
      return 0;
    }

    try {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('property_id', propertyId)
        .eq('sender_id', otherUserId)
        .eq('receiver_id', this.currentUserId)
        .eq('read', false)
        .is('deleted_at', null);

      console.log(`[MessageCountService] Nombre de messages non lus: ${count || 0}`);
      return count || 0;
    } catch (error) {
      console.error('Erreur lors du comptage des messages:', error);
      return 0;
    }
  }

  // Méthode privée pour mettre à jour tous les comptages
  private async updateCounts() {
    console.log('[MessageCountService] Début de updateCounts()');
    if (!this.currentUserId) {
      console.log('[MessageCountService] Aucun utilisateur connecté, arrêt de updateCounts()');
      return;
    }

    try {
      console.log(`[MessageCountService] Récupération des messages non lus pour l'utilisateur ${this.currentUserId}`);
      // Récupérer tous les messages non lus de l'utilisateur (sans relations pour éviter les erreurs)
      const { data: unreadMessages, error } = await supabase
        .from('messages')
        .select('id, property_id, sender_id, content, created_at')
        .eq('receiver_id', this.currentUserId)
        .eq('read', false)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      
      console.log(`[MessageCountService] Résultat de la requête:`, { unreadMessages, error });

      if (error) {
        console.error('Erreur lors de la récupération des messages non lus:', error);
        return;
      }

      // Grouper par conversation (property_id + sender_id)
      const countMap = new Map<string, number>();
      const newMessages: any[] = [];
      
      console.log(`[MessageCountService] Traitement de ${unreadMessages?.length || 0} messages non lus`);
      
      unreadMessages?.forEach((message, index) => {
        const conversationKey = `${message.property_id}-${message.sender_id}`;
        console.log(`[MessageCountService] Message ${index + 1}: id=${message.id}, property_id=${message.property_id}, sender_id=${message.sender_id}, clé=${conversationKey}`);
        
        const currentCount = countMap.get(conversationKey) || 0;
        
        // Vérifier si ce message n'a pas déjà été traité ET si c'est vraiment un nouveau message
        if (!this.processedMessageIds.has(message.id)) {
          // Vérifier si cette conversation n'avait pas de messages non lus avant
          const previousCount = this.lastCounts.get(conversationKey) || 0;
          if (previousCount === 0) {
            console.log(`[MessageCountService] Nouveau message détecté: ${message.id} pour ${conversationKey}`);
            newMessages.push(message);
          }
          this.processedMessageIds.add(message.id);
        }
        
        countMap.set(conversationKey, currentCount + 1);
      });

      console.log(`[MessageCountService] Comptage par conversation:`, Object.fromEntries(countMap));

      // Vérifier s'il y a des changements
      const hasChanges = this.hasCountsChanged(countMap);
      console.log(`[MessageCountService] Changements détectés:`, hasChanges);

      if (hasChanges) {
        console.log(`[MessageCountService] Mise à jour des comptages et notification des écouteurs`);
        
        // Envoyer des notifications seulement pour les nouveaux messages (pas tous les messages non lus)
        if (newMessages.length > 0) {
          console.log(`[MessageCountService] Envoi de ${newMessages.length} notifications pour nouveaux messages`);
          
          for (const message of newMessages) {
            // Récupérer les détails séparément pour éviter les erreurs de relation
            const [senderResult, propertyResult] = await Promise.all([
              supabase.from('profiles').select('full_name').eq('id', message.sender_id).single(),
              supabase.from('properties').select('title').eq('id', message.property_id).single()
            ]);
            
            const senderName = senderResult.data?.full_name || 'Utilisateur inconnu';
            const propertyTitle = propertyResult.data?.title || 'Propriété inconnue';
            
            // La logique de notification a été supprimée pour corriger le crash sur iOS
          }
        }
        
        this.lastCounts = countMap;
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour des comptages:', error);
    }
  }

  // Vérifier si les comptages ont changé
  private hasCountsChanged(newCounts: Map<string, number>): boolean {
    // Vérifier si les tailles sont différentes
    if (newCounts.size !== this.lastCounts.size) {
      return true;
    }

    // Vérifier chaque comptage
    for (const [key, count] of newCounts) {
      if (this.lastCounts.get(key) !== count) {
        return true;
      }
    }

    // Vérifier les clés qui ont disparu
    for (const key of this.lastCounts.keys()) {
      if (!newCounts.has(key)) {
        return true;
      }
    }

    return false;
  }
}

// Instance singleton
export const messageCountService = new MessageCountService();
