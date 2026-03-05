import { describe, expect, test } from "vitest";
import { createMiraRepositoryFromEnv } from "./miraRepositoryFactory";
import { createInMemoryFirestoreGateway } from "./firestoreGateway";
import {
    buildLearningArchivePath,
    buildMasterSourcesPath,
    buildProfilesPath,
} from "./firestorePaths";

/** テスト用 appId */
const TEST_APP_ID = "factory-test-app";

/** テスト用シードデータ（appId に紐付くパスで初期化） */
const buildTestSeedDocuments = (appId) => ({
    [buildMasterSourcesPath(appId)]: { ES: [{ sourceId: "s-1", enabled: true }] },
    [buildProfilesPath(appId, "masamune")]: {
        id: "masamune",
        name: "学習者A",
        role: "student",
        birthDate: "2015-06-15",
    },
    [buildProfilesPath(appId, "ayana")]: {
        id: "ayana",
        name: "学習者B",
        role: "student",
        birthDate: "2013-11-20",
    },
    [buildProfilesPath(appId, "father")]: {
        id: "father",
        name: "保護者サンプル",
        role: "parent",
    },
    [buildLearningArchivePath(appId, "masamune")]: {
        normal: [{ archiveId: "m-1", createdAt: "2026-03-05T00:00:00+09:00" }],
        review: [],
    },
    [buildLearningArchivePath(appId, "ayana")]: { normal: [], review: [] },
    [buildLearningArchivePath(appId, "father")]: { normal: [], review: [] },
});

describe("createMiraRepositoryFromEnv スタブモード", () => {
    test("stub モード（デフォルト）で repository を生成する", async () => {
        const repository = createMiraRepositoryFromEnv({ mode: "stub" });
        const profiles = await repository.fetchProfiles();
        expect(profiles.length).toBeGreaterThan(0);
    });
});

describe("createMiraRepositoryFromEnv realtime モード", () => {
    test("SDK gateway を注入した repository でプロファイルを取得できる", async () => {
        const gateway = createInMemoryFirestoreGateway({
            initialDocuments: buildTestSeedDocuments(TEST_APP_ID),
            latencyMs: 0,
        });
        const repository = createMiraRepositoryFromEnv({
            mode: "realtime",
            appId: TEST_APP_ID,
            retryOptions: { maxRetries: 0 },
            sdkFunctions: {
                readDocument: (path) => gateway.readDocument(path),
                writeDocument: (path, value) => gateway.writeDocument(path, value),
                updateDocument: (path, updater) => gateway.updateDocument(path, updater),
            },
        });
        const profiles = await repository.fetchProfiles();
        expect(profiles).toHaveLength(3);
        const sources = await repository.fetchMasterSources();
        expect(sources.ES[0].sourceId).toBe("s-1");
    });

    test("SDK gateway を注入すると masterSources のトグルも機能する", async () => {
        const gateway = createInMemoryFirestoreGateway({
            initialDocuments: buildTestSeedDocuments(TEST_APP_ID),
            latencyMs: 0,
        });
        const repository = createMiraRepositoryFromEnv({
            mode: "realtime",
            appId: TEST_APP_ID,
            retryOptions: { maxRetries: 0 },
            sdkFunctions: {
                readDocument: (path) => gateway.readDocument(path),
                writeDocument: (path, value) => gateway.writeDocument(path, value),
                updateDocument: (path, updater) => gateway.updateDocument(path, updater),
            },
        });
        const after = await repository.toggleMasterSource("ES", "s-1");
        expect(after.ES[0].enabled).toBe(false);
    });

    test("sdkFunctions が null の場合はスタブにフォールバックする", async () => {
        const repository = createMiraRepositoryFromEnv({
            mode: "realtime",
            sdkFunctions: null,
        });
        const profiles = await repository.fetchProfiles();
        expect(profiles.length).toBeGreaterThan(0);
    });

    test("SDK 読录り失敗時に理由コード付きエラーを返す", async () => {
        const repository = createMiraRepositoryFromEnv({
            mode: "realtime",
            retryOptions: { maxRetries: 0 },
            sdkFunctions: {
                readDocument: async () => {
                    throw new Error("network down");
                },
                writeDocument: async () => null,
                updateDocument: async (_path, updater) => updater(null),
            },
        });
        await expect(repository.fetchMasterSources()).rejects.toMatchObject({
            code: "E_FIRESTORE_READ_FAILED",
        });
    });

    test("'realtime' 以外の未知モード（例: 'offline'）はスタブにフォールバックする", async () => {
        // mode が "realtime" 以外の場合、sdkFunctions の有無に関わらずスタブを返す
        const repository = createMiraRepositoryFromEnv({ mode: "offline" });
        const profiles = await repository.fetchProfiles();
        expect(profiles.length).toBeGreaterThan(0);
    });
});
