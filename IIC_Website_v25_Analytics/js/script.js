// Theme Logic
const themeKey = 'iic_theme_v1';
const themeToggleBtns = document.querySelectorAll('.theme-toggle');

// 1. Initialize Theme on Load
const savedTheme = localStorage.getItem(themeKey);
// CSS Defaults to Dark Mode now.
// If savedTheme is 'light', we must apply it.
// If savedTheme is 'dark' or null, we apply 'dark' to ensure icons sync.
if (savedTheme === 'light') {
    applyTheme('light');
} else {
    applyTheme('dark');
}

// 2. Event Listeners for All Toggle Buttons
themeToggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
        localStorage.setItem(themeKey, newTheme);
    });
});

// Helper: Apply Theme & Update UI
function applyTheme(theme) {
    // Set Attribute
    document.documentElement.setAttribute('data-theme', theme);

    // Update All Toggle Icons
    themeToggleBtns.forEach(btn => {
        const icon = btn.querySelector('i');
        if (icon) {
            icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    });

    // Update All Logos
    const logos = document.querySelectorAll('.logo img');
    logos.forEach(img => {
        // Light Mode -> 'logo.png' (Dark Text)
        // Dark Mode  -> 'logo-dark.png' (White Text)
        if (theme === 'dark') {
            img.src = 'logo-dark.png';
            // Ensure no conflicting CSS filter overrides this
            img.style.filter = 'none';
        } else {
            img.src = 'logo.png';
            img.style.filter = 'none';
        }
    });
}
