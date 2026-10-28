/**
 * Product Fit Finder by Pinakkaa - Storefront Widget Script
 * Handles real-time customization syncing from backend, cascading fitment lookups,
 * search analytics, instant reset filters, and trust badges.
 * Fully responsive and compatible across ALL Shopify themes (Horizon, Dawn, Refresh, Impulse, Prestige, etc.)
 */

(function () {
  function initFitFinderWidget() {
    const containers = document.querySelectorAll(".widget-wrap");
    if (!containers || containers.length === 0) return;

    containers.forEach(function (container) {
      if (container.dataset.pffInitialized === "true") return;
      container.dataset.pffInitialized = "true";

      // Expand all ancestor section containers up to document.body to ensure full 100% width on all themes
      let ancestor = container.parentElement;
      while (ancestor && ancestor !== document.body) {
        const id = ancestor.id || "";
        const cls = ancestor.className || "";
        if (
          cls.indexOf("shopify-section") !== -1 ||
          id.indexOf("shopify-section") !== -1 ||
          ancestor.tagName === "SECTION"
        ) {
          ancestor.style.setProperty("width", "100%", "important");
          ancestor.style.setProperty("max-width", "100%", "important");
          ancestor.style.setProperty("display", "block", "important");
          ancestor.style.setProperty("flex", "1 1 100%", "important");
          ancestor.style.setProperty("grid-column", "1 / -1", "important");
          ancestor.style.setProperty("margin-left", "0", "important");
          ancestor.style.setProperty("margin-right", "0", "important");
          break;
        }
        ancestor = ancestor.parentElement;
      }

      const shop =
        container.dataset.shop ||
        window.Shopify?.shop ||
        window.location.hostname;

      const outerWrap = container.querySelector(".gvbar_outer-wrap");
      const badgeEl = container.querySelector("#widget-badge");
      const titleEl = container.querySelector("#widget-title");
      const descEl = container.querySelector("#widget-description");
      const textWrap = container.querySelector(".gv_bar_text");
      const yearSelector = container.querySelector("select#GetYear");
      const makeSelector = container.querySelector("select#GetMake");
      const modelSelector = container.querySelector("select#GetModel");
      const redirectBtn = container.querySelector("[data-redirect]");
      const resetBtn = container.querySelector("[data-reset]");

      let yearPlaceholder = "SELECT YEAR";
      let makePlaceholder = "SELECT MAKE";
      let modelPlaceholder = "SELECT MODEL";

      const fetchHeaders = {
        "Accept": "application/json",
        "ngrok-skip-browser-warning": "69420",
      };

      async function fetchFitFinderApi(action, params) {
        params = params || {};
        const queryParams = new URLSearchParams(
          Object.assign(
            {
              action: action || "",
              shop: shop,
            },
            params
          )
        );

        const endpoints = [
          "/apps/fit-finder?" + queryParams.toString(),
          "/apps/fit-finder/?" + queryParams.toString(),
          "/api/storefront/fit-finder?" + queryParams.toString(),
        ];

        for (let i = 0; i < endpoints.length; i++) {
          try {
            const res = await fetch(endpoints[i], {
              method: "GET",
              headers: fetchHeaders,
            });
            if (res.ok) {
              const contentType = res.headers.get("content-type") || "";
              if (contentType.includes("application/json")) {
                const data = await res.json();
                if (data) return data;
              }
            }
          } catch (err) {
            // Fallback to next endpoint
          }
        }
        return null;
      }

      function applyConfig(config) {
        if (!config) return;

        if (outerWrap) {
          if (config.bgType === "image" && config.bgImage) {
            outerWrap.style.setProperty("background-image", "url('" + config.bgImage + "')", "important");
            outerWrap.style.setProperty("background-size", "cover", "important");
            outerWrap.style.setProperty("background-position", "center", "important");
            outerWrap.style.setProperty("background-repeat", "no-repeat", "important");
            outerWrap.style.setProperty("background-color", "transparent", "important");
          } else if (config.bgColor) {
            outerWrap.style.setProperty("background-image", "none", "important");
            outerWrap.style.setProperty("background-color", config.bgColor, "important");
          }

          if (config.boxPadding) {
            outerWrap.style.setProperty("padding", config.boxPadding + "px 24px", "important");
          }
          if (config.borderRadius !== undefined) {
            outerWrap.style.setProperty("border-radius", config.borderRadius + "px", "important");
          }

          // Border Accent Styles
          outerWrap.classList.remove("pff-border-glow", "pff-border-gold", "pff-border-subtle");
          if (config.borderStyle === "glow" || config.borderStyle === "gold") {
            outerWrap.classList.add("pff-border-glow");
          } else if (config.borderStyle === "subtle") {
            outerWrap.classList.add("pff-border-subtle");
          }
        }

        // Trust Badge
        if (badgeEl) {
          if (config.badgeText && config.badgeText.trim() !== "") {
            badgeEl.textContent = config.badgeText.trim();
            badgeEl.style.display = "inline-flex";
          } else {
            badgeEl.style.display = "none";
          }
        }

        if (titleEl) {
          if (config.title) titleEl.textContent = config.title;
          if (config.textColor) titleEl.style.setProperty("color", config.textColor, "important");
        }

        if (descEl) {
          if (config.subtitle !== undefined) descEl.textContent = config.subtitle;
          if (config.textColor) descEl.style.setProperty("color", config.textColor, "important");
        }

        if (textWrap && config.alignment) {
          textWrap.style.setProperty("text-align", config.alignment, "important");
        }

        if (config.yearPlaceholder) {
          yearPlaceholder = config.yearPlaceholder;
          if (yearSelector && yearSelector.options[0]) {
            yearSelector.options[0].textContent = yearPlaceholder;
          }
        }

        if (config.makePlaceholder) {
          makePlaceholder = config.makePlaceholder;
          if (makeSelector && makeSelector.options[0]) {
            makeSelector.options[0].textContent = makePlaceholder;
          }
        }

        if (config.modelPlaceholder) {
          modelPlaceholder = config.modelPlaceholder;
          if (modelSelector && modelSelector.options[0]) {
            modelSelector.options[0].textContent = modelPlaceholder;
          }
        }

        if (redirectBtn) {
          if (config.submitText) redirectBtn.textContent = config.submitText;
          if (config.btnColor) redirectBtn.style.setProperty("background-color", config.btnColor, "important");
          if (config.btnTextColor) redirectBtn.style.setProperty("color", config.btnTextColor, "important");
        }

        // Reset Button
        if (resetBtn) {
          if (config.showResetBtn) {
            resetBtn.style.display = "inline-flex";
            if (config.resetBtnText) resetBtn.textContent = config.resetBtnText;
          } else {
            resetBtn.style.display = "none";
          }
        }
      }

      function resetSelect(selectEl, placeholder, disabled) {
        if (!selectEl) return;
        selectEl.innerHTML = '<option disabled selected value="">' + placeholder + "</option>";
        selectEl.disabled = Boolean(disabled);
      }

      function populateOptions(selectEl, items, placeholder) {
        if (!selectEl) return;
        resetSelect(selectEl, placeholder, false);
        if (!items || items.length === 0) return;

        items.forEach(function (item) {
          const opt = document.createElement("option");
          opt.value = item;
          opt.textContent = item;
          selectEl.appendChild(opt);
        });
      }

      function setButtonState(active, url) {
        if (!redirectBtn) return;
        if (active && url) {
          redirectBtn.href = url;
          redirectBtn.classList.remove("disabled");
          redirectBtn.style.setProperty("cursor", "pointer", "important");
          redirectBtn.style.setProperty("opacity", "1", "important");
        } else {
          redirectBtn.href = "";
          redirectBtn.classList.add("disabled");
          redirectBtn.style.setProperty("cursor", "not-allowed", "important");
          redirectBtn.style.setProperty("opacity", "0.55", "important");
        }
      }

      function resetAllFilters() {
        if (yearSelector) {
          yearSelector.selectedIndex = 0;
        }
        resetSelect(makeSelector, makePlaceholder, true);
        resetSelect(modelSelector, modelPlaceholder, true);
        setButtonState(false);
      }

      if (resetBtn) {
        resetBtn.addEventListener("click", function (e) {
          e.preventDefault();
          resetAllFilters();
        });
      }

      // Initialize Widget: Fetch config and initial years in one single fast request
      async function initializeData() {
        try {
          const res = await fetchFitFinderApi("init");
          if (res) {
            const config = res.config || res.widgetConfig;
            if (config) {
              applyConfig(config);
            }

            if (res.years && res.years.length > 0 && yearSelector) {
              populateOptions(yearSelector, res.years, yearPlaceholder);
            } else if (yearSelector) {
              resetSelect(yearSelector, yearPlaceholder, false);
            }
          }
        } catch (e) {
          console.warn("Product Fit Finder init error:", e);
        }
      }

      // Cascading Change Handlers
      if (yearSelector) {
        yearSelector.addEventListener("change", async function () {
          const selectedYear = yearSelector.value;
          resetSelect(makeSelector, makePlaceholder, true);
          resetSelect(modelSelector, modelPlaceholder, true);
          setButtonState(false);

          if (!selectedYear) return;

          const res = await fetchFitFinderApi("makes", { year: selectedYear });
          if (res && res.makes && res.makes.length > 0) {
            populateOptions(makeSelector, res.makes, makePlaceholder);
          }
        });
      }

      if (makeSelector) {
        makeSelector.addEventListener("change", async function () {
          const selectedYear = yearSelector ? yearSelector.value : "";
          const selectedMake = makeSelector.value;
          resetSelect(modelSelector, modelPlaceholder, true);
          setButtonState(false);

          if (!selectedYear || !selectedMake) return;

          const res = await fetchFitFinderApi("models", {
            year: selectedYear,
            make: selectedMake,
          });
          if (res && res.models && res.models.length > 0) {
            populateOptions(modelSelector, res.models, modelPlaceholder);
          }
        });
      }

      if (modelSelector) {
        modelSelector.addEventListener("change", async function () {
          const selectedYear = yearSelector ? yearSelector.value : "";
          const selectedMake = makeSelector ? makeSelector.value : "";
          const selectedModel = modelSelector.value;
          setButtonState(false);

          if (!selectedYear || !selectedMake || !selectedModel) return;

          const res = await fetchFitFinderApi("collection", {
            year: selectedYear,
            make: selectedMake,
            model: selectedModel,
          });

          if (res && res.collection) {
            setButtonState(true, res.collection);
          }
        });
      }

      if (redirectBtn) {
        redirectBtn.addEventListener("click", function () {
          const selectedYear = yearSelector ? yearSelector.value : "";
          const selectedMake = makeSelector ? makeSelector.value : "";
          const selectedModel = modelSelector ? modelSelector.value : "";
          if (selectedYear && selectedMake && selectedModel) {
            fetchFitFinderApi("track_search", {
              year: selectedYear,
              make: selectedMake,
              model: selectedModel,
            });
          }
        });
      }

      // Trigger initialization
      initializeData();
    });
  }

  // Universal event binding
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initFitFinderWidget);
  } else {
    initFitFinderWidget();
  }

  document.addEventListener("shopify:section:load", initFitFinderWidget);
  document.addEventListener("shopify:block:select", initFitFinderWidget);
})();
