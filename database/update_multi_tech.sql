-- Migration: Passer d'un seul technicien à un tableau de techniciens (Multiple)

-- 1. Ajouter la nouvelle colonne 'technician_ids' (Tableau de UUIDs)
ALTER TABLE contact_messages 
ADD COLUMN technician_ids UUID[] DEFAULT '{}';

-- 2. Transférer les données existantes de 'technician_id' vers le nouveau tableau
UPDATE contact_messages 
SET technician_ids = ARRAY[technician_id]
WHERE technician_id IS NOT NULL;

-- 3. (Optionnel mais recommandé) Supprimer l'ancienne colonne 'technician_id'
ALTER TABLE contact_messages 
DROP COLUMN technician_id;
