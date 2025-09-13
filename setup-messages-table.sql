-- Création de la table messages pour le système de messagerie
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT NOT NULL,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_property_id ON public.messages(property_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_read ON public.messages(read);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_messages_updated_at 
    BEFORE UPDATE ON public.messages 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Politiques RLS (Row Level Security)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre aux utilisateurs de voir leurs propres messages (envoyés ou reçus)
CREATE POLICY "Users can view their own messages" ON public.messages
    FOR SELECT USING (
        auth.uid() = sender_id OR auth.uid() = recipient_id
    );

-- Politique pour permettre aux utilisateurs d'insérer des messages qu'ils envoient
CREATE POLICY "Users can insert messages they send" ON public.messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id
    );

-- Politique pour permettre aux utilisateurs de mettre à jour le statut de lecture des messages qu'ils reçoivent
CREATE POLICY "Users can update read status of received messages" ON public.messages
    FOR UPDATE USING (
        auth.uid() = recipient_id
    ) WITH CHECK (
        auth.uid() = recipient_id
    );

-- Politique pour permettre aux utilisateurs de supprimer leurs propres messages
CREATE POLICY "Users can delete their own messages" ON public.messages
    FOR DELETE USING (
        auth.uid() = sender_id
    );

-- Accorder les permissions nécessaires
GRANT ALL ON public.messages TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
