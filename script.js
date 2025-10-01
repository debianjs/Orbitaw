// Menú hamburguesa para móviles
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        
        // Animación del icono hamburguesa
        hamburger.classList.toggle('active');
    });

    // Cerrar menú al hacer click en un enlace
    document.querySelectorAll('.nav-menu a').forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            hamburger.classList.remove('active');
        });
    });

    // Cerrar menú al hacer click fuera de él
    document.addEventListener('click', (e) => {
        if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
            navMenu.classList.remove('active');
            hamburger.classList.remove('active');
        }
    });
}

// Scroll suave para los enlaces del menú
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        
        // Solo hacer scroll suave si el href no es solo "#"
        if (href !== '#') {
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                const offsetTop = target.offsetTop - 80; // 80px para compensar el navbar
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        }
    });
});

// Efecto de parallax suave en el hero
let ticking = false;
window.addEventListener('scroll', () => {
    if (!ticking) {
        window.requestAnimationFrame(() => {
            const scrolled = window.pageYOffset;
            const hero = document.querySelector('.hero');
            
            if (hero && scrolled < 800) {
                hero.style.transform = `translateY(${scrolled * 0.4}px)`;
                hero.style.opacity = Math.max(0, 1 - (scrolled / 600));
            }
            
            ticking = false;
        });
        ticking = true;
    }
});

// Animación de aparición para las cards
const observerOptions = {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
};

const fadeInObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
            setTimeout(() => {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }, index * 100); // Efecto escalonado
            fadeInObserver.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observar todas las cards
document.querySelectorAll('.card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    fadeInObserver.observe(card);
});

// Animación para los iconos de lenguajes
const iconObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const icons = entry.target.querySelectorAll('.lang-icon');
            icons.forEach((icon, index) => {
                setTimeout(() => {
                    icon.style.opacity = '1';
                    icon.style.transform = 'scale(1)';
                }, index * 100);
            });
            iconObserver.unobserve(entry.target);
        }
    });
}, observerOptions);

const duclejsSection = document.querySelector('.duclejs-section');
if (duclejsSection) {
    document.querySelectorAll('.lang-icon').forEach(icon => {
        icon.style.opacity = '0';
        icon.style.transform = 'scale(0.8)';
        icon.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    });
    iconObserver.observe(duclejsSection);
}

// Efecto hover personalizado para las cards
document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.borderColor = '#00ff88';
    });
    
    card.addEventListener('mouseleave', function() {
        this.style.borderColor = '#2a2a2a';
    });
});

// Cambiar el color del navbar al hacer scroll
let lastScroll = 0;
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 50) {
        navbar.style.backgroundColor = 'rgba(13, 13, 13, 0.95)';
        navbar.style.backdropFilter = 'blur(10px)';
        navbar.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.5)';
    } else {
        navbar.style.backgroundColor = '#1a1a1a';
        navbar.style.backdropFilter = 'none';
        navbar.style.boxShadow = 'none';
    }
    
    // Ocultar/mostrar navbar al hacer scroll (opcional)
    // if (currentScroll > lastScroll && currentScroll > 100) {
    //     navbar.style.transform = 'translateY(-100%)';
    // } else {
    //     navbar.style.transform = 'translateY(0)';
    // }
    
    lastScroll = currentScroll;
});

// Animación del título hero al cargar
window.addEventListener('load', () => {
    const heroTitle = document.querySelector('.hero-title');
    const heroSubtitle = document.querySelector('.hero-subtitle');
    
    if (heroTitle) {
        heroTitle.style.opacity = '0';
        heroTitle.style.transform = 'translateY(30px)';
        
        setTimeout(() => {
            heroTitle.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
            heroTitle.style.opacity = '1';
            heroTitle.style.transform = 'translateY(0)';
        }, 100);
    }
    
    if (heroSubtitle) {
        heroSubtitle.style.opacity = '0';
        heroSubtitle.style.transform = 'translateY(30px)';
        
        setTimeout(() => {
            heroSubtitle.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
            heroSubtitle.style.opacity = '1';
            heroSubtitle.style.transform = 'translateY(0)';
        }, 300);
    }
});

// Console log estilizado para los desarrolladores curiosos
console.log('%c🚀 Ducle Team', 'color: #00ff88; font-size: 28px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,255,136,0.3);');
console.log('%cThe opportunity is now!', 'color: #ffffff; font-size: 18px; font-weight: 500;');
console.log('%c💻 Powered by DucleJS', 'color: #999999; font-size: 14px; font-style: italic;');
console.log('%c\nBuscando bugs? 🐛\n¡Únete al equipo!', 'color: #00ff88; font-size: 12px;');

// Prevenir que las imágenes se arrastren
document.querySelectorAll('img').forEach(img => {
    img.addEventListener('dragstart', (e) => e.preventDefault());
    img.addEventListener('contextmenu', (e) => e.preventDefault()); // Opcional: desactivar menú contextual
});

// Añadir un pequeño efecto de ripple a los botones
document.querySelectorAll('.btn-signup, .btn-signin').forEach(button => {
    button.addEventListener('click', function(e) {
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.classList.add('ripple');
        
        this.style.position = 'relative';
        this.style.overflow = 'hidden';
        this.appendChild(ripple);
        
        setTimeout(() => ripple.remove(), 600);
    });
});

// Añadir estilos para el efecto ripple
const style = document.createElement('style');
style.textContent = `
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.5);
        transform: scale(0);
        animation: ripple-animation 0.6s ease-out;
        pointer-events: none;
    }
    
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    .hamburger.active span:nth-child(1) {
        transform: rotate(45deg) translate(5px, 5px);
    }
    
    .hamburger.active span:nth-child(2) {
        opacity: 0;
    }
    
    .hamburger.active span:nth-child(3) {
        transform: rotate(-45deg) translate(7px, -6px);
    }
`;
document.head.appendChild(style);

// Efecto de cursor personalizado en los iconos de lenguajes (opcional)
document.querySelectorAll('.lang-icon').forEach(icon => {
    icon.addEventListener('mouseenter', function() {
        this.style.cursor = 'pointer';
    });
    
    // Mostrar tooltip con el nombre del lenguaje
    icon.addEventListener('mouseenter', function() {
        const tooltip = document.createElement('div');
        tooltip.className = 'lang-tooltip';
        tooltip.textContent = this.getAttribute('title');
        tooltip.style.cssText = `
            position: absolute;
            bottom: -35px;
            left: 50%;
            transform: translateX(-50%);
            background: #00ff88;
            color: #121212;
            padding: 5px 10px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            white-space: nowrap;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        this.style.position = 'relative';
        this.appendChild(tooltip);
        
        setTimeout(() => tooltip.style.opacity = '1', 10);
    });
    
    icon.addEventListener('mouseleave', function() {
        const tooltip = this.querySelector('.lang-tooltip');
        if (tooltip) {
            tooltip.style.opacity = '0';
            setTimeout(() => tooltip.remove(), 300);
        }
    });
});

// Animación del emoji del footer
const emoji = document.querySelector('.emoji');
if (emoji) {
    emoji.addEventListener('click', () => {
        emoji.style.animation = 'bounce 0.5s ease';
        setTimeout(() => {
            emoji.style.animation = '';
        }, 500);
    });
}

// Añadir animación de bounce
const bounceStyle = document.createElement('style');
bounceStyle.textContent = `
    @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-20px); }
    }
`;
document.head.appendChild(bounceStyle);

// Performance: Lazy loading para imágenes
if ('loading' in HTMLImageElement.prototype) {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        img.loading = 'lazy';
    });
}

// Easter egg: Konami Code
let konamiCode = [];
const konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

document.addEventListener('keydown', (e) => {
    konamiCode.push(e.key);
    konamiCode.splice(-konamiSequence.length - 1, konamiCode.length - konamiSequence.length);
    
    if (konamiCode.join('').includes(konamiSequence.join(''))) {
        document.body.style.animation = 'rainbow 2s linear infinite';
        console.log('%c🎉 ¡Konami Code activado! 🎉', 'color: #00ff88; font-size: 20px; font-weight: bold;');
        
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