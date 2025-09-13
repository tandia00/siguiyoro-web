import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Send, User, Phone, MapPin, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Message, Property, User as UserType } from '../types/index';
import { messageCountService } from '../services/messageCountService';
import Layout from '../components/Layout';

const ChatScreen: React.FC = () => {
  const navigate = useNavigate();
  const { propertyId, recipientId } = useParams<{ propertyId: string; recipientId: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [property, setProperty] = useState<Property | null>(null);
  const [otherUser, setOtherUser] = useState<UserType | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const markMessagesAsRead = useCallback(async () => {
    if (!user || !propertyId || !recipientId) return;
    try {
      await messageCountService.markAsRead(propertyId, recipientId);
      setMessages(prev => prev.map(msg => (
        msg.receiver_id === user.id ? { ...msg, read: true } : msg
      )));
    } catch (error) {
      console.error('[ChatScreen] Erreur lors du marquage des messages comme lus:', error);
    }
  }, [user, propertyId, recipientId]);

  const fetchChatData = useCallback(async () => {
    if (!user || !propertyId || !recipientId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Récupérer les infos de la propriété
      const { data: propertyData, error: propertyError } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single();

      if (propertyError) {
        console.error('Erreur propriété:', propertyError);
      } else {
        setProperty(propertyData);
      }

      // Récupérer les infos de l'autre utilisateur
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', recipientId)
        .single();

      if (userError) {
        console.error('Erreur utilisateur:', userError);
      } else {
        setOtherUser(userData);
      }

      // Récupérer les messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${recipientId},property_id.eq.${propertyId}),and(sender_id.eq.${recipientId},receiver_id.eq.${user.id},property_id.eq.${propertyId})`)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error('Erreur messages:', messagesError);
      } else {
        setMessages(messagesData || []);
      }

    } catch (error) {
      console.error('Erreur lors de la récupération des données du chat:', error);
    } finally {
      setLoading(false);
    }
  }, [user, propertyId, recipientId]);

  useEffect(() => {
    if (user) {
      // Initialiser le service avec l'utilisateur connecté
      messageCountService.startCountingForUser(user.id);
    }
    
    fetchChatData();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        markMessagesAsRead();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    markMessagesAsRead(); // Marquer au montage
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchChatData, markMessagesAsRead, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !propertyId || !recipientId || sending) return;

    try {
      setSending(true);

      const messageData = {
        content: newMessage.trim(),
        sender_id: user.id,
        receiver_id: recipientId,
        property_id: propertyId,
        read: false
      };

      const { data, error } = await supabase
        .from('messages')
        .insert([messageData])
        .select()
        .single();

      if (error) {
        console.error('Erreur lors de l\'envoi du message:', error);
        return;
      }

      setMessages(prev => [...prev, data]);
      setNewMessage('');
      
      // Forcer une mise à jour du comptage après envoi
      messageCountService.forceUpdate();
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Aujourd'hui";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Hier";
    } else {
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
  };

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {};
    
    messages.forEach(message => {
      const date = new Date(message.created_at).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });

    return groups;
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

  const messageGroups = groupMessagesByDate(messages);

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200 flex-shrink-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/messages')}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ArrowLeft className="h-6 w-6 text-gray-600" />
                </button>
                
                <div className="flex items-center space-x-3">
                  {otherUser?.avatar_url ? (
                    <img
                      src={otherUser.avatar_url}
                      alt={otherUser.full_name}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                  
                  <div>
                    <h1 className="text-lg font-semibold text-gray-900">
                      {otherUser?.full_name || 'Utilisateur inconnu'}
                    </h1>
                    <p className="text-sm text-gray-500">{property?.title}</p>
                  </div>
                </div>
              </div>

              {property?.phone && (
                <button
                  onClick={() => window.open(`tel:${property.phone}`)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <Phone className="h-5 w-5 text-gray-600" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Informations de la propriété */}
        {property && (
          <div className="bg-white border-b border-gray-200 flex-shrink-0">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center space-x-4">
                {property.images?.[0] && (
                  <img
                    src={property.images[0]}
                    alt={property.title}
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{property.title}</h3>
                  <p className="text-sm text-gray-500 flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {property.address}, {property.city}
                  </p>
                  <p className="text-lg font-semibold text-green-600">
                    {property.price.toLocaleString()} FCFA
                    {property.transaction_type === 'rent' && '/mois'}
                  </p>
                </div>
                <button
                  onClick={() => navigate(`/property/${property.id}`)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Voir
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            {Object.entries(messageGroups).map(([date, dayMessages]) => (
              <div key={date} className="mb-6">
                {/* Séparateur de date */}
                <div className="flex items-center justify-center mb-4">
                  <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                    {formatDate(dayMessages[0].created_at)}
                  </div>
                </div>

                {/* Messages du jour */}
                <div className="space-y-4">
                  {dayMessages.map((message) => {
                    const isCurrentUser = message.sender_id === user?.id;
                    
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            isCurrentUser
                              ? 'bg-green-600 text-white'
                              : 'bg-white text-gray-900 border border-gray-200'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p
                            className={`text-xs mt-1 ${
                              isCurrentUser ? 'text-green-100' : 'text-gray-500'
                            }`}
                          >
                            {formatTime(message.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            
            {messages.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-500">
                  <p>Aucun message pour le moment.</p>
                  <p className="text-sm mt-1">Commencez la conversation !</p>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Zone de saisie */}
        <div className="bg-white border-t border-gray-200 flex-shrink-0">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-end space-x-4">
              <div className="flex-1">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Tapez votre message..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  rows={1}
                  style={{ minHeight: '40px', maxHeight: '120px' }}
                />
              </div>
              
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || sending}
                className={`p-2 rounded-lg transition-colors ${
                  newMessage.trim() && !sending
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {sending ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ChatScreen;
