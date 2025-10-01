// ============================================
// DUCLE TEAM - PANEL DE ADMINISTRACIÓN
// ============================================

// Configuración de Supabase
const SUPABASE_URL = 'https://toevvojcvdibsrzmrsyd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvZXZ2b2pjdmRpYnNyem1yc3lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxODE3MTMsImV4cCI6MjA3NDc1NzcxM30.lMvWXVOYN4zV52IPSQrd7BVGLc6oz9XAnGzYiPgGNFw';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentAdmin = null;

// ============================================
// INICIALIZACIÓN
// ============================================

async function init() {
    try {
        // Verificar autenticación
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
            window.location.href = '../../signin.html';
            return;
        }

        currentAdmin = session.user;

        // Verificar si el usuario es admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin, full_name, email')
            .eq('id', currentAdmin.id)
            .single();

        if (!profile || !profile.is_admin) {
            alert('Access denied. Admin privileges required.');
            window.location.href = '../../index.html';
            return;
        }

        document.getElementById('adminName').textContent = profile.full_name || profile.email;

        // Cargar datos iniciales
        await loadDashboard();
        
        // Configurar event listeners
        setupEventListeners();

    } catch (error) {
        console.error('Error initializing admin panel:', error);
        alert('Error loading admin panel. Please refresh the page.');
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = '../../signin.html';
    });

    // Menu navigation
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', async () => {
            const section = item.dataset.section;
            
            // Actualizar menu activo
            document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            // Actualizar sección activa
            document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
            document.getElementById(`${section}Section`).classList.add('active');
            
            // Cargar datos de la sección
            switch(section) {
                case 'dashboard':
                    await loadDashboard();
                    break;
                case 'messages':
                    await loadMessages();
                    break;
                case 'users':
                    await loadUsers();
                    break;
                case 'bans':
                    await loadBans();
                    break;
                case 'logs':
                    await loadLogs();
                    break;
            }
        });
    });

    // Búsqueda
    document.getElementById('searchMessages')?.addEventListener('input', filterMessages);
    document.getElementById('searchUsers')?.addEventListener('input', filterUsers);
    document.getElementById('searchLogs')?.addEventListener('input', filterLogs);

    // Modal de ban
    document.getElementById('newBanBtn').addEventListener('click', () => {
        document.getElementById('banModal').classList.add('active');
    });

    document.querySelectorAll('[data-modal]').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.dataset.modal;
            document.getElementById(modalId).classList.remove('active');
        });
    });

    document.getElementById('confirmBanBtn').addEventListener('click', createBan);
}

// ============================================
// DASHBOARD
// ============================================

async function loadDashboard() {
    try {
        // Cargar estadísticas
        const [users, messages, onlineUsers, bans] = await Promise.all([
            supabase.from('profiles').select('id', { count: 'exact', head: true }),
            supabase.from('messages').select('id', { count: 'exact', head: true }),
            supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'online'),
            supabase.from('bans').select('id', { count: 'exact', head: true }).eq('is_active', true)
        ]);

        document.getElementById('totalUsers').textContent = users.count || 0;
        document.getElementById('totalMessages').textContent = messages.count || 0;
        document.getElementById('onlineUsers').textContent = onlineUsers.count || 0;
        document.getElementById('activeBans').textContent = bans.count || 0;

        // Cargar actividad reciente
        await loadRecentActivity();

    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

async function loadRecentActivity() {
    try {
        const { data, error } = await supabase
            .from('connection_logs')
            .select(`
                id,
                action,
                created_at,
                ip_address,
                profiles:user_id (
                    full_name,
                    email
                )
            `)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) throw error;

        const activityList = document.getElementById('recentActivity');
        activityList.innerHTML = '';

        if (data && data.length > 0) {
            data.forEach(log => {
                const profile = log.profiles;
                const activityDiv = document.createElement('div');
                activityDiv.className = 'activity-item';
                activityDiv.innerHTML = `
                    <div><strong>${profile?.full_name || profile?.email || 'Unknown'}</strong> ${log.action}</div>
                    <div class="activity-time">${getTimeAgo(new Date(log.created_at))} • IP: ${log.ip_address}</div>
                `;
                activityList.appendChild(activityDiv);
            });
        } else {
            activityList.innerHTML = '<div class="empty-state">No recent activity</div>';
        }
    } catch (error) {
        console.error('Error loading recent activity:', error);
    }
}

// ============================================
// MENSAJES
// ============================================

async function loadMessages() {
    try {
        const { data, error } = await supabase
            .from('messages')
            .select(`
                id,
                content,
                created_at,
                user_id,
                profiles:user_id (
                    full_name,
                    email
                )
            `)
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) throw error;

        const messagesTable = document.getElementById('messagesTable');
        messagesTable.innerHTML = '';

        if (data && data.length > 0) {
            for (const message of data) {
                // Obtener IP del usuario desde los logs
                const { data: logData } = await supabase
                    .from('connection_logs')
                    .select('ip_address')
                    .eq('user_id', message.user_id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                const profile = message.profiles;
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${profile?.full_name || 'Unknown'}</td>
                    <td>${profile?.email || 'N/A'}</td>
                    <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(message.content)}</td>
                    <td><span class="ip-address">${logData?.ip_address || 'N/A'}</span></td>
                    <td>${getTimeAgo(new Date(message.created_at))}</td>
                    <td>
                        <button class="btn-small delete" onclick="deleteMessage('${message.id}')">Delete</button>
                    </td>
                `;
                messagesTable.appendChild(row);
            }
        } else {
            messagesTable.innerHTML = '<tr><td colspan="6" class="empty-state">No messages found</td></tr>';
        }
    } catch (error) {
        console.error('Error loading messages:', error);
        document.getElementById('messagesTable').innerHTML = '<tr><td colspan="6" class="empty-state">Error loading messages</td></tr>';
    }
}

async function deleteMessage(messageId) {
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
        const { error } = await supabase
            .from('messages')
            .update({ is_deleted: true })
            .eq('id', messageId);

        if (error) throw error;

        alert('Message deleted successfully');
        await loadMessages();
    } catch (error) {
        console.error('Error deleting message:', error);
        alert('Error deleting message');
    }
}

function filterMessages(e) {
    const searchTerm = e.target.value.toLowerCase();
    const rows = document.getElementById('messagesTable').querySelectorAll('tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

// ============================================
// USUARIOS
// ============================================

async function loadUsers() {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const usersTable = document.getElementById('usersTable');
        usersTable.innerHTML = '';

        if (data && data.length > 0) {
            data.forEach(user => {
                const row = document.createElement('tr');
                const statusClass = user.status === 'online' ? 'status-online' : 'status-offline';
                const isBanned = user.is_banned ? '<span class="status-badge status-banned">BANNED</span>' : '';
                
                row.innerHTML = `
                    <td>${user.full_name || 'N/A'}</td>
                    <td>${user.email}</td>
                    <td><span class="status-badge ${statusClass}">${user.status}</span> ${isBanned}</td>
                    <td>${getTimeAgo(new Date(user.last_seen))}</td>
                    <td>${new Date(user.created_at).toLocaleDateString()}</td>
                    <td>
                        ${!user.is_banned ? 
                            `<button class="btn-small delete" onclick="banUserQuick('${user.id}', '${user.email}')">Ban</button>` :
                            `<button class="btn-small unban" onclick="unbanUser('${user.id}')">Unban</button>`
                        }
                    </td>
                `;
                usersTable.appendChild(row);
            });
        } else {
            usersTable.innerHTML = '<tr><td colspan="6" class="empty-state">No users found</td></tr>';
        }
    } catch (error) {
        console.error('Error loading users:', error);
        document.getElementById('usersTable').innerHTML = '<tr><td colspan="6" class="empty-state">Error loading users</td></tr>';
    }
}

async function banUserQuick(userId, email) {
    const reason = prompt('Enter ban reason:');
    if (!reason) return;

    const days = prompt('Enter ban duration in days (or "permanent"):');
    if (!days) return;

    try {
        // Obtener IP del usuario
        const { data: logData } = await supabase
            .from('connection_logs')
            .select('ip_address')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        const isPermanent = days.toLowerCase() === 'permanent';
        const expiresAt = isPermanent ? null : new Date(Date.now() + parseInt(days) * 24 * 60 * 60 * 1000).toISOString();

        // Crear ban
        const { error: banError } = await supabase
            .from('bans')
            .insert({
                user_id: userId,
                ip_address: logData?.ip_address || 'unknown',
                reason: reason,
                banned_by: currentAdmin.id,
                expires_at: expiresAt,
                is_permanent: isPermanent,
                is_active: true
            });

        if (banError) throw banError;

        // Actualizar perfil
        await supabase
            .from('profiles')
            .update({
                is_banned: true,
                ban_reason: reason,
                ban_expires_at: expiresAt
            })
            .eq('id', userId);

        alert('User banned successfully');
        await loadUsers();
    } catch (error) {
        console.error('Error banning user:', error);
        alert('Error banning user');
    }
}

async function unbanUser(userId) {
    if (!confirm('Are you sure you want to unban this user?')) return;

    try {
        // Desactivar todos los bans del usuario
        await supabase
            .from('bans')
            .update({ is_active: false })
            .eq('user_id', userId);

        // Actualizar perfil
        await supabase
            .from('profiles')
            .update({
                is_banned: false,
                ban_reason: null,
                ban_expires_at: null
            })
            .eq('id', userId);

        alert('User unbanned successfully');
        await loadUsers();
    } catch (error) {
        console.error('Error unbanning user:', error);
        alert('Error unbanning user');
    }
}

function filterUsers(e) {
    const searchTerm = e.target.value.toLowerCase();
    const rows = document.getElementById('usersTable').querySelectorAll('tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

// ============================================
// BANS
// ============================================

async function loadBans() {
    try {
        const { data, error } = await supabase
            .from('bans')
            .select(`
                id,
                reason,
                banned_at,
                expires_at,
                is_permanent,
                is_active,
                ip_address,
                user:user_id (
                    full_name,
                    email
                ),
                admin:banned_by (
                    full_name,
                    email
                )
            `)
            .order('banned_at', { ascending: false });

        if (error) throw error;

        const bansTable = document.getElementById('bansTable');
        bansTable.innerHTML = '';

        if (data && data.length > 0) {
            data.forEach(ban => {
                const row = document.createElement('tr');
                const statusClass = ban.is_active ? 'status-active' : 'status-offline';
                const expiresText = ban.is_permanent ? 
                    '<span class="status-badge status-permanent">PERMANENT</span>' : 
                    (ban.expires_at ? new Date(ban.expires_at).toLocaleDateString() : 'N/A');
                
                row.innerHTML = `
                    <td>${ban.user?.full_name || ban.user?.email || 'Unknown'}</td>
                    <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${ban.reason}</td>
                    <td>${ban.admin?.full_name || ban.admin?.email || 'System'}</td>
                    <td>${new Date(ban.banned_at).toLocaleDateString()}</td>
                    <td>${expiresText}</td>
                    <td><span class="status-badge ${statusClass}">${ban.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                        ${ban.is_active ? 
                            `<button class="btn-small unban" onclick="deactivateBan('${ban.id}')">Deactivate</button>` :
                            '<span style="color: #666;">Inactive</span>'
                        }
                    </td>
                `;
                bansTable.appendChild(row);
            });
        } else {
            bansTable.innerHTML = '<tr><td colspan="7" class="empty-state">No bans found</td></tr>';
        }
    } catch (error) {
        console.error('Error loading bans:', error);
        document.getElementById('bansTable').innerHTML = '<tr><td colspan="7" class="empty-state">Error loading bans</td></tr>';
    }
}

async function createBan() {
    const userInput = document.getElementById('banUserInput').value.trim();
    const reason = document.getElementById('banReason').value.trim();
    const duration = document.getElementById('banDuration').value;

    if (!userInput || !reason) {
        alert('Please fill all fields');
        return;
    }

    try {
        let userId = null;
        let ipAddress = userInput;

        // Verificar si es email o IP
        if (userInput.includes('@')) {
            const { data: userData } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', userInput)
                .single();

            if (userData) {
                userId = userData.id;
                
                // Obtener IP del usuario
                const { data: logData } = await supabase
                    .from('connection_logs')
                    .select('ip_address')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                ipAddress = logData?.ip_address || 'unknown';
            } else {
                alert('User not found');
                return;
            }
        }

        const isPermanent = duration === 'permanent';
        const expiresAt = isPermanent ? null : new Date(Date.now() + parseInt(duration) * 24 * 60 * 60 * 1000).toISOString();

        // Crear ban
        const { error } = await supabase
            .from('bans')
            .insert({
                user_id: userId,
                ip_address: ipAddress,
                reason: reason,
                banned_by: currentAdmin.id,
                expires_at: expiresAt,
                is_permanent: isPermanent,
                is_active: true
            });

        if (error) throw error;

        // Si tiene userId, actualizar perfil
        if (userId) {
            await supabase
                .from('profiles')
                .update({
                    is_banned: true,
                    ban_reason: reason,
                    ban_expires_at: expiresAt
                })
                .eq('id', userId);
        }

        alert('Ban created successfully');
        document.getElementById('banModal').classList.remove('active');
        document.getElementById('banUserInput').value = '';
        document.getElementById('banReason').value = '';
        await loadBans();
    } catch (error) {
        console.error('Error creating ban:', error);
        alert('Error creating ban');
    }
}

async function deactivateBan(banId) {
    if (!confirm('Are you sure you want to deactivate this ban?')) return;

    try {
        const { error } = await supabase
            .from('bans')
            .update({ is_active: false })
            .eq('id', banId);

        if (error) throw error;

        alert('Ban deactivated successfully');
        await loadBans();
    } catch (error) {
        console.error('Error deactivating ban:', error);
        alert('Error deactivating ban');
    }
}

// ============================================
// LOGS DE CONEXIÓN
// ============================================

async function loadLogs() {
    try {
        const { data, error } = await supabase
            .from('connection_logs')
            .select(`
                id,
                ip_address,
                user_agent,
                action,
                created_at,
                profiles:user_id (
                    full_name,
                    email
                )
            `)
            .order('created_at', { ascending: false })
            .limit(200);

        if (error) throw error;

        const logsTable = document.getElementById('logsTable');
        logsTable.innerHTML = '';

        if (data && data.length > 0) {
            data.forEach(log => {
                const profile = log.profiles;
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${profile?.full_name || 'Unknown'}</td>
                    <td>${profile?.email || 'N/A'}</td>
                    <td><span class="ip-address">${log.ip_address}</span></td>
                    <td><span class="status-badge ${log.action === 'login' ? 'status-online' : 'status-offline'}">${log.action}</span></td>
                    <td><span class="user-agent" title="${log.user_agent || 'N/A'}">${log.user_agent || 'N/A'}</span></td>
                    <td>${getTimeAgo(new Date(log.created_at))}</td>
                `;
                logsTable.appendChild(row);
            });
        } else {
            logsTable.innerHTML = '<tr><td colspan="6" class="empty-state">No logs found</td></tr>';
        }
    } catch (error) {
        console.error('Error loading logs:', error);
        document.getElementById('logsTable').innerHTML = '<tr><td colspan="6" class="empty-state">Error loading logs</td></tr>';
    }
}

function filterLogs(e) {
    const searchTerm = e.target.value.toLowerCase();
    const rows = document.getElementById('logsTable').querySelectorAll('tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + ' years ago';
    
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + ' months ago';
    
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ' days ago';
    
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ' hours ago';
    
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ' minutes ago';
    
    return 'just now';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// INICIAR PANEL
// ============================================

document.addEventListener('DOMContentLoaded', init);

console.log('%c🔐 Admin Panel - Ducle Team', 'color: #ff4444; font-size: 24px; font-weight: bold;');
console.log('%cAuthorized access only', 'color: #ffffff; font-size: 14px;');