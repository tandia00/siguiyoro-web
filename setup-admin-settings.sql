-- Créer la table admin_settings pour stocker les paramètres administrateur
CREATE TABLE IF NOT EXISTS public.admin_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    free_listings_limit INTEGER NOT NULL DEFAULT 2,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insérer les paramètres par défaut
INSERT INTO public.admin_settings (free_listings_limit, created_at, updated_at)
VALUES (2, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Créer une politique RLS pour permettre aux admins de gérer les paramètres
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre aux utilisateurs authentifiés de lire les paramètres
CREATE POLICY "Allow authenticated users to read admin settings" 
ON public.admin_settings 
FOR SELECT 
TO authenticated 
USING (true);

-- Politique pour permettre aux admins de modifier les paramètres
CREATE POLICY "Allow admins to manage admin settings" 
ON public.admin_settings 
FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Créer une fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Créer le trigger pour mettre à jour updated_at automatiquement
CREATE TRIGGER update_admin_settings_updated_at 
    BEFORE UPDATE ON public.admin_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
