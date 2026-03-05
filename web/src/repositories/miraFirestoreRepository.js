import { DEFAULT_APP_ID, resolveFirestorePaths } from "./firestorePaths";
import {
    assertFirestoreGateway,
    createInMemoryFirestoreGateway,
} from "./firestoreGateway";

const PROFILE_FIXTURES = [
    {
        id: "masamune",
        name: "学習者A",
        role: "student",
        birthDate: "2015-06-15",
    },
    {
        id: "ayana",
        name: "学習者B",
        role: "student",
        birthDate: "2013-11-20",
    },
    {
        id: "father",
        name: "保護者サンプル",
        role: "parent",
    },
];

const LEARNING_ARCHIVE_FIXTURES = {
    masamune: {
        normal: [
            {
                archiveId: "m-normal-001",
                createdAt: "2026-03-05T07:25:00+09:00",
                stage: "ES",
                subject: "算数",
                topic: "分数のたし算",
                weaknessTag: "計算精度",
                result: "in_progress",
                sourceId: "mext-es-math-v2025",
            },
            {
                archiveId: "m-normal-002",
                createdAt: "2026-03-04T18:40:00+09:00",
                stage: "ES",
                subject: "理科",
                topic: "てこのはたらき",
                weaknessTag: "用語定着",
                result: "needs_review",
                sourceId: "mext-es-science-v2025",
            },
        ],
        review: [
            {
                archiveId: "m-review-001",
                createdAt: "2026-03-05T20:10:00+09:00",
                stage: "ES",
                subject: "国語",
                topic: "説明文の要旨",
                weaknessTag: "読解",
                result: "mastered",
                sourceId: "mext-es-japanese-v2025",
            },
        ],
    },
    ayana: {
        normal: [],
        review: [],
    },
};

const MASTER_SOURCES_FIXTURES = {
    ES: [
        {
            sourceId: "mext-es-math-v2025",
            title: "小学校学習指導要領（算数）",
            stage: "ES",
            enabled: true,
            origin: "manual",
            lastSyncedAt: "2026-03-05T09:15:00+09:00",
        },
        {
            sourceId: "mext-es-science-v2025",
            title: "小学校学習指導要領（理科）",
            stage: "ES",
            enabled: true,
            origin: "auto",
            lastSyncedAt: "2026-03-05T08:55:00+09:00",
        },
    ],
    JHS: [
        {
            sourceId: "mext-jhs-math-v2025",
            title: "中学校学習指導要領（数学）",
            stage: "JHS",
            enabled: true,
            origin: "manual",
            lastSyncedAt: "2026-03-04T18:30:00+09:00",
        },
        {
            sourceId: "mext-jhs-english-v2025",
            title: "中学校学習指導要領（外国語）",
            stage: "JHS",
            enabled: false,
            origin: "auto",
            lastSyncedAt: "2026-03-03T20:30:00+09:00",
        },
    ],
    HS: [
        {
            sourceId: "mext-hs-kokugo-v2025",
            title: "高等学校学習指導要領（現代の国語）",
            stage: "HS",
            enabled: false,
            origin: "manual",
            lastSyncedAt: "2026-03-02T16:00:00+09:00",
        },
    ],
};

const cloneValue = (value) => JSON.parse(JSON.stringify(value));

const sortByCreatedAtDesc = (records) =>
    [...records].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));

const toRepositoryError = (code, cause) => {
    const error = new Error(code);
    error.code = code;
    if (cause) {
        error.cause = cause;
    }
    return error;
};

const normalizeRepositoryError = (error, fallbackCode) => {
    if (error?.code) {
        return error;
    }
    if (typeof error?.message === "string" && error.message.startsWith("E_")) {
        const wrapped = toRepositoryError(error.message, error);
        return wrapped;
    }
    return toRepositoryError(fallbackCode, error);
};

const buildSeedDocuments = (appId) => {
    const seedDocuments = {
        [resolveFirestorePaths(appId).masterSources]: cloneValue(MASTER_SOURCES_FIXTURES),
    };

    for (const profile of PROFILE_FIXTURES) {
        const profilePaths = resolveFirestorePaths(appId, profile.id);
        seedDocuments[profilePaths.profiles] = cloneValue(profile);
        seedDocuments[profilePaths.learningArchive] =
            cloneValue(LEARNING_ARCHIVE_FIXTURES[profile.id] ?? { normal: [], review: [] });
    }

    return seedDocuments;
};

const createDefaultStubGateway = ({ appId, latencyMs }) =>
    createInMemoryFirestoreGateway({
        initialDocuments: buildSeedDocuments(appId),
        latencyMs,
    });

export const createMiraFirestoreStubRepository = ({
    appId = DEFAULT_APP_ID,
    latencyMs = 220,
    gateway = null,
} = {}) => {
    const activeGateway = assertFirestoreGateway(
        gateway ?? createDefaultStubGateway({ appId, latencyMs }),
    );
    const getPathSet = (userId = "") => resolveFirestorePaths(appId, userId);

    return {
        appId,
        resolvePaths(userId = "") {
            return getPathSet(userId);
        },
        async fetchProfiles() {
            try {
                const profiles = [];
                for (const profile of PROFILE_FIXTURES) {
                    const profilePath = getPathSet(profile.id).profiles;
                    const value = await activeGateway.readDocument(profilePath);
                    if (value) {
                        profiles.push(value);
                    }
                }
                return profiles;
            } catch (error) {
                throw normalizeRepositoryError(error, "E_FIRESTORE_READ_FAILED");
            }
        },
        async fetchLearningArchive(profileId, studyMode) {
            try {
                const learningPath = getPathSet(profileId).learningArchive;
                const archiveByMode = await activeGateway.readDocument(learningPath);
                const records = archiveByMode?.[studyMode] ?? [];
                return sortByCreatedAtDesc(records);
            } catch (error) {
                throw normalizeRepositoryError(error, "E_FIRESTORE_READ_FAILED");
            }
        },
        async fetchMasterSources() {
            try {
                const value = await activeGateway.readDocument(getPathSet().masterSources);
                return value ?? {};
            } catch (error) {
                throw normalizeRepositoryError(error, "E_FIRESTORE_READ_FAILED");
            }
        },
        async toggleMasterSource(stage, sourceId) {
            const masterSourcesPath = getPathSet().masterSources;
            try {
                return await activeGateway.updateDocument(masterSourcesPath, (current) => {
                    const sourceMap = current ?? {};
                    return {
                        ...sourceMap,
                        [stage]: (sourceMap[stage] ?? []).map((source) =>
                            source.sourceId === sourceId
                                ? { ...source, enabled: !source.enabled }
                                : source,
                        ),
                    };
                });
            } catch (error) {
                throw normalizeRepositoryError(error, "E_FIRESTORE_WRITE_FAILED");
            }
        },
    };
};
