/**
 * リトライヘルパー
 * 指数バックオフ付きで非同期操作を再試行する。
 */

/** デフォルトリトライ設定 */
export const DEFAULT_RETRY_OPTIONS = {
    /** 最大再試行回数（初回実行を除く） */
    maxRetries: 3,
    /** 初回再試行までの待機時間（ms） */
    baseDelayMs: 300,
    /** 待機時間の上限（ms） */
    maxDelayMs: 5000,
};

const validateRetryOptions = ({ maxRetries, baseDelayMs, maxDelayMs }) => {
    if (!Number.isInteger(maxRetries) || maxRetries < 0) {
        throw new TypeError("E_RETRY_CONFIG_INVALID:maxRetries");
    }
    if (!Number.isFinite(baseDelayMs) || baseDelayMs < 0) {
        throw new TypeError("E_RETRY_CONFIG_INVALID:baseDelayMs");
    }
    if (!Number.isFinite(maxDelayMs) || maxDelayMs < 0) {
        throw new TypeError("E_RETRY_CONFIG_INVALID:maxDelayMs");
    }
};

/**
 * 指数バックオフ付きリトライ
 *
 * 失敗時は `baseDelayMs * 2^attempt` ms 待機して再試行する。
 * `maxRetries` 回超えた場合は最後のエラーを再送出する。
 *
 * @template T
 * @param {() => Promise<T>} fn - 実行する非同期関数
 * @param {Partial<typeof DEFAULT_RETRY_OPTIONS>} options - リトライ設定の上書き
 * @returns {Promise<T>}
 */
export const withRetry = async (fn, options = {}) => {
    const { maxRetries, baseDelayMs, maxDelayMs } = { ...DEFAULT_RETRY_OPTIONS, ...options };
    validateRetryOptions({ maxRetries, baseDelayMs, maxDelayMs });

    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (attempt < maxRetries) {
                const delay = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    }
    throw lastError;
};
