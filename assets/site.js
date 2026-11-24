// Small touches for the Aether website — no frameworks, no tracking.

document.querySelectorAll("[href^='downloads/']").forEach((link) => {
  link.addEventListener("click", () => {
    // Give the user a hint if they open a placeholder download locally.
    if (location.protocol === "file:" && link.getAttribute("href").endsWith(".AppImage")) {
      console.info("Aether: run site/serve.sh to place the AppImage in downloads/ first.");
    }
  });
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.animate(
        [{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }],
        { duration: 420, easing: "ease-out" }
      );
      observer.unobserve(entry.target);
    }
  });
}, { threshold: .08 });

document.querySelectorAll(".features article, .install-card").forEach((el) => observer.observe(el));
