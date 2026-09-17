type ScoreItem = {
  id: string;
  title: string;
  score: number;
  maxScore: number;
};

type ScoreStudent = {
  id: string;
  studentNumber?: number | null;
  studentCode: string;
  name: string;
  examScore: number;
  examMaxScore: number;
  assignmentScore: number;
  assignmentMaxScore: number;
  examResults: ScoreItem[];
  assignmentResults: ScoreItem[];
  score: number;
  maxScore: number;
  percentage: number | null;
  grade: string | null;
};

export type ScoreExportData = {
  classrooms: Array<{
    classroom: {
      id: string;
      name: string;
      gradeLevel?: string | null;
      academicYear: string;
    };
    subjects: Array<{
      subject: { id: string; code: string; name: string };
      students: ScoreStudent[];
    }>;
  }>;
};

export type ScoreExportFilters = {
  classroomId?: string;
  subjectId?: string;
};

type CellValue = string | number | null | undefined;

type ScoreColumn = {
  key: string;
  title: string;
  maxScore: number;
};

const encoder = new TextEncoder();

const xmlEscape = (value: CellValue) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const columnName = (index: number) => {
  let name = "";
  for (let value = index + 1; value; value = Math.floor((value - 1) / 26)) {
    name = String.fromCharCode(65 + ((value - 1) % 26)) + name;
  }
  return name;
};

const worksheetXml = (rows: CellValue[][]) => {
  const columnCount = Math.max(1, ...rows.map((row) => row.length));
  const widths = Array.from({ length: columnCount }, (_, columnIndex) =>
    Math.min(
      42,
      Math.max(
        10,
        ...rows.map((row) => String(row[columnIndex] ?? "").length + 2),
      ),
    ),
  );
  const sheetRows = rows
    .map(
      (row, rowIndex) =>
        `<row r="${rowIndex + 1}">${row
          .map((value, columnIndex) => {
            const reference = `${columnName(columnIndex)}${rowIndex + 1}`;
            if (typeof value === "number" && Number.isFinite(value)) {
              return `<c r="${reference}"${rowIndex === 0 ? ' s="1"' : ""}><v>${value}</v></c>`;
            }
            return `<c r="${reference}" t="inlineStr"${rowIndex === 0 ? ' s="1"' : ""}><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
          })
          .join("")}</row>`,
    )
    .join("");
  const lastCell = `${columnName(columnCount - 1)}${Math.max(rows.length, 1)}`;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:${lastCell}"/>
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <cols>${widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join("")}</cols>
  <sheetData>${sheetRows}</sheetData>
  <autoFilter ref="A1:${columnName(columnCount - 1)}${Math.max(rows.length, 1)}"/>
</worksheet>`;
};

const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

const crc32 = (data: Uint8Array) => {
  let crc = 0xffffffff;
  for (const byte of data) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

const concatBytes = (chunks: Uint8Array[]) => {
  const result = new Uint8Array(
    chunks.reduce((total, chunk) => total + chunk.length, 0),
  );
  let offset = 0;
  chunks.forEach((chunk) => {
    result.set(chunk, offset);
    offset += chunk.length;
  });
  return result;
};

const zipFiles = (files: Record<string, string>, generatedAt: Date) => {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let localOffset = 0;
  const dosTime =
    (generatedAt.getHours() << 11) |
    (generatedAt.getMinutes() << 5) |
    Math.floor(generatedAt.getSeconds() / 2);
  const dosDate =
    ((Math.max(1980, generatedAt.getFullYear()) - 1980) << 9) |
    ((generatedAt.getMonth() + 1) << 5) |
    generatedAt.getDate();

  Object.entries(files).forEach(([path, contents]) => {
    const name = encoder.encode(path);
    const data = encoder.encode(contents);
    const checksum = crc32(data);
    const localHeader = new Uint8Array(30);
    const localView = new DataView(localHeader.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, dosTime, true);
    localView.setUint16(12, dosDate, true);
    localView.setUint32(14, checksum, true);
    localView.setUint32(18, data.length, true);
    localView.setUint32(22, data.length, true);
    localView.setUint16(26, name.length, true);
    const localPart = concatBytes([localHeader, name, data]);
    localParts.push(localPart);

    const centralHeader = new Uint8Array(46);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, dosTime, true);
    centralView.setUint16(14, dosDate, true);
    centralView.setUint32(16, checksum, true);
    centralView.setUint32(20, data.length, true);
    centralView.setUint32(24, data.length, true);
    centralView.setUint16(28, name.length, true);
    centralView.setUint32(42, localOffset, true);
    centralParts.push(concatBytes([centralHeader, name]));
    localOffset += localPart.length;
  });

  const centralDirectory = concatBytes(centralParts);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, centralParts.length, true);
  endView.setUint16(10, centralParts.length, true);
  endView.setUint32(12, centralDirectory.length, true);
  endView.setUint32(16, localOffset, true);
  return concatBytes([...localParts, centralDirectory, end]);
};

const percentage = (score: number, maxScore: number) =>
  maxScore > 0 ? Number(((score / maxScore) * 100).toFixed(2)) : 0;

const scoreColumnKey = (subjectId: string, resultId: string) =>
  `${subjectId}:${resultId}`;

const compareScoreStudents = (left: ScoreStudent, right: ScoreStudent) => {
  if (left.studentNumber == null && right.studentNumber == null) {
    return left.studentCode.localeCompare(right.studentCode, "th", {
      numeric: true,
    });
  }
  if (left.studentNumber == null) return 1;
  if (right.studentNumber == null) return -1;
  return (
    left.studentNumber - right.studentNumber ||
    left.studentCode.localeCompare(right.studentCode, "th", { numeric: true })
  );
};

export function createScoreWorkbook(
  data: ScoreExportData,
  filters: ScoreExportFilters = {},
  generatedAt = new Date(),
) {
  const selected = data.classrooms.flatMap((classroomRecord) => {
    if (
      filters.classroomId &&
      classroomRecord.classroom.id !== filters.classroomId
    ) {
      return [];
    }
    return classroomRecord.subjects
      .filter(
        (subjectRecord) =>
          !filters.subjectId ||
          subjectRecord.subject.id === filters.subjectId,
      )
      .map((subjectRecord) => ({
        classroom: classroomRecord.classroom,
        subject: subjectRecord.subject,
        students: subjectRecord.students,
      }));
  });

  if (!selected.length) throw new Error("ไม่พบข้อมูลคะแนนตามห้องเรียนและรายวิชาที่เลือก");

  const multipleSubjects = new Set(
    selected.map(({ subject }) => subject.id),
  ).size > 1;
  const assignmentColumnMap = new Map<string, ScoreColumn>();
  const examColumnMap = new Map<string, ScoreColumn>();
  selected.forEach(({ subject, students }) => {
    students.forEach((student) => {
      student.assignmentResults.forEach((result) => {
        const key = scoreColumnKey(subject.id, result.id);
        if (!assignmentColumnMap.has(key)) {
          assignmentColumnMap.set(key, {
            key,
            title: `${multipleSubjects ? `${subject.code} · ` : ""}${result.title}`,
            maxScore: result.maxScore,
          });
        }
      });
      student.examResults.forEach((result) => {
        const key = scoreColumnKey(subject.id, result.id);
        if (!examColumnMap.has(key)) {
          examColumnMap.set(key, {
            key,
            title: `${multipleSubjects ? `${subject.code} · ` : ""}${result.title}`,
            maxScore: result.maxScore,
          });
        }
      });
    });
  });
  const assignmentColumns = Array.from(assignmentColumnMap.values());
  const examColumns = Array.from(examColumnMap.values());
  const summaryRows: CellValue[][] = [
    [
      "ห้องเรียน",
      "ระดับชั้น",
      "ปีการศึกษา",
      "รหัสวิชา",
      "รายวิชา",
      "เลขที่",
      "รหัสนักเรียน",
      "ชื่อ-นามสกุล",
      ...assignmentColumns.map(
        (column) => `งาน: ${column.title} (เต็ม ${column.maxScore})`,
      ),
      ...examColumns.map(
        (column) => `สอบ: ${column.title} (เต็ม ${column.maxScore})`,
      ),
      "คะแนนรวม",
      "คะแนนเต็มรวม",
      "ร้อยละรวม",
      "เกรด",
    ],
  ];
  const assignmentRows: CellValue[][] = [
    [
      "ห้องเรียน",
      "รหัสวิชา",
      "รายวิชา",
      "เลขที่",
      "รหัสนักเรียน",
      "ชื่อ-นามสกุล",
      "รายงาน / งาน",
      "คะแนน",
      "คะแนนเต็ม",
      "ร้อยละ",
    ],
  ];
  const examRows: CellValue[][] = [
    [
      "ห้องเรียน",
      "รหัสวิชา",
      "รายวิชา",
      "เลขที่",
      "รหัสนักเรียน",
      "ชื่อ-นามสกุล",
      "ข้อสอบ",
      "คะแนน",
      "คะแนนเต็ม",
      "ร้อยละ",
    ],
  ];

  selected.forEach(({ classroom, subject, students }) => {
    [...students].sort(compareScoreStudents).forEach((student) => {
      const assignmentScores = new Map(
        student.assignmentResults.map((result) => [
          scoreColumnKey(subject.id, result.id),
          result.score,
        ]),
      );
      const examScores = new Map(
        student.examResults.map((result) => [
          scoreColumnKey(subject.id, result.id),
          result.score,
        ]),
      );
      summaryRows.push([
        classroom.name,
        classroom.gradeLevel ?? "",
        classroom.academicYear,
        subject.code,
        subject.name,
        student.studentNumber ?? "",
        student.studentCode,
        student.name,
        ...assignmentColumns.map(
          (column) => assignmentScores.get(column.key) ?? "",
        ),
        ...examColumns.map((column) => examScores.get(column.key) ?? ""),
        student.score,
        student.maxScore,
        student.percentage == null
          ? percentage(student.score, student.maxScore)
          : Number(student.percentage),
        student.grade ?? "",
      ]);
      student.assignmentResults.forEach((result) => {
        assignmentRows.push([
          classroom.name,
          subject.code,
          subject.name,
          student.studentNumber ?? "",
          student.studentCode,
          student.name,
          result.title,
          result.score,
          result.maxScore,
          percentage(result.score, result.maxScore),
        ]);
      });
      student.examResults.forEach((result) => {
        examRows.push([
          classroom.name,
          subject.code,
          subject.name,
          student.studentNumber ?? "",
          student.studentCode,
          student.name,
          result.title,
          result.score,
          result.maxScore,
          percentage(result.score, result.maxScore),
        ]);
      });
    });
  });

  const sheets = [
    { name: "สรุปคะแนน", rows: summaryRows },
    { name: "คะแนนรายงาน", rows: assignmentRows },
    { name: "คะแนนสอบ", rows: examRows },
  ];
  const created = generatedAt.toISOString();
  const files: Record<string, string> = {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${sheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("\n  ")}
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`,
    "docProps/core.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>รายงานคะแนน Lab EDU</dc:title><dc:creator>Lab EDU</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${created}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${created}</dcterms:modified>
</cp:coreProperties>`,
    "docProps/app.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Lab EDU</Application></Properties>`,
    "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((sheet, index) => `<sheet name="${xmlEscape(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("")}</sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    "xl/styles.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2"><font><sz val="11"/><name val="Noto Sans Thai"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Noto Sans Thai"/></font></fonts>
  <fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF6658E8"/><bgColor indexed="64"/></patternFill></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf></cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`,
  };
  sheets.forEach((sheet, index) => {
    files[`xl/worksheets/sheet${index + 1}.xml`] = worksheetXml(sheet.rows);
  });
  return zipFiles(files, generatedAt);
}

const safeFilePart = (value: string) =>
  value.trim().replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-");

export function downloadScoreWorkbook(
  data: ScoreExportData,
  filters: ScoreExportFilters,
  labels: { classroom: string; subject: string },
) {
  const workbook = createScoreWorkbook(data, filters);
  const blob = new Blob([workbook.buffer.slice(0) as ArrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `คะแนน-${safeFilePart(labels.classroom)}-${safeFilePart(labels.subject)}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}
