// Initialize Lucide Icons with safety wrapper
const safeCreateIcons = () => {
    try {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    } catch (e) {
        console.warn('Lucide icon generation encountered a minor issue:', e);
    }
};
// Global Store Reference for Observers
let globalRevealObserver = null;
// --- State Management ---
const state = {
    currentView: 'splash',
    scrolled: false,
    navigating: false,
    contactEmail: 'erica64@gmail.com',
    currentLocation: 'Kigali, Rwanda'
};
// --- View Switcher Logic ---
function navigateTo(viewId, isInitial = false) {
    if (state.currentView === viewId && !isInitial) return;
    if (state.navigating && !isInitial) return;
    const targetView = document.getElementById(`view-${viewId}`);
    if (!targetView) return;
    // Reset Mobile Menu UI state
    const mobileOverlay = document.getElementById('mobile-overlay');
    if (mobileOverlay && !mobileOverlay.classList.contains('opacity-0')) {
        toggleMenu();
    }
    state.navigating = true;
    // Update Nav Link ARIA and Active classes
    document.querySelectorAll('.nav-link').forEach(link => {
        const href = link.getAttribute('href');
        if (href === `#${viewId}`) {
            link.classList.add('text-primary');
            link.setAttribute('aria-current', 'page');
        } else {
            link.classList.remove('text-primary');
            link.removeAttribute('aria-current');
        }
    });
    const nav = document.getElementById('main-nav');
    if (viewId === 'splash') {
        nav.classList.add('opacity-0', 'pointer-events-none', '-translate-y-full');
    } else {
        nav.classList.remove('opacity-0', 'pointer-events-none', '-translate-y-full');
    }
    const currentViewEl = document.getElementById(`view-${state.currentView}`);
    if (currentViewEl && viewId !== state.currentView) {
        currentViewEl.style.opacity = '0';
        setTimeout(() => {
            currentViewEl.classList.add('hidden');
            // Critical: Scroll to top before showing next view to prevent scroll jumps
            window.scrollTo({ top: 0, behavior: 'instant' });
            targetView.classList.remove('hidden');
            targetView.style.opacity = '0';
            void targetView.offsetWidth; // Force Reflow
            targetView.style.opacity = '1';
            state.currentView = viewId;
            if (!isInitial) {
                window.history.pushState(null, '', `#${viewId}`);
            }
            safeCreateIcons();
            initRevealObserver();
            state.navigating = false;
        }, 400);
    } else {
        targetView.classList.remove('hidden');
        targetView.style.opacity = '1';
        state.currentView = viewId;
        safeCreateIcons();
        initRevealObserver();
        state.navigating = false;
    }
}
// --- Reveal on Scroll Logic with Memory Management ---
function initRevealObserver() {
    // Disconnect previous observer to prevent memory leaks during SPA transitions
    if (globalRevealObserver) {
        globalRevealObserver.disconnect();
    }
    if (!('IntersectionObserver' in window)) {
        document.querySelectorAll('.reveal-on-scroll').forEach(el => el.classList.add('revealed'));
        return;
    }
    const observerOptions = {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    };
    globalRevealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                globalRevealObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);
    // Minor delay to ensure DOM is settled after transition
    setTimeout(() => {
        document.querySelectorAll('.reveal-on-scroll').forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom >= 0) {
                el.classList.add('revealed');
            } else {
                globalRevealObserver.observe(el);
            }
        });
    }, 150);
}
// --- Event Handlers ---
window.addEventListener('scroll', () => {
    const nav = document.getElementById('main-nav');
    if (state.currentView === 'splash') return;
    if (window.scrollY > 50) {
        if (!state.scrolled) {
            nav.classList.add('nav-scrolled');
            state.scrolled = true;
        }
    } else {
        if (state.scrolled) {
            nav.classList.remove('nav-scrolled');
            state.scrolled = false;
        }
    }
});
function toggleMenu() {
    const mobileOverlay = document.getElementById('mobile-overlay');
    if (!mobileOverlay) return;
    const isOpening = mobileOverlay.classList.contains('opacity-0');
    if (isOpening) {
        mobileOverlay.classList.remove('opacity-0', 'pointer-events-none');
        mobileOverlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    } else {
        mobileOverlay.classList.add('opacity-0', 'pointer-events-none');
        mobileOverlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }
}
// Ensure body scroll is restored if window resized while menu open
window.addEventListener('resize', () => {
    if (window.innerWidth >= 768) {
        const mobileOverlay = document.getElementById('mobile-overlay');
        if (mobileOverlay && !mobileOverlay.classList.contains('opacity-0')) {
            toggleMenu();
        }
    }
});
document.getElementById('mobile-menu-btn')?.addEventListener('click', toggleMenu);
document.getElementById('close-menu-btn')?.addEventListener('click', toggleMenu);
// Form Submission handling
const contactForm = document.getElementById('contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = contactForm.querySelector('button');
        const originalContent = btn.innerHTML;
        const formData = {
            firstName: document.getElementById('contact-firstname').value.trim(),
            lastName: document.getElementById('contact-lastname').value.trim(),
            email: document.getElementById('contact-email').value.trim(),
            message: document.getElementById('contact-message').value.trim()
        };
        if (!formData.firstName || !formData.email || !formData.message) {
            showToast('Please fill in all required fields.', true);
            return;
        }
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i><span>Sending...</span>';
        safeCreateIcons();
        // Controller for Timeout handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    recipient: state.contactEmail,
                    locationAtTimeOfInquiry: state.currentLocation
                }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            const result = await response.json().catch(() => ({ success: false, message: 'Invalid response from server.' }));
            if (response.ok && result.success !== false) {
                showToast(result.message || 'Thank you! Your message has been sent.');
                contactForm.reset();
            } else {
                throw new Error(result.message || 'Unable to deliver message at this time.');
            }
        } catch (error) {
            console.error('Submission Error:', error);
            const errorMessage = error.name === 'AbortError' 
                ? 'Request timed out. Please check your connection.' 
                : (error.message || 'Something went wrong. Please try again later.');
            showToast(errorMessage, true);
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalContent;
            safeCreateIcons();
        }
    });
}
function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-message');
    const iconContainer = document.getElementById('toast-icon-container');
    if (!toast || !toastMsg || !iconContainer) return;
    toastMsg.textContent = message;
    if (isError) {
        iconContainer.classList.remove('bg-green-500/20');
        iconContainer.classList.add('bg-red-500/20');
        iconContainer.innerHTML = '<i data-lucide="alert-circle" class="text-red-400 w-5 h-5"></i>';
    } else {
        iconContainer.classList.remove('bg-red-500/20');
        iconContainer.classList.add('bg-green-500/20');
        iconContainer.innerHTML = '<i data-lucide="check-circle-2" class="text-green-400 w-6 h-6"></i>';
    }
    safeCreateIcons();
    toast.classList.remove('opacity-0', 'translate-y-10', 'pointer-events-none');
    toast.classList.add('opacity-100', 'translate-y-0');
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-10', 'pointer-events-none');
        toast.classList.remove('opacity-100', 'translate-y-0');
    }, 4000);
}
// Initial Boot
window.addEventListener('DOMContentLoaded', () => {
    safeCreateIcons();
    const hash = window.location.hash.replace('#', '');
    const validViews = ['home', 'destinations', 'blog', 'gallery', 'about', 'contact'];
    if (hash && validViews.includes(hash)) {
        navigateTo(hash, true);
    } else {
        navigateTo('splash', true);
    }
});
// Browser History Support
window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '');
    if (hash && hash !== state.currentView) {
        state.navigating = false;
        navigateTo(hash);
    }
});
window.navigateTo = navigateTo;
window.toggleMenu = toggleMenu;