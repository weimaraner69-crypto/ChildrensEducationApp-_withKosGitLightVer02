import { createMiraFirestoreStubRepository } from "./miraFirestoreRepository";
import { createFirestoreSdkGateway } from "./firestoreGateway";

/**
 * 環境変数 VITE_FIRESTORE_MODE に基づき repository を生成する factory。
 *
 * モード:
 * - "realtime" : Firebase SDK アダプタを使用する（sdkFunctions 注入が必須）
 * - その他     : インメモリスタブを使用する（デフォルト）
 *
 * @param {object} params
 * @param {string} [params.mode] - モード文字列（省略時は VITE_FIRESTORE_MODE 環境変数から取得）
 * @param {object|null} [params.sdkFunctions] - realtime モード時の Firebase SDK 関数群
 * @param {string} [params.appId] - アプリケーション ID
 * @param {number} [params.latencyMs] - スタブモードの模擬レイテンシ（ms）
 * @param {object} [params.retryOptions] - SDK gateway のリトライ設定
 * @returns {object} MiraFirestore repository
 */
export const createMiraRepositoryFromEnv = ({
    mode = import.meta.env?.VITE_FIRESTORE_MODE ?? "stub",
    sdkFunctions = null,
    appId,
    latencyMs,
    retryOptions = {},
} = {}) => {
    if (mode === "realtime" && sdkFunctions) {
        const gateway = createFirestoreSdkGateway({ ...sdkFunctions, retryOptions });
        return createMiraFirestoreStubRepository({ gateway, appId });
    }
    return createMiraFirestoreStubRepository({ appId, latencyMs });
};
