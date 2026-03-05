import { useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    BookMarked,
    CalendarClock,
    Camera,
    CheckCircle2,
    Fingerprint,
    Home,
    Link2,
    LogOut,
    NotebookText,
    RefreshCw,
    ShieldCheck,
    Sparkles,
    UserRound,
} from "lucide-react";
import { createMiraRepositoryFromEnv } from "./repositories/miraRepositoryFactory";

const SCHOOL_STAGE_LABEL = {
    ES: "小学校",
    JHS: "中学校",
    HS: "高校",
    PRE: "就学前",
    GRAD: "高校卒業以降",
};

const STUDY_MODE = {
    NORMAL: "normal",
    REVIEW: "review",
};


const STAGE_WITH_SUBJECTS = new Set(["ES", "JHS", "HS"]);

const QUESTION_BUILD_STEPS = ["ソース特定", "デジタル署名照合", "原文抽出", "問題構築"];

const QUESTION_FIXTURES = {
    masamune: {
        normal: {
            算数: {
                questionId: "q-es-math-001",
                prompt: "1/3 + 2/9 を計算して、途中式を説明してください。",
                sourceId: "mext-es-math-v2025",
                sourceVersion: "2025.04",
                sourceTitle: "小学校学習指導要領（算数）",
                retrievedAt: "2026-03-05T07:10:00+09:00",
                sourceUrl:
                    "https://www.mext.go.jp/content/20240401-mxt_kyoiku01-100002607_1.pdf",
                ocrText:
                    "小学校第5学年の算数では、分数の加法及び減法を理解し、計算ができるようにする。",
                aiInterpretation:
                    "分数のたし算・ひき算を、通分と約分の手順に沿って説明できることを目標とする。",
                verificationHash:
                    "sha256:0bea72283798d423c6f1478fff919e5fdc9e039acc724dc3de5cf324da3e39e4",
            },
            default: {
                questionId: "q-es-default-001",
                prompt: "教科を選択すると、MEXTソースに基づく問題候補が表示されます。",
                sourceId: "mext-es-general-v2025",
                sourceVersion: "2025.04",
                sourceTitle: "小学校学習指導要領（総則）",
                retrievedAt: "2026-03-05T07:10:00+09:00",
                sourceUrl:
                    "https://www.mext.go.jp/content/20240401-mxt_kyoiku01-100002607_1.pdf",
                ocrText: "各教科等の目標を達成できるよう、児童の実態に応じた指導を行う。",
                aiInterpretation: "教科選択後に、学習目標に沿って問題を構築する。",
                verificationHash:
                    "sha256:94b1a038aed9fa5a2ede914b37bb3769170222e02c1df73fc64fab8df6173fa9",
            },
        },
        review: {
            default: {
                questionId: "q-es-review-001",
                prompt: "画像から抽出した式を確認し、誤りがある箇所を説明してください。",
                sourceId: "mext-es-math-v2025",
                sourceVersion: "2025.04",
                sourceTitle: "小学校学習指導要領（算数）",
                retrievedAt: "2026-03-05T07:10:00+09:00",
                sourceUrl: "https://example.com/non-mext.pdf",
                ocrText:
                    "基礎的・基本的な知識及び技能を確実に習得させ、これらを活用する力を育む。",
                aiInterpretation: "画像答案を分析し、計算ミスと理由を明確化する。",
                verificationHash:
                    "sha256:54fffbfef2ef122dbd0742505eb286b808ce6d5ce4ca2d84fdfd1ee644aa6cd4",
            },
        },
    },
    ayana: {
        normal: {
            default: {
                questionId: "q-jhs-default-001",
                prompt: "正負の数の加法・減法を説明してください。",
                sourceId: "mext-jhs-math-v2025",
                sourceVersion: "2025.04",
                sourceTitle: "中学校学習指導要領（数学）",
                retrievedAt: "2026-03-05T07:10:00+09:00",
                sourceUrl:
                    "https://www.mext.go.jp/content/20240401-mxt_kyoiku01-100002607_2.pdf",
                ocrText: "数と式の理解を深め、数学的に考察する力を育成する。",
                aiInterpretation: "正負の数のルールを使って計算を整理する。",
                verificationHash: "",
            },
        },
        review: {
            default: {
                questionId: "q-jhs-review-001",
                prompt: "画像問題の誤答を分類し、再学習計画を立ててください。",
                sourceId: "mext-jhs-math-v2025",
                sourceVersion: "2025.04",
                sourceTitle: "中学校学習指導要領（数学）",
                retrievedAt: "2026-03-05T07:10:00+09:00",
                sourceUrl:
                    "https://www.mext.go.jp/content/20240401-mxt_kyoiku01-100002607_2.pdf",
                ocrText: "事象を数学的に捉え、問題を解決する能力を伸ばす。",
                aiInterpretation: "画像解析の結果から弱点領域を抽出する。",
                verificationHash: "sha256:invalid",
            },
        },
    },
};

const EVIDENCE_REQUIRED_FIELDS = [
    "sourceId",
    "sourceVersion",
    "sourceTitle",
    "retrievedAt",
    "sourceUrl",
    "ocrText",
    "aiInterpretation",
    "verificationHash",
];

const FIELD_LABELS = {
    sourceId: "sourceId",
    sourceVersion: "sourceVersion",
    sourceTitle: "sourceTitle",
    retrievedAt: "retrievedAt",
    sourceUrl: "sourceUrl",
    ocrText: "ocrText",
    aiInterpretation: "aiInterpretation",
    verificationHash: "verificationHash",
};


const AUTO_IMPORT_QUEUE_FIXTURES = [
    {
        jobId: "job-001",
        stage: "ES",
        status: "success",
        requestedAt: "2026-03-05T07:50:00+09:00",
        detail: "算数改訂版 PDF を保存",
    },
    {
        jobId: "job-002",
        stage: "JHS",
        status: "running",
        requestedAt: "2026-03-05T08:10:00+09:00",
        detail: "英語資料の照合中",
    },
    {
        jobId: "job-003",
        stage: "HS",
        status: "failed",
        requestedAt: "2026-03-05T08:30:00+09:00",
        detail: "署名検証に失敗",
    },
];

const DELEGATION_STATE = {
    IDLE: "idle",
    PREVIEW: "preview",
    REQUESTED: "requested",
};

export const toggleSourceActivation = (sourceMap, stage, sourceId) => ({
    ...sourceMap,
    [stage]: (sourceMap[stage] ?? []).map((source) =>
        source.sourceId === sourceId ? { ...source, enabled: !source.enabled } : source,
    ),
});

export const summarizeQueueStatus = (jobs) =>
    jobs.reduce(
        (acc, job) => {
            const key = job.status;
            if (Object.prototype.hasOwnProperty.call(acc, key)) {
                acc[key] += 1;
            }
            return acc;
        },
        {
            queued: 0,
            running: 0,
            success: 0,
            failed: 0,
        },
    );

export const transitionDelegationState = (currentState, action) => {
    if (currentState === DELEGATION_STATE.IDLE && action === "start") {
        return DELEGATION_STATE.PREVIEW;
    }
    if (currentState === DELEGATION_STATE.PREVIEW && action === "submit") {
        return DELEGATION_STATE.REQUESTED;
    }
    if (action === "reset") {
        return DELEGATION_STATE.IDLE;
    }
    return currentState;
};

const asDate = (yyyyMmDd) => {
    const [year, month, day] = yyyyMmDd.split("-").map(Number);
    return new Date(year, month - 1, day);
};

const isBeforeBirthday = (today, birthday) => {
    const monthDiff = today.getMonth() - birthday.getMonth();
    if (monthDiff < 0) {
        return true;
    }
    if (monthDiff > 0) {
        return false;
    }
    return today.getDate() < birthday.getDate();
};

export const calculateCurrentAge = (birthDate, today = new Date()) => {
    const birth = asDate(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    if (isBeforeBirthday(today, birth)) {
        age -= 1;
    }
    return age;
};

const resolveSchoolYear = (today = new Date()) => {
    const year = today.getFullYear();
    const startOfYear = new Date(year, 3, 1);
    return today < startOfYear ? year - 1 : year;
};

// 4/2〜翌4/1を同一学年として扱う。
const resolveEntryYear = (birthDate) => {
    const birth = asDate(birthDate);
    const month = birth.getMonth() + 1;
    const day = birth.getDate();
    const isEarlyBorn = month < 4 || (month === 4 && day === 1);
    return birth.getFullYear() + (isEarlyBorn ? 6 : 7);
};

export const calculateSchoolStageAndGrade = (birthDate, today = new Date()) => {
    const schoolYear = resolveSchoolYear(today);
    const entryYear = resolveEntryYear(birthDate);
    const absoluteGrade = schoolYear - entryYear + 1;

    if (absoluteGrade < 1) {
        return {
            stage: "PRE",
            stageLabel: SCHOOL_STAGE_LABEL.PRE,
            grade: 0,
            gradeLabel: "入学前",
            schoolYear,
        };
    }

    if (absoluteGrade <= 6) {
        return {
            stage: "ES",
            stageLabel: SCHOOL_STAGE_LABEL.ES,
            grade: absoluteGrade,
            gradeLabel: `${absoluteGrade}年生`,
            schoolYear,
        };
    }

    if (absoluteGrade <= 9) {
        const grade = absoluteGrade - 6;
        return {
            stage: "JHS",
            stageLabel: SCHOOL_STAGE_LABEL.JHS,
            grade,
            gradeLabel: `${grade}年生`,
            schoolYear,
        };
    }

    if (absoluteGrade <= 12) {
        const grade = absoluteGrade - 9;
        return {
            stage: "HS",
            stageLabel: SCHOOL_STAGE_LABEL.HS,
            grade,
            gradeLabel: `${grade}年生`,
            schoolYear,
        };
    }

    return {
        stage: "GRAD",
        stageLabel: SCHOOL_STAGE_LABEL.GRAD,
        grade: absoluteGrade,
        gradeLabel: "卒業後モード",
        schoolYear,
    };
};

export const sortLearningArchive = (records) =>
    [...records].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));

export const resolveArchiveState = ({ isLoading, errorCode, records }) => {
    if (isLoading) {
        return "loading";
    }
    if (errorCode) {
        return "error";
    }
    if (records.length === 0) {
        return "empty";
    }
    return "ready";
};

export const normalizeOcrText = (text) =>
    String(text ?? "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/\s+/g, " ")
        .trim();

export const buildVerificationPayload = (question) => {
    const normalizedOcrText = normalizeOcrText(question.ocrText);
    return `${normalizedOcrText}|${question.sourceId}|${question.sourceVersion}`;
};

export const isTrustedMextUrl = (url) => {
    try {
        const parsed = new URL(url);
        return parsed.protocol === "https:" && parsed.hostname === "www.mext.go.jp";
    } catch {
        return false;
    }
};

export const getMissingEvidenceFields = (question) =>
    EVIDENCE_REQUIRED_FIELDS.filter((field) => !String(question[field] ?? "").trim());

export const computeSha256Fingerprint = async (value) => {
    const digest = await globalThis.crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(value),
    );
    const hash = Array.from(new Uint8Array(digest), (item) =>
        item.toString(16).padStart(2, "0"),
    ).join("");
    return `sha256:${hash}`;
};

export const resolveVerificationOutcome = async (question) => {
    if (!isTrustedMextUrl(question.sourceUrl)) {
        return {
            status: "blocked",
            reasonCode: "C003_untrusted_context",
            computedHash: "",
            missingFields: [],
        };
    }

    const missingFields = getMissingEvidenceFields(question);
    if (missingFields.length > 0) {
        return {
            status: "blocked",
            reasonCode: "C005_insufficient_evidence",
            computedHash: "",
            missingFields,
        };
    }

    const computedHash = await computeSha256Fingerprint(buildVerificationPayload(question));
    if (computedHash !== question.verificationHash) {
        return {
            status: "blocked",
            reasonCode: "C004_signature_verification_failed",
            computedHash,
            missingFields: [],
        };
    }

    return {
        status: "verified",
        reasonCode: "",
        computedHash,
        missingFields: [],
    };
};

export const splitInterpretationDiff = (ocrText, aiInterpretation) => {
    const normalizedOcr = normalizeOcrText(ocrText);
    const sentences = aiInterpretation
        .split("。")
        .map((sentence) => sentence.trim())
        .filter(Boolean)
        .map((sentence) => `${sentence}。`);

    return sentences.map((sentence) => ({
        text: sentence,
        matched: normalizedOcr.includes(normalizeOcrText(sentence)),
    }));
};

const getQuestionFixture = (profileId, studyMode, subject) => {
    const modeFixtures = QUESTION_FIXTURES[profileId]?.[studyMode] ?? {};
    return modeFixtures[subject] ?? modeFixtures.default ?? null;
};

const resolveRepositoryErrorCode = (error, fallbackCode) => {
    if (typeof error?.code === "string" && error.code.startsWith("E_")) {
        return error.code;
    }
    if (typeof error?.message === "string" && error.message.startsWith("E_")) {
        return error.message.split(":")[0];
    }
    return fallbackCode;
};

const HomeButton = ({ onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className="inline-flex flex-col items-center gap-1 rounded-2xl bg-white/80 px-3 py-2 text-xs font-bold text-indigo-700 shadow-sm transition hover:bg-white"
    >
        <Home className="h-4 w-4" />
        <span>ホームに戻る</span>
    </button>
);

const ProfileSelector = ({ profiles, onSelect }) => (
    <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="panel card-appear mb-8 rounded-[2rem] p-7 sm:p-10">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-amber-200/70 px-4 py-2 text-sm font-bold text-amber-900">
                <Sparkles className="h-4 w-4" />
                MiraStudy Profile Selector
            </div>
            <h1 className="title-font text-3xl font-black leading-tight sm:text-5xl">
                今日の学びを選ぼう
            </h1>
            <p className="mt-3 max-w-2xl text-sm sm:text-base">
                プロファイルを選択すると、年齢と学年を自動判定して学習モードを開始します。
            </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {profiles.map((profile, index) => (
                <button
                    key={profile.id}
                    type="button"
                    onClick={() => onSelect(profile)}
                    className="panel card-appear rounded-[2rem] border border-white/70 p-6 text-left shadow-md transition duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                    style={{ animationDelay: `${index * 80}ms` }}
                >
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white">
                        {profile.role === "parent" ? (
                            <ShieldCheck className="h-6 w-6" />
                        ) : (
                            <UserRound className="h-6 w-6" />
                        )}
                    </div>
                    <h2 className="title-font text-2xl font-black">{profile.name}</h2>
                    {profile.role === "student" ? (
                        <>
                            <p className="mt-3 inline-block rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
                                {profile.stageInfo.stageLabel} {profile.stageInfo.gradeLabel}
                            </p>
                            <p className="mt-2 flex items-center gap-2 text-sm">
                                <CalendarClock className="h-4 w-4 text-rose-500" />
                                {profile.age}歳
                            </p>
                        </>
                    ) : (
                        <p className="mt-4 text-sm">ナレッジ管理・進捗監視を行う管理者モード</p>
                    )}
                </button>
            ))}
        </div>
    </section>
);

const VerificationBadgeButton = ({ onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-2 text-xs font-black text-emerald-800"
    >
        <CheckCircle2 className="h-4 w-4" />
        MEXT Sync Verified
    </button>
);

const EvidenceViewer = ({ question, verification, onClose }) => {
    if (!question) {
        return null;
    }

    const diffSentences = splitInterpretationDiff(question.ocrText, question.aiInterpretation);
    const canOpenSourceUrl = isTrustedMextUrl(question.sourceUrl);

    return (
        <div className="mt-4 rounded-2xl border border-indigo-100 bg-white p-4 text-sm shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
                <h4 className="title-font text-base font-black text-indigo-900">Evidence Viewer</h4>
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700"
                >
                    閉じる
                </button>
            </div>

            <div className="mb-4 grid gap-2 rounded-xl bg-indigo-50 p-3 text-xs text-indigo-900">
                <p className="font-bold">{question.sourceTitle}</p>
                <p>sourceId: {question.sourceId}</p>
                <p>version: {question.sourceVersion}</p>
                <p>retrievedAt: {question.retrievedAt}</p>
                {canOpenSourceUrl ? (
                    <a
                        href={question.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-indigo-700 underline"
                    >
                        <Link2 className="h-3.5 w-3.5" />
                        MEXT 公式 PDF を開く
                    </a>
                ) : (
                    <p className="inline-flex items-center gap-1 font-bold text-zinc-600">
                        <Link2 className="h-3.5 w-3.5" />
                        外部 URL のためリンクを無効化しました
                    </p>
                )}
            </div>

            <div className="mb-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl bg-amber-50 p-3">
                    <p className="mb-2 font-bold text-amber-900">OCR 生テキスト</p>
                    <p className="text-xs leading-6 text-amber-900">{question.ocrText}</p>
                </div>
                <div className="rounded-xl bg-rose-50 p-3">
                    <p className="mb-2 font-bold text-rose-900">AI 解釈（差分強調）</p>
                    <div className="space-y-2 text-xs leading-6 text-rose-900">
                        {diffSentences.map((sentence) => (
                            <p
                                key={sentence.text}
                                className={sentence.matched ? "" : "rounded-md bg-rose-200 px-2 py-1"}
                            >
                                {sentence.text}
                            </p>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid gap-2 rounded-xl bg-zinc-50 p-3 text-xs text-zinc-700">
                <p className="inline-flex items-center gap-1 font-bold text-zinc-800">
                    <Fingerprint className="h-3.5 w-3.5" />
                    デジタル・フィンガープリント
                </p>
                <p>期待値: {question.verificationHash || "(未設定)"}</p>
                <p>計算値: {verification.computedHash || "(未計算)"}</p>
                <p>状態: {verification.status}</p>
                {verification.reasonCode ? <p>理由コード: {verification.reasonCode}</p> : null}
                {verification.missingFields?.length > 0 ? (
                    <p>
                        不足項目: {verification.missingFields.map((field) => FIELD_LABELS[field]).join(", ")}
                    </p>
                ) : null}
            </div>
        </div>
    );
};

const StudentHome = ({ profile, onBack, subjectsConfig, repository }) => {
    const subjects = subjectsConfig[profile.stageInfo.stage] ?? [];
    const [studyMode, setStudyMode] = useState(STUDY_MODE.NORMAL);
    const [selectedSubject, setSelectedSubject] = useState(subjects[0] ?? null);
    const [archiveRecords, setArchiveRecords] = useState([]);
    const [isArchiveLoading, setIsArchiveLoading] = useState(true);
    const [archiveErrorCode, setArchiveErrorCode] = useState("");
    const [archiveReloadCount, setArchiveReloadCount] = useState(0);
    const [verification, setVerification] = useState({
        status: "checking",
        reasonCode: "",
        computedHash: "",
        missingFields: [],
    });
    const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);

    const canShowSubjects = STAGE_WITH_SUBJECTS.has(profile.stageInfo.stage);
    const archiveState = resolveArchiveState({
        isLoading: isArchiveLoading,
        errorCode: archiveErrorCode,
        records: archiveRecords,
    });
    const activeQuestion = useMemo(
        () => getQuestionFixture(profile.id, studyMode, selectedSubject),
        [profile.id, selectedSubject, studyMode],
    );

    useEffect(() => {
        if (!subjects.includes(selectedSubject)) {
            setSelectedSubject(subjects[0] ?? null);
        }
    }, [selectedSubject, subjects]);

    useEffect(() => {
        let cancelled = false;

        const loadArchive = async () => {
            setIsArchiveLoading(true);
            setArchiveErrorCode("");
            try {
                const records = await repository.fetchLearningArchive(profile.id, studyMode);
                if (!cancelled) {
                    setArchiveRecords(records);
                }
            } catch (error) {
                if (!cancelled) {
                    setArchiveRecords([]);
                    setArchiveErrorCode(
                        resolveRepositoryErrorCode(error, "E_ARCHIVE_FETCH_FAILED"),
                    );
                }
            } finally {
                if (!cancelled) {
                    setIsArchiveLoading(false);
                }
            }
        };

        loadArchive();

        return () => {
            cancelled = true;
        };
    }, [archiveReloadCount, profile.id, repository, studyMode]);

    useEffect(() => {
        let cancelled = false;
        setVerification({
            status: "checking",
            reasonCode: "",
            computedHash: "",
            missingFields: [],
        });

        const verifyQuestion = async () => {
            if (!activeQuestion) {
                setVerification({
                    status: "blocked",
                    reasonCode: "C005_insufficient_evidence",
                    computedHash: "",
                    missingFields: ["sourceId"],
                });
                return;
            }

            const outcome = await resolveVerificationOutcome(activeQuestion);
            if (!cancelled) {
                setVerification(outcome);
            }
        };

        verifyQuestion();

        return () => {
            cancelled = true;
        };
    }, [activeQuestion]);

    useEffect(() => {
        setIsEvidenceOpen(false);
    }, [activeQuestion, studyMode]);

    return (
        <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                    <h2 className="title-font text-3xl font-black">{profile.name}さんのホーム</h2>
                    <p className="mt-2 text-sm">
                        現在: {profile.stageInfo.stageLabel} {profile.stageInfo.gradeLabel}
                    </p>
                </div>
                <HomeButton onClick={onBack} />
            </div>

            <div className="panel rounded-[2rem] p-6">
                <h3 className="mb-4 text-lg font-black text-indigo-900">学習モード</h3>
                <div className="mb-6 flex flex-wrap gap-3">
                    <button
                        type="button"
                        onClick={() => setStudyMode(STUDY_MODE.NORMAL)}
                        aria-pressed={studyMode === STUDY_MODE.NORMAL}
                        className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${studyMode === STUDY_MODE.NORMAL
                            ? "bg-indigo-600 text-white"
                            : "bg-white text-indigo-700"
                            }`}
                    >
                        通常学習
                    </button>
                    <button
                        type="button"
                        onClick={() => setStudyMode(STUDY_MODE.REVIEW)}
                        aria-pressed={studyMode === STUDY_MODE.REVIEW}
                        className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition ${studyMode === STUDY_MODE.REVIEW
                            ? "bg-rose-600 text-white"
                            : "bg-white text-rose-700"
                            }`}
                    >
                        <Camera className="h-4 w-4" />
                        テスト復習（画像解析）
                    </button>
                </div>

                {selectedSubject ? (
                    <p className="mb-5 inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                        現在の教科: {selectedSubject}
                    </p>
                ) : null}

                <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-indigo-900">
                    <BookMarked className="h-5 w-5" />
                    ステージ別 教科候補
                </h3>

                {canShowSubjects ? (
                    <ul className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                        {subjects.map((subject) => (
                            <li key={subject}>
                                <button
                                    type="button"
                                    onClick={() => setSelectedSubject(subject)}
                                    className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${subject === selectedSubject
                                        ? "bg-gradient-to-br from-indigo-500 to-rose-500 text-white"
                                        : "bg-white text-indigo-700"
                                        }`}
                                >
                                    {subject}
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="mb-8 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        このステージでは教科グリッドを表示しません。
                    </div>
                )}

                <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-indigo-900">
                    学習アーカイブ
                </h3>

                {archiveState === "loading" ? (
                    <div className="space-y-3" role="status" aria-live="polite">
                        <div className="h-14 animate-pulse rounded-2xl bg-indigo-100" />
                        <div className="h-14 animate-pulse rounded-2xl bg-indigo-100" />
                    </div>
                ) : null}

                {archiveState === "empty" ? (
                    <div className="rounded-2xl bg-white px-4 py-4 text-sm text-zinc-700">
                        学習履歴はまだありません。
                    </div>
                ) : null}

                {archiveState === "error" ? (
                    <div className="rounded-2xl bg-rose-50 px-4 py-4 text-sm text-rose-800">
                        <p className="mb-3 flex items-center gap-2 font-bold">
                            <AlertTriangle className="h-4 w-4" />
                            学習アーカイブの取得に失敗しました
                        </p>
                        <p className="mb-4">理由コード: {archiveErrorCode}</p>
                        <button
                            type="button"
                            onClick={() => setArchiveReloadCount((count) => count + 1)}
                            className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 font-bold text-rose-700"
                        >
                            <RefreshCw className="h-4 w-4" />
                            再試行
                        </button>
                    </div>
                ) : null}

                {archiveState === "ready" ? (
                    <ul className="space-y-3">
                        {archiveRecords.map((record) => (
                            <li key={record.archiveId} className="rounded-2xl bg-white px-4 py-4 text-sm shadow-sm">
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                    <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs font-bold text-indigo-700">
                                        {record.subject}
                                    </span>
                                    <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">
                                        {record.result}
                                    </span>
                                    <span className="text-xs text-zinc-500">{record.createdAt}</span>
                                </div>
                                <p className="font-bold text-zinc-800">{record.topic}</p>
                                <p className="mt-1 text-xs text-zinc-600">
                                    弱点タグ: {record.weaknessTag} / Source: {record.sourceId}
                                </p>
                            </li>
                        ))}
                    </ul>
                ) : null}

                <h3 className="mt-8 mb-4 flex items-center gap-2 text-lg font-black text-indigo-900">
                    <NotebookText className="h-5 w-5" />
                    問題生成プレビュー
                </h3>

                <ol className="mb-4 grid gap-2 sm:grid-cols-2">
                    {QUESTION_BUILD_STEPS.map((step) => (
                        <li
                            key={step}
                            className="rounded-xl bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-800"
                        >
                            {step}
                        </li>
                    ))}
                </ol>

                {activeQuestion ? (
                    <div className="rounded-2xl bg-white px-4 py-4 text-sm">
                        <p className="mb-3 font-bold text-zinc-800">{activeQuestion.prompt}</p>

                        {verification.status === "checking" ? (
                            <p className="text-xs text-zinc-600">検証処理を実行中...</p>
                        ) : null}

                        {verification.status === "verified" ? (
                            <div className="flex flex-wrap items-center gap-2">
                                <VerificationBadgeButton onClick={() => setIsEvidenceOpen(true)} />
                                <p className="text-xs text-emerald-700">検証済みソースに基づいています</p>
                            </div>
                        ) : null}

                        {verification.status === "blocked" ? (
                            <div className="rounded-xl bg-rose-50 px-3 py-3 text-rose-800">
                                <p className="font-bold">問題配信を停止しました</p>
                                <p className="mt-1 text-xs">理由コード: {verification.reasonCode}</p>
                                <button
                                    type="button"
                                    onClick={() => setIsEvidenceOpen(true)}
                                    className="mt-3 rounded-lg bg-white px-3 py-1 text-xs font-bold text-rose-700"
                                >
                                    検証詳細を見る
                                </button>
                            </div>
                        ) : null}

                        {isEvidenceOpen ? (
                            <EvidenceViewer
                                question={activeQuestion}
                                verification={verification}
                                onClose={() => setIsEvidenceOpen(false)}
                            />
                        ) : null}
                    </div>
                ) : (
                    <div className="rounded-2xl bg-amber-50 px-4 py-4 text-sm text-amber-900">
                        問題プレビューを生成できませんでした。
                    </div>
                )}
            </div>
        </section>
    );
};

const ParentHome = ({ onBack, profiles, repository }) => {
    const [selectedStage, setSelectedStage] = useState("ES");
    const [sourceMap, setSourceMap] = useState({});
    const [isSourceLoading, setIsSourceLoading] = useState(true);
    const [sourceErrorCode, setSourceErrorCode] = useState("");
    const [queueJobs, setQueueJobs] = useState(AUTO_IMPORT_QUEUE_FIXTURES);
    const [delegationState, setDelegationState] = useState(DELEGATION_STATE.IDLE);
    const [targetChildId, setTargetChildId] = useState("masamune");

    const stageSources = sourceMap[selectedStage] ?? [];
    const queueSummary = useMemo(() => summarizeQueueStatus(queueJobs), [queueJobs]);
    const childCandidates = useMemo(
        () =>
            profiles.filter((profile) => profile.role === "student").map((profile) => ({
                id: profile.id,
                name: profile.name,
                age: calculateCurrentAge(profile.birthDate),
            })),
        [profiles],
    );
    const targetChild = childCandidates.find((candidate) => candidate.id === targetChildId) ?? null;
    const isDelegationReady = (targetChild?.age ?? 0) >= 20;
    const pathSummary = useMemo(
        () => repository.resolvePaths(targetChildId),
        [repository, targetChildId],
    );

    useEffect(() => {
        let cancelled = false;

        const loadMasterSources = async () => {
            setIsSourceLoading(true);
            setSourceErrorCode("");
            try {
                const sourceData = await repository.fetchMasterSources();
                if (!cancelled) {
                    setSourceMap(sourceData);
                }
            } catch (error) {
                if (!cancelled) {
                    setSourceMap({});
                    setSourceErrorCode(
                        resolveRepositoryErrorCode(error, "E_MASTER_SOURCES_FETCH_FAILED"),
                    );
                }
            } finally {
                if (!cancelled) {
                    setIsSourceLoading(false);
                }
            }
        };

        loadMasterSources();

        return () => {
            cancelled = true;
        };
    }, [repository]);

    const handleToggleSource = async (sourceId) => {
        setSourceErrorCode("");
        try {
            const updatedMap = await repository.toggleMasterSource(selectedStage, sourceId);
            setSourceMap(updatedMap);
        } catch (error) {
            setSourceErrorCode(
                resolveRepositoryErrorCode(error, "E_MASTER_SOURCES_WRITE_FAILED"),
            );
        }
    };

    const handleRunAutoImport = () => {
        const now = new Date().toISOString();
        const nextId = `job-${String(queueJobs.length + 1).padStart(3, "0")}`;

        setQueueJobs((current) => [
            {
                jobId: nextId,
                stage: selectedStage,
                status: "queued",
                requestedAt: now,
                detail: "MEXT 公式資料の検索キューへ追加",
            },
            ...current,
        ]);

        setTimeout(() => {
            setQueueJobs((current) =>
                current.map((job) =>
                    job.jobId === nextId
                        ? { ...job, status: "running", detail: "署名照合と OCR 抽出を実行中" }
                        : job,
                ),
            );
        }, 260);

        setTimeout(() => {
            setQueueJobs((current) =>
                current.map((job) =>
                    job.jobId === nextId
                        ? { ...job, status: "success", detail: "ライブラリへ保存完了" }
                        : job,
                ),
            );
        }, 960);
    };

    return (
        <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                    <h2 className="title-font text-3xl font-black">保護者ダッシュボード</h2>
                    <p className="mt-2 text-sm">
                        ナレッジ管理（ON/OFF）、自動収集キュー、権限移譲準備をここで操作します。
                    </p>
                </div>
                <HomeButton onClick={onBack} />
            </div>

            <div className="panel space-y-7 rounded-[2rem] p-6">
                <div>
                    <h3 className="mb-3 flex items-center gap-2 text-lg font-black text-indigo-900">
                        <ShieldCheck className="h-5 w-5" />
                        ステージ別ソース管理
                    </h3>
                    <div className="mb-4 rounded-xl bg-indigo-50 px-3 py-2 text-xs text-indigo-900">
                        <p>masterSources: {pathSummary.masterSources}</p>
                        <p>learningArchive: {pathSummary.learningArchive}</p>
                        <p>profiles: {pathSummary.profiles}</p>
                    </div>
                    <div className="mb-4 flex flex-wrap gap-2">
                        {["ES", "JHS", "HS"].map((stage) => (
                            <button
                                key={stage}
                                type="button"
                                onClick={() => setSelectedStage(stage)}
                                className={`rounded-xl px-3 py-2 text-xs font-black ${selectedStage === stage
                                    ? "bg-indigo-600 text-white"
                                    : "bg-white text-indigo-700"
                                    }`}
                            >
                                {stage}
                            </button>
                        ))}
                    </div>

                    {isSourceLoading ? (
                        <div className="mb-3 rounded-xl bg-white px-3 py-2 text-xs text-zinc-600">
                            ソース一覧を読み込み中...
                        </div>
                    ) : null}

                    {sourceErrorCode ? (
                        <div className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
                            source 取得に失敗しました（{sourceErrorCode}）
                        </div>
                    ) : null}

                    <ul className="space-y-3">
                        {stageSources.map((source) => (
                            <li
                                key={source.sourceId}
                                className="rounded-2xl bg-white px-4 py-3 text-sm shadow-sm"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <p className="font-bold text-zinc-800">{source.title}</p>
                                        <p className="mt-1 text-xs text-zinc-600">
                                            sourceId: {source.sourceId} / origin: {source.origin} / sync: {source.lastSyncedAt}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            void handleToggleSource(source.sourceId);
                                        }}
                                        className={`rounded-xl px-3 py-2 text-xs font-black ${source.enabled
                                            ? "bg-emerald-100 text-emerald-800"
                                            : "bg-zinc-100 text-zinc-700"
                                            }`}
                                    >
                                        {source.enabled ? "ON" : "OFF"}
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                <div>
                    <h3 className="mb-3 flex items-center gap-2 text-lg font-black text-indigo-900">
                        <RefreshCw className="h-5 w-5" />
                        AI 自動収集キュー
                    </h3>
                    <div className="mb-3 flex flex-wrap gap-2 text-xs font-bold">
                        <span className="rounded-full bg-zinc-100 px-3 py-1">queued: {queueSummary.queued}</span>
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">
                            running: {queueSummary.running}
                        </span>
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">
                            success: {queueSummary.success}
                        </span>
                        <span className="rounded-full bg-rose-100 px-3 py-1 text-rose-800">
                            failed: {queueSummary.failed}
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={handleRunAutoImport}
                        className="mb-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white"
                    >
                        {selectedStage} の自動収集を実行
                    </button>

                    <ul className="space-y-2 text-xs">
                        {queueJobs.slice(0, 5).map((job) => (
                            <li key={job.jobId} className="rounded-xl bg-white px-3 py-2">
                                {job.jobId} / {job.stage} / {job.status} / {job.requestedAt}
                                <br />
                                {job.detail}
                            </li>
                        ))}
                    </ul>
                </div>

                <div>
                    <h3 className="mb-3 flex items-center gap-2 text-lg font-black text-indigo-900">
                        <UserRound className="h-5 w-5" />
                        権限移譲（プレースホルダー）
                    </h3>

                    <div className="mb-3 flex flex-wrap gap-2">
                        {childCandidates.map((candidate) => (
                            <button
                                key={candidate.id}
                                type="button"
                                onClick={() => setTargetChildId(candidate.id)}
                                className={`rounded-xl px-3 py-2 text-xs font-bold ${targetChildId === candidate.id
                                    ? "bg-rose-600 text-white"
                                    : "bg-white text-rose-700"
                                    }`}
                            >
                                {candidate.name}（{candidate.age}歳）
                            </button>
                        ))}
                    </div>

                    {delegationState === DELEGATION_STATE.IDLE ? (
                        <button
                            type="button"
                            onClick={() =>
                                setDelegationState((state) => transitionDelegationState(state, "start"))
                            }
                            className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-black text-white"
                        >
                            権限移譲の準備を開始
                        </button>
                    ) : null}

                    {delegationState === DELEGATION_STATE.PREVIEW ? (
                        <div className="rounded-2xl bg-white px-4 py-3 text-xs text-zinc-700">
                            <p>
                                対象: {targetChild?.name ?? "未選択"} / 年齢: {targetChild?.age ?? 0}歳
                            </p>
                            <p className="mt-1">
                                状態: {isDelegationReady ? "申請作成可能" : "20歳未満のため保留"}
                            </p>
                            <div className="mt-3 flex gap-2">
                                <button
                                    type="button"
                                    disabled={!isDelegationReady}
                                    onClick={() =>
                                        setDelegationState((state) =>
                                            transitionDelegationState(state, "submit"),
                                        )
                                    }
                                    className="rounded-lg bg-indigo-600 px-3 py-2 font-black text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
                                >
                                    申請作成（プレースホルダー）
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setDelegationState((state) => transitionDelegationState(state, "reset"))
                                    }
                                    className="rounded-lg bg-zinc-100 px-3 py-2 font-black text-zinc-700"
                                >
                                    キャンセル
                                </button>
                            </div>
                        </div>
                    ) : null}

                    {delegationState === DELEGATION_STATE.REQUESTED ? (
                        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
                            権限移譲申請を作成しました（プレースホルダー遷移）。
                            <div className="mt-3">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setDelegationState((state) => transitionDelegationState(state, "reset"))
                                    }
                                    className="rounded-lg bg-white px-3 py-2 font-black text-emerald-800"
                                >
                                    初期状態へ戻す
                                </button>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </section>
    );
};

function App() {
    const repository = useMemo(() => createMiraRepositoryFromEnv(), []);
    const [activeProfile, setActiveProfile] = useState(null);
    const [profiles, setProfiles] = useState([]);
    const [isProfilesLoading, setIsProfilesLoading] = useState(true);
    const [profilesErrorCode, setProfilesErrorCode] = useState("");

    const subjectsConfig = useMemo(
        () => ({
            ES: ["算数", "国語", "理科", "社会", "図画工作", "体育"],
            JHS: ["数学", "国語", "理科", "社会", "英語", "美術", "保健体育"],
            HS: ["数学I・A", "現代の国語", "物理基礎", "日本史探究", "英語コミュニケーション"],
        }),
        [],
    );

    const decoratedProfiles = useMemo(
        () =>
            profiles.map((profile) => {
                if (profile.role !== "student") {
                    return profile;
                }
                return {
                    ...profile,
                    age: calculateCurrentAge(profile.birthDate),
                    stageInfo: calculateSchoolStageAndGrade(profile.birthDate),
                };
            }),
        [profiles],
    );

    useEffect(() => {
        let cancelled = false;

        const loadProfiles = async () => {
            setIsProfilesLoading(true);
            setProfilesErrorCode("");
            try {
                const loadedProfiles = await repository.fetchProfiles();
                if (!cancelled) {
                    setProfiles(loadedProfiles);
                }
            } catch (error) {
                if (!cancelled) {
                    setProfiles([]);
                    setProfilesErrorCode(
                        resolveRepositoryErrorCode(error, "E_PROFILES_FETCH_FAILED"),
                    );
                }
            } finally {
                if (!cancelled) {
                    setIsProfilesLoading(false);
                }
            }
        };

        loadProfiles();

        return () => {
            cancelled = true;
        };
    }, [repository]);

    return (
        <main className="relative min-h-screen overflow-hidden">
            <div className="grain-overlay" />
            <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 pt-5 sm:px-6 lg:px-8">
                <p className="title-font text-xl font-black tracking-wide">MiraStudy</p>
                {activeProfile ? (
                    <button
                        type="button"
                        onClick={() => setActiveProfile(null)}
                        className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-2 text-xs font-bold text-rose-700"
                    >
                        <LogOut className="h-4 w-4" />
                        プロファイル選択に戻る
                    </button>
                ) : null}
            </header>

            {!activeProfile ? (
                isProfilesLoading ? (
                    <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
                        <div className="panel rounded-[2rem] p-6 text-sm">プロフィールを読み込み中...</div>
                    </section>
                ) : profilesErrorCode ? (
                    <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
                        <div className="panel rounded-[2rem] bg-rose-50 p-6 text-sm text-rose-700">
                            プロファイルの取得に失敗しました（{profilesErrorCode}）。
                            <button
                                type="button"
                                onClick={() => {
                                    setProfilesErrorCode("");
                                    setIsProfilesLoading(true);
                                    void repository
                                        .fetchProfiles()
                                        .then(setProfiles)
                                        .catch((error) => {
                                            setProfiles([]);
                                            setProfilesErrorCode(
                                                resolveRepositoryErrorCode(
                                                    error,
                                                    "E_PROFILES_FETCH_FAILED",
                                                ),
                                            );
                                        })
                                        .finally(() => {
                                            setIsProfilesLoading(false);
                                        });
                                }}
                                className="ml-3 rounded-lg bg-white px-3 py-2 text-xs font-bold text-rose-700"
                            >
                                再試行
                            </button>
                        </div>
                    </section>
                ) : (
                    <ProfileSelector profiles={decoratedProfiles} onSelect={setActiveProfile} />
                )
            ) : activeProfile.role === "student" ? (
                <StudentHome
                    key={activeProfile.id}
                    profile={activeProfile}
                    onBack={() => setActiveProfile(null)}
                    subjectsConfig={subjectsConfig}
                    repository={repository}
                />
            ) : (
                <ParentHome
                    onBack={() => setActiveProfile(null)}
                    profiles={decoratedProfiles}
                    repository={repository}
                />
            )}
        </main>
    );
}

export default App;
