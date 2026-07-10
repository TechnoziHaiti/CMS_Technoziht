-- Script de création de la base de données CMS WebTechnozi

-- 1. Table Settings
CREATE TABLE public.settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    description TEXT,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    social_links JSONB DEFAULT '{}'::jsonb,
    hero_title TEXT,
    hero_subtitle TEXT,
    hero_cta TEXT,
    hero_image_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Insérer une ligne par défaut pour les settings
INSERT INTO public.settings (description, email) VALUES ('Description courte', 'contact@webtechnozi.com');

-- 2. Table Services
CREATE TABLE public.services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(100), -- Nom de l'icône Lucide
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Table Projects
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT,
    technologies TEXT[], -- Tableau de chaînes
    link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Table Testimonials
CREATE TABLE public.testimonials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    photo_url TEXT,
    message TEXT NOT NULL,
    position VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Table Messages (Contact)
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status BOOLEAN DEFAULT false, -- false = non lu, true = lu
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Création du Bucket de stockage pour les images
INSERT INTO storage.buckets (id, name, public) VALUES ('cms-uploads', 'cms-uploads', true);
CREATE POLICY "Images publiques" ON storage.objects FOR SELECT USING ( bucket_id = 'cms-uploads' );
