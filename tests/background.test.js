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
    test("stores entry with url, status, and timestamp", async () => {
        const mod = loadBackground();
        await mod.cacheStatus(42, "https://example.com/404", 404);

        expect(chrome.storage.session.set).toHaveBeenCalled();
        const key = "tab_42";
        const data = await chrome.storage.session.get(key);
        const entry = data[key];
        expect(entry.url).toBe("https://example.com/404");
        expect(entry.status).toBe(404);
        expect(entry.timestamp).toBeGreaterThan(0);
    });

    test("stores status 0 for network errors", async () => {
        const mod = loadBackground();
        await mod.cacheStatus(5, "https://example.com/broken", 0);

        const data = await chrome.storage.session.get("tab_5");
        expect(data["tab_5"].status).toBe(0);
    });
});

describe("cleanupOldEntries", () => {
    test("removes entries older than CACHE_TTL_MS", async () => {
        const mod = loadBackground();
        const oldTime = Date.now() - mod.CACHE_TTL_MS - 1000;

        await chrome.storage.session.set({
            tab_1: { url: "old", status: 404, timestamp: oldTime },
            tab_2: { url: "fresh", status: 200, timestamp: Date.now() },
        });

        await mod.cleanupOldEntries();

        const data = await chrome.storage.session.get(null);
        expect(data["tab_1"]).toBeUndefined();
        expect(data["tab_2"]).toBeDefined();
    });

    test("throttles: does not run again within CACHE_TTL_MS", async () => {
        const mod = loadBackground();
        const oldTime = Date.now() - mod.CACHE_TTL_MS - 1000;
        await chrome.storage.session.set({
            tab_1: { url: "old", status: 404, timestamp: oldTime },
        });

        await mod.cleanupOldEntries();
        const removeCallsAfterFirst = chrome.storage.session.remove.mock.calls.length;

        await chrome.storage.session.set({
            tab_2: { url: "old2", status: 500, timestamp: oldTime },
        });

        await mod.cleanupOldEntries();

        expect(chrome.storage.session.remove.mock.calls.length).toBe(removeCallsAfterFirst);
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
    test("returns status for known tab", async () => {
        const mod = loadBackground();
        await mod.cacheStatus(99, "https://example.com/500", 500);

        const sendResponse = jest.fn();
        const listener = __getRegisteredCallbacks().runtimeMessage;

        listener(
            { type: "getStatus" },
            { tab: { id: 99 } },
            sendResponse
        );

        await new Promise(process.nextTick);
        expect(sendResponse).toHaveBeenCalledWith({ status: 500 });
    });

    test("returns null for unknown tab", async () => {
        loadBackground();
        const sendResponse = jest.fn();
        const listener = __getRegisteredCallbacks().runtimeMessage;

        listener(
            { type: "getStatus" },
            { tab: { id: 9999 } },
            sendResponse
        );

        await new Promise(process.nextTick);
        expect(sendResponse).toHaveBeenCalledWith({ status: null });
    });

    test("ignores non-getStatus messages", () => {
        loadBackground();
        const listener = __getRegisteredCallbacks().runtimeMessage;
        const result = listener({ type: "somethingElse" }, {}, jest.fn());
        expect(result).toBe(false);
    });
});

describe("tab cleanup", () => {
    test("removes storage entry when tab is closed", async () => {
        const mod = loadBackground();
        await mod.cacheStatus(7, "https://example.com/page", 404);
        const cb = __getRegisteredCallbacks().tabRemoved;

        cb(7);

        expect(chrome.storage.session.remove).toHaveBeenCalledWith("tab_7");
    });
});
