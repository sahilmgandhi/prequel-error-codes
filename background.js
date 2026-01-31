// Service worker to track HTTP status codes for pages
// Uses chrome.storage.session to persist across service worker restarts

const CACHE_TTL_MS = 30000;

async function cleanupOldEntries() {
    const data = await chrome.storage.session.get(null);
    const now = Date.now();
    const keysToRemove = [];

    for (const [key, value] of Object.entries(data)) {
        if (key.startsWith("tab_") && value.timestamp && now - value.timestamp > CACHE_TTL_MS) {
            keysToRemove.push(key);
        }
    }

    if (keysToRemove.length > 0) {
        await chrome.storage.session.remove(keysToRemove);
    }
}

async function cacheStatus(tabId, url, status) {
    await chrome.storage.session.set({
        [`tab_${tabId}`]: {
            url: url,
            status: status,
            timestamp: Date.now()
        }
    });
    // Clean up old entries periodically
    cleanupOldEntries();
}

// Track completed web requests for main frames only
chrome.webRequest.onCompleted.addListener(
    function(details) {
        if (details.type === "main_frame") {
            cacheStatus(details.tabId, details.url, details.statusCode);
        }
    },
    { urls: ["<all_urls>"] }
);

// Track network errors
chrome.webRequest.onErrorOccurred.addListener(
    function(details) {
        if (details.type === "main_frame") {
            cacheStatus(details.tabId, details.url, 0);
        }
    },
    { urls: ["<all_urls>"] }
);

// Handle status queries from content scripts
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.type !== "getStatus" || !sender.tab) {
        return false;
    }

    // Use async response
    (async function() {
        const key = `tab_${sender.tab.id}`;
        const data = await chrome.storage.session.get(key);
        const entry = data[key];

        // Use tabId as primary key, URL check is secondary (allows for minor differences)
        if (entry) {
            sendResponse({ status: entry.status });
        } else {
            sendResponse({ status: null });
        }
    })();

    return true; // Keep channel open for async response
});

// Clean up when tab is closed
chrome.tabs.onRemoved.addListener(function(tabId) {
    chrome.storage.session.remove(`tab_${tabId}`);
});
