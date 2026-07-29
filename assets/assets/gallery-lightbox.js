/*!
 * SPRING — Gallery Lightbox
 * Click any project-gallery thumbnail to view the full image.
 * Vanilla JS, no dependencies. Works with display:contents gallery groups.
 */
(function () {
  "use strict";

  function init() {
    var galleryImgs = Array.prototype.slice.call(
      document.querySelectorAll(".project-gallery .gallery-item img")
    );
    if (!galleryImgs.length) return;

    // Build overlay once
    var overlay = document.createElement("div");
    overlay.className = "gl-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.innerHTML =
      '<button class="gl-close" aria-label="Close">&times;</button>' +
      '<button class="gl-prev" aria-label="Previous">&#8249;</button>' +
      '<img class="gl-img" alt="" />' +
      '<button class="gl-next" aria-label="Next">&#8250;</button>' +
      '<div class="gl-caption"></div>';
    document.body.appendChild(overlay);

    var glImg = overlay.querySelector(".gl-img");
    var glCap = overlay.querySelector(".gl-caption");
    var idx = 0;

    function show(i) {
      var n = galleryImgs.length;
      idx = (i + n) % n;
      var img = galleryImgs[idx];
      glImg.src = img.currentSrc || img.src;
      glImg.alt = img.getAttribute("alt") || "";
      glCap.textContent = img.getAttribute("alt") || "";
    }
    function open(i) {
      show(i);
      overlay.classList.add("is-open");
      document.body.style.overflow = "hidden";
    }
    function close() {
      overlay.classList.remove("is-open");
      document.body.style.overflow = "";
    }

    // Delegate clicks on thumbnails
    document.addEventListener("click", function (e) {
      var item = e.target.closest ? e.target.closest(".gallery-item") : null;
      if (!item) return;
      var img = item.querySelector("img");
      if (!img) return;
      var i = galleryImgs.indexOf(img);
      if (i < 0) {
        galleryImgs = Array.prototype.slice.call(
          document.querySelectorAll(".project-gallery .gallery-item img")
        );
        i = galleryImgs.indexOf(img);
      }
      if (i >= 0) {
        open(i);
        e.preventDefault();
      }
    });

    overlay.querySelector(".gl-close").addEventListener("click", close);
    overlay.querySelector(".gl-prev").addEventListener("click", function (e) {
      e.stopPropagation();
      show(idx - 1);
    });
    overlay.querySelector(".gl-next").addEventListener("click", function (e) {
      e.stopPropagation();
      show(idx + 1);
    });
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close();
    });
    document.addEventListener("keydown", function (e) {
      if (!overlay.classList.contains("is-open")) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") show(idx - 1);
      else if (e.key === "ArrowRight") show(idx + 1);
    });
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
