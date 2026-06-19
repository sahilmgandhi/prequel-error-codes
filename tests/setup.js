const storageData = {};
const localStorageData = {};
const registeredCallbacks = {};

globalThis.chrome = {
  storage: {
    session: {
      get: jest.fn(async (key) => {
        if (key === null) return { ...storageData };
        if (typeof key === "string") {
          const val = storageData[key];
          return val !== undefined ? { [key]: val } : {};
        }
        if (Array.isArray(key)) {
          const result = {};
          for (const k of key) {
            if (storageData[k] !== undefined) result[k] = storageData[k];
          }
          return result;
        }
        return {};
      }),
      set: jest.fn(async (items) => {
        Object.assign(storageData, items);
      }),
      remove: jest.fn(async (keys) => {
        const list = Array.isArray(keys) ? keys : [keys];
        for (const k of list) {
          delete storageData[k];
        }
      }),
    },
    local: {
      get: jest.fn(async (key, cb) => {
        let result;
        if (key === null) {
          result = { ...localStorageData };
        } else if (typeof key === "string") {
          const val = localStorageData[key];
          result = val !== undefined ? { [key]: val } : {};
        } else if (Array.isArray(key)) {
          result = {};
          for (const k of key) {
            if (localStorageData[k] !== undefined) result[k] = localStorageData[k];
          }
        } else {
          result = {};
        }
        if (typeof cb === "function") cb(result);
        return result;
      }),
      set: jest.fn(async (items, cb) => {
        Object.assign(localStorageData, items);
        if (typeof cb === "function") cb();
      }),
      remove: jest.fn(async (keys) => {
        const list = Array.isArray(keys) ? keys : [keys];
        for (const k of list) {
          delete localStorageData[k];
        }
      }),
    },
  },
  webRequest: {
    onCompleted: {
      addListener: jest.fn((cb, filter) => {
        registeredCallbacks.webRequestCompleted = { cb, filter };
      }),
    },
    onErrorOccurred: {
      addListener: jest.fn((cb, filter) => {
        registeredCallbacks.webRequestError = { cb, filter };
      }),
    },
  },
  runtime: {
    sendMessage: jest.fn((msg, cb) => {
      if (cb) cb({ status: null });
    }),
    onMessage: {
      addListener: jest.fn((cb) => {
        registeredCallbacks.runtimeMessage = cb;
      }),
    },
    getURL: jest.fn((path) => `chrome-extension://id/${path}`),
    lastError: undefined,
  },
  tabs: {
    query: jest.fn(async (opts, cb) => {
      const result = [{ url: "https://example.com/test" }];
      if (cb) cb(result);
      return result;
    }),
    onRemoved: {
      addListener: jest.fn((cb) => {
        registeredCallbacks.tabRemoved = cb;
      }),
    },
  },
};

globalThis.__resetChromeStorage = () => {
  Object.keys(storageData).forEach((k) => delete storageData[k]);
  Object.keys(localStorageData).forEach((k) => delete localStorageData[k]);
};

globalThis.__getRegisteredCallbacks = () => registeredCallbacks;
