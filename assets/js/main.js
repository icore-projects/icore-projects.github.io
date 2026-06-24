/* I.Core Projects — public gallery logic */

(function () {
  "use strict";

  const grid = document.getElementById("grid");
  const emptyState = document.getElementById("empty-state");
  const emptyTitle = document.getElementById("empty-title");
  const emptySub = document.getElementById("empty-sub");
  const appCountEl = document.getElementById("app-count");
  const searchInput = document.getElementById("search-input");

  const modalOverlay = document.getElementById("modal-overlay");
  const modalTitle = document.getElementById("modal-title");
  const modalVersion = document.getElementById("modal-version");
  const modalDesc = document.getElementById("modal-desc");
  const modalDescSection = document.getElementById("modal-desc-section");
  const modalCarousel = document.getElementById("modal-carousel");
  const modalDots = document.getElementById("carousel-dots");
  const modalSource = document.getElementById("modal-source");
  const modalOpen = document.getElementById("modal-open");
  const modalClose = document.getElementById("modal-close");
  const carouselPrev = document.getElementById("carousel-prev");
  const carouselNext = document.getElementById("carousel-next");

  let allApps = [];

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  function firstScreenshot(app) {
    return Array.isArray(app.screenshots) && app.screenshots.length ? app.screenshots[0] : "";
  }

  async function loadApps() {
    try {
      const res = await fetch("apps.json?t=" + Date.now(), { cache: "no-store" });
      if (!res.ok) throw new Error("apps.json not found (" + res.status + ")");
      const data = await res.json();
      allApps = Array.isArray(data) ? data : [];
      allApps.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      render(allApps);
    } catch (err) {
      console.error("Couldn't load apps.json:", err);
      allApps = [];
      appCountEl.textContent = "Couldn't load the app list";
      grid.innerHTML = "";
      emptyTitle.textContent = "Couldn't load apps";
      emptySub.textContent = "apps.json is missing or invalid. If you're the admin, publish an app from the dashboard first.";
      emptyState.hidden = false;
    }
  }

  function render(apps) {
    grid.innerHTML = "";
    if (!apps.length) {
      const isFiltered = searchInput.value.trim().length > 0;
      emptyTitle.textContent = isFiltered ? "No matches" : "No apps yet";
      emptySub.textContent = isFiltered
        ? "Try a different search term."
        : "Once an app is published from the admin dashboard, it'll show up here.";
      emptyState.hidden = false;
      appCountEl.innerHTML = isFiltered
        ? "0 results"
        : "<strong>0</strong> apps ready to launch";
      return;
    }
    emptyState.hidden = true;
    appCountEl.innerHTML = "<strong>" + apps.length + "</strong> app" + (apps.length === 1 ? "" : "s") + " ready to launch";

    apps.forEach((app) => {
      const card = document.createElement("article");
      card.className = "card";
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", "Open details for " + app.name);

      const shot = firstScreenshot(app);
      card.innerHTML = `
        <div class="card-shot">
          ${shot ? `<img src="${escapeHtml(shot)}" alt="${escapeHtml(app.name)} screenshot" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'shot-fallback\\'>No preview</div>'">` : `<div class="shot-fallback">No preview</div>`}
        </div>
        <div class="card-body">
          <div class="card-top-row">
            <span class="card-name">${escapeHtml(app.name)}</span>
            <span class="chip">${escapeHtml(app.version || "")}</span>
          </div>
          <p class="card-desc">${escapeHtml(app.description || "No description provided.")}</p>
          <div class="card-actions">
            <button class="btn btn-solid btn-sm" data-action="open">
              Open
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17 17 7M8 7h9v9"/></svg>
            </button>
            <button class="btn btn-ghost btn-sm" data-action="details">Details</button>
          </div>
        </div>
      `;

      card.addEventListener("click", (e) => {
        const action = e.target.closest("[data-action]");
        if (action && action.dataset.action === "open") {
          e.stopPropagation();
          const url = app.openUrl || app.githubReleaseUrl;
          if (url) window.open(url, "_blank", "noopener");
          return;
        }
        openModal(app);
      });
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openModal(app);
        }
      });

      grid.appendChild(card);
    });
  }

  function filterApps() {
    const q = searchInput.value.trim().toLowerCase();
    if (!q) return render(allApps);
    render(allApps.filter((a) => (a.name || "").toLowerCase().includes(q) || (a.description || "").toLowerCase().includes(q)));
  }

  /* ---------------- modal / carousel ---------------- */

  let activeShots = [];
  let activeIndex = 0;

  function openModal(app) {
    modalTitle.textContent = app.name || "Untitled app";
    modalVersion.textContent = app.version || "";

    if (app.description && app.description.trim()) {
      modalDesc.textContent = app.description;
      modalDescSection.hidden = false;
    } else {
      modalDescSection.hidden = true;
    }

    activeShots = Array.isArray(app.screenshots) ? app.screenshots.filter(Boolean) : [];
    activeIndex = 0;
    buildCarousel();

    const openUrl = app.openUrl || app.githubReleaseUrl;
    if (openUrl) {
      modalOpen.href = openUrl;
      modalOpen.style.display = "";
    } else {
      modalOpen.style.display = "none";
    }

    if (app.githubReleaseUrl) {
      modalSource.href = app.githubReleaseUrl;
      modalSource.style.display = "";
    } else {
      modalSource.style.display = "none";
    }

    modalOverlay.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function buildCarousel() {
    modalCarousel.innerHTML = activeShots
      .map((src) => `<img src="${escapeHtml(src)}" alt="Screenshot" loading="lazy" onerror="this.style.opacity=0.25">`)
      .join("");
    modalDots.innerHTML = activeShots.map((_, i) => `<span></span>`).join("");
    const showNav = activeShots.length > 1;
    carouselPrev.style.display = showNav ? "" : "none";
    carouselNext.style.display = showNav ? "" : "none";
    updateDots();
  }

  function updateDots() {
    const dots = modalDots.children;
    for (let i = 0; i < dots.length; i++) dots[i].classList.toggle("active", i === activeIndex);
  }

  function scrollToIndex(i) {
    if (!activeShots.length) return;
    activeIndex = (i + activeShots.length) % activeShots.length;
    const child = modalCarousel.children[activeIndex];
    if (child) child.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
    updateDots();
  }

  carouselPrev.addEventListener("click", () => scrollToIndex(activeIndex - 1));
  carouselNext.addEventListener("click", () => scrollToIndex(activeIndex + 1));

  function closeModal() {
    modalOverlay.hidden = true;
    document.body.style.overflow = "";
  }

  modalClose.addEventListener("click", closeModal);
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modalOverlay.hidden) closeModal();
  });

  searchInput.addEventListener("input", filterApps);

  loadApps();
})();
