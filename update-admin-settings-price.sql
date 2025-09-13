-- Script pour ajouter la configuration du prix d'annonce dans admin_settings
-- À exécuter dans l'éditeur SQL de Supabase

-- 1. Ajouter la colonne listing_price à la table admin_settings
ALTER TABLE public.admin_settings 
ADD COLUMN IF NOT EXISTS listing_price INTEGER NOT NULL DEFAULT 5000;

-- 2. Mettre à jour les paramètres existants avec le prix par défaut
UPDATE public.admin_settings 
SET listing_price = 5000 
WHERE listing_price IS NULL OR listing_price = 0;

-- 3. Vérifier que la colonne a été ajoutée correctement
SELECT 
    id,
    free_listings_limit,
    listing_price,
    created_at,
    updated_at
FROM public.admin_settings;
