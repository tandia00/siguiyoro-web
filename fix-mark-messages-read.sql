-- Fonction corrigée pour marquer les messages comme lus
-- Cette version utilise SECURITY DEFINER pour contourner les restrictions RLS

CREATE OR REPLACE FUNCTION mark_messages_as_read_fixed(
  p_property_id UUID,
  p_sender_id UUID,
  p_receiver_id UUID
) RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Mettre à jour les messages non lus
  UPDATE messages 
  SET read = true 
  WHERE property_id = p_property_id 
    AND sender_id = p_sender_id
    AND receiver_id = p_receiver_id
    AND read = false
    AND deleted_at IS NULL;
  
  -- Obtenir le nombre de lignes affectées
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Log pour débogage
  RAISE NOTICE 'Messages mis à jour: %', updated_count;
  
  -- Retourner le comptage
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Donner les permissions nécessaires
GRANT EXECUTE ON FUNCTION mark_messages_as_read_fixed(UUID, UUID, UUID) TO authenticated;

-- Commentaire pour expliquer l'usage
COMMENT ON FUNCTION mark_messages_as_read_fixed IS 'Marque les messages comme lus pour une conversation spécifique. Utilise SECURITY DEFINER pour contourner RLS.';
