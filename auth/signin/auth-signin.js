// Configuración de Supabase
const SUPABASE_URL = 'https://toevvojcvdibsrzmrsyd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvZXZ2b2pjdmRpYnNyem1yc3lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxODE3MTMsImV4cCI6MjA3NDc1NzcxM30.lMvWXVOYN4zV52IPSQrd7BVGLc6oz9XAnGzYiPgGNFw';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Elementos del DOM
const signinForm = document.getElementById('signinForm');
const googleSignInBtn = document.getElementById('googleSignIn');
const messageDiv = document.getElementById('message');
const submitBtn = document.getElementById('submitBtn');
const btnText = document.getElementById('btnText');
const btnLoader = document.getElementById('btnLoader');
const rememberMeCheckbox = document.getElementById('rememberMe');

// Función para mostrar mensajes
function showMessage(message, type = 'info') {
    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
    
    // Auto ocultar después de 5 segundos
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}

// Función para cambiar estado del botón
function setButtonLoading(loading) {
    if (loading) {
        submitBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoader.style.display = 'block';
    } else {
        submitBtn.disabled = false;
        btnText.style.display = 'block';
        btnLoader.style.display = 'none';
    }
}

// Verificar si el usuario ya está autenticado
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        // Si el usuario ya tiene sesión, redirigir a main.html
        window.location.href = 'main.html';
    }
}

// Verificar al cargar la página
checkAuth();

// Cargar email guardado si existe
window.addEventListener('load', () => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
        document.getElementById('email').value = savedEmail;
        rememberMeCheckbox.checked = true;
    }
});

// Manejo del formulario de inicio de sesión
signinForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    setButtonLoading(true);
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = rememberMeCheckbox.checked;
    
    try {
        // Iniciar sesión con Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        // Guardar email si "Remember me" está activado
        if (rememberMe) {
            localStorage.setItem('rememberedEmail', email);
        } else {
            localStorage.removeItem('rememberedEmail');
        }
        
        // Verificar si el email está confirmado
        if (data.user && !data.user.email_confirmed_at) {
            showMessage(
                '⚠️ Please verify your email before signing in. Check your inbox.',
                'error'
            );
            await supabase.auth.signOut();
            setButtonLoading(false);
            return;
        }
        
        // Mostrar mensaje de éxito y redirigir
        showMessage('✅ Signed in successfully! Redirecting...', 'success');
        
        console.log('User signed in:', data);
        
        setTimeout(() => {
            window.location.href = 'main.html';
        }, 1500);
        
    } catch (error) {
        console.error('Error signing in:', error);
        
        let errorMessage = error.message;
        
        // Mensajes personalizados de error
        if (error.message.includes('Invalid login credentials')) {
            errorMessage = 'Invalid email or password. Please try again.';
        } else if (error.message.includes('Email not confirmed')) {
            errorMessage = 'Please verify your email before signing in.';
        }
        
        showMessage(`❌ Error: ${errorMessage}`, 'error');
        setButtonLoading(false);
    }
});

// Manejo del inicio de sesión con Google
googleSignInBtn.addEventListener('click', async () => {
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/main.html`
            }
        });
        
        if (error) throw error;
        
        console.log('Google sign in initiated:', data);
        
    } catch (error) {
        console.error('Error with Google sign in:', error);
        showMessage(`❌ Error: ${error.message}`, 'error');
    }
});

// Manejar cambios en el estado de autenticación
supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event, session);
    
    if (event === 'SIGNED_IN' && session) {
        showMessage('✅ Signed in successfully! Redirecting...', 'success');
        setTimeout(() => {
            window.location.href = 'main.html';
        }, 1500);
    }
    
    if (event === 'PASSWORD_RECOVERY') {
        showMessage('Password recovery email sent. Check your inbox.', 'info');
    }
});

// Manejo del "Forgot password"
document.querySelector('.forgot-password').addEventListener('click', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    
    if (!email) {
        showMessage('⚠️ Please enter your email address first.', 'error');
        return;
    }
    
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password.html`
        });
        
        if (error) throw error;
        
        showMessage('✅ Password reset email sent! Check your inbox.', 'success');
        
    } catch (error) {
        console.error('Error sending reset email:', error);
        showMessage(`❌ Error: ${error.message}`, 'error');
    }
});

// Animación de entrada
window.addEventListener('load', () => {
    document.querySelector('.auth-form-container').style.opacity = '0';
    document.querySelector('.auth-form-container').style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        document.querySelector('.auth-form-container').style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        document.querySelector('.auth-form-container').style.opacity = '1';
        document.querySelector('.auth-form-container').style.transform = 'translateY(0)';
    }, 100);
});

// Easter egg: Konami code
let konamiCode = [];
const konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

document.addEventListener('keydown', (e) => {
    konamiCode.push(e.key);
    konamiCode.splice(-konamiSequence.length - 1, konamiCode.length - konamiSequence.length);
    
    if (konamiCode.join('').includes(konamiSequence.join(''))) {
        showMessage('🎮 Konami Code activated! You found the secret!', 'success');
        document.body.style.animation = 'rainbow 2s linear infinite';
        
        setTimeout(() => {
            document.body.style.animation = '';
        }, 5000);
    }
});

const rainbowStyle = document.createElement('style');
rainbowStyle.textContent = `
    @keyframes rainbow {
        0% { filter: hue-rotate(0deg); }
        100% { filter: hue-rotate(360deg); }
    }
`;
document.head.appendChild(rainbowStyle);