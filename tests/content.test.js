beforeEach(() => {
    document.documentElement.innerHTML = "<html><body></body></html>";
    jest.resetModules();
    jest.useRealTimers();
    chrome.runtime.sendMessage.mockClear();
    chrome.runtime.lastError = undefined;
    __resetChromeStorage();
    chrome.storage.local.get.mockImplementation(async (key, cb) => {
        const result = {};
        if (typeof key === "string") result[key] = [];
        if (cb) cb(result);
        return result;
    });
});

const loadContentScript = () => {
    require("../content.js");
    return globalThis.__PrequelTest;
};

describe("showErrorModal", () => {
    let mod;

    beforeEach(() => {
        mod = loadContentScript();
    });

    test.each([
        [308, "Permanent Redirect", "error_308.png"],
        [400, "Bad Request", "error_400.png"],
        [403, "Forbidden", "error_403.png"],
        [404, "Not Found", "error_404.png"],
        [417, "Expectation Failed", "error_417.png"],
        [500, "Internal Server Error", "error_500.png"],
        [503, "Service Unavailable", "error_503.png"],
    ])("creates correct DOM for status %i", (status, title, imageFile) => {
        mod.showErrorModal(status);
        const modal = document.querySelector(".prequel-modal");
        expect(modal).not.toBeNull();
        expect(modal.classList.contains("prequel-show-modal")).toBe(true);

        const heading = document.querySelector("h1");
        expect(heading.textContent).toBe(`${title} - ${status} Error`);

        const img = document.querySelector(".prequel-img");
        expect(img.src).toContain(imageFile);
    });

    test("uses error_misc.png for unknown status codes", () => {
        mod.showErrorModal(418);
        const heading = document.querySelector("h1");
        expect(heading.textContent).toBe("Misc. 418 Error");

        const img = document.querySelector(".prequel-img");
        expect(img.src).toContain("error_misc.png");
    });

    test("does nothing for 1xx and 2xx status codes", () => {
        mod.showErrorModal(200);
        expect(document.querySelector(".prequel-modal")).toBeNull();

        mod.showErrorModal(101);
        expect(document.querySelector(".prequel-modal")).toBeNull();
    });

    test("does nothing when document.body is null", () => {
        const bodySpy = jest.spyOn(document, "body", "get").mockReturnValue(null);

        mod.showErrorModal(404);
        expect(document.querySelector(".prequel-modal")).toBeNull();

        bodySpy.mockRestore();
    });

    test("does not create a second modal if one is already open", () => {
        mod.showErrorModal(404);
        expect(document.querySelectorAll(".prequel-modal").length).toBe(1);

        mod.showErrorModal(500);
        expect(document.querySelectorAll(".prequel-modal").length).toBe(1);
    });

    test("close button removes modal from DOM", () => {
        jest.useFakeTimers();
        mod.showErrorModal(404);

        const closeBtn = document.querySelector(".prequel-close-button");
        closeBtn.click();

        jest.advanceTimersByTime(300);
        expect(document.querySelector(".prequel-modal")).toBeNull();
        jest.useRealTimers();
    });

    test("clicking overlay removes modal from DOM", () => {
        jest.useFakeTimers();
        mod.showErrorModal(404);

        const modal = document.querySelector(".prequel-modal");
        modal.click();

        jest.advanceTimersByTime(300);
        expect(document.querySelector(".prequel-modal")).toBeNull();
        jest.useRealTimers();
    });

    test("Escape key closes the modal", () => {
        jest.useFakeTimers();
        mod.showErrorModal(404);

        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

        jest.advanceTimersByTime(300);
        expect(document.querySelector(".prequel-modal")).toBeNull();
        jest.useRealTimers();
    });

    test("shows 'Don't show on this site' link", () => {
        mod.showErrorModal(404);
        const link = document.querySelector("#prequel-dont-show");
        expect(link).not.toBeNull();
        expect(link.textContent).toBe("Don't show on this site");
    });

    test("'Don't show' link adds domain to block list and shows toast", () => {
        jest.useFakeTimers();
        const mod = loadContentScript();
        const domain = mod.getCurrentDomain();
        mod.showErrorModal(404);

        const link = document.querySelector("#prequel-dont-show");
        link.click();

        jest.advanceTimersByTime(500);

        expect(chrome.storage.local.set).toHaveBeenCalled();
        const setCall = chrome.storage.local.set.mock.calls[0][0];
        expect(setCall.blockedSites).toContain(domain);

        expect(document.querySelector(".prequel-modal")).toBeNull();

        const toast = document.querySelector(".prequel-toast");
        expect(toast).not.toBeNull();
        expect(toast.textContent).toContain("Disabled on " + domain);

        jest.useRealTimers();
    });
});

describe("ERROR_TITLES Map", () => {
    test("contains all expected error codes", () => {
        const mod = loadContentScript();
        const expected = [308, 400, 403, 404, 417, 500, 503];
        for (const code of expected) {
            expect(mod.ERROR_TITLES.has(code)).toBe(true);
        }
        expect(mod.ERROR_TITLES.size).toBe(7);
    });
});

describe("getCurrentDomain", () => {
    test("returns hostname from window.location", () => {
        const mod = loadContentScript();
        const domain = mod.getCurrentDomain();
        expect(domain).toBeTruthy();
        expect(typeof domain).toBe("string");
    });
});

describe("isDomainBlocked", () => {
    test("returns true for exact match", () => {
        const mod = loadContentScript();
        expect(mod.isDomainBlocked("example.com", ["example.com"])).toBe(true);
    });

    test("returns false for non-matching domain", () => {
        const mod = loadContentScript();
        expect(mod.isDomainBlocked("other.com", ["example.com"])).toBe(false);
    });

    test("returns false for empty blocked list", () => {
        const mod = loadContentScript();
        expect(mod.isDomainBlocked("example.com", [])).toBe(false);
    });
});

describe("showToast", () => {
    test("creates a toast element", () => {
        const mod = loadContentScript();
        mod.showToast("test.com");

        const toast = document.querySelector(".prequel-toast");
        expect(toast).not.toBeNull();
        expect(toast.textContent).toContain("Disabled on test.com");
        expect(toast.textContent).toContain("Undo");
    });

    test("toast is added to the DOM with correct text", () => {
        const mod = loadContentScript();
        mod.showToast("test.com");

        const toast = document.querySelector(".prequel-toast");
        expect(toast).not.toBeNull();
        expect(toast.textContent).toContain("Disabled on test.com");
        expect(toast.textContent).toContain("Undo");
    });

    test("toast auto-dismisses after 2s", () => {
        jest.useFakeTimers();
        const mod = loadContentScript();
        mod.showToast("test.com");

        jest.advanceTimersByTime(2000);

        const toast = document.querySelector(".prequel-toast");
        expect(toast.classList.contains("prequel-toast-show")).toBe(false);

        jest.advanceTimersByTime(300);
        expect(document.querySelector(".prequel-toast")).toBeNull();

        jest.useRealTimers();
    });

    test("undo link removes domain from block list", () => {
        const mod = loadContentScript();
        mod.showToast("test.com");

        const undoLink = document.querySelector("#prequel-undo");
        undoLink.click();

        expect(chrome.storage.local.set).toHaveBeenCalled();
        const setCall = chrome.storage.local.set.mock.calls[0][0];
        expect(setCall.blockedSites).not.toContain("test.com");
    });
});

describe("requestStatus", () => {
    test("does not show modal if domain is blocked", async () => {
        chrome.storage.local.get.mockImplementation(async (key, cb) => {
            const result = { blockedSites: ["example.com"] };
            if (cb) cb(result);
            return result;
        });

        const mod = loadContentScript();
        await new Promise(process.nextTick);
        await new Promise(process.nextTick);

        expect(document.querySelector(".prequel-modal")).toBeNull();
    });

    test("shows modal if domain is not blocked", async () => {
        chrome.storage.local.get.mockImplementation(async (key, cb) => {
            const result = { blockedSites: ["other.com"] };
            if (cb) cb(result);
            return result;
        });

        const mod = loadContentScript();
        await new Promise(process.nextTick);
        await new Promise(process.nextTick);

        expect(chrome.runtime.sendMessage).toHaveBeenCalled();
    });
});
