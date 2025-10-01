// Configuración de Supabase
const SUPABASE_URL = 'https://toevvojcvdibsrzmrsyd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvZXZ2b2pjdmRpYnNyem1yc3lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxODE3MTMsImV4cCI6MjA3NDc1NzcxM30.lMvWXVOYN4zV52IPSQrd7BVGLc6oz9XAnGzYiPgGNFw';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Elementos del DOM
const signupForm = document.getElementById('signupForm');
const googleSignUpBtn = document.getElementById('googleSignUp');
const messageDiv = document.getElementById('message');
const submitBtn = document.getElementById('submitBtn');
const btnText = document.getElementById('btnText');
const btnLoader = document.getElementById('btnLoader');

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

// Manejo del formulario de registro
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    setButtonLoading(true);
    
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    try {
        // Registrar usuario con Supabase
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: fullName
                },
                emailRedirectTo: `${window.location.origin}/main.html`
            }
        });
        
        if (error) throw error;
        
        // Mostrar mensaje de éxito
        showMessage(
            '✅ Account created! Please check your email to verify your account.',
            'success'
        );
        
        // Limpiar formulario
        signupForm.reset();
        
        console.log('User registered:', data);
        
    } catch (error) {
        console.error('Error signing up:', error);
        showMessage(`❌ Error: ${error.message}`, 'error');
    } finally {
        setButtonLoading(false);
    }
});

// Manejo del registro con Google
googleSignUpBtn.addEventListener('click', async () => {
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/main.html`
            }
        });
        
        if (error) throw error;
        
        console.log('Google sign up initiated:', data);
        
    } catch (error) {
        console.error('Error with Google sign up:', error);
        showMessage(`❌ Error: ${error.message}`, 'error');
    }
});

// Manejar la confirmación de email cuando el usuario regresa desde el link
supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event, session);
    
    if (event === 'SIGNED_IN' && session) {
        // Usuario confirmó su email y está autenticado
        showMessage('✅ Email verified! Redirecting...', 'success');
        setTimeout(() => {
            window.location.href = 'main.html';
        }, 1500);
    }
    
    if (event === 'USER_UPDATED') {
        console.log('User updated:', session);
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