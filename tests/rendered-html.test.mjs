import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders Lab EDU admin panel metadata", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<html lang="th">/i);
  assert.match(html, /<title>Lab EDU — ผู้ดูแลระบบ<\/title>/i);
  assert.match(html, /กำลังเตรียมระบบ/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/i);
});

test("includes authenticated admin workflows and API integration", async () => {
  const [app, apiClient, packageJson] = await Promise.all([
    readFile(new URL("../app/admin-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/api.ts", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  assert.match(app, /ภาพรวมระบบ/);
  assert.match(app, /จัดการนักเรียน/);
  assert.match(app, /สร้างข้อสอบด้วย AI/);
  assert.match(app, /\/auth\/login/);
  assert.match(app, /\/analytics\/dashboard/);
  assert.match(app, /\/questions\/generate/);
  assert.match(app, /`\/questions\/\$\{question\.id\}`/);
  assert.match(app, /แก้ไขข้อสอบและเฉลย/);
  assert.match(app, /ลบที่เลือก/);
  assert.match(app, /method: "DELETE"/);
  assert.match(app, /ออกจากระบบ\?/);
  assert.match(app, /profile\?\.role === "TEACHER"/);
  assert.match(app, /นักเรียนของฉัน/);
  assert.match(app, /ผลสอบและวิเคราะห์/);
  assert.match(app, /\/analytics\/exams\/\$\{examId\}/);
  assert.match(app, /\/exams\/\$\{examId\}\/attempts\/\$\{student\.attemptId\}/);
  assert.match(app, /รีเซ็ตผลสอบ/);
  assert.match(app, /\/ai\/status/);
  assert.match(app, /\/ai\/student-access/);
  assert.match(app, /AI สำหรับผู้เรียน/);
  assert.match(
    app,
    /profile\?\.role === "ADMIN" \|\| profile\?\.role === "SUPER_ADMIN"/,
  );
  assert.match(app, /`\/academic\/subjects\/\$\{editingSubject\.id\}`/);
  assert.match(app, /`\/academic\/indicators\/\$\{editingIndicator\.id\}`/);
  assert.match(app, /ลบตัวชี้วัด/);
  assert.match(app, /label="ครูผู้สอน"/);
  assert.doesNotMatch(app, /label="ครูประจำชั้น"/);
  assert.match(app, /api<Teacher\[]>\("\/academic\/teachers"/);
  assert.match(app, /งานและการให้คะแนน/);
  assert.match(app, /\/assignments\/grade-scale/);
  assert.match(app, /ให้คะแนน/);
  assert.match(app, /ให้คะแนนทั้งห้อง/);
  assert.match(app, /\/assignments\/\$\{assignment\.id\}\/grades/);
  assert.match(app, /ยังไม่ส่งในระบบ/);
  assert.match(app, /ยังไม่ได้เพิ่ม API Key/);
  assert.match(apiClient, /NEXT_PUBLIC_API_URL/);
  assert.match(packageJson, /"sweetalert2"/);
  assert.match(packageJson, /"@fontsource\/noto-sans-thai"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
