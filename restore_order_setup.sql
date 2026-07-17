-- Fonction avancée pour restaurer et valider une commande expirée
-- Gère les stocks partiels et utilise FOR UPDATE pour bloquer les conflits

CREATE OR REPLACE FUNCTION restore_order(p_order_id UUID, p_admin_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
    v_item RECORD;
    v_available INT;
    v_new_total NUMERIC := 0;
    v_item_total NUMERIC := 0;
    v_is_partial BOOLEAN := FALSE;
    v_is_empty BOOLEAN := TRUE;
    v_result JSONB;
BEGIN
    -- 1. Verrouiller la commande pour éviter des modifications parallèles
    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Commande introuvable';
    END IF;

    IF v_order.status != 'EXPIRED' THEN
        RAISE EXCEPTION 'Seule une commande expirée peut être restaurée';
    END IF;

    -- 2. Traiter chaque article et verrouiller les produits
    FOR v_item IN (SELECT * FROM public.order_items WHERE order_id = p_order_id FOR UPDATE) LOOP
        DECLARE
            v_prod RECORD;
            v_actual_price NUMERIC;
            v_qty_to_give INT;
        BEGIN
            -- Verrouiller le produit (FOR UPDATE)
            SELECT * INTO v_prod FROM public.products WHERE id = v_item.product_id FOR UPDATE;
            
            IF NOT FOUND THEN
                CONTINUE;
            END IF;

            v_available := v_prod.quantite_stock - v_prod.quantite_reservee;
            v_actual_price := v_item.unit_price;

            -- Calculer la quantité qu'on peut donner
            IF v_available >= v_item.quantity THEN
                v_qty_to_give := v_item.quantity;
            ELSIF v_available > 0 THEN
                v_qty_to_give := v_available;
                v_is_partial := TRUE;
            ELSE
                v_qty_to_give := 0;
                v_is_partial := TRUE;
            END IF;

            -- Si on peut honorer au moins 1 produit
            IF v_qty_to_give > 0 THEN
                v_is_empty := FALSE;
                
                -- Déduire le stock définitivement
                UPDATE public.products
                SET quantite_stock = quantite_stock - v_qty_to_give
                WHERE id = v_prod.id;

                -- Mettre à jour l'article de la commande si la quantité a baissé
                IF v_qty_to_give != v_item.quantity THEN
                    UPDATE public.order_items
                    SET quantity = v_qty_to_give
                    WHERE id = v_item.id;
                END IF;

                v_item_total := v_qty_to_give * v_actual_price;
                v_new_total := v_new_total + v_item_total;

                -- Historique de stock
                INSERT INTO public.stock_movements (product_id, quantity_change, previous_stock, new_stock, reason, admin_id)
                VALUES (
                    v_prod.id, 
                    -v_qty_to_give, 
                    v_prod.quantite_stock, 
                    v_prod.quantite_stock - v_qty_to_give, 
                    'Restauration (Commande ' || p_order_id || ')', 
                    p_admin_id
                );
            ELSE
                -- Plus du tout de stock pour cet article, on le supprime de la commande
                DELETE FROM public.order_items WHERE id = v_item.id;
            END IF;
        END;
    END LOOP;

    -- 3. Si aucun article n'a pu être restauré (rupture totale)
    IF v_is_empty THEN
        RAISE EXCEPTION 'Rupture de stock totale. Impossible de restaurer la commande.';
    END IF;

    -- 4. Valider la commande et mettre à jour le prix
    UPDATE public.orders
    SET status = 'PAID', total_amount = v_new_total, updated_at = timezone('utc'::text, now())
    WHERE id = p_order_id;

    -- 5. Retourner le résultat au CMS
    v_result := jsonb_build_object(
        'success', true,
        'is_partial', v_is_partial,
        'new_total', v_new_total
    );

    RETURN v_result;
END;
$$;
