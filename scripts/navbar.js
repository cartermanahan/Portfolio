// navbar.js

document.addEventListener('DOMContentLoaded', () => {
    const navbar = document.querySelector('.navbar');
    const menuToggle = document.getElementById('menu-toggle');
    const navList = document.querySelector('.nav-links ul');
    const navLinks = document.querySelectorAll('.nav-links a');

    /*-----------------------------
      Smooth Scroll for Nav Links
    -----------------------------*/
    navLinks.forEach(link => {
        link.addEventListener('click', e => {
            const href = link.getAttribute('href');

            // Only handle in-page anchors
            if (href && href.startsWith('#')) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            }

            // Close mobile menu after click
            if (navList) {
                navList.classList.remove('show');
            }
            if (menuToggle) {
                menuToggle.classList.remove('open');
            }
        });
    });

    /*-----------------------------
      Sticky Navbar on Scroll
    -----------------------------*/
    const handleScroll = () => {
        if (!navbar) return;

        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // run once on load

    /*-----------------------------
      Mobile Menu Toggle
    -----------------------------*/
    if (menuToggle && navList) {
        menuToggle.addEventListener('click', e => {
            e.stopPropagation();
            navList.classList.toggle('show');
            menuToggle.classList.toggle('open');
        });

        // Close when clicking outside
        document.addEventListener('click', e => {
            const clickInsideMenu = navList.contains(e.target);
            const clickOnToggle = menuToggle.contains(e.target);

            if (!clickInsideMenu && !clickOnToggle) {
                navList.classList.remove('show');
                menuToggle.classList.remove('open');
            }
        });
    }
});