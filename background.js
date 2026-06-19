const CACHE_TTL_MS = 30000;
const statusCache = new Map();
let lastCleanupTime = 0;

function cleanupOldEntries() {
    const now = Date.now();
    if (now - lastCleanupTime < CACHE_TTL_MS) return;
    lastCleanupTime = now;

    for (const [tabId, entry] of statusCache) {
        if (now - entry.timestamp > CACHE_TTL_MS) {
            statusCache.delete(tabId);
        }
    }
}

function cacheStatus(tabId, url, status) {
    statusCache.set(tabId, { url, status, timestamp: Date.now() });
    cleanupOldEntries();
}

chrome.webRequest.onCompleted.addListener(
    function(details) {
        if (details.type === "main_frame") {
            cacheStatus(details.tabId, details.url, details.statusCode);
        }
    },
    { urls: ["<all_urls>"] }
);

chrome.webRequest.onErrorOccurred.addListener(
    function(details) {
        if (details.type === "main_frame") {
            cacheStatus(details.tabId, details.url, 0);
        }
    },
    { urls: ["<all_urls>"] }
);

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.type !== "getStatus" || !sender.tab) {
        return false;
    }

    try {
        const entry = statusCache.get(sender.tab.id);
        sendResponse({ status: entry ? entry.status : null });
    } catch (e) {
        sendResponse({ status: null });
    }
    return false;
});

chrome.tabs.onRemoved.addListener(function(tabId) {
    statusCache.delete(tabId);
});

globalThis.__PrequelTest = { cacheStatus, cleanupOldEntries, CACHE_TTL_MS, statusCache };
