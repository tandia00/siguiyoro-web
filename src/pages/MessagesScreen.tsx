import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Search, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Conversation } from '../types/index';
import { messageCountService, UnreadCount } from '../services/messageCountService';
import Layout from '../components/Layout';

const MessagesScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCounts, setUnreadCounts] = useState<UnreadCount[]>([]);

  useEffect(() => {
    if (user) {
      console.log('[MessagesScreen] Initialisation pour l\'utilisateur:', user.id);
      fetchConversations();
      
      // Démarrer le service de comptage
      console.log('[MessagesScreen] Démarrage du service de comptage');
      messageCountService.startCountingForUser(user.id);
      
      // S'abonner aux mises à jour de comptage
      const unsubscribe = messageCountService.subscribe('messages-screen', (counts) => {
        console.log('[MessagesScreen] Mise à jour des comptages reçue:', counts);
        setUnreadCounts(counts);
      });
      
      return () => {
        console.log('[MessagesScreen] Nettoyage des abonnements');
        unsubscribe();
        messageCountService.stopCounting();
      };
    }
  }, [user]);

  const fetchConversations = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Récupérer les messages sans jointures pour éviter PGRST201
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur lors de la récupération des messages:', error);
        return;
      }

      // Grouper les messages par conversation et récupérer les données séparément
      const conversationMap = new Map<string, Conversation>();
      const propertyIds = new Set<string>();
      const userIds = new Set<string>();

      messages?.forEach((message: any) => {
        const isCurrentUserSender = message.sender_id === user.id;
        const otherUserId = isCurrentUserSender ? message.receiver_id : message.sender_id;
        const conversationKey = `${message.property_id}-${otherUserId}`;

        // Collecter les IDs pour les requêtes séparées
        if (message.property_id) propertyIds.add(message.property_id);
        userIds.add(otherUserId);

        const existingConversation = conversationMap.get(conversationKey);

        if (!existingConversation || new Date(message.created_at) > new Date(existingConversation.last_message_time)) {
          conversationMap.set(conversationKey, {
            id: conversationKey,
            property_id: message.property_id,
            sender_id: message.sender_id,
            receiver_id: message.receiver_id,
            last_message: message.content,
            last_message_time: message.created_at,
            unread_count: 0,
            is_sender: isCurrentUserSender,
            other_user_name: 'Chargement...',
            other_user_avatar: undefined,
            property_title: 'Chargement...',
            property_image: undefined,
            created_at: message.created_at
          });
        }
      });

      // Récupérer les données des propriétés séparément
      const { data: properties } = await supabase
        .from('properties')
        .select('id, title, images')
        .in('id', Array.from(propertyIds));

      // Récupérer les données des utilisateurs séparément
      let users: Array<{id: string; full_name?: string}> = [];
      if (userIds.size > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', Array.from(userIds));
        
        if (usersError) {
          console.error('Erreur lors de la récupération des utilisateurs:', usersError);
        } else {
          users = usersData || [];
        }
      }

      // Enrichir les conversations avec les données récupérées
      conversationMap.forEach((conversation) => {
        const property = properties?.find(p => p.id === conversation.property_id);
        const otherUserId = conversation.sender_id === user.id ? conversation.receiver_id : conversation.sender_id;
        const otherUser = users?.find(u => u.id === otherUserId);

        conversation.property_title = property?.title || 'Propriété inconnue';
        conversation.property_image = property?.images?.[0];
        conversation.other_user_name = otherUser?.full_name || 'Utilisateur inconnu';
        conversation.other_user_avatar = undefined;
      });

      // Mettre à jour is_sender pour indiquer si le dernier message est de l'utilisateur actuel
      conversationMap.forEach((conversation) => {
        conversation.is_sender = conversation.sender_id === user.id;
        // Ne pas initialiser unread_count ici, il sera calculé dynamiquement
      });

      setConversations(Array.from(conversationMap.values()));
    } catch (error) {
      console.error('Erreur lors de la récupération des conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fonction utilitaire pour obtenir le nombre de messages non lus pour une conversation
  const getUnreadCount = (conversation: Conversation): number => {
    const otherUserId = conversation.sender_id === user?.id ? conversation.receiver_id : conversation.sender_id;
    const conversationKey = `${conversation.property_id}-${otherUserId}`;
    const count = unreadCounts.find(c => c.conversationKey === conversationKey)?.count || 0;
    console.log(`[MessagesScreen] getUnreadCount pour ${conversationKey}:`, count);
    
    // Debug: vérifier l'état réel des messages pour cette conversation
    if (count > 0) {
      messageCountService.debugMessages(conversation.property_id, otherUserId);
    }
    
    return count;
  };

  // Filtrer les conversations en fonction de la recherche
  const filteredConversations = conversations.map(conv => {
    // Ajouter le comptage des messages non lus à chaque conversation
    const unreadCount = getUnreadCount(conv);
    console.log(`[MessagesScreen] Conversation ${conv.id} - unreadCount:`, unreadCount);
    return {
      ...conv,
      unread_count: unreadCount
    };
  }).filter(conv => {
    const matchesSearch = 
      conv.other_user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (conv.property_title || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 jours
      return date.toLocaleDateString('fr-FR', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    }
  };

  const handleConversationPress = (conversation: Conversation) => {
    const otherUserId = conversation.sender_id === user?.id ? conversation.receiver_id : conversation.sender_id;
    navigate(`/chat/${conversation.property_id}/${otherUserId}`);
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/')}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ArrowLeft className="h-6 w-6 text-gray-600" />
                </button>
                <h1 className="text-xl font-semibold text-gray-900">Messages</h1>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Barre de recherche */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher une conversation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Liste des conversations */}
          {filteredConversations.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery ? 'Aucune conversation trouvée' : 'Aucune conversation'}
              </h3>
              <p className="text-gray-500">
                {searchQuery 
                  ? 'Essayez avec d\'autres mots-clés'
                  : 'Vos conversations apparaîtront ici'
                }
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-200">
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => handleConversationPress(conversation)}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    {/* Avatar de l'utilisateur */}
                    <div className="flex-shrink-0">
                      {conversation.other_user_avatar ? (
                        <img
                          src={conversation.other_user_avatar}
                          alt={conversation.other_user_name}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Contenu de la conversation */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {conversation.other_user_name}
                        </h3>
                        <span className="text-xs text-gray-500">
                          {formatTime(conversation.last_message_time)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1 truncate">
                        {conversation.property_title}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {conversation.last_message}
                      </p>
                    </div>

                    {/* Image de la propriété et badge non lu */}
                    <div className="flex-shrink-0 flex items-center space-x-3">
                      {conversation.property_image && (
                        <img
                          src={conversation.property_image}
                          alt={conversation.property_title}
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                      )}
                      {conversation.unread_count > 0 && (
                        <div className="bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
                          {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default MessagesScreen;
