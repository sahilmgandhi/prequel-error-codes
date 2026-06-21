(function() {
    const STORAGE_KEY = "blockedSites";
    const ERROR_TITLES = new Map([
        [308, "Permanent Redirect"],
        [400, "Bad Request"],
        [403, "Forbidden"],
        [404, "Not Found"],
        [417, "Expectation Failed"],
        [500, "Internal Server Error"],
        [503, "Service Unavailable"]
    ]);
    const RETRY_DELAY_MS = 200;
    const TOAST_TIMEOUT_MS = 2000;
    const MODAL_ANIMATION_MS = 250;
    const TOAST_ANIMATION_MS = 300;

    function getCurrentDomain() {
        try {
            return new URL(window.location.href).hostname;
        } catch (_) {
            return null;
        }
    }

    function isDomainBlocked(domain, blockedSites) {
        return blockedSites.includes(domain);
    }

    function requestStatus() {
        chrome.storage.local.get(STORAGE_KEY, function(data) {
            const blockedSites = data[STORAGE_KEY] || [];
            const domain = getCurrentDomain();

            if (domain && isDomainBlocked(domain, blockedSites)) {
                return;
            }

            chrome.runtime.sendMessage({ type: "getStatus", url: window.location.href }, function(response) {
                if (chrome.runtime.lastError) return;
                if (response && response.status !== null) {
                    showErrorModal(response.status);
                } else {
                    setTimeout(function() {
                        chrome.runtime.sendMessage({ type: "getStatus", url: window.location.href }, function(r) {
                            if (chrome.runtime.lastError) return;
                            if (r && r.status !== null) {
                                showErrorModal(r.status);
                            }
                        });
                    }, RETRY_DELAY_MS);
                }
            });
        });
    }

    requestStatus();

    function showToast(domain) {
        const existing = document.querySelector(".prequel-toast");
        if (existing) existing.remove();

        const toast = document.createElement("div");
        toast.className = "prequel-toast";

        const text = document.createTextNode("Disabled on " + domain + " ");
        toast.appendChild(text);

        const undoLink = document.createElement("a");
        undoLink.href = "#";
        undoLink.id = "prequel-undo";
        undoLink.textContent = "Undo";
        toast.appendChild(undoLink);

        document.body.appendChild(toast);

        requestAnimationFrame(function() {
            toast.classList.add("prequel-toast-show");
        });

        toast.querySelector("#prequel-undo").addEventListener("click", function(e) {
            e.preventDefault();
            const d = getCurrentDomain();
            if (!d) return;
            chrome.storage.local.get(STORAGE_KEY, function(data) {
                let sites = (data[STORAGE_KEY] || []).filter(function(s) { return s !== d; });
                chrome.storage.local.set({ [STORAGE_KEY]: sites }, function() {
                    toast.classList.remove("prequel-toast-show");
                    setTimeout(function() { toast.remove(); }, TOAST_ANIMATION_MS);
                });
            });
        });

        setTimeout(function() {
            if (toast.parentNode) {
                toast.classList.remove("prequel-toast-show");
                setTimeout(function() { toast.remove(); }, TOAST_ANIMATION_MS);
            }
        }, TOAST_TIMEOUT_MS);
    }

    function showErrorModal(status) {
        if (status > 0 && status < 300) return;
        if (!document.body) return;
        if (document.querySelector(".prequel-modal")) return;

        const known = ERROR_TITLES.has(status);
        const title = known
            ? `${ERROR_TITLES.get(status)} - ${status} Error`
            : `Misc. ${status} Error`;
        const imageName = known
            ? `error_${status}.png`
            : "error_misc.png";
        const imageUrl = chrome.runtime.getURL(`img/${imageName}`);
        const domain = getCurrentDomain();

        const wrapper = document.createElement("div");

        const modal = document.createElement("div");
        modal.className = "prequel-modal";

        const content = document.createElement("div");
        content.className = "prequel-modal-content";

        const closeButton = document.createElement("span");
        closeButton.className = "prequel-close-button";
        closeButton.textContent = "\u00d7";

        const heading = document.createElement("h1");
        heading.textContent = title;

        const img = document.createElement("img");
        img.className = "prequel-img";
        img.src = imageUrl;
        img.alt = title;

        const blockLinkContainer = document.createElement("div");
        blockLinkContainer.className = "prequel-block-link";

        const blockLink = document.createElement("a");
        blockLink.href = "#";
        blockLink.id = "prequel-dont-show";
        blockLink.textContent = "Don't show on this site";

        blockLinkContainer.appendChild(blockLink);
        content.appendChild(closeButton);
        content.appendChild(heading);
        content.appendChild(img);
        content.appendChild(blockLinkContainer);
        modal.appendChild(content);
        wrapper.appendChild(modal);

        document.body.appendChild(wrapper);

        modal.classList.add("prequel-show-modal");

        function closeModal() {
            document.removeEventListener("keydown", escapeHandler);
            modal.classList.remove("prequel-show-modal");
            setTimeout(function() {
                if (wrapper.parentNode) {
                    wrapper.parentNode.removeChild(wrapper);
                }
            }, MODAL_ANIMATION_MS);
        }

        function escapeHandler(e) {
            if (e.key === "Escape") {
                closeModal();
            }
        }

        closeButton.addEventListener("click", closeModal, { once: true });
        modal.addEventListener("click", function(e) {
            if (e.target === modal) {
                closeModal();
            }
        }, { once: true });

        if (blockLink && domain) {
            blockLink.addEventListener("click", function(e) {
                e.preventDefault();
                e.stopPropagation();
                chrome.storage.local.get(STORAGE_KEY, function(data) {
                    let sites = data[STORAGE_KEY] || [];
                    if (!sites.includes(domain)) {
                        sites.push(domain);
                    }
                    chrome.storage.local.set({ [STORAGE_KEY]: sites }, function() {
                        closeModal();
                        showToast(domain);
                    });
                });
            }, { once: true });
        }

        document.addEventListener("keydown", escapeHandler);
    }

    globalThis.__PrequelTest ??= {};
    Object.assign(globalThis.__PrequelTest, {
        showErrorModal,
        requestStatus,
        ERROR_TITLES,
        getCurrentDomain,
        isDomainBlocked,
        showToast,
        STORAGE_KEY
    });
})();
