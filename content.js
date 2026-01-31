// Sahil Gandhi
// PrequelErrorCodes - Shows Star Wars prequel memes on error pages

(function() {
    // Error code to title mapping
    const ERROR_TITLES = {
        308: "Permanent Redirect",
        400: "Bad Request",
        403: "Forbidden",
        404: "Not Found",
        417: "Expectation Failed",
        500: "Internal Server Error",
        503: "Service Unavailable"
    };

    const MAX_RETRIES = 5;
    const RETRY_DELAY_MS = 100;

    // Request status with retry logic to handle race condition with service worker
    function requestStatus(attempt) {
        if (attempt > MAX_RETRIES) {
            return;
        }

        chrome.runtime.sendMessage({ type: "getStatus", url: window.location.href }, function(response) {
            if (chrome.runtime.lastError) {
                return;
            }

            if (response && response.status !== null) {
                showErrorModal(response.status);
            } else if (attempt < MAX_RETRIES) {
                // Retry with exponential backoff
                setTimeout(function() {
                    requestStatus(attempt + 1);
                }, RETRY_DELAY_MS * attempt);
            }
        });
    }

    // Start requesting status
    requestStatus(1);

    function showErrorModal(status) {
        // Only show for error codes (300+ or network error 0)
        if (status > 0 && status < 300) {
            return;
        }

        // Guard for non-HTML pages (XML, SVG, PDF, etc.)
        if (!document.body) {
            return;
        }

        const errorTitle = ERROR_TITLES[status];
        const title = errorTitle
            ? `${errorTitle} - ${status} Error`
            : `Misc. ${status} Error`;
        const imageName = errorTitle
            ? `error_${status}.png`
            : "error_misc.png";
        const imageUrl = chrome.runtime.getURL(`img/${imageName}`);

        // Create modal elements
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
            // Remove from DOM after transition to prevent memory leak
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
})();
