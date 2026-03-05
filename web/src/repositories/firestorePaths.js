export const DEFAULT_APP_ID = "mirastudy-dev";

export const buildMasterSourcesPath = (appId = DEFAULT_APP_ID) =>
    `/artifacts/${appId}/public/data/masterSources`;

export const buildLearningArchivePath = (appId = DEFAULT_APP_ID, userId = "") =>
    `/artifacts/${appId}/users/${userId}/learningArchive`;

export const buildProfilesPath = (appId = DEFAULT_APP_ID, userId = "") =>
    `/artifacts/${appId}/users/${userId}/profiles`;

export const resolveFirestorePaths = (appId = DEFAULT_APP_ID, userId = "") => ({
    masterSources: buildMasterSourcesPath(appId),
    learningArchive: buildLearningArchivePath(appId, userId),
    profiles: buildProfilesPath(appId, userId),
});
