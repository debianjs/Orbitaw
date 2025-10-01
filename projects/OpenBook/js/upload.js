// Manejar el envío del formulario de subida de libro
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const loading = document.getElementById('loading');
    const submitBtn = e.target.querySelector('.submit-btn');
    
    // Mostrar loading
    loading.style.display = 'block';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Subiendo...';

    try {
        // Obtener datos del formulario
        const title = document.getElementById('title').value;
        const author = document.getElementById('author').value;
        const description = document.getElementById('description').value;
        const imageFile = document.getElementById('image').files[0];
        const pdfFile = document.getElementById('pdf').files[0];

        // Validar que se hayan seleccionado archivos
        if (!imageFile || !pdfFile) {
            alert('Por favor selecciona una imagen y un PDF');
            loading.style.display = 'none';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Subir Libro';
            return;
        }

        // Generar IDs únicos para los archivos
        const timestamp = Date.now();
        const imageFileName = `${timestamp}_${imageFile.name}`;
        const pdfFileName = `${timestamp}_${pdfFile.name}`;

        // Subir imagen a Supabase Storage
        console.log('Subiendo imagen...');
        const imageUrl = await uploadFileToSupabase(imageFile, imageFileName, 'images');
        
        // Subir PDF a Supabase Storage
        console.log('Subiendo PDF...');
        const pdfUrl = await uploadFileToSupabase(pdfFile, pdfFileName, 'pdfs');

        // Guardar información del libro en la base de datos
        console.log('Guardando información del libro...');
        const { data, error } = await supabase
            .from('books')
            .insert([
                {
                    title: title,
                    author: author,
                    description: description,
                    image_url: imageUrl,
                    pdf_url: pdfUrl,
                    created_at: new Date().toISOString()
                }
            ])
            .select();

        if (error) {
            throw error;
        }

        console.log('Libro subido exitosamente:', data);
        alert('¡Libro subido exitosamente!');

        // Cerrar modal y recargar libros
        closeUploadModal();
        await loadBooks();

    } catch (error) {
        console.error('Error al subir el libro:', error);
        alert('Error al subir el libro: ' + error.message);
    } finally {
        loading.style.display = 'none';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Subir Libro';
    }
});

// Función para subir archivos a Supabase Storage
async function uploadFileToSupabase(file, fileName, folder) {
    try {
        const filePath = `${folder}/${fileName}`;

        // Subir archivo a Supabase Storage
        const { data, error } = await supabase.storage
            .from('books-storage')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            throw error;
        }

        // Obtener URL pública del archivo
        const { data: publicUrlData } = supabase.storage
            .from('books-storage')
            .getPublicUrl(filePath);

        return publicUrlData.publicUrl;

    } catch (error) {
        console.error('Error al subir archivo:', error);
        throw error;
    }
}

// Función para cerrar modal (si no está definida en main.js)
if (typeof closeUploadModal !== 'function') {
    function closeUploadModal() {
        const modal = document.getElementById('uploadModal');
        modal.style.display = 'none';
        document.getElementById('uploadForm').reset();
    }
}