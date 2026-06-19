(function() {
    const STORAGE_KEY = "blockedSites";

    const currentDomainEl = document.getElementById("current-domain");
    const toggleBtn = document.getElementById("toggle-btn");
    const blockedListEl = document.getElementById("blocked-list");

    let blockedSites = [];
    let currentDomain = "";

    function isBlocked(domain, list) {
        return (list || blockedSites).includes(domain);
    }

    function toggleSite() {
        if (isBlocked(currentDomain)) {
            blockedSites = blockedSites.filter(function(s) { return s !== currentDomain; });
        } else {
            blockedSites.push(currentDomain);
        }
        chrome.storage.local.set({ [STORAGE_KEY]: blockedSites });
        render();
    }

    function removeSite(domain) {
        blockedSites = blockedSites.filter(function(s) { return s !== domain; });
        chrome.storage.local.set({ [STORAGE_KEY]: blockedSites });
        render();
    }

    function render() {
        if (currentDomain) {
            const blocked = isBlocked(currentDomain);
            currentDomainEl.textContent = currentDomain;
            toggleBtn.textContent = blocked ? "Unblock" : "Block";
            toggleBtn.className = "toggle-btn " + (blocked ? "blocked" : "unblocked");
            toggleBtn.style.display = "";
        } else {
            currentDomainEl.textContent = "N/A";
            toggleBtn.style.display = "none";
        }

        blockedListEl.innerHTML = "";
        blockedSites.forEach(function(site) {
            const li = document.createElement("li");
            li.className = "blocked-item";

            const span = document.createElement("span");
            span.textContent = site;

            const removeBtn = document.createElement("button");
            removeBtn.className = "remove-btn";
            removeBtn.textContent = "\u00d7";
            removeBtn.dataset.site = site;

            li.appendChild(span);
            li.appendChild(removeBtn);
            blockedListEl.appendChild(li);
        });
    }

    blockedListEl.addEventListener("click", function(e) {
        if (e.target.classList.contains("remove-btn")) {
            removeSite(e.target.dataset.site);
        }
    });

    toggleBtn.addEventListener("click", toggleSite);

    chrome.storage.local.get(STORAGE_KEY, function(data) {
        blockedSites = data[STORAGE_KEY] || [];

        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            var url;
            try {
                url = new URL(tabs[0].url);
            } catch (_) {
                render();
                return;
            }
            if (url.protocol === "http:" || url.protocol === "https:") {
                currentDomain = url.hostname;
            }
            render();
        });
    });

    globalThis.__PrequelTest = { isBlocked, removeSite, toggleSite };
})();
