beforeEach(() => {
    __resetChromeStorage();
    jest.clearAllMocks();
    jest.resetModules();
});

const loadBackground = () => {
    require("../background.js");
    return globalThis.__PrequelTest;
};

describe("cacheStatus", () => {
    test("stores entry with url, status, and timestamp", () => {
        const mod = loadBackground();
        mod.cacheStatus(42, "https://example.com/404", 404);

        const entry = mod.statusCache.get(42);
        expect(entry).toBeDefined();
        expect(entry.url).toBe("https://example.com/404");
        expect(entry.status).toBe(404);
        expect(entry.timestamp).toBeGreaterThan(0);
    });

    test("stores status 0 for network errors", () => {
        const mod = loadBackground();
        mod.cacheStatus(5, "https://example.com/broken", 0);

        const entry = mod.statusCache.get(5);
        expect(entry.status).toBe(0);
    });
});

describe("cleanupOldEntries", () => {
    test("removes entries older than CACHE_TTL_MS", () => {
        const mod = loadBackground();
        const oldTime = Date.now() - mod.CACHE_TTL_MS - 1000;

        mod.statusCache.set(1, { url: "old", status: 404, timestamp: oldTime });
        mod.statusCache.set(2, { url: "fresh", status: 200, timestamp: Date.now() });

        mod.cleanupOldEntries();

        expect(mod.statusCache.has(1)).toBe(false);
        expect(mod.statusCache.has(2)).toBe(true);
    });

    test("throttles: does not run again within CACHE_TTL_MS", () => {
        const mod = loadBackground();
        const oldTime = Date.now() - mod.CACHE_TTL_MS - 1000;
        mod.statusCache.set(1, { url: "old", status: 404, timestamp: oldTime });

        mod.cleanupOldEntries();
        expect(mod.statusCache.has(1)).toBe(false);

        mod.statusCache.set(2, { url: "old2", status: 500, timestamp: oldTime });
        mod.cleanupOldEntries();
        expect(mod.statusCache.has(2)).toBe(true);
    });
});

describe("webRequest event wiring", () => {
    test("onCompleted listener is registered with correct filter", () => {
        loadBackground();
        expect(chrome.webRequest.onCompleted.addListener).toHaveBeenCalled();
        const { cb, filter } = __getRegisteredCallbacks().webRequestCompleted;
        expect(filter.urls).toEqual(["<all_urls>"]);
        expect(cb).toBeDefined();
    });

    test("onErrorOccurred listener is registered", () => {
        loadBackground();
        expect(chrome.webRequest.onErrorOccurred.addListener).toHaveBeenCalled();
    });
});

describe("runtime message handling", () => {
    test("returns status for known tab", () => {
        const mod = loadBackground();
        mod.cacheStatus(99, "https://example.com/500", 500);

        const sendResponse = jest.fn();
        const listener = __getRegisteredCallbacks().runtimeMessage;

        listener(
            { type: "getStatus" },
            { tab: { id: 99 } },
            sendResponse
        );

        expect(sendResponse).toHaveBeenCalledWith({ status: 500 });
    });

    test("returns null for unknown tab", () => {
        loadBackground();
        const sendResponse = jest.fn();
        const listener = __getRegisteredCallbacks().runtimeMessage;

        listener(
            { type: "getStatus" },
            { tab: { id: 9999 } },
            sendResponse
        );

        expect(sendResponse).toHaveBeenCalledWith({ status: null });
    });

    test("ignores non-getStatus messages", () => {
        loadBackground();
        const listener = __getRegisteredCallbacks().runtimeMessage;
        const result = listener({ type: "somethingElse" }, {}, jest.fn());
        expect(result).toBe(false);
    });

    test("returns null when cache lookup throws", () => {
        const mod = loadBackground();
        const originalGet = mod.statusCache.get.bind(mod.statusCache);
        mod.statusCache.get = () => { throw new Error("broken"); };

        const sendResponse = jest.fn();
        const listener = __getRegisteredCallbacks().runtimeMessage;

        listener(
            { type: "getStatus" },
            { tab: { id: 1 } },
            sendResponse
        );

        expect(sendResponse).toHaveBeenCalledWith({ status: null });
        mod.statusCache.get = originalGet;
    });
});

describe("tab cleanup", () => {
    test("removes cache entry when tab is closed", () => {
        const mod = loadBackground();
        mod.cacheStatus(7, "https://example.com/page", 404);
        const cb = __getRegisteredCallbacks().tabRemoved;

        cb(7);

        expect(mod.statusCache.has(7)).toBe(false);
    });
});
