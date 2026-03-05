import { withRetry, DEFAULT_RETRY_OPTIONS } from "./retryHelper";

const FIRESTORE_GATEWAY_METHODS = ["readDocument", "writeDocument", "updateDocument"];

const cloneValue = (value) => JSON.parse(JSON.stringify(value));

const buildContractError = (methodName) => {
    const error = new Error(`E_REPOSITORY_CONTRACT_INVALID:${methodName}`);
    error.code = "E_REPOSITORY_CONTRACT_INVALID";
    return error;
};

export const assertFirestoreGateway = (gateway) => {
    if (!gateway || typeof gateway !== "object") {
        throw buildContractError("gateway-object");
    }

    for (const methodName of FIRESTORE_GATEWAY_METHODS) {
        if (typeof gateway[methodName] !== "function") {
            throw buildContractError(methodName);
        }
    }

    return gateway;
};

export const createInMemoryFirestoreGateway = ({
    initialDocuments = {},
    latencyMs = 0,
} = {}) => {
    const store = new Map(
        Object.entries(initialDocuments).map(([path, value]) => [path, cloneValue(value)]),
    );

    const wait = async (ms = latencyMs) => {
        if (ms <= 0) {
            return;
        }
        await new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    };

    return {
        async readDocument(path) {
            await wait();
            if (!store.has(path)) {
                return null;
            }
            return cloneValue(store.get(path));
        },
        async writeDocument(path, value) {
            await wait();
            store.set(path, cloneValue(value));
            return cloneValue(value);
        },
        async updateDocument(path, updater) {
            await wait();
            const current = store.has(path) ? cloneValue(store.get(path)) : null;
            const nextValue = updater(current);
            store.set(path, cloneValue(nextValue));
            return cloneValue(nextValue);
        },
    };
};

export const createFirestoreSdkGateway = ({
    readDocument,
    writeDocument,
    updateDocument,
    retryOptions = {},
}) => {
    const resolvedRetryOptions = { ...DEFAULT_RETRY_OPTIONS, ...retryOptions };

    const gateway = {
        /** リトライ付きドキュメント読取 */
        async readDocument(path) {
            return withRetry(() => readDocument(path), resolvedRetryOptions);
        },
        /** リトライ付きドキュメント書込 */
        async writeDocument(path, value) {
            return withRetry(() => writeDocument(path, value), resolvedRetryOptions);
        },
        /** リトライ付き読取更新 */
        async updateDocument(path, updater) {
            return withRetry(() => updateDocument(path, updater), resolvedRetryOptions);
        },
    };
    return assertFirestoreGateway(gateway);
};
