beforeEach(() => {
    document.documentElement.innerHTML = "<html><body></body></html>";
    jest.resetModules();
    chrome.runtime.sendMessage.mockClear();
    chrome.runtime.lastError = undefined;
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
