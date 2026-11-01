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
    });

    // ---------- Background: floating particles ----------
    const canvas = document.getElementById('canvas-bg');
    const ctx = canvas.getContext('2d');
    const PARTICLE_COUNT = 60;
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
        particles = Array.from({ length: PARTICLE_COUNT }, () => new Particle());
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = particleColor;
        for (const p of particles) {
            p.update();
            p.draw();
        }
        requestAnimationFrame(animate);
    }

    // Rebuild after resizing stops, not on every resize event
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(initCanvas, 150);
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
    animate();
})();
