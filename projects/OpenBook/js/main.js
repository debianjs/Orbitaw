// Configuración de Supabase
const SUPABASE_URL = 'https://jcumgyeqckgidvcdzaoi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjdW1neWVxY2tnaWR2Y2R6YW9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyOTA4MzUsImV4cCI6MjA3NDg2NjgzNX0.Io0milDjBGLx3saynyi2zjHJjoRLLJzbiUDWjG3mCC0';

// Inicializar cliente de Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Cargar libros al iniciar la página
document.addEventListener('DOMContentLoaded', async () => {
    await loadBooks();
});

// Función para cargar todos los libros desde Supabase
async function loadBooks() {
    const booksContainer = document.getElementById('booksContainer');
    booksContainer.innerHTML = '<p class="loading-text">Cargando libros...</p>';

    try {
        // Obtener todos los libros de la tabla 'books'
        const { data: books, error } = await supabase
            .from('books')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error al cargar libros:', error);
            booksContainer.innerHTML = '<p class="error-text">Error al cargar los libros</p>';
            return;
        }

        // Si no hay libros
        if (!books || books.length === 0) {
            booksContainer.innerHTML = '<p class="no-books-text">No hay libros disponibles. ¡Sé el primero en subir uno!</p>';
            return;
        }

        // Limpiar contenedor
        booksContainer.innerHTML = '';

        // Crear cards para cada libro
        books.forEach(book => {
            const bookCard = createBookCard(book);
            booksContainer.appendChild(bookCard);
        });

    } catch (error) {
        console.error('Error:', error);
        booksContainer.innerHTML = '<p class="error-text">Error al cargar los libros</p>';
    }
}

// Función para crear una card de libro
function createBookCard(book) {
    const card = document.createElement('div');
    card.className = 'book-card';
    card.onclick = () => {
        window.location.href = `book-detail.html?id=${book.id}`;
    };

    // Obtener URL pública de la imagen
    const imageUrl = book.image_url || 'https://via.placeholder.com/300x400?text=Sin+Imagen';

    card.innerHTML = `
        <div class="book-image">
            <img src="${imageUrl}" alt="${book.title}" onerror="this.src='https://via.placeholder.com/300x400?text=Sin+Imagen'">
        </div>
        <div class="book-info">
            <h3 class="book-card-title">${book.title}</h3>
            <p class="book-card-author">${book.author}</p>
            <p class="book-card-description">${truncateText(book.description, 100)}</p>
        </div>
    `;

    return card;
}

// Función para truncar texto
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Función para abrir el modal de subir libro
function openUploadModal() {
    const modal = document.getElementById('uploadModal');
    modal.style.display = 'flex';
}

// Función para cerrar el modal
function closeUploadModal() {
    const modal = document.getElementById('uploadModal');
    modal.style.display = 'none';
    // Limpiar formulario
    document.getElementById('uploadForm').reset();
}

// Event listeners para el modal
document.getElementById('addBookBtn').addEventListener('click', openUploadModal);
document.getElementById('closeModal').addEventListener('click', closeUploadModal);

// Cerrar modal al hacer click fuera de él
window.addEventListener('click', (event) => {
    const modal = document.getElementById('uploadModal');
    if (event.target === modal) {
        closeUploadModal();
    }
});