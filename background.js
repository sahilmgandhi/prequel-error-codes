const CACHE_TTL_MS = 30000;
const STORAGE_KEY_PREFIX = "tab_";
let lastCleanupTime = 0;

async function cleanupOldEntries() {
    const now = Date.now();
    if (now - lastCleanupTime < CACHE_TTL_MS) return;
    lastCleanupTime = now;

    const data = await chrome.storage.session.get(null);
    const keysToRemove = [];

    for (const [key, value] of Object.entries(data)) {
        if (key.startsWith(STORAGE_KEY_PREFIX) && value.timestamp && now - value.timestamp > CACHE_TTL_MS) {
            keysToRemove.push(key);
        }
    }

    if (keysToRemove.length > 0) {
        await chrome.storage.session.remove(keysToRemove);
    }
}

async function cacheStatus(tabId, url, status) {
    await chrome.storage.session.set({
        [`${STORAGE_KEY_PREFIX}${tabId}`]: {
            url,
            status,
            timestamp: Date.now()
        }
    });
    cleanupOldEntries().catch(() => {});
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

    (async function() {
        const key = `${STORAGE_KEY_PREFIX}${sender.tab.id}`;
        const data = await chrome.storage.session.get(key);
        const entry = data[key];

        if (entry) {
            sendResponse({ status: entry.status });
        } else {
            sendResponse({ status: null });
        }
    })();

    return true;
});

chrome.tabs.onRemoved.addListener(function(tabId) {
    chrome.storage.session.remove(`${STORAGE_KEY_PREFIX}${tabId}`);
});

globalThis.__PrequelTest = { cacheStatus, cleanupOldEntries, CACHE_TTL_MS };
