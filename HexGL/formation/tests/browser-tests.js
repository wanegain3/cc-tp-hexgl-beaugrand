/* Tests du code existant HexGL, sans Node.js. QUnit est chargé localement. */
(function () {
  "use strict";
  if (typeof QUnit === "undefined") {
    document.documentElement.dataset.testStatus = "fail";
    document.documentElement.dataset.testCount = "0";
    document.documentElement.dataset.testFailures = "1";
    document.body.insertAdjacentHTML("afterbegin", "<p style='color:red'>QUnit introuvable : vérifiez vendor/qunit-2.26.0.js</p>");
    return;
  }

  // Compatible avec le script Chrome headless existant : état mesurable dans le DOM.
  QUnit.done(function (result) {
    const count = result.total;
    const failed = result.failed;
    const root = document.documentElement;
    root.setAttribute("data-test-count", String(count));
    root.setAttribute("data-test-failures", String(failed));
    root.setAttribute("data-test-status", failed === 0 && count >= 4 ? "pass" : "fail");
    let summary = document.getElementById("summary");
    if (!summary) {
      summary = document.createElement("p");
      summary.id = "summary";
      document.body.appendChild(summary);
    }
    summary.textContent = count + " test(s) : " + (count - failed) + " réussi(s), " + failed + " échec(s).";
  });

  const U = window.bkcore && window.bkcore.Utils;
  QUnit.module("HexGL — bkcore.Utils", function () {
    QUnit.test("updateClass ajoute une classe", function (assert) {
      assert.ok(U, "Utils.js chargé");
      const e = document.createElement("div");
      e.id = "test-hexgl-add";
      document.getElementById("qunit-fixture").appendChild(e);
      U.updateClass(e.id, "active", true);
      assert.true(e.classList.contains("active"));
    });
    QUnit.test("updateClass supprime une classe", function (assert) {
      assert.ok(U, "Utils.js chargé");
      const e = document.createElement("div");
      e.id = "test-hexgl-remove";
      e.className = "active";
      document.getElementById("qunit-fixture").appendChild(e);
      U.updateClass(e.id, "active", false);
      assert.false(e.classList.contains("active"));
    });
    QUnit.test("getOffsetTop additionne les décalages parent/enfant", function (assert) {
      const parent = {
        offsetTop: 37,
        offsetParent: null
      };
      const enfant = {
        offsetTop: 13,
        offsetParent: parent
      };
      assert.strictEqual(U.getOffsetTop(enfant), 50);
    });
    QUnit.test("getURLParameter lit les paramètres d'URL", function (assert) {
      assert.ok(U, "Utils.js chargé");
      U.URLParameters = null;
      const url = new URL(window.location.href);
      url.searchParams.set("hexgl_poc", "ok");
      // Le lanceur fournit hexgl_poc=ok ; en ouverture directe, on teste l'absence ou la présence.
      const expected = window.location.search.includes("hexgl_poc=ok") ? "ok" : null;
      assert.strictEqual(U.getURLParameter("hexgl_poc"), expected);
    });
  });

  // Image 2x2 factice : évite le chargement réseau du constructeur ImageData.
  function imageFactice(pixels) {
    const img = Object.create(window.bkcore.ImageData.prototype);
    const data = new Uint8ClampedArray(pixels.flat());
    img.pixels = { width: 2, height: 2, data: data };
    return img;
  }

  QUnit.module("HexGL — bkcore.Utils (cas limites)", function () {
    QUnit.test("updateClass ignore un id inconnu sans lever d'erreur", function (assert) {
      assert.strictEqual(U.updateClass("id-inexistant-hexgl", "active", true), undefined);
    });
    QUnit.test("getURLParameter renvoie undefined pour un paramètre absent", function (assert) {
      U.URLParameters = null;
      assert.strictEqual(U.getURLParameter("parametre_absent_hexgl"), undefined);
    });
    QUnit.test("getOffsetTop sans parent renvoie son propre décalage", function (assert) {
      assert.strictEqual(U.getOffsetTop({ offsetTop: 21, offsetParent: null }), 21);
    });
  });

  const T = window.bkcore && window.bkcore.Timer;
  QUnit.module("HexGL — bkcore.Timer", function () {
    QUnit.test("msToTime découpe les millisecondes en h/m/s/ms", function (assert) {
      assert.ok(T, "Timer.js chargé");
      const t = T.msToTime(3723004); // 1 h 2 min 3 s 4 ms
      assert.strictEqual(t.h, 1);
      assert.strictEqual(t.m, 2);
      assert.strictEqual(t.s, 3);
      assert.strictEqual(t.ms, 4);
    });
    QUnit.test("msToTime(0) vaut zéro partout", function (assert) {
      const t = T.msToTime(0);
      assert.deepEqual([t.h, t.m, t.s, t.ms], [0, 0, 0, 0]);
    });
    QUnit.test("zfill complète avec des zéros sans tronquer", function (assert) {
      assert.strictEqual(T.zfill(5, 2), "05");
      assert.strictEqual(T.zfill(5, 4), "0005");
      assert.strictEqual(T.zfill(123, 2), "123");
    });
    QUnit.test("msToTimeString formate m/s sur 2 chiffres et ms sur 4", function (assert) {
      const t = T.msToTimeString(3723004);
      assert.strictEqual(t.h, "01");
      assert.strictEqual(t.m, "02");
      assert.strictEqual(t.s, "03");
      assert.strictEqual(t.ms, "0004");
    });
    QUnit.test("un chronomètre neuf est inactif et update() ne change rien", function (assert) {
      const timer = new T();
      assert.false(timer.active);
      timer.update();
      assert.strictEqual(timer.time.elapsed, 0);
    });
    QUnit.test("start() active le chronomètre et pause() le met en pause / le relance", function (assert) {
      const timer = new T();
      timer.start();
      assert.true(timer.active);
      assert.strictEqual(timer.time.elapsed, 0);
      timer.pause(true);
      assert.false(timer.active);
      timer.pause(false);
      assert.true(timer.active);
    });
    QUnit.test("getElapsedTime formate le temps écoulé via msToTime", function (assert) {
      const timer = new T();
      timer.time.elapsed = 61500;
      const t = timer.getElapsedTime();
      assert.deepEqual([t.m, t.s, t.ms], [1, 1, 500]);
    });
  });

  QUnit.module("HexGL — bkcore.ImageData (lecture de pixels)", function () {
    const rouge = [255, 0, 0, 255], vert = [0, 255, 0, 255], bleu = [0, 0, 255, 255], blanc = [255, 255, 255, 255];
    QUnit.test("getPixel renvoie les composantes r/g/b/a du pixel demandé", function (assert) {
      assert.ok(window.bkcore.ImageData, "ImageData.js chargé");
      const img = imageFactice([rouge, vert, bleu, blanc]);
      assert.deepEqual(img.getPixel(0, 0), { r: 255, g: 0, b: 0, a: 255 });
      assert.deepEqual(img.getPixel(1, 0), { r: 0, g: 255, b: 0, a: 255 });
      assert.deepEqual(img.getPixel(0, 1), { r: 0, g: 0, b: 255, a: 255 });
      assert.deepEqual(img.getPixel(1, 1), { r: 255, g: 255, b: 255, a: 255 });
    });
    QUnit.test("getPixel hors limites renvoie un pixel transparent noir", function (assert) {
      const img = imageFactice([rouge, vert, bleu, blanc]);
      const vide = { r: 0, g: 0, b: 0, a: 0 };
      assert.deepEqual(img.getPixel(-1, 0), vide);
      assert.deepEqual(img.getPixel(0, -1), vide);
      assert.deepEqual(img.getPixel(2, 0), vide);
      assert.deepEqual(img.getPixel(0, 2), vide);
    });
    QUnit.test("getPixel avant le chargement de l'image (pixels null) renvoie un pixel vide", function (assert) {
      const img = Object.create(window.bkcore.ImageData.prototype);
      img.pixels = null;
      assert.deepEqual(img.getPixel(0, 0), { r: 0, g: 0, b: 0, a: 0 });
    });
    QUnit.test("getPixelBilinear au centre d'un pixel renvoie ce pixel", function (assert) {
      const img = imageFactice([rouge, vert, bleu, blanc]);
      const c = img.getPixelBilinear(0.5, 0.5);
      assert.deepEqual([c.r, c.g, c.b, c.a], [255, 0, 0, 255]);
    });
    QUnit.test("getPixelBilinear à la frontière de deux pixels fait la moyenne", function (assert) {
      const img = imageFactice([rouge, vert, bleu, blanc]);
      const c = img.getPixelBilinear(1.0, 0.5);
      assert.strictEqual(c.r, 127.5);
      assert.strictEqual(c.g, 127.5);
      assert.strictEqual(c.b, 0);
    });
    QUnit.test("getPixelF sur un pixel dont seul r est non nul renvoie r", function (assert) {
      const img = imageFactice([[7, 0, 0, 255], vert, bleu, blanc]);
      assert.strictEqual(img.getPixelF(0, 0), 7);
    });
  });

  // Document isolé (createHTMLDocument) et config de test : on vérifie le mécanisme,
  // pas les valeurs de marque réelles.
  const B = window.bkcore && window.bkcore.Branding;
  function documentAccueil() {
    const doc = document.implementation.createHTMLDocument("");
    doc.body.innerHTML =
      '<div id="step-1">' +
      '<div id="brand-logo-box"><img id="brand-logo" alt=""></div>' +
      '<h1 id="brand-welcome"></h1><p id="brand-subtitle"></p>' +
      '<div id="start">Start</div></div>';
    return doc;
  }
  const configTest = {
    logo: { src: "logo-test.png", alt: "Societe test", ratio: "2/1" },
    welcome: "Message test",
    subtitle: "Sous-titre test",
    startLabel: "Libelle test",
    colors: { background: "#111111", violet: "#222222", gradient: ["#333333", "#444444"] }
  };

  QUnit.module("HexGL — bkcore.Branding", function () {
    QUnit.test("apply écrit les textes et le logo de la config dans le DOM", function (assert) {
      assert.ok(B, "branding.js chargé");
      const doc = documentAccueil();
      B.apply(doc, configTest);
      assert.strictEqual(doc.getElementById("brand-welcome").textContent, "Message test");
      assert.strictEqual(doc.getElementById("brand-subtitle").textContent, "Sous-titre test");
      assert.strictEqual(doc.getElementById("start").textContent, "Libelle test");
      assert.strictEqual(doc.getElementById("brand-logo").getAttribute("src"), "logo-test.png");
      assert.strictEqual(doc.getElementById("brand-logo").alt, "Societe test");
      assert.true(doc.getElementById("step-1").classList.contains("brand-acme"));
    });
    QUnit.test("apply pose les variables CSS issues de colors", function (assert) {
      const doc = documentAccueil();
      B.apply(doc, configTest);
      const style = doc.documentElement.style;
      assert.strictEqual(style.getPropertyValue("--brand-background"), "#111111");
      assert.strictEqual(style.getPropertyValue("--brand-violet"), "#222222");
      assert.ok(style.getPropertyValue("--brand-gradient").indexOf("#333333") !== -1);
      assert.ok(style.getPropertyValue("--brand-gradient").indexOf("#444444") !== -1);
    });
    QUnit.test("apply sans config ne modifie rien et ne lève pas d'erreur", function (assert) {
      const doc = documentAccueil();
      B.apply(doc, undefined);
      B.apply(undefined, configTest);
      assert.strictEqual(doc.getElementById("start").textContent, "Start");
      assert.false(doc.getElementById("step-1").classList.contains("brand-acme"));
    });
    QUnit.test("apply ignore les éléments manquants sans lever d'erreur", function (assert) {
      const doc = document.implementation.createHTMLDocument("");
      B.apply(doc, configTest);
      assert.strictEqual(doc.documentElement.style.getPropertyValue("--brand-background"), "#111111");
    });
    QUnit.test("logo en erreur : le cartouche est masqué", function (assert) {
      const doc = documentAccueil();
      B.apply(doc, configTest);
      const img = doc.getElementById("brand-logo");
      assert.strictEqual(typeof img.onerror, "function");
      img.onerror();
      assert.strictEqual(doc.getElementById("brand-logo-box").style.display, "none");
      assert.strictEqual(doc.getElementById("brand-welcome").textContent, "Message test");
    });
  });
})();
