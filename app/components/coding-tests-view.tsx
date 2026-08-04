"use client";

import {
  Bot,
  CheckCircle2,
  Code2,
  FileText,
  Link2,
  LoaderCircle,
  LockKeyhole,
  PencilLine,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import { api } from "../../lib/api";

type Language = "C" | "CPP" | "CSHARP" | "PYTHON";
interface RefRow {
  id: string;
  name: string;
}
interface TestCase {
  id?: string;
  input: string;
  expectedOutput: string;
}
interface Problem {
  id?: string;
  title: string;
  description?: string | null;
  pdfUrl: string;
  language: Language;
  score: string | number;
  position?: number;
  testCases: TestCase[];
}
interface Attempt {
  id: string;
  status: string;
  gradingStatus?: string | null;
  score?: string | number | null;
  maxScore?: string | number | null;
  lockedAt?: string | null;
  lockReason?: string | null;
  student: {
    studentCode: string;
    user: { firstName: string; lastName: string };
  };
  answers: Array<{
    id: string;
    sourceCode: string;
    score?: string | number | null;
    feedback?: string | null;
    problem: { title: string; score: string | number };
  }>;
}
interface CodingTest {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  requiredCount: number;
  durationMinutes?: number | null;
  aiGradingEnabled: boolean;
  aiGradingModel?: string | null;
  classroom: RefRow;
  subject: RefRow;
  problems: Problem[];
  attempts: Attempt[];
  _count: { attempts: number; problems: number };
}

const languageLabel: Record<Language, string> = {
  C: "C",
  CPP: "C++",
  CSHARP: "C#",
  PYTHON: "Python",
};
const blankProblem = (): Problem => ({
  title: "",
  description: "",
  pdfUrl: "",
  language: "PYTHON",
  score: 10,
  testCases: [{ input: "", expectedOutput: "" }],
});

export function CodingTestsView({
  token,
  classrooms,
  subjects,
}: {
  token: string;
  classrooms: RefRow[];
  subjects: RefRow[];
}) {
  const [rows, setRows] = useState<CodingTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<CodingTest | null | undefined>();
  const [problems, setProblems] = useState<Problem[]>([blankProblem()]);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await api<CodingTest[]>("/coding-tests", {}, token));
    } catch (error) {
      await fail(error);
    } finally {
      setLoading(false);
    }
  }, [token]);
  /* Initial API hydration intentionally updates component state. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void load();
  }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */
  const open = (row: CodingTest | null) => {
    setEditing(row);
    setProblems(
      row?.problems.map((problem) => ({
        ...problem,
        testCases: (problem.testCases ?? []).map((testCase) => ({ ...testCase })),
      })) ?? [blankProblem()],
    );
  };
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const normalizedProblems = normalizeProblems(problems);
    const problemsChanged =
      !editing ||
      JSON.stringify(normalizedProblems) !==
        JSON.stringify(normalizeProblems(editing.problems));
    const payload = {
      classroomId: String(form.get("classroomId")),
      subjectId: String(form.get("subjectId")),
      title: String(form.get("title")),
      description: String(form.get("description")),
      requiredCount: Number(form.get("requiredCount")),
      durationMinutes: Number(form.get("durationMinutes")) || undefined,
      aiGradingEnabled: form.get("aiGradingEnabled") === "on",
      aiGradingModel: String(form.get("aiGradingModel") || "") || undefined,
      ...(problemsChanged ? { problems: normalizedProblems } : {}),
    };
    try {
      await api(
        editing ? `/coding-tests/${editing.id}` : "/coding-tests",
        { method: editing ? "PATCH" : "POST", body: JSON.stringify(payload) },
        token,
      );
      setEditing(undefined);
      await load();
      await Swal.fire({
        icon: "success",
        title: "บันทึก Coding Test แล้ว",
        timer: 1000,
        showConfirmButton: false,
      });
    } catch (error) {
      await fail(error);
    }
  };
  const toggle = async (row: CodingTest) => {
    try {
      await api(
        `/coding-tests/${row.id}/availability`,
        {
          method: "PATCH",
          body: JSON.stringify({ isOpen: row.status !== "PUBLISHED" }),
        },
        token,
      );
      await load();
    } catch (error) {
      await fail(error);
    }
  };
  const remove = async (row: CodingTest) => {
    const answer = await Swal.fire({
      icon: "warning",
      title: `ลบ “${row.title}”?`,
      showCancelButton: true,
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#d65b65",
    });
    if (!answer.isConfirmed) return;
    try {
      await api(`/coding-tests/${row.id}`, { method: "DELETE" }, token);
      await load();
    } catch (error) {
      await fail(error);
    }
  };
  const unlock = async (attempt: Attempt) => {
    try {
      await api(
        `/coding-tests/attempts/${attempt.id}/unlock`,
        { method: "POST" },
        token,
      );
      await load();
    } catch (error) {
      await fail(error);
    }
  };
  const resetAttempt = async (test: CodingTest, attempt: Attempt) => {
    const studentName = `${attempt.student.user.firstName} ${attempt.student.user.lastName}`;
    const answer = await Swal.fire({
      icon: "warning",
      title: `รีเซ็ตคำตอบของ ${studentName}?`,
      text: "คำตอบ คะแนน ผลตรวจ Test Case และสถานะล็อกจะถูกลบ นักเรียนจะเริ่มทำ Coding Test ใหม่ได้",
      showCancelButton: true,
      confirmButtonText: "รีเซ็ตให้เริ่มใหม่",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#d65b65",
    });
    if (!answer.isConfirmed) return;
    try {
      await api(
        `/coding-tests/${test.id}/attempts/${attempt.id}`,
        { method: "DELETE" },
        token,
      );
      await load();
      await Swal.fire({
        icon: "success",
        title: "รีเซ็ตคำตอบแล้ว",
        text: `${studentName} สามารถเริ่มทำ Coding Test ใหม่ได้`,
        timer: 1300,
        showConfirmButton: false,
      });
    } catch (error) {
      await fail(error);
    }
  };
  const grade = async (attempt: Attempt) => {
    const html = attempt.answers
      .map(
        (answer) =>
          `<label class="swal-field">${escapeHtml(answer.problem.title)} (เต็ม ${Number(answer.problem.score)})<input data-answer="${answer.id}" type="number" min="0" max="${Number(answer.problem.score)}" step="0.01" value="${Number(answer.score ?? 0)}"><textarea data-feedback="${answer.id}" rows="2" placeholder="ความคิดเห็น">${escapeHtml(answer.feedback ?? "")}</textarea></label>`,
      )
      .join("");
    const result = await Swal.fire({
      title: "ให้คะแนน Coding Test",
      html,
      showCancelButton: true,
      confirmButtonText: "บันทึกคะแนน",
      cancelButtonText: "ยกเลิก",
      preConfirm: () => ({
        answers: attempt.answers.map((answer) => ({
          answerId: answer.id,
          score: Number(
            (
              document.querySelector(
                `[data-answer=\"${answer.id}\"]`,
              ) as HTMLInputElement
            ).value,
          ),
          feedback: (
            document.querySelector(
              `[data-feedback=\"${answer.id}\"]`,
            ) as HTMLTextAreaElement
          ).value,
        })),
      }),
    });
    if (!result.isConfirmed) return;
    try {
      await api(
        `/coding-tests/attempts/${attempt.id}/grade`,
        { method: "PATCH", body: JSON.stringify(result.value) },
        token,
      );
      await load();
    } catch (error) {
      await fail(error);
    }
  };
  return (
    <div className="coding-tests-admin">
      <section className="panel coding-hero">
        <div>
          <span>
            <Code2 />
          </span>
          <div>
            <h3>Coding Test</h3>
            <p>ข้อสอบเขียนโค้ดแบบเลือกโจทย์ พร้อมคิวตรวจและระบบคุมสอบ</p>
          </div>
        </div>
        <div>
          <button className="button secondary" onClick={() => void load()}>
            <RefreshCw size={16} /> รีเฟรช
          </button>
          <button className="button primary" onClick={() => open(null)}>
            <Plus size={17} /> สร้าง Coding Test
          </button>
        </div>
      </section>
      {loading ? (
        <div className="playground-problem-loading">
          <LoaderCircle className="spin" /> กำลังโหลด...
        </div>
      ) : rows.length ? (
        <div className="coding-test-grid">
          {rows.map((row) => (
            <article className="panel coding-test-card" key={row.id}>
              <header>
                <div>
                  <span
                    className={`assignment-status status-${row.status.toLowerCase()}`}
                  >
                    {row.status === "PUBLISHED"
                      ? "เปิดสอบ"
                      : row.status === "CLOSED"
                        ? "ปิดสอบ"
                        : "ฉบับร่าง"}
                  </span>
                  <h3>{row.title}</h3>
                  <p>
                    {row.subject.name} · {row.classroom.name}
                  </p>
                </div>
                <button
                  className={`availability-switch ${row.status === "PUBLISHED" ? "on" : "off"}`}
                  onClick={() => void toggle(row)}
                  aria-label="เปิดปิดการสอบ"
                >
                  <i />
                  <span>{row.status === "PUBLISHED" ? "เปิด" : "ปิด"}</span>
                </button>
              </header>
              <p>{row.description || "ไม่มีคำอธิบาย"}</p>
              <div className="coding-metrics">
                <span>
                  <FileText /> โจทย์ {row._count.problems} ข้อ
                </span>
                <span>
                  <CheckCircle2 /> เลือกทำ {row.requiredCount} ข้อ
                </span>
                <span>
                  <Bot /> {row.aiGradingEnabled ? "AI ตรวจ" : "ครูตรวจ"}
                </span>
              </div>
              <div className="coding-problem-chips">
                {row.problems.map((problem) => (
                  <a
                    href={problem.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    key={problem.id}
                  >
                    <span>{languageLabel[problem.language]}</span>
                    {problem.title}
                    <b>{Number(problem.score)} คะแนน · {problem.testCases?.length ?? 0} tests</b>
                  </a>
                ))}
              </div>
              <footer>
                <span>{row._count.attempts} คนเข้าสอบ</span>
                <button onClick={() => open(row)}>
                  <PencilLine size={15} /> แก้ไข
                </button>
                <button className="danger" onClick={() => void remove(row)}>
                  <Trash2 size={15} />
                </button>
              </footer>
              {row.attempts.length > 0 && (
                <details>
                  <summary>สถานะผู้เข้าสอบ</summary>
                  <div className="coding-attempts">
                    {row.attempts.map((attempt) => (
                      <div key={attempt.id}>
                        <span>
                          <b>
                            {attempt.student.user.firstName}{" "}
                            {attempt.student.user.lastName}
                          </b>
                          <small>
                            {attempt.student.studentCode} ·{" "}
                            {attempt.gradingStatus === "QUEUED"
                              ? "อยู่ในคิว"
                              : attempt.gradingStatus === "GRADING"
                                ? "กำลังตรวจ"
                                : attempt.status === "GRADED"
                                  ? `${Number(attempt.score)}/${Number(attempt.maxScore)}`
                                  : "รอตรวจ"}
                          </small>
                        </span>
                        {attempt.lockedAt && (
                          <button onClick={() => void unlock(attempt)}>
                            <LockKeyhole size={14} /> ปลดล็อก
                          </button>
                        )}
                        <button onClick={() => void grade(attempt)}>
                          ให้คะแนน
                        </button>
                        <button
                          className="danger"
                          onClick={() => void resetAttempt(row, attempt)}
                        >
                          <RotateCcw size={14} /> รีเซ็ต
                        </button>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="panel playground-empty">
          <Code2 />
          <p>ยังไม่มี Coding Test</p>
          <button onClick={() => open(null)}>สร้างชุดแรก</button>
        </div>
      )}
      {editing !== undefined && (
        <div
          className="playground-modal-backdrop"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setEditing(undefined)
          }
        >
          <form className="coding-test-modal" onSubmit={save}>
            <header>
              <div>
                <h2>{editing ? "แก้ไข Coding Test" : "สร้าง Coding Test"}</h2>
                <p>นักเรียนจะเห็นโจทย์ทั้งหมดและเลือกทำตามจำนวนที่กำหนด</p>
              </div>
              <button type="button" onClick={() => setEditing(undefined)}>
                <X />
              </button>
            </header>
            <div className="coding-test-form">
              <label>
                ชื่อชุดสอบ
                <input
                  name="title"
                  required
                  defaultValue={editing?.title ?? ""}
                />
              </label>
              <label>
                คำอธิบาย
                <textarea
                  name="description"
                  rows={2}
                  defaultValue={editing?.description ?? ""}
                />
              </label>
              <div className="field-row">
                <label>
                  ห้องเรียน
                  <select
                    name="classroomId"
                    required
                    defaultValue={editing?.classroom.id ?? ""}
                  >
                    <option value="">เลือกห้องเรียน</option>
                    {classrooms.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  วิชา
                  <select
                    name="subjectId"
                    required
                    defaultValue={editing?.subject.id ?? ""}
                  >
                    <option value="">เลือกวิชา</option>
                    {subjects.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="field-row">
                <label>
                  จำนวนข้อที่ต้องทำ
                  <input
                    name="requiredCount"
                    required
                    type="number"
                    min={1}
                    max={problems.length}
                    defaultValue={editing?.requiredCount ?? 1}
                  />
                </label>
                <label>
                  เวลา (นาที)
                  <input
                    name="durationMinutes"
                    type="number"
                    min={1}
                    max={1440}
                    defaultValue={editing?.durationMinutes ?? ""}
                  />
                </label>
              </div>
              <label className="playground-active-check">
                <input
                  name="aiGradingEnabled"
                  type="checkbox"
                  defaultChecked={editing?.aiGradingEnabled ?? true}
                />
                <span>
                  <b>ตรวจคำตอบและให้คะแนนด้วย AI</b>
                  <small>ปิดเพื่อให้ครูตรวจและให้คะแนนเอง</small>
                </span>
              </label>
              <label>
                โมเดล AI (เว้นว่างเพื่อใช้ค่าองค์กร)
                <input
                  name="aiGradingModel"
                  defaultValue={editing?.aiGradingModel ?? ""}
                  placeholder="เช่น gemini-2.5-pro"
                />
              </label>
              <section className="coding-problem-editor">
                <header>
                  <div>
                    <h3>โจทย์สอบ</h3>
                    <p>ลิงก์ต้องเปิดดูได้สำหรับผู้ที่มีลิงก์</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setProblems((current) => [...current, blankProblem()])
                    }
                  >
                    <Plus size={15} /> เพิ่มโจทย์
                  </button>
                </header>
                {problems.map((problem, index) => (
                  <div className="coding-problem-row" key={index}>
                    <div className="coding-problem-number">{index + 1}</div>
                    <label>
                      ชื่อโจทย์
                      <input
                        required
                        value={problem.title}
                        onChange={(e) =>
                          setProblems((current) =>
                            current.map((p, i) =>
                              i === index ? { ...p, title: e.target.value } : p,
                            ),
                          )
                        }
                      />
                    </label>
                    <label>
                      ลิงก์ PDF Google Drive
                      <div className="drive-url-field">
                        <Link2 />
                        <input
                          required
                          type="url"
                          value={problem.pdfUrl}
                          onChange={(e) =>
                            setProblems((current) =>
                              current.map((p, i) =>
                                i === index
                                  ? { ...p, pdfUrl: e.target.value }
                                  : p,
                              ),
                            )
                          }
                        />
                      </div>
                    </label>
                    <label>
                      ภาษา
                      <select
                        value={problem.language}
                        onChange={(e) =>
                          setProblems((current) =>
                            current.map((p, i) =>
                              i === index
                                ? { ...p, language: e.target.value as Language }
                                : p,
                            ),
                          )
                        }
                      >
                        {Object.entries(languageLabel).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      คะแนน
                      <input
                        required
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={problem.score}
                        onChange={(e) =>
                          setProblems((current) =>
                            current.map((p, i) =>
                              i === index ? { ...p, score: e.target.value } : p,
                            ),
                          )
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="danger"
                      disabled={problems.length === 1}
                      onClick={() =>
                        setProblems((current) =>
                          current.filter((_, i) => i !== index),
                        )
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                    <section className="coding-test-cases">
                      <header>
                        <div>
                          <b>Test cases</b>
                          <small>ซ่อนจากนักเรียน ใช้รันตรวจคำตอบและกำหนดเพดานคะแนน</small>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setProblems((current) =>
                              current.map((item, problemIndex) =>
                                problemIndex === index
                                  ? {
                                      ...item,
                                      testCases: [
                                        ...item.testCases,
                                        { input: "", expectedOutput: "" },
                                      ],
                                    }
                                  : item,
                              ),
                            )
                          }
                        >
                          <Plus size={14} /> เพิ่ม test case
                        </button>
                      </header>
                      {problem.testCases.map((testCase, caseIndex) => (
                        <div className="coding-test-case-row" key={caseIndex}>
                          <span>{caseIndex + 1}</span>
                          <label>
                            Input (stdin)
                            <textarea
                              rows={3}
                              value={testCase.input}
                              placeholder="เช่น 5\n1 2 3 4 5"
                              onChange={(event) =>
                                setProblems((current) =>
                                  current.map((item, problemIndex) =>
                                    problemIndex === index
                                      ? {
                                          ...item,
                                          testCases: item.testCases.map(
                                            (currentCase, currentCaseIndex) =>
                                              currentCaseIndex === caseIndex
                                                ? {
                                                    ...currentCase,
                                                    input: event.target.value,
                                                  }
                                                : currentCase,
                                          ),
                                        }
                                      : item,
                                  ),
                                )
                              }
                            />
                          </label>
                          <label>
                            Expected output
                            <textarea
                              rows={3}
                              value={testCase.expectedOutput}
                              placeholder="ผลลัพธ์ที่ถูกต้อง"
                              onChange={(event) =>
                                setProblems((current) =>
                                  current.map((item, problemIndex) =>
                                    problemIndex === index
                                      ? {
                                          ...item,
                                          testCases: item.testCases.map(
                                            (currentCase, currentCaseIndex) =>
                                              currentCaseIndex === caseIndex
                                                ? {
                                                    ...currentCase,
                                                    expectedOutput:
                                                      event.target.value,
                                                  }
                                                : currentCase,
                                          ),
                                        }
                                      : item,
                                  ),
                                )
                              }
                            />
                          </label>
                          <button
                            type="button"
                            className="danger"
                            disabled={problem.testCases.length === 1}
                            onClick={() =>
                              setProblems((current) =>
                                current.map((item, problemIndex) =>
                                  problemIndex === index
                                    ? {
                                        ...item,
                                        testCases: item.testCases.filter(
                                          (_, currentCaseIndex) =>
                                            currentCaseIndex !== caseIndex,
                                        ),
                                      }
                                    : item,
                                ),
                              )
                            }
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </section>
                  </div>
                ))}
              </section>
            </div>
            <footer>
              <button
                type="button"
                className="button secondary"
                onClick={() => setEditing(undefined)}
              >
                ยกเลิก
              </button>
              <button className="button primary" type="submit">
                บันทึก
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>'"]/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        char
      ]!,
  );
const normalizeProblems = (rows: Problem[]) =>
  rows.map((problem) => ({
    title: problem.title,
    description: problem.description ?? "",
    pdfUrl: problem.pdfUrl,
    language: problem.language,
    score: Number(problem.score),
    testCases: (problem.testCases ?? []).map((testCase) => ({
      input: testCase.input,
      expectedOutput: testCase.expectedOutput,
    })),
  }));
async function fail(error: unknown) {
  await Swal.fire({
    icon: "error",
    title: "ดำเนินการไม่สำเร็จ",
    text: error instanceof Error ? error.message : "กรุณาลองใหม่",
  });
}
