"use client";

import {
  Eye,
  FilePlus2,
  Link2,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { api } from "../../lib/api";

export type PlaygroundDifficulty = "EASY" | "MEDIUM" | "HARD";

interface PlaygroundProblem {
  id: string;
  title: string;
  description?: string | null;
  difficulty: PlaygroundDifficulty;
  driveUrl: string;
  previewUrl: string;
  isActive: boolean;
  position: number;
}

const levels: Array<{
  value: PlaygroundDifficulty;
  label: string;
  description: string;
}> = [
  { value: "EASY", label: "ง่าย", description: "เริ่มต้นและทบทวนพื้นฐาน" },
  { value: "MEDIUM", label: "กลาง", description: "ประยุกต์ใช้แนวคิดหลายขั้นตอน" },
  { value: "HARD", label: "ยาก", description: "โจทย์ท้าทายสำหรับฝึกเชิงลึก" },
];

const emptyDraft = {
  title: "",
  description: "",
  difficulty: "EASY" as PlaygroundDifficulty,
  driveUrl: "",
  isActive: true,
  position: 0,
};

export function PlaygroundProblemsView({ token }: { token: string }) {
  const [rows, setRows] = useState<PlaygroundProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<PlaygroundProblem | null | undefined>();
  const [preview, setPreview] = useState<PlaygroundProblem | null>(null);

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      setRows(await api<PlaygroundProblem[]>("/playground/problems", {}, token));
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "โหลดโจทย์ไม่สำเร็จ",
        text: error instanceof Error ? error.message : "กรุณาลองใหม่อีกครั้ง",
      });
    } finally {
      setLoading(false);
    }
  }, [token]);

  /* Initial API hydration intentionally updates component state. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void load(false);
  }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const grouped = useMemo(
    () =>
      Object.fromEntries(
        levels.map((level) => [
          level.value,
          rows
            .filter((row) => row.difficulty === level.value)
            .sort((a, b) => a.position - b.position),
        ]),
      ) as Record<PlaygroundDifficulty, PlaygroundProblem[]>,
    [rows],
  );

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    const data = new FormData(event.currentTarget);
    const payload = {
      title: String(data.get("title") ?? ""),
      description: String(data.get("description") ?? ""),
      difficulty: String(data.get("difficulty")),
      driveUrl: String(data.get("driveUrl") ?? ""),
      position: Number(data.get("position") ?? 0),
      isActive: data.get("isActive") === "on",
    };
    setSaving(true);
    try {
      await api(
        editing
          ? `/playground/problems/${editing.id}`
          : "/playground/problems",
        {
          method: editing ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
        token,
      );
      setEditing(undefined);
      await load();
      await Swal.fire({
        icon: "success",
        title: editing ? "แก้ไขโจทย์แล้ว" : "เพิ่มโจทย์แล้ว",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "บันทึกไม่สำเร็จ",
        text: error instanceof Error ? error.message : "กรุณาตรวจสอบข้อมูล",
      });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (problem: PlaygroundProblem) => {
    const answer = await Swal.fire({
      icon: "warning",
      title: `ลบโจทย์ “${problem.title}”?`,
      text: "โจทย์จะหายจากหน้า Playground ของนักเรียนทันที",
      showCancelButton: true,
      confirmButtonText: "ลบโจทย์",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#d65b65",
    });
    if (!answer.isConfirmed) return;
    try {
      await api(
        `/playground/problems/${problem.id}`,
        { method: "DELETE" },
        token,
      );
      setRows((current) => current.filter((row) => row.id !== problem.id));
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "ลบโจทย์ไม่สำเร็จ",
        text: error instanceof Error ? error.message : "กรุณาลองใหม่อีกครั้ง",
      });
    }
  };

  return (
    <div className="playground-problems-admin">
      <section className="panel playground-problem-intro">
        <div>
          <span className="playground-problem-icon"><FilePlus2 /></span>
          <div>
            <h3>คลังโจทย์ฝึกเขียนโปรแกรม</h3>
            <p>แนบไฟล์โจทย์จาก Google Drive และแบ่งให้นักเรียนเลือกตามระดับ</p>
          </div>
        </div>
        <div className="playground-problem-actions">
          <button className="button secondary" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={16} className={loading ? "spin" : ""} /> รีเฟรช
          </button>
          <button className="button primary" onClick={() => setEditing(null)}>
            <Plus size={17} /> เพิ่มโจทย์
          </button>
        </div>
      </section>

      {loading ? (
        <div className="playground-problem-loading"><LoaderCircle className="spin" /> กำลังโหลดโจทย์...</div>
      ) : (
        <div className="playground-level-grid">
          {levels.map((level) => (
            <section className={`panel playground-level level-${level.value.toLowerCase()}`} key={level.value}>
              <header>
                <div><span>{level.label}</span><div><h3>ระดับ{level.label}</h3><p>{level.description}</p></div></div>
                <b>{grouped[level.value].length} โจทย์</b>
              </header>
              <div className="playground-problem-list">
                {grouped[level.value].length ? grouped[level.value].map((problem) => (
                  <article className={!problem.isActive ? "inactive" : ""} key={problem.id}>
                    <div className="playground-problem-order">{problem.position || "–"}</div>
                    <div className="playground-problem-copy">
                      <div><h4>{problem.title}</h4>{!problem.isActive && <span>ซ่อน</span>}</div>
                      <p>{problem.description || "ไม่มีคำอธิบายเพิ่มเติม"}</p>
                      <a href={problem.driveUrl} target="_blank" rel="noreferrer"><Link2 size={13} /> เปิดต้นฉบับใน Drive</a>
                    </div>
                    <div className="playground-problem-row-actions">
                      <button title="พรีวิว" onClick={() => setPreview(problem)}><Eye size={16} /></button>
                      <button title="แก้ไข" onClick={() => setEditing(problem)}><PencilLine size={16} /></button>
                      <button className="danger" title="ลบ" onClick={() => void remove(problem)}><Trash2 size={16} /></button>
                    </div>
                  </article>
                )) : <div className="playground-empty"><FilePlus2 /><p>ยังไม่มีโจทย์ระดับ{level.label}</p><button onClick={() => setEditing(null)}>เพิ่มโจทย์แรก</button></div>}
              </div>
            </section>
          ))}
        </div>
      )}

      {editing !== undefined && (
        <div className="playground-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setEditing(undefined)}>
          <form className="playground-problem-modal" onSubmit={save}>
            <header><div><h2>{editing ? "แก้ไขโจทย์" : "เพิ่มโจทย์ Playground"}</h2><p>ไฟล์ใน Google Drive ต้องตั้งสิทธิ์ให้ผู้ที่มีลิงก์ดูได้</p></div><button type="button" onClick={() => setEditing(undefined)}><X /></button></header>
            <div className="playground-problem-form">
              <label>ชื่อโจทย์<input name="title" defaultValue={editing?.title ?? emptyDraft.title} maxLength={160} required placeholder="เช่น คำนวณผลรวมของตัวเลข" /></label>
              <label>คำอธิบาย<textarea name="description" defaultValue={editing?.description ?? emptyDraft.description} maxLength={2000} rows={3} placeholder="สรุปสิ่งที่นักเรียนจะได้ฝึก" /></label>
              <div className="field-row">
                <label>ระดับ<select name="difficulty" defaultValue={editing?.difficulty ?? emptyDraft.difficulty}>{levels.map((level) => <option value={level.value} key={level.value}>{level.label}</option>)}</select></label>
                <label>ลำดับแสดง<input name="position" type="number" min={0} max={100000} defaultValue={editing?.position ?? emptyDraft.position} /></label>
              </div>
              <label>ลิงก์ Google Drive<div className="drive-url-field"><Link2 /><input name="driveUrl" type="url" defaultValue={editing?.driveUrl ?? emptyDraft.driveUrl} required placeholder="https://drive.google.com/file/d/.../view" /></div><small>รองรับ Google Drive, Docs, Sheets และ Slides</small></label>
              <label className="playground-active-check"><input name="isActive" type="checkbox" defaultChecked={editing?.isActive ?? true} /><span><b>แสดงให้นักเรียนเห็น</b><small>ปิดไว้ได้หากยังเตรียมโจทย์ไม่เสร็จ</small></span></label>
            </div>
            <footer><button className="button secondary" type="button" onClick={() => setEditing(undefined)}>ยกเลิก</button><button className="button primary" type="submit" disabled={saving}>{saving && <LoaderCircle size={16} className="spin" />} บันทึกโจทย์</button></footer>
          </form>
        </div>
      )}

      {preview && (
        <div className="playground-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setPreview(null)}>
          <section className="playground-preview-modal">
            <header><div><span className={`playground-level-badge ${preview.difficulty.toLowerCase()}`}>{levels.find((level) => level.value === preview.difficulty)?.label}</span><h2>{preview.title}</h2></div><button onClick={() => setPreview(null)}><X /></button></header>
            <iframe src={preview.previewUrl} title={`พรีวิว ${preview.title}`} allow="autoplay" />
            <footer><span>หากพรีวิวไม่แสดง โปรดตรวจสอบสิทธิ์แชร์ไฟล์</span><a className="button secondary" href={preview.driveUrl} target="_blank" rel="noreferrer"><Link2 size={15} /> เปิดใน Google Drive</a></footer>
          </section>
        </div>
      )}
    </div>
  );
}
