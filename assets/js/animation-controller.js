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
})();
