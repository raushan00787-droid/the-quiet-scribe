/* The Quiet Scribe · Motion Controller
   No framework or runtime dependency. Owns the opening sequence and motion lifecycle. */
(function () {
  "use strict";

  var body = document.body;
  var scene = document.getElementById("qs-opening-scene");
  var dayAction = document.getElementById("qs-day-action");
  var nightGo = document.getElementById("qs-night-go");
  var skipButton = document.getElementById("qs-opening-skip");
  var reducedMotion = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : { matches: false };

  function syncMotionPreference() {
    body.classList.toggle("qs-reduced-motion", !!reducedMotion.matches);
  }

  syncMotionPreference();
  if (reducedMotion.addEventListener) {
    reducedMotion.addEventListener("change", syncMotionPreference);
  } else if (reducedMotion.addListener) {
    reducedMotion.addListener(syncMotionPreference);
  }

  function syncVisibility() {
    body.classList.toggle("qs-motion-paused", document.visibilityState === "hidden");
  }

  document.addEventListener("visibilitychange", syncVisibility, { passive: true });
  window.addEventListener("pageshow", syncVisibility, { passive: true });
  syncVisibility();

  /* Fail open if opening markup is absent: the main app remains usable. */
  if (!scene) return;

  var transitioning = false;
  var finished = false;
  var finishTimer = 0;

  function finishOpening() {
    if (finished) return;
    finished = true;
    window.clearTimeout(finishTimer);

    if (scene.isConnected) scene.remove();

    body.classList.remove("qs-opening", "qs-entering");
    body.classList.add("qs-ready", "qs-entering");

    var nextScreen = "welcome";
    if (typeof window.restoreQuietSession === "function") {
      try {
        var restored = window.restoreQuietSession();
        if (restored) {
          nextScreen = typeof window.isQuietSetupComplete === "function" &&
            window.isQuietSetupComplete() ? "purpose" : "quiet-setup";
        }
      } catch (error) {
        console.warn("Quiet Scribe session restoration was skipped.", error);
      }
    }

    document.querySelectorAll(".screen").forEach(function (screen) {
      screen.classList.remove("active");
    });

    var target = document.getElementById(nextScreen);
    if (target) target.classList.add("active");

    window.scrollTo({ top: 0, behavior: "auto" });

    window.requestAnimationFrame(function () {
      if (reducedMotion.matches) {
        body.classList.remove("qs-entering");
        return;
      }
      window.setTimeout(function () {
        body.classList.remove("qs-entering");
      }, 520);
    });
  }

  function enterQuiet(skipAnimation) {
    if (transitioning || finished) return;
    transitioning = true;

    if (dayAction) dayAction.disabled = true;
    if (nightGo) nightGo.disabled = true;
    if (skipButton) skipButton.disabled = true;

    scene.classList.add("qs-exiting");
    if (skipAnimation) {
      scene.style.transitionDuration = reducedMotion.matches ? "1ms" : "450ms";
    }

    var delay = reducedMotion.matches ? 30 : (skipAnimation ? 500 : 1450);
    scene.addEventListener("transitionend", function (event) {
      if (event.target === scene && event.propertyName === "opacity") finishOpening();
    }, { once: true });

    finishTimer = window.setTimeout(finishOpening, delay);
  }

  if (dayAction) {
    dayAction.addEventListener("click", function () {
      if (transitioning || scene.classList.contains("qs-night")) return;

      scene.classList.add("qs-night");
      dayAction.setAttribute("aria-pressed", "true");

      if (nightGo) {
        window.setTimeout(function () {
          if (!finished && nightGo.isConnected && !nightGo.disabled) nightGo.focus();
        }, reducedMotion.matches ? 30 : 250);
      }
    });
  }

  if (nightGo) {
    nightGo.addEventListener("click", function () {
      if (transitioning || !scene.classList.contains("qs-night")) return;
      enterQuiet(false);
    });
  }

  if (skipButton) {
    skipButton.addEventListener("click", function () {
      enterQuiet(true);
    });
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && body.classList.contains("qs-opening")) {
      enterQuiet(true);
    }
  });

  /* Newly inserted chat messages get one short entrance, without replaying old history. */
  var chat = document.getElementById("chat");
  if (chat && "MutationObserver" in window) {
    var messageObserver = new MutationObserver(function (records) {
      records.forEach(function (record) {
        record.addedNodes.forEach(function (node) {
          if (!node || node.nodeType !== 1) return;
          var messages = [];
          if (node.matches && node.matches(".message")) messages.push(node);
          if (node.querySelectorAll) messages.push.apply(messages, node.querySelectorAll(".message"));

          messages.forEach(function (message) {
            if (message.dataset.qsMotionSeen === "true") return;
            message.dataset.qsMotionSeen = "true";
            message.classList.add("qs-motion-new");

            message.addEventListener("animationend", function () {
              message.classList.remove("qs-motion-new");
            }, { once: true });

            window.setTimeout(function () {
              message.classList.remove("qs-motion-new");
            }, reducedMotion.matches ? 80 : 650);
          });
        });
      });
    });

    messageObserver.observe(chat, { childList: true, subtree: true });
  }

  /* FINAL BOSS INTERACTION PASS
     Keep the effects pointer-aware, cheap, and completely optional. */

  function initOpeningParallax() {
    if (!scene || reducedMotion.matches || !window.matchMedia) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    var frame = 0;
    var pointerX = 0;
    var pointerY = 0;

    function resetParallax() {
      pointerX = 0;
      pointerY = 0;
      if (frame) return;
      frame = window.requestAnimationFrame(function () {
        frame = 0;
        scene.style.setProperty("--qs-parallax-x", "0px");
        scene.style.setProperty("--qs-parallax-y", "0px");
      });
    }

    scene.addEventListener("pointermove", function (event) {
      if (event.pointerType === "touch" || !scene.isConnected) return;

      var rect = scene.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      pointerX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      pointerY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;

      if (frame) return;
      frame = window.requestAnimationFrame(function () {
        frame = 0;
        if (!scene.isConnected || reducedMotion.matches) return;
        scene.style.setProperty("--qs-parallax-x", (-pointerX * 5).toFixed(2) + "px");
        scene.style.setProperty("--qs-parallax-y", (-pointerY * 4).toFixed(2) + "px");
      });
    }, { passive: true });

    scene.addEventListener("pointerleave", resetParallax, { passive: true });
    window.addEventListener("blur", resetParallax, { passive: true });
  }

  function initRoomCardDepth() {
    if (reducedMotion.matches || !window.matchMedia) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    document.querySelectorAll("button.qs-room-card").forEach(function (card) {
      var frame = 0;
      var latestEvent = null;

      function resetCard() {
        latestEvent = null;
        if (frame) {
          window.cancelAnimationFrame(frame);
          frame = 0;
        }
        card.classList.remove("qs-tilt-active");
        card.style.setProperty("--qs-tilt-x", "0deg");
        card.style.setProperty("--qs-tilt-y", "0deg");
        card.style.setProperty("--qs-glow-x", "50%");
        card.style.setProperty("--qs-glow-y", "50%");
      }

      card.addEventListener("pointermove", function (event) {
        if (event.pointerType === "touch" || reducedMotion.matches) return;

        latestEvent = event;
        if (frame) return;

        frame = window.requestAnimationFrame(function () {
          frame = 0;
          if (!latestEvent || reducedMotion.matches) return;

          var rect = card.getBoundingClientRect();
          if (!rect.width || !rect.height) return;

          var x = Math.max(0, Math.min(1, (latestEvent.clientX - rect.left) / rect.width));
          var y = Math.max(0, Math.min(1, (latestEvent.clientY - rect.top) / rect.height));
          var tiltX = (0.5 - y) * 5.5;
          var tiltY = (x - 0.5) * 7;

          card.classList.add("qs-tilt-active");
          card.style.setProperty("--qs-tilt-x", tiltX.toFixed(2) + "deg");
          card.style.setProperty("--qs-tilt-y", tiltY.toFixed(2) + "deg");
          card.style.setProperty("--qs-glow-x", (x * 100).toFixed(1) + "%");
          card.style.setProperty("--qs-glow-y", (y * 100).toFixed(1) + "%");
        });
      }, { passive: true });

      card.addEventListener("pointerleave", resetCard, { passive: true });
      card.addEventListener("blur", resetCard, { passive: true });
    });
  }

  function initScrollArrivals() {
    if (reducedMotion.matches || !("IntersectionObserver" in window)) return;

    var selector = ".reading-card, .entry, .person-card, .settings-card, .thought-box, .qs-mark-card";
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("qs-scroll-reveal-visible");
        revealObserver.unobserve(entry.target);
      });
    }, {
      root: null,
      rootMargin: "0px 0px -24px 0px",
      threshold: 0.08
    });

    var sequence = 0;

    function registerReveal(element) {
      if (!element || element.nodeType !== 1 || element.dataset.qsRevealObserved === "true") return;
      if (!element.matches(selector)) return;

      element.dataset.qsRevealObserved = "true";
      element.classList.add("qs-scroll-reveal");
      element.style.setProperty("--qs-reveal-delay", ((sequence++ % 4) * 45) + "ms");
      revealObserver.observe(element);
    }

    function scanNode(node) {
      if (!node || node.nodeType !== 1) return;
      registerReveal(node);
      if (node.querySelectorAll) node.querySelectorAll(selector).forEach(registerReveal);
    }

    body.classList.add("qs-reveal-enhanced");
    document.querySelectorAll(selector).forEach(registerReveal);

    /* Catch cards/entries created later by the app, without replaying revealed items. */
    var contentObserver = new MutationObserver(function (records) {
      records.forEach(function (record) {
        record.addedNodes.forEach(scanNode);
      });
    });
    contentObserver.observe(body, { childList: true, subtree: true });
  }

  initOpeningParallax();
  initRoomCardDepth();
  initScrollArrivals();

})();
