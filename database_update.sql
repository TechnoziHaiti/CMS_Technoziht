-- 1. Updates to products table
ALTER TABLE products RENAME COLUMN title TO name;

-- Renommer l'ancien prix
ALTER TABLE products RENAME COLUMN price TO price_text;

-- Ajouter les nouvelles colonnes
ALTER TABLE products ADD COLUMN price NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE products ADD COLUMN discount_price NUMERIC(10, 2);
ALTER TABLE products ADD COLUMN brand VARCHAR(255);
ALTER TABLE products ADD COLUMN quantite_stock INT DEFAULT 0;
ALTER TABLE products ADD COLUMN quantite_reservee INT DEFAULT 0;
ALTER TABLE products ADD COLUMN status VARCHAR(50) DEFAULT 'active';

-- Créer les autres tables
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES public.customers(id),
    total_amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'PAYMENT_PENDING',
    payment_method VARCHAR(50),
    receipt_url TEXT,
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id),
    quantity INT NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL
);

CREATE TABLE public.reservation_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    token UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    expiration_time TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.products(id),
    quantity_change INT NOT NULL,
    previous_stock INT NOT NULL,
    new_stock INT NOT NULL,
    reason VARCHAR(255) NOT NULL,
    admin_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    action VARCHAR(255) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Stored procedure for confirming payment securely (Transaction)
CREATE OR REPLACE FUNCTION confirm_payment(p_order_id UUID, p_admin_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_status VARCHAR;
    v_item RECORD;
    v_stock INT;
    v_reserved INT;
BEGIN
    -- Obtenir le statut de la commande avec un verrou (FOR UPDATE)
    SELECT status INTO v_order_status
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Commande introuvable';
    END IF;

    IF v_order_status != 'PAYMENT_PENDING' THEN
        RAISE EXCEPTION 'Commande déjà traitée ou expirée';
    END IF;

    -- Mettre à jour la commande
    UPDATE public.orders
    SET status = 'PAID', updated_at = timezone('utc'::text, now())
    WHERE id = p_order_id;

    -- Pour chaque article, réduire le stock et libérer la réservation
    FOR v_item IN SELECT product_id, quantity FROM public.order_items WHERE order_id = p_order_id LOOP
        
        -- Verrouiller le produit
        SELECT quantite_stock, quantite_reservee INTO v_stock, v_reserved
        FROM public.products
        WHERE id = v_item.product_id
        FOR UPDATE;
        
        -- Mettre à jour le stock
        UPDATE public.products
        SET quantite_stock = quantite_stock - v_item.quantity,
            quantite_reservee = quantite_reservee - v_item.quantity
        WHERE id = v_item.product_id;

        -- Historique
        INSERT INTO public.stock_movements (product_id, quantity_change, previous_stock, new_stock, reason, admin_id)
        VALUES (
            v_item.product_id, 
            -v_item.quantity, 
            v_stock, 
            v_stock - v_item.quantity, 
            'Vente validée (Commande ' || p_order_id || ')', 
            p_admin_id
        );
    END LOOP;

    RETURN TRUE;
END;
$$;

-- Stored procedure for creating an order and reserving stock securely
CREATE OR REPLACE FUNCTION create_order(
    p_customer_name VARCHAR,
    p_customer_email VARCHAR,
    p_customer_phone VARCHAR,
    p_customer_address TEXT,
    p_customer_city VARCHAR,
    p_total_amount NUMERIC,
    p_payment_method VARCHAR,
    p_comments TEXT,
    p_items JSONB -- Array of {product_id, quantity, unit_price}
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_customer_id UUID;
    v_order_id UUID;
    v_order_number VARCHAR;
    v_token UUID;
    v_item RECORD;
    v_product RECORD;
BEGIN
    -- Insert or oder a client (by email )
    SELECT id INTO v_customer_id FROM public.customers WHERE email = p_customer_email LIMIT 1;
    IF NOT FOUND THEN
        INSERT INTO public.customers (name, email, phone, address, city)
        VALUES (p_customer_name, p_customer_email, p_customer_phone, p_customer_address, p_customer_city)
        RETURNING id INTO v_customer_id;
    END IF;

    -- 2. Generate unique order number (e.g. TZ-26-0004)
    -- Simplified generator using sequence or timestamp
    v_order_number := 'TZ-' || to_char(now(), 'YY') || '-' || lpad(floor(random() * 10000)::text, 4, '0');

    -- 3. Create Order
    INSERT INTO public.orders (order_number, customer_id, total_amount, payment_method, comments)
    VALUES (v_order_number, v_customer_id, p_total_amount, p_payment_method, p_comments)
    RETURNING id INTO v_order_id;

    -- 4. Process Items (Check stock with lock)
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INT, unit_price NUMERIC)
    LOOP
        -- Lock product row
        SELECT * INTO v_product FROM public.products WHERE id = v_item.product_id FOR UPDATE;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Produit % introuvable', v_item.product_id;
        END IF;

        IF (v_product.quantite_stock - v_product.quantite_reservee) < v_item.quantity THEN
            RAISE EXCEPTION 'Stock insuffisant pour le produit %', v_product.name;
        END IF;

        -- Update reserved stock
        UPDATE public.products 
        SET quantite_reservee = quantite_reservee + v_item.quantity
        WHERE id = v_item.product_id;

        -- Insert order item
        INSERT INTO public.order_items (order_id, product_id, quantity, unit_price)
        VALUES (v_order_id, v_item.product_id, v_item.quantity, v_item.unit_price);
    END LOOP;

    -- 5. Create reservation token (15 mins)
    INSERT INTO public.reservation_tokens (order_id, expiration_time)
    VALUES (v_order_id, now() + interval '15 minutes')
    RETURNING token INTO v_token;

    RETURN jsonb_build_object(
        'order_id', v_order_id,
        'order_number', v_order_number,
        'token', v_token
    );
END;
$$;

