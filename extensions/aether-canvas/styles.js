const AETHER_PRESETS = {
  original: "",
  reader: `
    body { font-family: Georgia, 'Times New Roman', serif !important; font-size: 18px !important;
           line-height: 1.75 !important; color: #24252b !important; background: #fbfaf6 !important; }
    main, article, [role=main] { max-width: 760px !important; margin: 40px auto !important; padding: 0 24px !important; }
    nav, aside, .sidebar, .comments, .related { display: none !important; }
    img, video { max-width: 100% !important; height: auto !important; }`,
  night: `
    html { filter: invert(0.92) hue-rotate(180deg) !important; }
    img, video, canvas, [style*="background-image"] { filter: invert(1) hue-rotate(180deg) !important; }`,
  focus: `
    main, article, [role=main] { max-width: 780px !important; margin: auto !important; }
    aside, .sidebar, .newsletter, .cookie-banner, .promo { display: none !important; }
    body { background: #f7f7f5 !important; color: #222 !important; }`,
  large: `html { font-size: 120% !important; } body { line-height: 1.6 !important; }`,
  calm: `
    *, *::before, *::after { animation-duration: 0.001s !important; transition-duration: 0.001s !important; }
    .cookie-banner, .cookie-consent, .modal-backdrop { display: none !important; }`
};
