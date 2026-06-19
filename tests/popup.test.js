beforeEach(() => {
    document.documentElement.innerHTML = `
        <body>
            <span id="current-domain"></span>
            <button id="toggle-btn"></button>
            <ul id="blocked-list"></ul>
        </body>
    `;
    jest.clearAllMocks();
    jest.resetModules();
    __resetChromeStorage();
    chrome.storage.local.get.mockImplementation(async (key, cb) => {
        const result = {};
        if (typeof key === "string") result[key] = [];
        if (cb) cb(result);
        return result;
    });
    chrome.tabs.query.mockImplementation(async (opts, cb) => {
        const result = [{ url: "https://example.com/test" }];
        if (cb) cb(result);
        return result;
    });
});

const loadPopup = () => {
    require("../popup/popup.js");
    return globalThis.__PrequelTest;
};

describe("isBlocked", () => {
    test("returns true for blocked domains", () => {
        const mod = loadPopup();
        const blockedSites = ["example.com", "localhost"];
        expect(mod.isBlocked("example.com", blockedSites)).toBe(true);
        expect(mod.isBlocked("localhost", blockedSites)).toBe(true);
    });

    test("returns false for unblocked domains", () => {
        const mod = loadPopup();
        const blockedSites = ["example.com"];
        expect(mod.isBlocked("other.com", blockedSites)).toBe(false);
    });

    test("returns false for empty list", () => {
        const mod = loadPopup();
        expect(mod.isBlocked("example.com", [])).toBe(false);
    });
});

describe("toggleSite", () => {
    test("adds domain to block list if not blocked", async () => {
        const mod = loadPopup();
        mod.toggleSite();
        await new Promise(process.nextTick);

        expect(chrome.storage.local.set).toHaveBeenCalled();
        const call = chrome.storage.local.set.mock.calls[0][0];
        expect(call.blockedSites).toContain("example.com");
    });

    test("removes domain from block list if blocked", async () => {
        const mod = loadPopup();
        mod.toggleSite();
        await new Promise(process.nextTick);

        mod.toggleSite();
        await new Promise(process.nextTick);

        const lastCall = chrome.storage.local.set.mock.calls[1][0];
        expect(lastCall.blockedSites).not.toContain("example.com");
    });
});

describe("removeSite", () => {
    test("removes the specified domain", async () => {
        const mod = loadPopup();
        mod.removeSite("localhost");
        await new Promise(process.nextTick);

        const call = chrome.storage.local.set.mock.calls[0][0];
        expect(call.blockedSites).not.toContain("localhost");
    });
});

describe("popup rendering", () => {
    test("displays current domain", async () => {
        const mod = loadPopup();
        await new Promise(process.nextTick);
        await new Promise(process.nextTick);

        expect(document.getElementById("current-domain").textContent).toBe("example.com");
    });

    test("shows Block button for unblocked site", async () => {
        const mod = loadPopup();
        await new Promise(process.nextTick);
        await new Promise(process.nextTick);

        const btn = document.getElementById("toggle-btn");
        expect(btn.textContent).toBe("Block");
        expect(btn.classList.contains("unblocked")).toBe(true);
    });

    test("toggle button changes to Unblock after blocking", async () => {
        const mod = loadPopup();
        await new Promise(process.nextTick);
        await new Promise(process.nextTick);

        const btn = document.getElementById("toggle-btn");
        btn.click();
        await new Promise(process.nextTick);

        expect(btn.textContent).toBe("Unblock");
        expect(btn.classList.contains("blocked")).toBe(true);
    });

    test("renders blocked sites in the list", async () => {
        chrome.storage.local.get.mockImplementation(async (key, cb) => {
            const result = { blockedSites: ["a.com", "b.com"] };
            if (cb) cb(result);
            return result;
        });

        const mod = loadPopup();
        await new Promise(process.nextTick);
        await new Promise(process.nextTick);

        const items = document.querySelectorAll(".blocked-item");
        expect(items.length).toBe(2);
    });

    test("remove button removes a site from the list", async () => {
        chrome.storage.local.get.mockImplementation(async (key, cb) => {
            const result = { blockedSites: ["a.com"] };
            if (cb) cb(result);
            return result;
        });

        const mod = loadPopup();
        await new Promise(process.nextTick);
        await new Promise(process.nextTick);

        document.querySelector(".remove-btn").click();
        await new Promise(process.nextTick);

        expect(chrome.storage.local.set).toHaveBeenCalled();
    });

    test("hides toggle for non-http pages", async () => {
        chrome.tabs.query.mockImplementation(async (opts, cb) => {
            const result = [{ url: "chrome://extensions" }];
            if (cb) cb(result);
            return result;
        });

        const mod = loadPopup();
        await new Promise(process.nextTick);
        await new Promise(process.nextTick);

        expect(document.getElementById("toggle-btn").style.display).toBe("none");
    });
});
