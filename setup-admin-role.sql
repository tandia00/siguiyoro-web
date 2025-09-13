-- Script pour attribuer le rôle administrateur à traorehamidou1990@gmail.com
-- À exécuter dans l'éditeur SQL de Supabase

-- 1. Créer la table user_roles si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ajouter la contrainte unique séparément pour éviter les conflits
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_user_role' 
        AND table_name = 'user_roles'
    ) THEN
        ALTER TABLE public.user_roles 
        ADD CONSTRAINT unique_user_role 
        UNIQUE (user_id, role);
    END IF;
END $$;

-- 2. Activer RLS sur la table user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Créer les politiques RLS pour user_roles
DO $$
BEGIN
    -- Politique pour permettre aux utilisateurs de lire leurs propres rôles
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Users can read their own roles' 
        AND tablename = 'user_roles'
    ) THEN
        CREATE POLICY "Users can read their own roles" 
        ON public.user_roles 
        FOR SELECT 
        TO authenticated 
        USING (user_id = auth.uid());
    END IF;

    -- Politique pour permettre aux admins de gérer tous les rôles
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Admins can manage all roles' 
        AND tablename = 'user_roles'
    ) THEN
        CREATE POLICY "Admins can manage all roles" 
        ON public.user_roles 
        FOR ALL 
        TO authenticated 
        USING (
            EXISTS (
                SELECT 1 FROM public.user_roles 
                WHERE user_id = auth.uid() AND role = 'admin'
            )
        );
    END IF;
END $$;

-- 5. Attribuer le rôle admin à traorehamidou1990@gmail.com
-- D'abord, récupérer l'ID utilisateur depuis la table profiles
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Récupérer l'ID de l'utilisateur admin depuis la table profiles
    SELECT id INTO admin_user_id 
    FROM public.profiles 
    WHERE email = 'traorehamidou1990@gmail.com' 
    LIMIT 1;
    
    -- Si l'utilisateur existe, lui attribuer le rôle admin
    IF admin_user_id IS NOT NULL THEN
        -- Vérifier si le rôle existe déjà
        IF NOT EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = admin_user_id AND role = 'admin'
        ) THEN
            INSERT INTO public.user_roles (user_id, role, created_at)
            VALUES (admin_user_id, 'admin', NOW());
            
            RAISE NOTICE 'Rôle admin attribué à l''utilisateur %', admin_user_id;
        ELSE
            RAISE NOTICE 'L''utilisateur % a déjà le rôle admin', admin_user_id;
        END IF;
    ELSE
        RAISE NOTICE 'Utilisateur avec l''email traorehamidou1990@gmail.com non trouvé dans la table profiles';
    END IF;
END $$;

-- 6. Vérifier que le rôle a été attribué correctement
SELECT 
    ur.id,
    ur.user_id,
    ur.role,
    p.email,
    p.full_name,
    ur.created_at
FROM public.user_roles ur
JOIN public.profiles p ON ur.user_id = p.id
WHERE ur.role = 'admin';
