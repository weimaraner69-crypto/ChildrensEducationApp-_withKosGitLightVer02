import { describe, expect, test, vi } from "vitest";
import { DEFAULT_RETRY_OPTIONS, withRetry } from "./retryHelper";

describe("withRetry", () => {
    test("初回成功時はそのまま結果を返す", async () => {
        const fn = vi.fn().mockResolvedValue("ok");
        const result = await withRetry(fn, { maxRetries: 3, baseDelayMs: 0 });
        expect(result).toBe("ok");
        expect(fn).toHaveBeenCalledTimes(1);
    });

    test("一時的な失敗の後に成功する", async () => {
        let callCount = 0;
        const fn = vi.fn().mockImplementation(async () => {
            callCount++;
            if (callCount < 3) throw new Error("transient error");
            return "recovered";
        });
        const result = await withRetry(fn, { maxRetries: 3, baseDelayMs: 0 });
        expect(result).toBe("recovered");
        expect(fn).toHaveBeenCalledTimes(3);
    });

    test("maxRetries 超過後は最後のエラーを throw する", async () => {
        const fn = vi.fn().mockRejectedValue(new Error("persistent error"));
        await expect(withRetry(fn, { maxRetries: 2, baseDelayMs: 0 })).rejects.toThrow(
            "persistent error",
        );
        // 初回 + 2回再試行 = 3回呼び出し
        expect(fn).toHaveBeenCalledTimes(3);
    });

    test("maxRetries: 0 の場合は再試行せず即エラーになる", async () => {
        const fn = vi.fn().mockRejectedValue(new Error("fail"));
        await expect(withRetry(fn, { maxRetries: 0 })).rejects.toThrow("fail");
        expect(fn).toHaveBeenCalledTimes(1);
    });

    test("maxRetries が負値なら設定エラーを返す", async () => {
        const fn = vi.fn().mockRejectedValue(new Error("fail"));
        await expect(withRetry(fn, { maxRetries: -1 })).rejects.toThrow(
            "E_RETRY_CONFIG_INVALID:maxRetries",
        );
        expect(fn).toHaveBeenCalledTimes(0);
    });

    test("最初の成功で後続の呼び出しは発生しない", async () => {
        const fn = vi.fn().mockResolvedValue(42);
        await withRetry(fn, { maxRetries: 5, baseDelayMs: 0 });
        expect(fn).toHaveBeenCalledTimes(1);
    });

    test("DEFAULT_RETRY_OPTIONS は有効な値を持つ", () => {
        expect(DEFAULT_RETRY_OPTIONS.maxRetries).toBeGreaterThan(0);
        expect(DEFAULT_RETRY_OPTIONS.baseDelayMs).toBeGreaterThan(0);
        expect(DEFAULT_RETRY_OPTIONS.maxDelayMs).toBeGreaterThanOrEqual(
            DEFAULT_RETRY_OPTIONS.baseDelayMs,
        );
    });

    // ---- 境界値テスト ----

    test("maxRetries: 1 の境界値 — 初回失敗後に1回だけ再試行して成功する（合計2回呼び出し）", async () => {
        const fn = vi
            .fn()
            .mockRejectedValueOnce(new Error("fail"))
            .mockResolvedValue("recovered");
        const result = await withRetry(fn, { maxRetries: 1, baseDelayMs: 0 });
        expect(result).toBe("recovered");
        expect(fn).toHaveBeenCalledTimes(2);
    });

    test("maxDelayMs で指数バックオフが上限キャップされること", async () => {
        // globalThis.setTimeout を差し替えることで実際の待機なしに遅延値を記録する
        const recordedDelays = [];
        const origSetTimeout = globalThis.setTimeout;
        globalThis.setTimeout = (fn, ms, ...rest) => {
            recordedDelays.push(ms);
            return origSetTimeout.call(globalThis, fn, 0, ...rest);
        };
        try {
            let count = 0;
            await withRetry(
                async () => {
                    if (++count <= 3) throw new Error("transient");
                    return "capped";
                },
                // baseDelayMs が大きくても maxDelayMs: 7 ms でキャップされる
                { maxRetries: 5, baseDelayMs: 9999, maxDelayMs: 7 },
            );
            // 3回失敗 → 3回 setTimeout が呼ばれる
            expect(recordedDelays).toHaveLength(3);
            // すべての遅延が maxDelayMs (7ms) 以下であること
            for (const d of recordedDelays) {
                expect(d).toBeLessThanOrEqual(7);
            }
        } finally {
            globalThis.setTimeout = origSetTimeout;
        }
    });
});
