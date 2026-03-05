import { describe, expect, test } from "vitest";
import {
    buildVerificationPayload,
    calculateCurrentAge,
    calculateSchoolStageAndGrade,
    getMissingEvidenceFields,
    isTrustedMextUrl,
    normalizeOcrText,
    resolveArchiveState,
    resolveVerificationOutcome,
    sortLearningArchive,
    summarizeQueueStatus,
    toggleSourceActivation,
    transitionDelegationState,
} from "./App";

describe("学年判定ロジック", () => {
    test("政宗: 2026-03-05 時点で小5", () => {
        const result = calculateSchoolStageAndGrade("2014-04-09", new Date("2026-03-05"));
        expect(result.stage).toBe("ES");
        expect(result.grade).toBe(5);
    });

    test("文菜: 2026-03-05 時点で中1", () => {
        const result = calculateSchoolStageAndGrade("2012-05-29", new Date("2026-03-05"));
        expect(result.stage).toBe("JHS");
        expect(result.grade).toBe(1);
    });

    test("4/1 生まれは同年度で1学年前扱いになる", () => {
        const result = calculateSchoolStageAndGrade("2014-04-01", new Date("2026-04-10"));
        expect(result.stage).toBe("JHS");
        expect(result.grade).toBe(1);
    });
});

describe("年齢計算", () => {
    test("誕生日前は年齢を1つ減算する", () => {
        const age = calculateCurrentAge("2014-04-09", new Date("2026-03-05"));
        expect(age).toBe(11);
    });
});

describe("アーカイブ状態判定", () => {
    test("読み込み中を優先する", () => {
        const state = resolveArchiveState({
            isLoading: true,
            errorCode: "",
            records: [{ archiveId: "1" }],
        });
        expect(state).toBe("loading");
    });

    test("エラー状態を判定する", () => {
        const state = resolveArchiveState({
            isLoading: false,
            errorCode: "E_ARCHIVE_FETCH_FAILED",
            records: [],
        });
        expect(state).toBe("error");
    });

    test("空配列は empty を返す", () => {
        const state = resolveArchiveState({
            isLoading: false,
            errorCode: "",
            records: [],
        });
        expect(state).toBe("empty");
    });
});

describe("アーカイブ並び替え", () => {
    test("createdAt の降順で並び替える", () => {
        const sorted = sortLearningArchive([
            { archiveId: "old", createdAt: "2026-03-01T08:00:00+09:00" },
            { archiveId: "new", createdAt: "2026-03-05T08:00:00+09:00" },
        ]);
        expect(sorted[0].archiveId).toBe("new");
        expect(sorted[1].archiveId).toBe("old");
    });
});

describe("Evidence 正規化と検証", () => {
    test("OCR 正規化で改行と連続空白を統一する", () => {
        const normalized = normalizeOcrText("A\r\nB   C\n");
        expect(normalized).toBe("A B C");
    });

    test("MEXT 公式 URL のみ trusted と判定する", () => {
        expect(isTrustedMextUrl("https://www.mext.go.jp/content/abc.pdf")).toBe(true);
        expect(isTrustedMextUrl("https://example.com/abc.pdf")).toBe(false);
    });

    test("必須項目欠落を検出する", () => {
        const missing = getMissingEvidenceFields({
            sourceId: "x",
            sourceVersion: "",
            sourceTitle: "",
            retrievedAt: "2026-03-05",
            sourceUrl: "",
            ocrText: "",
            aiInterpretation: "ok",
            verificationHash: "",
        });
        expect(missing).toContain("sourceVersion");
        expect(missing).toContain("sourceTitle");
        expect(missing).toContain("sourceUrl");
    });

    test("ハッシュ一致時は verified になる", async () => {
        const question = {
            sourceId: "mext-es-math-v2025",
            sourceVersion: "2025.04",
            sourceTitle: "小学校学習指導要領（算数）",
            retrievedAt: "2026-03-05T07:10:00+09:00",
            sourceUrl: "https://www.mext.go.jp/content/20240401-mxt_kyoiku01-100002607_1.pdf",
            ocrText: "小学校第5学年の算数では、分数の加法及び減法を理解し、計算ができるようにする。",
            aiInterpretation: "分数のたし算・ひき算を、通分と約分の手順に沿って説明できることを目標とする。",
            verificationHash:
                "sha256:0bea72283798d423c6f1478fff919e5fdc9e039acc724dc3de5cf324da3e39e4",
        };
        const payload = buildVerificationPayload(question);
        expect(payload).toContain("|mext-es-math-v2025|2025.04");

        const result = await resolveVerificationOutcome(question);
        expect(result.status).toBe("verified");
    });

    test("URL が MEXT ドメイン外なら blocked になる", async () => {
        const result = await resolveVerificationOutcome({
            sourceId: "x",
            sourceVersion: "1",
            sourceTitle: "title",
            retrievedAt: "2026-03-05",
            sourceUrl: "https://example.com/doc.pdf",
            ocrText: "text",
            aiInterpretation: "interpretation",
            verificationHash:
                "sha256:0bea72283798d423c6f1478fff919e5fdc9e039acc724dc3de5cf324da3e39e4",
        });
        expect(result.status).toBe("blocked");
        expect(result.reasonCode).toBe("C003_untrusted_context");
    });
});

describe("保護者ダッシュボード補助関数", () => {
    test("Stage ソース ON/OFF を切り替える", () => {
        const sourceMap = {
            ES: [{ sourceId: "a", enabled: true }],
            JHS: [{ sourceId: "b", enabled: false }],
        };
        const updated = toggleSourceActivation(sourceMap, "ES", "a");
        expect(updated.ES[0].enabled).toBe(false);
        expect(updated.JHS[0].enabled).toBe(false);
    });

    test("キュー状態集計を返す", () => {
        const summary = summarizeQueueStatus([
            { status: "queued" },
            { status: "running" },
            { status: "success" },
            { status: "failed" },
            { status: "success" },
        ]);
        expect(summary.queued).toBe(1);
        expect(summary.running).toBe(1);
        expect(summary.success).toBe(2);
        expect(summary.failed).toBe(1);
    });

    test("権限移譲ステップ遷移", () => {
        const preview = transitionDelegationState("idle", "start");
        const requested = transitionDelegationState(preview, "submit");
        const reset = transitionDelegationState(requested, "reset");
        expect(preview).toBe("preview");
        expect(requested).toBe("requested");
        expect(reset).toBe("idle");
    });
});
