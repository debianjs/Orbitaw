// ============================================
// DUCLE TEAM - SISTEMA DE CHAT EN TIEMPO REAL
// ============================================

// Configuración de Supabase
const SUPABASE_URL = 'https://toevvojcvdibsrzmrsyd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvZXZ2b2pjdmRpYnNyem1yc3lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxODE3MTMsImV4cCI6MjA3NDc1NzcxM30.lMvWXVOYN4zV52IPSQrd7BVGLc6oz9XAnGzYiPgGNFw';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Estado global
let currentUser = null;
let currentChatType = 'public'; // 'public' o 'private'
let currentChatUserId = null;
let messagesSubscription = null;
let privateMessagesSubscription = null;
let notificationsSubscription = null;
let friendsSubscription = null;

// Elementos del DOM
const elements = {
    userName: document.getElementById('userName'),
    userAvatar: document.getElementById('userAvatar'),
    userMenuBtn: document.getElementById('userMenuBtn'),
    userDropdown: document.getElementById('userDropdown'),
    logoutBtn: document.getElementById('logoutBtn'),
    messagesContainer: document.getElementById('messagesContainer'),
    messageInput: document.getElementById('messageInput'),
    sendBtn: document.getElementById('sendBtn'),
    charCounter: document.getElementById('charCounter'),
    chatTitle: document.getElementById('chatTitle'),
    closeChatBtn: document.getElementById('closeChatBtn'),
    friendsList: document.getElementById('friendsList'),
    requestsList: document.getElementById('requestsList'),
    addFriendBtn: document.getElementById('addFriendBtn'),
    addFriendModal: document.getElementById('addFriendModal'),
    notificationsBtn: document.getElementById('notificationsBtn'),
    notificationsPanel: document.getElementById('notificationsPanel'),
    notificationsList: document.getElementById('notificationsList'),
    notificationBadge: document.getElementById('notificationBadge'),
    requestBadge: document.getElementById('requestBadge'),
    onlineCount: document.getElementById('onlineCount')
};

// ============================================
// INICIALIZACIÓN
// ============================================

async function init() {
    try {
        // Verificar autenticación
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
            window.location.href = 'signin.html';
            return;
        }

        currentUser = session.user;

        // Verificar si el usuario está baneado
        const isBanned = await checkIfBanned();
        if (isBanned) {
            alert('Your account has been banned. Contact support for more information.');
            await supabase.auth.signOut();
            window.location.href = 'signin.html';
            return;
        }

        // Registrar conexión (para admin panel)
        await logConnection('login');

        // Cargar perfil del usuario
        await loadUserProfile();

        // Actualizar estado a online
        await updateUserStatus('online');

        // Cargar datos iniciales
        await Promise.all([
            loadPublicMessages(),
            loadFriends(),
            loadFriendRequests(),
            loadNotifications()
        ]);

        // Suscribirse a actualizaciones en tiempo real
        subscribeToMessages();
        subscribeToNotifications();
        subscribeToFriends();

        // Configurar event listeners
        setupEventListeners();

        // Actualizar estado cada 30 segundos
        setInterval(() => updateUserStatus('online'), 30000);

        // Al cerrar la ventana, actualizar a offline
        window.addEventListener('beforeunload', () => {
            updateUserStatus('offline');
            logConnection('logout');
        });

    } catch (error) {
        console.error('Error initializing app:', error);
        alert('Error loading application. Please refresh the page.');
    }
}

// ============================================
// FUNCIONES DE AUTENTICACIÓN Y PERFIL
// ============================================

async function checkIfBanned() {
    try {
        const userIp = await getUserIP();
        
        const { data, error } = await supabase.rpc('is_user_banned', {
            check_user_id: currentUser.id,
            check_ip: userIp
        });

        if (error) {
            console.error('Error checking ban status:', error);
            return false;
        }

        return data;
    } catch (error) {
        console.error('Error checking ban:', error);
        return false;
    }
}

async function getUserIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error('Error getting IP:', error);
        return 'unknown';
    }
}

async function logConnection(action) {
    try {
        const userIp = await getUserIP();
        const userAgent = navigator.userAgent;

        await supabase.from('connection_logs').insert({
            user_id: currentUser.id,
            ip_address: userIp,
            user_agent: userAgent,
            action: action
        });
    } catch (error) {
        console.error('Error logging connection:', error);
    }
}

async function loadUserProfile() {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();

        if (error) throw error;

        if (data) {
            elements.userName.textContent = data.full_name || data.email;
            if (data.avatar_url) {
                elements.userAvatar.src = data.avatar_url;
            } else {
                elements.userAvatar.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.email}`;
            }
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

async function updateUserStatus(status) {
    try {
        await supabase.rpc('update_user_status');
    } catch (error) {
        console.error('Error updating status:', error);
    }
}

// ============================================
// MENSAJES PÚBLICOS
// ============================================

async function loadPublicMessages() {
    try {
        const { data, error } = await supabase
            .from('messages')
            .select(`
                id,
                content,
                created_at,
                user_id,
                is_edited,
                profiles!user_id (
                    id,
                    full_name,
                    email,
                    avatar_url
                )
            `)
            .eq('is_deleted', false)
            .order('created_at', { ascending: true })
            .limit(50);

        if (error) throw error;

        elements.messagesContainer.innerHTML = '';
        
        if (data && data.length > 0) {
            data.forEach(message => renderMessage(message, 'public'));
        } else {
            showWelcomeMessage();
        }

        scrollToBottom();
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

function renderMessage(message, type = 'public') {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    messageDiv.dataset.messageId = message.id;

    const isOwnMessage = message.user_id === currentUser.id || message.sender_id === currentUser.id;
    if (isOwnMessage) {
        messageDiv.classList.add('own');
    }

    const profile = message.profiles || message.sender_profile;
    const authorName = profile?.full_name || profile?.email || 'Unknown';
    const avatarUrl = profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.email || 'default'}`;
    
    const timeAgo = getTimeAgo(new Date(message.created_at));

    messageDiv.innerHTML = `
        <img src="${avatarUrl}" alt="${authorName}" class="message-avatar" data-user-id="${message.user_id || message.sender_id}">
        <div class="message-content">
            <div class="message-header">
                <span class="message-author" data-user-id="${message.user_id || message.sender_id}">${authorName}</span>
                <span class="message-time">${timeAgo}</span>
            </div>
            <div class="message-text">${escapeHtml(message.content)}</div>
        </div>
    `;

    // Click en avatar o nombre para abrir chat privado
    const avatar = messageDiv.querySelector('.message-avatar');
    const author = messageDiv.querySelector('.message-author');
    
    [avatar, author].forEach(el => {
        el.addEventListener('click', () => {
            const userId = el.dataset.userId;
            if (userId !== currentUser.id) {
                openPrivateChat(userId, authorName, avatarUrl);
            }
        });
    });

    elements.messagesContainer.appendChild(messageDiv);
}

async function sendPublicMessage() {
    const content = elements.messageInput.value.trim();
    
    if (!content) return;

    try {
        const { error } = await supabase
            .from('messages')
            .insert({
                user_id: currentUser.id,
                content: content
            });

        if (error) throw error;

        elements.messageInput.value = '';
        updateCharCounter();
        scrollToBottom();
    } catch (error) {
        console.error('Error sending message:', error);
        alert('Error sending message. Please try again.');
    }
}

// ============================================
// MENSAJES PRIVADOS
// ============================================

async function openPrivateChat(userId, userName, avatarUrl) {
    currentChatType = 'private';
    currentChatUserId = userId;

    elements.chatTitle.textContent = userName;
    elements.closeChatBtn.style.display = 'block';
    elements.messagesContainer.innerHTML = '';

    await loadPrivateMessages(userId);
    subscribeToPrivateMessages(userId);

    // Marcar mensajes como leídos
    await markMessagesAsRead(userId);
}

async function loadPrivateMessages(userId) {
    try {
        const { data, error } = await supabase
            .from('private_messages')
            .select(`
                id,
                content,
                created_at,
                sender_id,
                receiver_id,
                is_read,
                sender_profile:profiles!sender_id (
                    id,
                    full_name,
                    email,
                    avatar_url
                )
            `)
            .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${currentUser.id})`)
            .order('created_at', { ascending: true })
            .limit(50);

        if (error) throw error;

        if (data && data.length > 0) {
            data.forEach(message => renderMessage(message, 'private'));
        } else {
            elements.messagesContainer.innerHTML = '<div class="welcome-message"><p>Start your conversation</p></div>';
        }

        scrollToBottom();
    } catch (error) {
        console.error('Error loading private messages:', error);
    }
}

async function sendPrivateMessage() {
    const content = elements.messageInput.value.trim();
    
    if (!content || !currentChatUserId) return;

    try {
        const { error } = await supabase
            .from('private_messages')
            .insert({
                sender_id: currentUser.id,
                receiver_id: currentChatUserId,
                content: content
            });

        if (error) throw error;

        elements.messageInput.value = '';
        updateCharCounter();
    } catch (error) {
        console.error('Error sending private message:', error);
        alert('Error sending message. Please try again.');
    }
}

async function markMessagesAsRead(userId) {
    try {
        await supabase
            .from('private_messages')
            .update({ is_read: true })
            .eq('sender_id', userId)
            .eq('receiver_id', currentUser.id)
            .eq('is_read', false);
    } catch (error) {
        console.error('Error marking messages as read:', error);
    }
}

function closePrivateChat() {
    currentChatType = 'public';
    currentChatUserId = null;
    elements.chatTitle.textContent = 'Public Forum';
    elements.closeChatBtn.style.display = 'none';
    
    // Cancelar suscripción a mensajes privados
    if (privateMessagesSubscription) {
        supabase.removeChannel(privateMessagesSubscription);
        privateMessagesSubscription = null;
    }
    
    loadPublicMessages();
}

// ============================================
// AMIGOS Y CONTACTOS
// ============================================

async function loadFriends() {
    try {
        const { data, error } = await supabase
            .from('friendships')
            .select(`
                id,
                friend_id,
                status,
                profiles!friend_id (
                    id,
                    full_name,
                    email,
                    avatar_url,
                    status,
                    last_seen
                )
            `)
            .eq('user_id', currentUser.id)
            .eq('status', 'accepted');

        if (error) throw error;

        elements.friendsList.innerHTML = '';

        if (data && data.length > 0) {
            data.forEach(friendship => {
                const friend = friendship.profiles;
                renderContact(friend, friendship.id);
            });
        } else {
            elements.friendsList.innerHTML = '<div class="no-contacts">No friends yet. Add some!</div>';
        }
    } catch (error) {
        console.error('Error loading friends:', error);
    }
}

function renderContact(friend, friendshipId) {
    const contactDiv = document.createElement('div');
    contactDiv.className = 'contact-item';
    contactDiv.dataset.userId = friend.id;
    contactDiv.dataset.friendshipId = friendshipId;

    const avatarUrl = friend.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.email}`;
    const isOnline = friend.status === 'online';
    const statusText = isOnline ? 'Online' : `Last seen ${getTimeAgo(new Date(friend.last_seen))}`;

    contactDiv.innerHTML = `
        <img src="${avatarUrl}" alt="${friend.full_name}" class="contact-avatar ${isOnline ? 'online' : ''}">
        <div class="contact-info">
            <div class="contact-name">${friend.full_name || friend.email}</div>
            <div class="contact-status">${statusText}</div>
        </div>
    `;

    contactDiv.addEventListener('click', () => {
        document.querySelectorAll('.contact-item').forEach(el => el.classList.remove('active'));
        contactDiv.classList.add('active');
        openPrivateChat(friend.id, friend.full_name || friend.email, avatarUrl);
    });

    elements.friendsList.appendChild(contactDiv);
}

async function loadFriendRequests() {
    try {
        const { data, error } = await supabase
            .from('friendships')
            .select(`
                id,
                user_id,
                created_at,
                profiles!user_id (
                    id,
                    full_name,
                    email,
                    avatar_url
                )
            `)
            .eq('friend_id', currentUser.id)
            .eq('status', 'pending');

        if (error) throw error;

        elements.requestsList.innerHTML = '';

        if (data && data.length > 0) {
            elements.requestBadge.textContent = data.length;
            elements.requestBadge.style.display = 'inline';

            data.forEach(request => {
                renderFriendRequest(request);
            });
        } else {
            elements.requestBadge.style.display = 'none';
            elements.requestsList.innerHTML = '<div class="no-requests">No pending requests</div>';
        }
    } catch (error) {
        console.error('Error loading friend requests:', error);
    }
}

function renderFriendRequest(request) {
    const requestDiv = document.createElement('div');
    requestDiv.className = 'friend-request-item';
    requestDiv.dataset.requestId = request.id;

    const profile = request.profiles;
    const avatarUrl = profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.email}`;

    requestDiv.innerHTML = `
        <div class="request-header">
            <img src="${avatarUrl}" alt="${profile.full_name}" class="contact-avatar">
            <div class="contact-info">
                <div class="contact-name">${profile.full_name || profile.email}</div>
                <div class="contact-status">Wants to be your friend</div>
            </div>
        </div>
        <div class="request-actions">
            <button class="btn-accept" data-request-id="${request.id}">Accept</button>
            <button class="btn-reject" data-request-id="${request.id}">Reject</button>
        </div>
    `;

    elements.requestsList.appendChild(requestDiv);
}

async function acceptFriendRequest(requestId) {
    try {
        const { error } = await supabase
            .from('friendships')
            .update({ status: 'accepted' })
            .eq('id', requestId);

        if (error) throw error;

        await loadFriendRequests();
        await loadFriends();
    } catch (error) {
        console.error('Error accepting friend request:', error);
    }
}

async function rejectFriendRequest(requestId) {
    try {
        const { error } = await supabase
            .from('friendships')
            .update({ status: 'rejected' })
            .eq('id', requestId);

        if (error) throw error;

        await loadFriendRequests();
    } catch (error) {
        console.error('Error rejecting friend request:', error);
    }
}

// ============================================
// NOTIFICACIONES
// ============================================

async function loadNotifications() {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;

        elements.notificationsList.innerHTML = '';

        if (data && data.length > 0) {
            const unreadCount = data.filter(n => !n.is_read).length;
            
            if (unreadCount > 0) {
                elements.notificationBadge.textContent = unreadCount;
                elements.notificationBadge.style.display = 'inline';
            } else {
                elements.notificationBadge.style.display = 'none';
            }

            data.forEach(notification => {
                renderNotification(notification);
            });
        } else {
            elements.notificationBadge.style.display = 'none';
            elements.notificationsList.innerHTML = '<div class="no-notifications">No notifications</div>';
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

function renderNotification(notification) {
    const notifDiv = document.createElement('div');
    notifDiv.className = 'notification-item';
    if (!notification.is_read) {
        notifDiv.classList.add('unread');
    }
    notifDiv.dataset.notificationId = notification.id;

    const timeAgo = getTimeAgo(new Date(notification.created_at));

    notifDiv.innerHTML = `
        <div class="notification-title">${notification.title}</div>
        ${notification.content ? `<div class="notification-content">${notification.content}</div>` : ''}
        <div class="notification-time">${timeAgo}</div>
    `;

    notifDiv.addEventListener('click', async () => {
        if (!notification.is_read) {
            await markNotificationAsRead(notification.id);
        }
        
        // Si es una notificación de mensaje, abrir el chat
        if (notification.type === 'message' && notification.from_user_id) {
            // Cargar perfil del remitente y abrir chat
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', notification.from_user_id)
                .single();
            
            if (data) {
                openPrivateChat(data.id, data.full_name || data.email, data.avatar_url);
                elements.notificationsPanel.classList.remove('active');
            }
        }
    });

    elements.notificationsList.appendChild(notifDiv);
}

async function markNotificationAsRead(notificationId) {
    try {
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId);

        await loadNotifications();
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

async function markAllNotificationsAsRead() {
    try {
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', currentUser.id)
            .eq('is_read', false);

        await loadNotifications();
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
    }
}

// ============================================
// SUSCRIPCIONES EN TIEMPO REAL
// ============================================

function subscribeToMessages() {
    messagesSubscription = supabase
        .channel('public-messages')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages'
        }, async (payload) => {
            if (currentChatType === 'public') {
                // Cargar el perfil del usuario que envió el mensaje
                const { data } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', payload.new.user_id)
                    .single();

                const messageWithProfile = {
                    ...payload.new,
                    profiles: data
                };

                renderMessage(messageWithProfile, 'public');
                scrollToBottom();
            }
        })
        .subscribe();
}

function subscribeToPrivateMessages(userId) {
    if (privateMessagesSubscription) {
        supabase.removeChannel(privateMessagesSubscription);
    }

    privateMessagesSubscription = supabase
        .channel(`private-messages-${userId}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'private_messages',
            filter: `or(and(sender_id.eq.${currentUser.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${currentUser.id}))`
        }, async (payload) => {
            // Cargar el perfil del remitente
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', payload.new.sender_id)
                .single();

            const messageWithProfile = {
                ...payload.new,
                sender_profile: data
            };

            renderMessage(messageWithProfile, 'private');
            scrollToBottom();

            // Marcar como leído si es un mensaje recibido
            if (payload.new.receiver_id === currentUser.id) {
                await markMessagesAsRead(userId);
            }
        })
        .subscribe();
}

function subscribeToNotifications() {
    notificationsSubscription = supabase
        .channel('notifications')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${currentUser.id}`
        }, () => {
            loadNotifications();
            
            // Mostrar notificación del navegador si está permitido
            if (Notification.permission === 'granted') {
                new Notification('Ducle Team', {
                    body: 'You have a new notification',
                    icon: '/images/logo.png'
                });
            }
        })
        .subscribe();
}

function subscribeToFriends() {
    friendsSubscription = supabase
        .channel('friendships')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'friendships',
            filter: `or(user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id})`
        }, () => {
            loadFriends();
            loadFriendRequests();
        })
        .subscribe();
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // User menu dropdown
    elements.userMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.userDropdown.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (!elements.userMenuBtn.contains(e.target)) {
            elements.userDropdown.classList.remove('active');
        }
    });

    // Logout
    elements.logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await updateUserStatus('offline');
        await logConnection('logout');
        await supabase.auth.signOut();
        window.location.href = 'signin.html';
    });

    // Enviar mensaje
    elements.sendBtn.addEventListener('click', () => {
        if (currentChatType === 'public') {
            sendPublicMessage();
        } else {
            sendPrivateMessage();
        }
    });

    // Enter para enviar (Shift+Enter para nueva línea)
    elements.messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (currentChatType === 'public') {
                sendPublicMessage();
            } else {
                sendPrivateMessage();
            }
        }
    });

    // Auto-resize del textarea
    elements.messageInput.addEventListener('input', () => {
        updateCharCounter();
        autoResizeTextarea();
    });

    // Cerrar chat privado
    elements.closeChatBtn.addEventListener('click', closePrivateChat);

    // Tabs de sidebar
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(`${tabName}Tab`).classList.add('active');
        });
    });

    // Agregar amigo
    elements.addFriendBtn.addEventListener('click', () => {
        elements.addFriendModal.classList.add('active');
    });

    // Cerrar modales
    document.querySelectorAll('[data-modal]').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.dataset.modal;
            document.getElementById(modalId).classList.remove('active');
        });
    });

    // Enviar solicitud de amistad
    document.getElementById('sendFriendRequestBtn').addEventListener('click', sendFriendRequest);

    // Buscar amigos
    document.getElementById('searchFriends').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        document.querySelectorAll('.contact-item').forEach(contact => {
            const name = contact.querySelector('.contact-name').textContent.toLowerCase();
            contact.style.display = name.includes(searchTerm) ? 'flex' : 'none';
        });
    });

    // Notificaciones
    elements.notificationsBtn.addEventListener('click', () => {
        elements.notificationsPanel.classList.toggle('active');
    });

    document.getElementById('markAllReadBtn').addEventListener('click', markAllNotificationsAsRead);

    // Aceptar/Rechazar solicitudes de amistad (event delegation)
    elements.requestsList.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-accept')) {
            const requestId = e.target.dataset.requestId;
            acceptFriendRequest(requestId);
        } else if (e.target.classList.contains('btn-reject')) {
            const requestId = e.target.dataset.requestId;
            rejectFriendRequest(requestId);
        }
    });

    // Solicitar permiso para notificaciones del navegador
    if (Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

async function sendFriendRequest() {
    const emailOrUsername = document.getElementById('friendEmailInput').value.trim();
    
    if (!emailOrUsername) {
        alert('Please enter an email or username');
        return;
    }

    try {
        // Buscar usuario por email o username
        const { data: userData, error: searchError } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .or(`email.eq.${emailOrUsername},username.eq.${emailOrUsername}`)
            .single();

        if (searchError || !userData) {
            alert('User not found');
            return;
        }

        if (userData.id === currentUser.id) {
            alert('You cannot add yourself as a friend');
            return;
        }

        // Verificar si ya son amigos o hay una solicitud pendiente
        const { data: existingFriendship } = await supabase
            .from('friendships')
            .select('*')
            .or(`and(user_id.eq.${currentUser.id},friend_id.eq.${userData.id}),and(user_id.eq.${userData.id},friend_id.eq.${currentUser.id})`)
            .single();

        if (existingFriendship) {
            if (existingFriendship.status === 'accepted') {
                alert('You are already friends with this user');
            } else if (existingFriendship.status === 'pending') {
                alert('Friend request already sent');
            }
            return;
        }

        // Enviar solicitud de amistad
        const { error: insertError } = await supabase
            .from('friendships')
            .insert({
                user_id: currentUser.id,
                friend_id: userData.id,
                status: 'pending'
            });

        if (insertError) throw insertError;

        alert('Friend request sent!');
        elements.addFriendModal.classList.remove('active');
        document.getElementById('friendEmailInput').value = '';
    } catch (error) {
        console.error('Error sending friend request:', error);
        alert('Error sending friend request. Please try again.');
    }
}

function updateCharCounter() {
    const length = elements.messageInput.value.length;
    elements.charCounter.textContent = `${length}/2000`;
    
    if (length >= 2000) {
        elements.charCounter.style.color = '#ff4444';
    } else if (length >= 1800) {
        elements.charCounter.style.color = '#ffaa00';
    } else {
        elements.charCounter.style.color = '#666666';
    }

    elements.sendBtn.disabled = length === 0 || length > 2000;
}

function autoResizeTextarea() {
    elements.messageInput.style.height = 'auto';
    elements.messageInput.style.height = elements.messageInput.scrollHeight + 'px';
}

function scrollToBottom() {
    setTimeout(() => {
        elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
    }, 100);
}

function showWelcomeMessage() {
    elements.messagesContainer.innerHTML = `
        <div class="welcome-message">
            <h2>Welcome to Ducle Team! 👋</h2>
            <p>Start chatting with the community</p>
        </div>
    `;
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + 'y ago';
    
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + 'mo ago';
    
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + 'd ago';
    
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + 'h ago';
    
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + 'm ago';
    
    return 'just now';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// INICIAR APLICACIÓN
// ============================================

// Verificar autenticación al cargar
document.addEventListener('DOMContentLoaded', init);

// Console log estilizado
console.log('%c🚀 Ducle Team Chat', 'color: #00ff88; font-size: 24px; font-weight: bold;');
console.log('%cReal-time messaging powered by Supabase', 'color: #ffffff; font-size: 14px;');