import { describe, expect, test } from "vitest";
import {
    DEFAULT_APP_ID,
    buildLearningArchivePath,
    buildMasterSourcesPath,
    buildProfilesPath,
    resolveFirestorePaths,
} from "./firestorePaths";
import {
    createFirestoreSdkGateway,
    createInMemoryFirestoreGateway,
} from "./firestoreGateway";
import { createMiraFirestoreStubRepository } from "./miraFirestoreRepository";

describe("Firestore パス定義", () => {
    test("指定 appId / userId でパスを解決する", () => {
        expect(buildMasterSourcesPath("app-001")).toBe("/artifacts/app-001/public/data/masterSources");
        expect(buildLearningArchivePath("app-001", "u-01")).toBe(
            "/artifacts/app-001/users/u-01/learningArchive",
        );
        expect(buildProfilesPath("app-001", "u-01")).toBe("/artifacts/app-001/users/u-01/profiles");

        const paths = resolveFirestorePaths("app-001", "u-01");
        expect(paths.masterSources).toBe("/artifacts/app-001/public/data/masterSources");
        expect(paths.learningArchive).toBe("/artifacts/app-001/users/u-01/learningArchive");
        expect(paths.profiles).toBe("/artifacts/app-001/users/u-01/profiles");
    });
});

describe("Firestore スタブ repository", () => {
    test("profiles を取得できる", async () => {
        const repository = createMiraFirestoreStubRepository({ latencyMs: 0 });
        const profiles = await repository.fetchProfiles();

        expect(profiles).toHaveLength(3);
        expect(profiles[0].id).toBe("masamune");
    });

    test("learningArchive を降順で返す", async () => {
        const repository = createMiraFirestoreStubRepository({ latencyMs: 0 });
        const records = await repository.fetchLearningArchive("masamune", "normal");

        expect(records).toHaveLength(2);
        expect(records[0].archiveId).toBe("m-normal-001");
    });

    test("review に履歴がない場合は空配列を返す", async () => {
        const repository = createMiraFirestoreStubRepository({ latencyMs: 0 });
        const records = await repository.fetchLearningArchive("ayana", "review");

        expect(records).toEqual([]);
    });

    test("masterSources ON/OFF を反転できる", async () => {
        const repository = createMiraFirestoreStubRepository({ latencyMs: 0 });
        const before = await repository.fetchMasterSources();
        const targetBefore = before.ES.find((source) => source.sourceId === "mext-es-math-v2025");
        expect(targetBefore?.enabled).toBe(true);

        const after = await repository.toggleMasterSource("ES", "mext-es-math-v2025");
        const targetAfter = after.ES.find((source) => source.sourceId === "mext-es-math-v2025");
        expect(targetAfter?.enabled).toBe(false);
    });

    test("repository から path summary を取得できる", () => {
        const repository = createMiraFirestoreStubRepository({ latencyMs: 0 });
        const paths = repository.resolvePaths("masamune");

        expect(repository.appId).toBe(DEFAULT_APP_ID);
        expect(paths.masterSources).toBe(`/artifacts/${DEFAULT_APP_ID}/public/data/masterSources`);
        expect(paths.learningArchive).toBe(
            `/artifacts/${DEFAULT_APP_ID}/users/masamune/learningArchive`,
        );
    });

    test("gateway interface が不正なら初期化を拒否する", () => {
        expect(() =>
            createMiraFirestoreStubRepository({
                gateway: {
                    readDocument: async () => null,
                },
            }),
        ).toThrow("E_REPOSITORY_CONTRACT_INVALID");
    });

    test("外部 gateway 実装を注入して repository を差し替えできる", async () => {
        const appId = "sdk-app";
        const gateway = createInMemoryFirestoreGateway({
            initialDocuments: {
                [buildMasterSourcesPath(appId)]: {
                    ES: [{ sourceId: "s-1", enabled: true }],
                },
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
                    normal: [{ archiveId: "z", createdAt: "2026-03-05T00:00:00+09:00" }],
                    review: [],
                },
            },
            latencyMs: 0,
        });

        const repository = createMiraFirestoreStubRepository({
            appId,
            latencyMs: 0,
            gateway,
        });

        const profiles = await repository.fetchProfiles();
        const records = await repository.fetchLearningArchive("masamune", "normal");
        expect(profiles).toHaveLength(3);
        expect(records[0].archiveId).toBe("z");
    });

    test("SDK gateway からの読み取り失敗を理由コード付きで返す", async () => {
        const sdkGateway = createFirestoreSdkGateway({
            readDocument: async () => {
                throw new Error("network down");
            },
            writeDocument: async () => null,
            updateDocument: async () => ({}),
            // テスト高速化のためリトライ無効
            retryOptions: { maxRetries: 0 },
        });
        const repository = createMiraFirestoreStubRepository({ gateway: sdkGateway });

        await expect(repository.fetchMasterSources()).rejects.toMatchObject({
            code: "E_FIRESTORE_READ_FAILED",
        });
    });
});
