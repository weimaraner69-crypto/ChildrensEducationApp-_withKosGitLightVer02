import { describe, expect, test } from "vitest";
import {
    assertFirestoreGateway,
    createFirestoreSdkGateway,
    createInMemoryFirestoreGateway,
} from "./firestoreGateway";

// ---- assertFirestoreGateway ----

describe("assertFirestoreGateway", () => {
    test("完全なインターフェースを持つオブジェクトはそのまま返す", () => {
        const gateway = {
            readDocument: async () => null,
            writeDocument: async () => null,
            updateDocument: async () => ({}),
        };
        expect(assertFirestoreGateway(gateway)).toBe(gateway);
    });

    test("null を渡すと E_REPOSITORY_CONTRACT_INVALID を throw する", () => {
        expect(() => assertFirestoreGateway(null)).toThrow("E_REPOSITORY_CONTRACT_INVALID");
    });

    test("非オブジェクト（文字列）を渡すと throw する", () => {
        expect(() => assertFirestoreGateway("not-an-object")).toThrow(
            "E_REPOSITORY_CONTRACT_INVALID",
        );
    });

    test.each(["readDocument", "writeDocument", "updateDocument"])(
        "メソッド %s が欠けていると throw する（境界値: 2/3 メソッドのみ実装）",
        (missingMethod) => {
            const partial = {
                readDocument: async () => null,
                writeDocument: async () => null,
                updateDocument: async () => ({}),
            };
            delete partial[missingMethod];
            expect(() => assertFirestoreGateway(partial)).toThrow(
                "E_REPOSITORY_CONTRACT_INVALID",
            );
        },
    );

    test("メソッドが関数でなく文字列の場合は throw する", () => {
        expect(() =>
            assertFirestoreGateway({
                readDocument: "not-a-function",
                writeDocument: async () => null,
                updateDocument: async () => ({}),
            }),
        ).toThrow("E_REPOSITORY_CONTRACT_INVALID");
    });
});

// ---- createInMemoryFirestoreGateway ----

describe("createInMemoryFirestoreGateway", () => {
    test("存在しないパスは null を返す", async () => {
        const gateway = createInMemoryFirestoreGateway({ latencyMs: 0 });
        const result = await gateway.readDocument("/no/such/path");
        expect(result).toBeNull();
    });

    test("writeDocument → readDocument でラウンドトリップできる", async () => {
        const gateway = createInMemoryFirestoreGateway({ latencyMs: 0 });
        await gateway.writeDocument("/test/doc", { value: 42 });
        const result = await gateway.readDocument("/test/doc");
        expect(result).toEqual({ value: 42 });
    });

    test("writeDocument は値をクローンする（外部変更が保存済みデータに影響しない）", async () => {
        const gateway = createInMemoryFirestoreGateway({ latencyMs: 0 });
        const data = { count: 1 };
        await gateway.writeDocument("/test/clone", data);
        data.count = 99; // 書込後に外部変更
        const result = await gateway.readDocument("/test/clone");
        expect(result.count).toBe(1); // クローンのまま変わらない
    });

    test("updateDocument: 既存ドキュメントを updater で更新できる", async () => {
        const gateway = createInMemoryFirestoreGateway({
            initialDocuments: { "/test/counter": { count: 5 } },
            latencyMs: 0,
        });
        const result = await gateway.updateDocument("/test/counter", (current) => ({
            ...current,
            count: current.count + 1,
        }));
        expect(result).toEqual({ count: 6 });
        expect(await gateway.readDocument("/test/counter")).toEqual({ count: 6 });
    });

    test("updateDocument: 存在しないパスは current が null で updater が呼ばれる（境界値）", async () => {
        const gateway = createInMemoryFirestoreGateway({ latencyMs: 0 });
        const result = await gateway.updateDocument("/new/doc", (current) => ({
            initialized: true,
            receivedNull: current === null,
        }));
        expect(result.initialized).toBe(true);
        expect(result.receivedNull).toBe(true);
    });

    test("initialDocuments のデータはクローンされる（外部変更が初期値に影響しない）", async () => {
        const initial = { foo: "original" };
        const gateway = createInMemoryFirestoreGateway({
            initialDocuments: { "/test/init": initial },
            latencyMs: 0,
        });
        initial.foo = "mutated"; // initialDocuments 作成後に外部変更
        const result = await gateway.readDocument("/test/init");
        expect(result.foo).toBe("original"); // クローンのまま
    });
});

// ---- createFirestoreSdkGateway ----

describe("createFirestoreSdkGateway", () => {
    test("有効な SDK 関数を渡すと assertFirestoreGateway を満たす gateway を生成できる", () => {
        const gateway = createFirestoreSdkGateway({
            readDocument: async () => null,
            writeDocument: async () => null,
            updateDocument: async () => ({}),
        });
        expect(typeof gateway.readDocument).toBe("function");
        expect(typeof gateway.writeDocument).toBe("function");
        expect(typeof gateway.updateDocument).toBe("function");
    });

    test("readDocument は一時的な失敗後にリトライして回復する", async () => {
        let callCount = 0;
        const gateway = createFirestoreSdkGateway({
            readDocument: async () => {
                if (++callCount < 3) throw new Error("network fail");
                return { recovered: true };
            },
            writeDocument: async () => null,
            updateDocument: async () => ({}),
            retryOptions: { maxRetries: 3, baseDelayMs: 0 },
        });
        const result = await gateway.readDocument("/path");
        expect(result).toEqual({ recovered: true });
        expect(callCount).toBe(3);
    });

    test("retryOptions: maxRetries:0 の境界値 — リトライなしで即失敗する", async () => {
        const gateway = createFirestoreSdkGateway({
            readDocument: async () => {
                throw new Error("permanent fail");
            },
            writeDocument: async () => null,
            updateDocument: async () => ({}),
            retryOptions: { maxRetries: 0 },
        });
        await expect(gateway.readDocument("/path")).rejects.toThrow("permanent fail");
    });

    test("writeDocument は一時失敗後にリトライして回復する", async () => {
        let callCount = 0;
        const gateway = createFirestoreSdkGateway({
            readDocument: async () => null,
            writeDocument: async () => {
                if (++callCount < 3) {
                    throw new Error("write transient");
                }
                return { ok: true };
            },
            updateDocument: async () => ({}),
            retryOptions: { maxRetries: 3, baseDelayMs: 0 },
        });
        const result = await gateway.writeDocument("/path", { value: 1 });
        expect(result).toEqual({ ok: true });
        expect(callCount).toBe(3);
    });

    test("updateDocument は maxRetries 超過時に失敗を返す", async () => {
        const gateway = createFirestoreSdkGateway({
            readDocument: async () => null,
            writeDocument: async () => null,
            updateDocument: async () => {
                throw new Error("update fail");
            },
            retryOptions: { maxRetries: 1, baseDelayMs: 0 },
        });

        await expect(
            gateway.updateDocument("/path", (current) => ({ ...current, ok: true })),
        ).rejects.toThrow("update fail");
    });
});
