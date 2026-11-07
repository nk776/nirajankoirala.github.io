(() => {
    'use strict';

    const root = document.documentElement;

    // ---------- Theme ----------
    // The initial theme is applied by the inline <head> script (light by default).
    const themeToggle = document.getElementById('theme-toggle');
    let particleColor = '';

    function syncTheme() {
        const isLight = root.dataset.theme === 'light';
        const label = isLight ? 'Switch to dark theme' : 'Switch to light theme';
        themeToggle.setAttribute('aria-label', label);
        themeToggle.title = label;
        // Particle color comes from the --particle-rgb CSS variable (read once per theme change)
        const styles = getComputedStyle(root);
        particleColor = `rgb(${styles.getPropertyValue('--particle-rgb').trim()})`;
        // Tint the mobile browser bar to match the page background
        document.querySelector('meta[name="theme-color"]').content = styles.getPropertyValue('--bg-dark').trim();
    }

    themeToggle.addEventListener('click', () => {
        const next = root.dataset.theme === 'light' ? 'dark' : 'light';
        root.dataset.theme = next;
        try { localStorage.setItem('theme', next); } catch (e) {}
        syncTheme();
        if (reducedMotion.matches) render(false); // static background: redraw in the new color
    });

    // ---------- Background: floating particles ----------
    const canvas = document.getElementById('canvas-bg');
    const ctx = canvas.getContext('2d');
    // Fewer particles on phones keeps the animation smooth and saves battery
    const particleCount = () => (window.innerWidth < 768 ? 30 : 60);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let particles = [];

    class Particle {
        constructor() {
            this.reset();
        }
        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2.5 + 1.5;
            this.speedX = (Math.random() - 0.5) * 0.4;
            this.speedY = (Math.random() - 0.5) * 0.4;
            this.alpha = Math.random() * 0.5 + 0.1;
        }
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
                this.reset();
            }
        }
        draw() {
            ctx.globalAlpha = this.alpha;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function initCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        particles = Array.from({ length: particleCount() }, () => new Particle());
    }

    function render(move) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = particleColor;
        for (const p of particles) {
            if (move) p.update();
            p.draw();
        }
    }

    function animate() {
        render(true);
        requestAnimationFrame(animate);
    }

    // Rebuild after resizing stops, not on every resize event.
    // Ignore small height changes: on phones the address bar showing/hiding fires
    // a resize while scrolling, and rebuilding then makes the particles jump.
    let resizeTimer;
    let lastWidth = window.innerWidth;
    let lastHeight = window.innerHeight;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            const widthChanged = window.innerWidth !== lastWidth;
            const heightChanged = Math.abs(window.innerHeight - lastHeight) > 150;
            if (!widthChanged && !heightChanged) return;
            lastWidth = window.innerWidth;
            lastHeight = window.innerHeight;
            initCanvas();
            if (reducedMotion.matches) render(false);
        }, 150);
    });

    // ---------- Scroll reveal ----------
    const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target); // reveal once, then stop watching
            }
        }
    }, { threshold: 0.2 });

    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

    // ---------- Mobile menu ----------
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('nav-links');

    function setMenu(open) {
        hamburger.classList.toggle('active', open);
        navLinks.classList.toggle('active', open);
        hamburger.setAttribute('aria-expanded', open);
    }

    hamburger.addEventListener('click', () => setMenu(!navLinks.classList.contains('active')));

    // Close the menu when a link is tapped
    navLinks.addEventListener('click', (e) => {
        if (e.target.closest('a')) setMenu(false);
    });

    // ---------- Start ----------
    syncTheme();
    initCanvas();
    // People who ask their device for less motion get a still background
    if (reducedMotion.matches) render(false);
    else animate();
})();
