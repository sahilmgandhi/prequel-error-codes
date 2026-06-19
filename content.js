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
            var blockedSites = data[STORAGE_KEY] || [];
            var domain = getCurrentDomain();

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
                    }, 200);
                }
            });
        });
    }

    requestStatus();

    function showToast(domain) {
        var existing = document.querySelector(".prequel-toast");
        if (existing) existing.remove();

        var toast = document.createElement("div");
        toast.className = "prequel-toast";

        var text = document.createTextNode("Blocked on " + domain + " ");
        toast.appendChild(text);

        var undoLink = document.createElement("a");
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
            var d = getCurrentDomain();
            if (!d) return;
            chrome.storage.local.get(STORAGE_KEY, function(data) {
                var sites = (data[STORAGE_KEY] || []).filter(function(s) { return s !== d; });
                chrome.storage.local.set({ [STORAGE_KEY]: sites }, function() {
                    toast.classList.remove("prequel-toast-show");
                    setTimeout(function() { toast.remove(); }, 300);
                });
            });
        });

        setTimeout(function() {
            if (toast.parentNode) {
                toast.classList.remove("prequel-toast-show");
                setTimeout(function() { toast.remove(); }, 300);
            }
        }, 2000);
    }

    function showErrorModal(status) {
        if (status > 0 && status < 300) return;
        if (!document.body) return;

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
        wrapper.innerHTML = `
            <div class="prequel-modal">
                <div class="prequel-modal-content">
                    <span class="prequel-close-button">&times;</span>
                    <h1 style="text-align: center;">${title}</h1>
                    <img class="prequel-img" src="${imageUrl}" alt="${title}">
                    <div class="prequel-block-link">
                        <a href="#" id="prequel-dont-show">Don't show on this site</a>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(wrapper);

        const modal = wrapper.querySelector(".prequel-modal");
        const closeButton = wrapper.querySelector(".prequel-close-button");
        const blockLink = wrapper.querySelector("#prequel-dont-show");

        modal.classList.add("prequel-show-modal");

        function closeModal() {
            document.removeEventListener("keydown", escapeHandler);
            modal.classList.remove("prequel-show-modal");
            setTimeout(function() {
                if (wrapper.parentNode) {
                    wrapper.parentNode.removeChild(wrapper);
                }
            }, 300);
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
                    var sites = data[STORAGE_KEY] || [];
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
