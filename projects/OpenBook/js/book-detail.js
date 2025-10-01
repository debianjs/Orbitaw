// Configuración de Supabase
const SUPABASE_URL = 'https://jcumgyeqckgidvcdzaoi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjdW1neWVxY2tnaWR2Y2R6YW9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyOTA4MzUsImV4cCI6MjA3NDg2NjgzNX0.Io0milDjBGLx3saynyi2zjHJjoRLLJzbiUDWjG3mCC0';

// Inicializar cliente de Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Configurar PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let currentBook = null;

// Cargar detalles del libro al iniciar
document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const bookId = urlParams.get('id');

    if (!bookId) {
        alert('No se especificó un libro');
        window.location.href = 'index.html';
        return;
    }

    await loadBookDetails(bookId);
});

// Función para cargar los detalles del libro
async function loadBookDetails(bookId) {
    try {
        // Obtener libro desde Supabase
        const { data: book, error } = await supabase
            .from('books')
            .select('*')
            .eq('id', bookId)
            .single();

        if (error) {
            console.error('Error al cargar libro:', error);
            alert('Error al cargar el libro');
            window.location.href = 'index.html';
            return;
        }

        if (!book) {
            alert('Libro no encontrado');
            window.location.href = 'index.html';
            return;
        }

        currentBook = book;

        // Actualizar información en la página
        document.getElementById('bookTitle').textContent = book.title;
        document.getElementById('bookAuthor').textContent = `Por ${book.author}`;
        document.getElementById('bookDescription').textContent = book.description;
        
        const bookImage = document.getElementById('bookImage');
        bookImage.src = book.image_url || 'https://via.placeholder.com/300x400?text=Sin+Imagen';
        bookImage.alt = book.title;

        // Configurar botones
        setupActionButtons(book);

    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar el libro');
        window.location.href = 'index.html';
    }
}

// Configurar los botones de acción
function setupActionButtons(book) {
    // Botón Descargar
    document.getElementById('downloadBtn').addEventListener('click', () => {
        if (book.pdf_url) {
            window.open(book.pdf_url, '_blank');
        } else {
            alert('No hay PDF disponible para descargar');
        }
    });

    // Botón Leer Online
    document.getElementById('readBtn').addEventListener('click', async () => {
        if (book.pdf_url) {
            await loadPdfViewer(book.pdf_url);
        } else {
            alert('No hay PDF disponible para leer');
        }
    });

    // Botón Like
    document.getElementById('likeBtn').addEventListener('click', async () => {
        await updateLikes(book.id, true);
    });

    // Botón Dislike
    document.getElementById('dislikeBtn').addEventListener('click', async () => {
        await updateLikes(book.id, false);
    });

    // Botón cerrar PDF
    document.getElementById('closePdfBtn').addEventListener('click', () => {
        document.getElementById('pdfViewer').style.display = 'none';
        document.querySelector('.book-detail-content').style.display = 'block';
    });
}

// Función para cargar el visor de PDF
async function loadPdfViewer(pdfUrl) {
    const pdfViewer = document.getElementById('pdfViewer');
    const pdfPages = document.getElementById('pdfPages');
    const bookDetailContent = document.querySelector('.book-detail-content');

    // Mostrar visor y ocultar detalles
    bookDetailContent.style.display = 'none';
    pdfViewer.style.display = 'block';
    pdfPages.innerHTML = '<p class="loading-text">Cargando PDF...</p>';

    try {
        // Cargar el PDF
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;

        pdfPages.innerHTML = '';

        // Renderizar cada página
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const scale = 1.5;
            const viewport = page.getViewport({ scale: scale });

            // Crear canvas para la página
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            canvas.className = 'pdf-page';

            // Renderizar página en el canvas
            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };

            await page.render(renderContext).promise;

            // Agregar número de página
            const pageContainer = document.createElement('div');
            pageContainer.className = 'pdf-page-container';
            
            const pageNumber = document.createElement('div');
            pageNumber.className = 'pdf-page-number';
            pageNumber.textContent = `Página ${pageNum} de ${pdf.numPages}`;

            pageContainer.appendChild(canvas);
            pageContainer.appendChild(pageNumber);
            pdfPages.appendChild(pageContainer);
        }

    } catch (error) {
        console.error('Error al cargar PDF:', error);
        pdfPages.innerHTML = '<p class="error-text">Error al cargar el PDF</p>';
    }
}

// Función para actualizar likes/dislikes
async function updateLikes(bookId, isLike) {
    try {
        // Obtener libro actual
        const { data: book, error: fetchError } = await supabase
            .from('books')
            .select('likes, dislikes')
            .eq('id', bookId)
            .single();

        if (fetchError) {
            console.error('Error al obtener likes:', fetchError);
            return;
        }

        // Actualizar contador
        const newLikes = isLike ? (book.likes || 0) + 1 : book.likes || 0;
        const newDislikes = !isLike ? (book.dislikes || 0) + 1 : book.dislikes || 0;

        const { error: updateError } = await supabase
            .from('books')
            .update({
                likes: newLikes,
                dislikes: newDislikes
            })
            .eq('id', bookId);

        if (updateError) {
            console.error('Error al actualizar likes:', updateError);
            return;
        }

        // Mostrar feedback
        const button = isLike ? document.getElementById('likeBtn') : document.getElementById('dislikeBtn');
        const originalText = button.innerHTML;
        button.innerHTML = isLike ? 
            `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
            </svg> ¡Gracias!` :
            `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
                <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path>
            </svg> ¡Gracias!`;

        setTimeout(() => {
            button.innerHTML = originalText;
        }, 2000);

    } catch (error) {
        console.error('Error al actualizar likes:', error);
    }
}

// Event listeners para el modal (desde book-detail.html)
document.getElementById('addBookBtn').addEventListener('click', () => {
    const modal = document.getElementById('uploadModal');
    modal.style.display = 'flex';
});

document.getElementById('closeModal').addEventListener('click', () => {
    const modal = document.getElementById('uploadModal');
    modal.style.display = 'none';
    document.getElementById('uploadForm').reset();
});

window.addEventListener('click', (event) => {
    const modal = document.getElementById('uploadModal');
    if (event.target === modal) {
        modal.style.display = 'none';
        document.getElementById('uploadForm').reset();
    }
});