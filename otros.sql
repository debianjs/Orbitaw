-- ============================================
-- SISTEMA DE CHAT EN TIEMPO REAL - DUCLE TEAM
-- ============================================

-- 1. Actualizar tabla de perfiles con campos adicionales
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'offline';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ban_reason TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ban_expires_at TIMESTAMP WITH TIME ZONE;

-- Crear índices para optimización
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_is_banned ON public.profiles(is_banned);

-- 2. Tabla de mensajes públicos (foro principal)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Índices para optimización de mensajes públicos
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_deleted ON public.messages(is_deleted) WHERE is_deleted = FALSE;

-- RLS para mensajes públicos
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Messages are viewable by everyone"
    ON public.messages FOR SELECT
    USING (is_deleted = FALSE);

CREATE POLICY "Users can insert own messages"
    ON public.messages FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own messages"
    ON public.messages FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own messages"
    ON public.messages FOR DELETE
    USING (auth.uid() = user_id);

-- 3. Tabla de mensajes privados (chats 1-1)
CREATE TABLE IF NOT EXISTS public.private_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_read BOOLEAN DEFAULT FALSE,
    is_deleted_by_sender BOOLEAN DEFAULT FALSE,
    is_deleted_by_receiver BOOLEAN DEFAULT FALSE
);

-- Índices para optimización de mensajes privados
CREATE INDEX IF NOT EXISTS idx_private_messages_sender ON public.private_messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_private_messages_receiver ON public.private_messages(receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_private_messages_conversation ON public.private_messages(sender_id, receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_private_messages_unread ON public.private_messages(receiver_id, is_read) WHERE is_read = FALSE;

-- RLS para mensajes privados
ALTER TABLE public.private_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their private messages"
    ON public.private_messages FOR SELECT
    USING (
        auth.uid() = sender_id OR auth.uid() = receiver_id
    );

CREATE POLICY "Users can send private messages"
    ON public.private_messages FOR INSERT
    WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their private messages"
    ON public.private_messages FOR UPDATE
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- 4. Tabla de amigos/contactos
CREATE TABLE IF NOT EXISTS public.friendships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, friend_id)
);

-- Índices para amistades
CREATE INDEX IF NOT EXISTS idx_friendships_user ON public.friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON public.friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON public.friendships(status);

-- RLS para amistades
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their friendships"
    ON public.friendships FOR SELECT
    USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friendship requests"
    ON public.friendships FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update friendship status"
    ON public.friendships FOR UPDATE
    USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- 5. Tabla de logs de conexión (para admin panel)
CREATE TABLE IF NOT EXISTS public.connection_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ip_address TEXT NOT NULL,
    user_agent TEXT,
    action TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para logs
CREATE INDEX IF NOT EXISTS idx_connection_logs_user ON public.connection_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_connection_logs_ip ON public.connection_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_connection_logs_created ON public.connection_logs(created_at DESC);

-- RLS para logs (solo admins)
ALTER TABLE public.connection_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view logs"
    ON public.connection_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
        )
    );

-- 6. Tabla de baneos
CREATE TABLE IF NOT EXISTS public.bans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ip_address TEXT NOT NULL,
    reason TEXT NOT NULL,
    banned_by UUID REFERENCES auth.users(id) NOT NULL,
    banned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_permanent BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE
);

-- Índices para baneos
CREATE INDEX IF NOT EXISTS idx_bans_user ON public.bans(user_id);
CREATE INDEX IF NOT EXISTS idx_bans_ip ON public.bans(ip_address);
CREATE INDEX IF NOT EXISTS idx_bans_active ON public.bans(is_active) WHERE is_active = TRUE;

-- RLS para baneos (solo admins)
ALTER TABLE public.bans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can manage bans"
    ON public.bans FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
        )
    );

-- 7. Tabla de notificaciones
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('message', 'friend_request', 'system')),
    title TEXT NOT NULL,
    content TEXT,
    from_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para notificaciones
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = FALSE;

-- RLS para notificaciones
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- 8. Función para limpiar mensajes antiguos (optimización)
-- Se ejecutará automáticamente para borrar mensajes de más de 30 días
CREATE OR REPLACE FUNCTION clean_old_messages()
RETURNS void AS $$
BEGIN
    -- Marcar mensajes públicos antiguos como eliminados
    UPDATE public.messages
    SET is_deleted = TRUE
    WHERE created_at < NOW() - INTERVAL '30 days'
    AND is_deleted = FALSE;
    
    -- Eliminar mensajes privados antiguos ya leídos
    DELETE FROM public.private_messages
    WHERE created_at < NOW() - INTERVAL '30 days'
    AND is_read = TRUE
    AND (is_deleted_by_sender = TRUE OR is_deleted_by_receiver = TRUE);
    
    -- Eliminar notificaciones antiguas leídas
    DELETE FROM public.notifications
    WHERE created_at < NOW() - INTERVAL '7 days'
    AND is_read = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Función para crear notificación automática
CREATE OR REPLACE FUNCTION create_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Si es un mensaje privado, crear notificación
    IF TG_TABLE_NAME = 'private_messages' THEN
        INSERT INTO public.notifications (user_id, type, title, content, from_user_id)
        VALUES (
            NEW.receiver_id,
            'message',
            'New private message',
            LEFT(NEW.content, 50),
            NEW.sender_id
        );
    END IF;
    
    -- Si es una solicitud de amistad
    IF TG_TABLE_NAME = 'friendships' AND NEW.status = 'pending' THEN
        INSERT INTO public.notifications (user_id, type, title, from_user_id)
        VALUES (
            NEW.friend_id,
            'friend_request',
            'New friend request',
            NEW.user_id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers para notificaciones automáticas
DROP TRIGGER IF EXISTS on_private_message_sent ON public.private_messages;
CREATE TRIGGER on_private_message_sent
    AFTER INSERT ON public.private_messages
    FOR EACH ROW
    EXECUTE FUNCTION create_notification();

DROP TRIGGER IF EXISTS on_friend_request ON public.friendships;
CREATE TRIGGER on_friend_request
    AFTER INSERT ON public.friendships
    FOR EACH ROW
    EXECUTE FUNCTION create_notification();

-- 10. Función para verificar si un usuario está baneado
CREATE OR REPLACE FUNCTION is_user_banned(check_user_id UUID, check_ip TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    banned BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.bans
        WHERE (user_id = check_user_id OR ip_address = check_ip)
        AND is_active = TRUE
        AND (is_permanent = TRUE OR expires_at > NOW())
    ) INTO banned;
    
    RETURN banned;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Vista para conversaciones privadas (optimización)
CREATE OR REPLACE VIEW private_conversations AS
SELECT DISTINCT
    CASE
        WHEN pm.sender_id < pm.receiver_id THEN pm.sender_id
        ELSE pm.receiver_id
    END as user1_id,
    CASE
        WHEN pm.sender_id < pm.receiver_id THEN pm.receiver_id
        ELSE pm.sender_id
    END as user2_id,
    MAX(pm.created_at) as last_message_at,
    COUNT(*) FILTER (WHERE pm.is_read = FALSE AND pm.receiver_id = auth.uid()) as unread_count
FROM public.private_messages pm
WHERE pm.is_deleted_by_sender = FALSE AND pm.is_deleted_by_receiver = FALSE
GROUP BY user1_id, user2_id;

-- Dar permisos a la vista
GRANT SELECT ON private_conversations TO authenticated;

-- 12. Función para actualizar el estado del usuario
CREATE OR REPLACE FUNCTION update_user_status()
RETURNS void AS $$
BEGIN
    UPDATE public.profiles
    SET 
        status = 'online',
        last_seen = NOW()
    WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Crear usuario admin por defecto (CAMBIA EL EMAIL)
-- Primero crea un usuario normal desde el registro, luego ejecuta:
-- UPDATE public.profiles SET is_admin = TRUE WHERE email = 'tuemailadmin@example.com';

-- ============================================
-- NOTAS IMPORTANTES:
-- ============================================
-- 1. Los mensajes públicos se marcan como eliminados después de 30 días
-- 2. Los mensajes privados se eliminan permanentemente después de 30 días si están leídos
-- 3. Las notificaciones se eliminan después de 7 días si están leídas
-- 4. Para hacer a alguien admin: UPDATE public.profiles SET is_admin = TRUE WHERE email = 'email@example.com';
-- 5. El sistema de baneos verifica tanto user_id como IP
-- ============================================