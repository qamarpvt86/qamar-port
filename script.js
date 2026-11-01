(() => {
  const FRAME_COUNT = 300;
  const canvas = document.getElementById("can-canvas");
  const ctx = canvas.getContext("2d");

  const images = new Array(FRAME_COUNT + 1);
  let loadedCount = 0;
  let targetFrame = 1;
  let currentFrame = 1;
  let lastRenderedFrame = -1;

  // Format frame URL: ezgif-frame-001.jpg ... ezgif-frame-300.jpg
  function getFrameUrl(index) {
    const padded = String(index).padStart(3, "0");
    return `assets/can-vid/ezgif-frame-${padded}.jpg`;
  }

  // Preload frames asynchronously
  function preloadImages() {
    for (let i = 1; i <= FRAME_COUNT; i++) {
      const img = new Image();
      img.src = getFrameUrl(i);

      img.onload = () => {
        loadedCount++;
        // As soon as the first frame loads, paint it immediately
        if (i === 1 && lastRenderedFrame === -1) {
          drawFrame(1);
        }
      };

      images[i] = img;
    }
  }

  // Find the closest available loaded frame if target is still loading
  function getClosestLoadedImage(index) {
    if (images[index] && images[index].complete && images[index].naturalWidth > 0) {
      return images[index];
    }

    for (let offset = 1; offset < FRAME_COUNT; offset++) {
      const prev = index - offset;
      if (prev >= 1 && images[prev]?.complete && images[prev]?.naturalWidth > 0) {
        return images[prev];
      }
      const next = index + offset;
      if (next <= FRAME_COUNT && images[next]?.complete && images[next]?.naturalWidth > 0) {
        return images[next];
      }
    }
    return null;
  }

  // Draw frame to canvas with full-bleed responsive cover fit
  function drawFrame(frameIndex) {
    const img = getClosestLoadedImage(frameIndex);
    if (!img) return;

    const w = canvas.width;
    const h = canvas.height;
    const imgW = img.naturalWidth;
    const imgH = img.naturalHeight;

    if (!imgW || !imgH) return;

    // Full-bleed cover ensures zero letterboxing on any screen size
    const scale = Math.max(w / imgW, h / imgH);

    const drawW = imgW * scale;
    const drawH = imgH * scale;
    const drawX = (w - drawW) / 2;
    const drawY = (h - drawH) / 2;

    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, imgW, imgH, drawX, drawY, drawW, drawH);

    lastRenderedFrame = frameIndex;
  }

  // Resize canvas to match display size and DPR
  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;

    if (lastRenderedFrame !== -1) {
      drawFrame(lastRenderedFrame);
    } else {
      drawFrame(1);
    }
  }

  // Initialize Lenis smooth scroll
  let lenis = null;
  if (typeof Lenis !== "undefined") {
    lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.8,
    });
  }

  // Mobile navigation drawer toggle
  const menuToggle = document.getElementById("menu-toggle");
  const navLinks = document.getElementById("nav-links");

  function closeMobileMenu() {
    if (navLinks && navLinks.classList.contains("open")) {
      navLinks.classList.remove("open");
      if (menuToggle) menuToggle.classList.remove("active");
    }
  }

  if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = navLinks.classList.toggle("open");
      menuToggle.classList.toggle("active", isOpen);
    });

    // Close when tapping anywhere outside the menu
    document.addEventListener("click", (e) => {
      if (!navLinks.contains(e.target) && !menuToggle.contains(e.target)) {
        closeMobileMenu();
      }
    });

    // Close on Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMobileMenu();
    });
  }

  // Smooth scroll to anchor links with Lenis
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      const targetId = this.getAttribute("href");
      if (targetId && targetId !== "#") {
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          e.preventDefault();
          closeMobileMenu();

          const offset = window.innerWidth <= 768 ? -64 : -72;
          if (lenis) {
            lenis.scrollTo(targetElement, { offset, duration: 1.3 });
          } else {
            targetElement.scrollIntoView({ behavior: "smooth" });
          }
        }
      }
    });
  });

  // Navbar background change & active section tracking
  const navbar = document.getElementById("navbar");
  const sections = document.querySelectorAll(".section");
  const navItems = document.querySelectorAll(".nav-link");

  function updateNavbar() {
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    if (navbar) {
      if (scrollY > 30) {
        navbar.classList.add("scrolled");
      } else {
        navbar.classList.remove("scrolled");
      }
    }

    // Active link highlighting
    let currentSectionId = "home";
    const navOffset = window.innerWidth <= 768 ? 100 : 130;
    sections.forEach((sec) => {
      const top = sec.offsetTop - navOffset;
      const height = sec.offsetHeight;
      if (scrollY >= top && scrollY < top + height) {
        currentSectionId = sec.getAttribute("id");
      }
    });

    navItems.forEach((link) => {
      link.classList.remove("active");
      if (link.getAttribute("href") === `#${currentSectionId}`) {
        link.classList.add("active");
      }
    });
  }

  // Animation render loop
  function update(time) {
    if (lenis) {
      lenis.raf(time);
    }

    const scrollElement = document.documentElement;
    const maxScroll = scrollElement.scrollHeight - window.innerHeight;
    const scrollY = window.scrollY || scrollElement.scrollTop || 0;
    const progress = maxScroll > 0 ? Math.min(1, Math.max(0, scrollY / maxScroll)) : 0;

    targetFrame = 1 + progress * (FRAME_COUNT - 1);

    // Linear interpolation for ultra-smooth fluid frame stepping
    currentFrame += (targetFrame - currentFrame) * 0.12;

    if (Math.abs(targetFrame - currentFrame) < 0.005) {
      currentFrame = targetFrame;
    }

    const frameToDraw = Math.min(FRAME_COUNT, Math.max(1, Math.round(currentFrame)));

    if (frameToDraw !== lastRenderedFrame) {
      drawFrame(frameToDraw);
    }

    updateNavbar();
    requestAnimationFrame(update);
  }

  // Event listeners
  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("orientationchange", () => {
    setTimeout(resizeCanvas, 150);
  });

  // Initialize
  resizeCanvas();
  preloadImages();
  requestAnimationFrame(update);
})();
