(() => {
  "use strict";

  const header = document.querySelector(".site-header");
  const progress = document.getElementById("scrollProgress");
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("navLinks");
  const navAnchors = [...document.querySelectorAll('.nav-links a[href^="#"]')];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const closeMenu = () => {
    if (!nav || !toggle) return;
    nav.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  };

  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });

    nav.addEventListener("click", (event) => {
      if (event.target.closest("a")) closeMenu();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });

    document.addEventListener("click", (event) => {
      if (!nav.classList.contains("open")) return;
      if (!nav.contains(event.target) && !toggle.contains(event.target)) closeMenu();
    });
  }

  const updateScrollUI = () => {
    const y = window.scrollY || document.documentElement.scrollTop;
    if (header) header.classList.toggle("scrolled", y > 24);

    if (progress) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? Math.min(1, y / max) : 0;
      progress.style.width = (ratio * 100).toFixed(2) + "%";
    }
  };

  updateScrollUI();
  window.addEventListener("scroll", updateScrollUI, { passive: true });
  window.addEventListener("resize", updateScrollUI);

  const reveals = [...document.querySelectorAll(".reveal")];
  const revealSupported = !reducedMotion && "IntersectionObserver" in window;

  if (revealSupported) {
    document.documentElement.classList.add("reveal-ready");
  }

  if (!revealSupported) {
    reveals.forEach((node) => node.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

    reveals.forEach((node, index) => {
      if (index < 8) node.style.transitionDelay = Math.min(index * 45, 180) + "ms";
      revealObserver.observe(node);
    });
  }

  const sections = [...document.querySelectorAll("main section[id]")];
  if ("IntersectionObserver" in window && navAnchors.length) {
    const sectionObserver = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!visible) return;
      navAnchors.forEach((link) => {
        link.classList.toggle("active", link.getAttribute("href") === "#" + visible.target.id);
      });
    }, { rootMargin: "-34% 0px -56% 0px", threshold: [0.01, 0.2, 0.5] });

    sections.forEach((section) => sectionObserver.observe(section));
  }

  const counters = [...document.querySelectorAll("[data-count]")];
  const setCounter = (node, value) => {
    node.textContent = new Intl.NumberFormat("fr-FR").format(value);
  };

  if (reducedMotion || !("IntersectionObserver" in window)) {
    counters.forEach((node) => setCounter(node, Number(node.dataset.count || 0)));
  } else {
    const counterObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const node = entry.target;
        const target = Number(node.dataset.count || 0);
        const start = performance.now();
        const duration = 850;

        const frame = (now) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 3);
          setCounter(node, Math.round(target * eased));
          if (t < 1) requestAnimationFrame(frame);
        };

        requestAnimationFrame(frame);
        observer.unobserve(node);
      });
    }, { threshold: 0.6 });

    counters.forEach((node) => {
      node.textContent = "0";
      counterObserver.observe(node);
    });
  }

  const dialog = document.getElementById("lightbox");
  const dialogImage = document.getElementById("lightboxImage");
  const closeButton = document.querySelector(".lightbox-close");
  const mediaTriggers = [...document.querySelectorAll("[data-lightbox]")];

  const openLightbox = (trigger) => {
    if (!dialog || !dialogImage) return;
    const src = trigger.getAttribute("data-lightbox");
    const img = trigger.querySelector("img");
    dialogImage.src = src || "";
    dialogImage.alt = img ? img.alt : "";
    if (typeof dialog.showModal === "function") dialog.showModal();
  };

  mediaTriggers.forEach((trigger) => {
    trigger.addEventListener("click", () => openLightbox(trigger));
  });

  if (dialog) {
    if (closeButton) closeButton.addEventListener("click", () => dialog.close());

    dialog.addEventListener("click", (event) => {
      const rect = dialog.getBoundingClientRect();
      const outside =
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom;
      if (outside) dialog.close();
    });

    dialog.addEventListener("close", () => {
      if (dialogImage) {
        dialogImage.src = "";
        dialogImage.alt = "";
      }
    });
  }

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href");
      if (!href || href === "#") return;
      const target = document.querySelector(href);
      if (!target) return;

      event.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 24;
      window.scrollTo({ top, behavior: reducedMotion ? "auto" : "smooth" });
      history.replaceState(null, "", href);
    });
  });
})();