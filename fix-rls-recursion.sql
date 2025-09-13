-- Script pour corriger la récursion infinie dans les politiques RLS
-- À exécuter dans l'éditeur SQL de Supabase

-- 1. Supprimer les politiques problématiques
DROP POLICY IF EXISTS "Users can read their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

-- 2. Créer une politique simple pour permettre la lecture des rôles
CREATE POLICY "Allow authenticated users to read user_roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated 
USING (true);

-- 3. Créer une politique pour permettre l'insertion (pour les super admins seulement)
CREATE POLICY "Allow service role to manage user_roles" 
ON public.user_roles 
FOR ALL 
TO service_role 
USING (true);

-- 4. Créer une fonction pour vérifier si un utilisateur est admin
-- Cette fonction évite la récursion en utilisant une requête directe
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = user_uuid AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Vérifier que tout fonctionne
SELECT 
    ur.id,
    ur.user_id,
    ur.role,
    p.email,
    p.full_name,
    ur.created_at,
    is_admin(ur.user_id) as is_admin_check
FROM public.user_roles ur
JOIN public.profiles p ON ur.user_id = p.id
WHERE ur.role = 'admin';
