// Applique la configuration de branding (branding.config.js) à l'écran d'accueil.
// JS ES5 sans dépendance ; tolérant : config ou élément absent => rien n'est fait.
(function () {
  window.bkcore = window.bkcore || {};

  function setText(doc, id, text) {
    var e = doc.getElementById(id);
    if (e && text != null) e.textContent = text;
  }

  function applyLogo(doc, logo) {
    var img = doc.getElementById("brand-logo");
    if (!img || !logo) return;
    // Logo introuvable : on masque le cartouche (ou l'image seule) ; le texte d'accueil reste.
    img.onerror = function () {
      var box = doc.getElementById("brand-logo-box") || img;
      box.style.display = "none";
    };
    if (logo.alt != null) img.alt = logo.alt;
    if (logo.ratio) img.style.aspectRatio = String(logo.ratio).replace("/", " / ");
    if (logo.src) img.src = logo.src;
  }

  function applyColors(doc, colors) {
    if (!colors) return;
    var style = doc.documentElement.style;
    for (var key in colors) {
      if (!Object.prototype.hasOwnProperty.call(colors, key)) continue;
      var value = colors[key];
      // gradient: [debut, fin] => --brand-gradient: linear-gradient(...)
      if (key === "gradient") {
        if (value && value.length >= 2) {
          value = "linear-gradient(to right, " + value[0] + ", " + value[1] + ")";
        } else {
          continue;
        }
      }
      style.setProperty("--brand-" + key, value);
    }
  }

  window.bkcore.Branding = {
    apply: function (doc, config) {
      if (!doc || !config) return;
      setText(doc, "brand-welcome", config.welcome);
      setText(doc, "brand-subtitle", config.subtitle);
      setText(doc, "start", config.startLabel);
      applyLogo(doc, config.logo);
      applyColors(doc, config.colors);
      var step1 = doc.getElementById("step-1");
      if (step1) step1.classList.add("brand-acme");
    }
  };
})();
