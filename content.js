(function() {
    const ERROR_TITLES = new Map([
        [308, "Permanent Redirect"],
        [400, "Bad Request"],
        [403, "Forbidden"],
        [404, "Not Found"],
        [417, "Expectation Failed"],
        [500, "Internal Server Error"],
        [503, "Service Unavailable"]
    ]);

    function requestStatus() {
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
    }

    requestStatus();

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

        const wrapper = document.createElement("div");
        wrapper.innerHTML = `
            <div class="prequel-modal">
                <div class="prequel-modal-content">
                    <span class="prequel-close-button">&times;</span>
                    <h1 style="text-align: center;">${title}</h1>
                    <img class="prequel-img" src="${imageUrl}" alt="${title}">
                </div>
            </div>
        `;

        document.body.appendChild(wrapper);

        const modal = wrapper.querySelector(".prequel-modal");
        const closeButton = wrapper.querySelector(".prequel-close-button");

        modal.classList.add("prequel-show-modal");

        function closeModal() {
            modal.classList.remove("prequel-show-modal");
            setTimeout(function() {
                if (wrapper.parentNode) {
                    wrapper.parentNode.removeChild(wrapper);
                }
            }, 300);
        }

        closeButton.addEventListener("click", closeModal, { once: true });
        modal.addEventListener("click", function(e) {
            if (e.target === modal) {
                closeModal();
            }
        }, { once: true });
    }

    globalThis.__PrequelTest ??= {};
    Object.assign(globalThis.__PrequelTest, { showErrorModal, requestStatus, ERROR_TITLES });
})();
