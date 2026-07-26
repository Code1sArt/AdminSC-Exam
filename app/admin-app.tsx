"use client";

import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  BrainCircuit,
  Building2,
  ChevronDown,
  CircleHelp,
  CircleDollarSign,
  ClipboardCheck,
  FileQuestion,
  Eye,
  GraduationCap,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Menu,
  NotebookPen,
  Plus,
  PencilLine,
  RefreshCw,
  RotateCcw,
  School,
  Search,
  Settings,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Trash2,
  Upload,
  UserRoundPlus,
  Users,
  X,
} from "lucide-react";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Swal from "sweetalert2";
import { ApiError, api, jsonBody } from "../lib/api";

type PageKey =
  | "dashboard"
  | "students"
  | "teachers"
  | "classrooms"
  | "subjects"
  | "questions"
  | "exams"
  | "assignments"
  | "grades"
  | "results"
  | "exam-locks"
  | "ai"
  | "organizations"
  | "ai-models"
  | "ai-usage"
  | "settings";
type ModalKind =
  | "student"
  | "teacher"
  | "classroom"
  | "subject"
  | "indicator"
  | "generate"
  | "exam"
  | "assignment"
  | "organization"
  | null;

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organization: { id: string; name: string; code: string };
}

interface DashboardData {
  totals: {
    classrooms: number;
    students: number;
    questions: number;
    exams: number;
  };
  studentGroups: Record<string, number>;
  students: Array<{
    id: string;
    studentCode: string;
    name: string;
    average: number | null;
    group: string;
  }>;
  recentExams: Array<{
    id: string;
    title: string;
    classroom: string;
    subject: string;
    status: string;
    submissions: number;
    average: number | null;
  }>;
}

interface Subject {
  id: string;
  code: string;
  name: string;
  _count?: {
    indicators: number;
    questions: number;
    exams: number;
    assignments: number;
  };
}

interface Indicator {
  id: string;
  code: string;
  description: string;
  gradeLevel?: string;
  subject: Subject;
  _count?: { questions: number };
}

interface Classroom {
  id: string;
  name: string;
  gradeLevel?: string;
  academicYear: string;
  teacher: { id: string; firstName: string; lastName: string };
  _count: { enrollments: number; exams: number };
}

interface Student {
  id: string;
  studentCode: string;
  gradeLevel?: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
  };
  enrollments: Array<{ classroom: { id: string; name: string } }>;
}

interface Teacher {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  _count: { taughtClasses: number };
}

interface Question {
  id: string;
  type: string;
  difficulty: string;
  prompt: string;
  source: string;
  subject: Subject;
  indicator?: Indicator;
  maxScore: string | number;
  options?: Array<{ id: string; text: string }> | null;
  answerKey?: Record<string, unknown>;
  explanation?: string | null;
  tags?: string[] | null;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: { firstName: string; lastName: string; email: string };
  _count?: { examItems: number; remedialQuestions: number };
}

interface QuestionFilters {
  subjectId: string;
  indicatorId: string;
  type: string;
  difficulty: string;
  search: string;
}

interface QuestionMeta {
  page: number;
  limit: number;
  total: number;
}

interface Exam {
  id: string;
  title: string;
  status: string;
  isAdaptive: boolean;
  durationMinutes?: number;
  classroom: { id: string; name: string };
  subject: { id: string; name: string };
  _count: { items: number; attempts: number };
}

interface ExamAnalysis {
  id: string;
  title: string;
  classroom: string;
  subject: string;
  distribution: { strong: number; average: number; needsSupport: number };
  students: Array<{
    attemptId: string;
    studentCode: string;
    name: string;
    percentage: string | number | null;
  }>;
  questions: Array<{ questionId: string; correctRate: number }>;
}

interface AcademicRecords {
  gradeScale: Record<string, number>;
  classrooms: Array<{
    classroom: {
      id: string;
      name: string;
      gradeLevel?: string | null;
      academicYear: string;
    };
    subjects: Array<{
      subject: { id: string; code: string; name: string };
      students: Array<{
        id: string;
        studentCode: string;
        name: string;
        examScore: number;
        examMaxScore: number;
        examCount: number;
        assignmentScore: number;
        assignmentMaxScore: number;
        assignmentCount: number;
        examResults: Array<{
          id: string;
          title: string;
          score: number;
          maxScore: number;
        }>;
        assignmentResults: Array<{
          id: string;
          title: string;
          score: number;
          maxScore: number;
        }>;
        score: number;
        maxScore: number;
        percentage: number | null;
        grade: string | null;
      }>;
    }>;
  }>;
}

interface AssignmentSubmission {
  id: string;
  content?: string | null;
  attachmentUrl?: string | null;
  attachmentUrls?: string[] | null;
  status: "SUBMITTED" | "GRADED";
  score?: string | number | null;
  feedback?: string | null;
  grade?: string | null;
  assessment?: string | null;
  submittedAt: string;
  groupName?: string | null;
  gradingMode?: "SHARED" | "INDIVIDUAL" | null;
  members?: Array<{
    studentId: string;
    role: string;
    score?: string | number | null;
    feedback?: string | null;
    student: {
      id: string;
      studentCode: string;
      user: { firstName: string; lastName: string };
    };
  }>;
  student: {
    id: string;
    studentCode: string;
    user: { firstName: string; lastName: string };
  };
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  maxScore: string | number;
  dueAt: string;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  type: "GENERAL" | "CODE";
  codeLanguage?: "C" | "CPP" | "CSHARP" | "PYTHON" | null;
  aiGradingEnabled: boolean;
  aiGradingModel?: string | null;
  isGroupWork: boolean;
  minGroupSize: number;
  maxGroupSize: number;
  classroom: { id: string; name: string };
  subject: { id: string; name: string };
  students: Array<{
    id: string;
    studentCode: string;
    user: { firstName: string; lastName: string };
  }>;
  submissions: AssignmentSubmission[];
  _count: { submissions: number };
}

interface LockedAttempt {
  id: string;
  attemptNumber: number;
  lockedAt: string;
  lockReason: string;
  violationCount: number;
  lastViolationAt: string;
  exam: {
    id: string;
    title: string;
    classroom: { id: string; name: string };
    subject: { id: string; name: string };
  };
  student: {
    studentCode: string;
    user: { firstName: string; lastName: string };
  };
}

interface AiStatusData {
  mockMode: boolean;
  studentAiEnabled: boolean;
  services: Array<{
    id: string;
    provider: string;
    purpose: string;
    model: string;
    configured: boolean;
    active: boolean;
    mode: "MOCK" | "LIVE" | "NOT_CONFIGURED";
  }>;
}

interface Organization {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  aiGenerationModel?: string | null;
  aiReasoningModel?: string | null;
  aiReportModel?: string | null;
  studentAiEnabled?: boolean;
  users: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  }>;
  _count: { users: number; classrooms: number; exams: number };
}

interface AiCatalogModel {
  id: string;
  provider: "OPENAI" | "GOOGLE";
  name: string;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
  contextLength: number | null;
}

interface AiUsageModel {
  model: string;
  provider: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  estimatedCostThb: number;
  unknownCostRequests: number;
}

interface AiUsageOrganization {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  aiMonthlyTokenBudget: number;
  requests: number;
  successfulRequests: number;
  failedRequests: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  remainingTokens: number;
  usagePercent: number;
  estimatedCostUsd: number;
  estimatedCostThb: number;
  unknownCostRequests: number;
  byModel: AiUsageModel[];
}

interface AiUsageData {
  periodStart: string;
  periodEnd: string;
  priceCatalogAvailable: boolean;
  exchangeRateAvailable: boolean;
  exchangeRate: {
    base: "USD";
    quote: "THB";
    rate: number;
    date: string;
    source: string;
    cached: boolean;
  } | null;
  totals: {
    requests: number;
    successfulRequests: number;
    failedRequests: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    totalBudget: number;
    remainingTokens: number;
    estimatedCostUsd: number;
    estimatedCostThb: number;
    unknownCostRequests: number;
    byModel: AiUsageModel[];
  };
  organizations: AiUsageOrganization[];
}

const navigation: Array<{
  section: string;
  items: Array<{
    key: PageKey;
    label: string;
    icon: typeof LayoutDashboard;
    roles: string[];
  }>;
}> = [
  {
    section: "ผู้ดูแลสูงสุด",
    items: [
      {
        key: "organizations",
        label: "จัดการองค์กร",
        icon: Building2,
        roles: ["SUPER_ADMIN"],
      },
      {
        key: "ai-models",
        label: "ตั้งค่าโมเดล AI",
        icon: Bot,
        roles: ["SUPER_ADMIN"],
      },
      {
        key: "ai-usage",
        label: "การใช้งาน AI",
        icon: CircleDollarSign,
        roles: ["SUPER_ADMIN"],
      },
    ],
  },
  {
    section: "ภาพรวม",
    items: [
      {
        key: "dashboard",
        label: "แดชบอร์ด",
        icon: LayoutDashboard,
        roles: ["ADMIN", "TEACHER"],
      },
      {
        key: "ai",
        label: "AI Insights",
        icon: Sparkles,
        roles: ["ADMIN", "TEACHER"],
      },
    ],
  },
  {
    section: "การจัดการ",
    items: [
      {
        key: "students",
        label: "นักเรียนของฉัน",
        icon: GraduationCap,
        roles: ["TEACHER"],
      },
      {
        key: "students",
        label: "นักเรียน",
        icon: GraduationCap,
        roles: ["ADMIN"],
      },
      { key: "teachers", label: "ครูผู้สอน", icon: Users, roles: ["ADMIN"] },
      {
        key: "classrooms",
        label: "ห้องเรียน",
        icon: School,
        roles: ["ADMIN", "TEACHER"],
      },
      {
        key: "subjects",
        label: "วิชาและตัวชี้วัด",
        icon: BookOpen,
        roles: ["ADMIN", "TEACHER"],
      },
    ],
  },
  {
    section: "การวัดผล",
    items: [
      {
        key: "questions",
        label: "ธนาคารข้อสอบ",
        icon: FileQuestion,
        roles: ["ADMIN", "TEACHER"],
      },
      {
        key: "exams",
        label: "ชุดข้อสอบ",
        icon: ClipboardCheck,
        roles: ["ADMIN", "TEACHER"],
      },
      {
        key: "assignments",
        label: "งานและการให้คะแนน",
        icon: NotebookPen,
        roles: ["ADMIN", "TEACHER"],
      },
      {
        key: "grades",
        label: "ผลการเรียน",
        icon: GraduationCap,
        roles: ["ADMIN", "TEACHER"],
      },
      {
        key: "results",
        label: "ผลสอบและวิเคราะห์",
        icon: BarChart3,
        roles: ["ADMIN", "TEACHER"],
      },
      {
        key: "exam-locks",
        label: "ปลดล็อกการสอบ",
        icon: LockKeyhole,
        roles: ["ADMIN", "TEACHER"],
      },
    ],
  },
  {
    section: "ระบบ",
    items: [
      {
        key: "settings",
        label: "ตั้งค่า",
        icon: Settings,
        roles: ["ADMIN", "TEACHER"],
      },
    ],
  },
];

const pageTitles: Record<PageKey, { title: string; subtitle: string }> = {
  dashboard: {
    title: "ภาพรวมระบบ",
    subtitle: "ติดตามผลการเรียนรู้และการใช้งานล่าสุด",
  },
  students: {
    title: "จัดการนักเรียน",
    subtitle: "เพิ่ม นำเข้า และจัดนักเรียนเข้าห้องเรียน",
  },
  teachers: {
    title: "จัดการครูผู้สอน",
    subtitle: "ดูแลบัญชีครูและภาระห้องเรียน",
  },
  classrooms: { title: "ห้องเรียน", subtitle: "จัดการชั้นเรียนและปีการศึกษา" },
  subjects: {
    title: "วิชาและตัวชี้วัด",
    subtitle: "กำหนดโครงสร้างเนื้อหาเพื่อสร้างข้อสอบอย่างแม่นยำ",
  },
  questions: { title: "ธนาคารข้อสอบ", subtitle: "สร้างและจัดการข้อสอบด้วย AI" },
  exams: {
    title: "ชุดข้อสอบออนไลน์",
    subtitle: "เผยแพร่และติดตามการสอบแบบปรับระดับ",
  },
  assignments: {
    title: "งานและการให้คะแนน",
    subtitle: "มอบหมายงาน รับงาน และตัดเกรดนักเรียน",
  },
  grades: {
    title: "ผลการเรียน",
    subtitle: "คะแนนรวมและเกรดนักเรียน แยกตามห้องเรียนและรายวิชา",
  },
  results: {
    title: "ผลสอบและวิเคราะห์",
    subtitle: "ติดตามคะแนนและกลุ่มผู้เรียนจากการสอบ",
  },
  "exam-locks": {
    title: "ปลดล็อกการสอบ",
    subtitle: "ตรวจสอบเหตุการณ์ผิดปกติและอนุญาตให้นักเรียนทำข้อสอบต่อ",
  },
  ai: { title: "AI Insights", subtitle: "มุมมองอัจฉริยะเพื่อช่วยวางแผนการสอน" },
  organizations: {
    title: "จัดการองค์กร",
    subtitle: "เพิ่ม แก้ไข และควบคุมการใช้งานแต่ละองค์กร",
  },
  "ai-models": {
    title: "ตั้งค่าโมเดล AI",
    subtitle: "กำหนดโมเดล AI แยกตามองค์กร",
  },
  "ai-usage": {
    title: "การใช้งาน AI",
    subtitle: "ติดตาม token คงเหลือและค่าใช้จ่ายรายเดือน",
  },
  settings: {
    title: "ตั้งค่าระบบ",
    subtitle: "ข้อมูลโรงเรียนและการเชื่อมต่อระบบ",
  },
};

const teacherPageTitles: Partial<
  Record<PageKey, { title: string; subtitle: string }>
> = {
  dashboard: {
    title: "ภาพรวมการสอน",
    subtitle: "ติดตามห้องเรียน นักเรียน และผลการสอบของคุณ",
  },
  students: {
    title: "นักเรียนของฉัน",
    subtitle: "ดูแลนักเรียนในห้องเรียนที่คุณรับผิดชอบ",
  },
  classrooms: {
    title: "ห้องเรียนของฉัน",
    subtitle: "จัดการชั้นเรียนและนักเรียนที่คุณดูแล",
  },
  exams: {
    title: "ชุดข้อสอบของฉัน",
    subtitle: "สร้าง เผยแพร่ และติดตามการสอบของคุณ",
  },
  assignments: {
    title: "งานของฉัน",
    subtitle: "สร้างงาน ตรวจงาน และให้คะแนนนักเรียน",
  },
  grades: {
    title: "ผลการเรียนของนักเรียน",
    subtitle: "ดูคะแนนสอบ คะแนนงาน และเกรดรายวิชาในห้องที่คุณดูแล",
  },
  results: {
    title: "ผลสอบของนักเรียน",
    subtitle: "วิเคราะห์ผลสอบจากชุดข้อสอบที่คุณสร้าง",
  },
  "exam-locks": {
    title: "ปลดล็อกการสอบ",
    subtitle: "จัดการนักเรียนที่ถูกล็อกจากชุดข้อสอบของคุณ",
  },
  settings: {
    title: "ตั้งค่าบัญชี",
    subtitle: "แก้ไขข้อมูลส่วนตัวและรหัสผ่านของคุณ",
  },
};

const questionTypeLabel: Record<string, string> = {
  MULTIPLE_CHOICE: "ปรนัย",
  TRUE_FALSE: "ถูก / ผิด",
  SHORT_ANSWER: "ตอบสั้น",
  ESSAY: "อัตนัย",
  FILL_IN_BLANK: "เติมคำ",
};

const difficultyLabel: Record<string, string> = {
  VERY_EASY: "ง่ายมาก",
  EASY: "ง่าย",
  MEDIUM: "ปานกลาง",
  HARD: "ยาก",
  VERY_HARD: "ยากมาก",
};

const questionImportExample = {
  questions: [
    {
      prompt: "ข้อใดมีค่าเท่ากับ 1/2",
      options: [
        { id: "A", text: "2/3" },
        { id: "B", text: "2/4" },
        { id: "C", text: "3/4" },
        { id: "D", text: "1/3" },
      ],
      answerKey: { correctOptionId: "B" },
      explanation: "2/4 ย่อส่วนด้วย 2 ได้ 1/2",
      maxScore: 1,
      tags: ["เศษส่วน"],
    },
    {
      prompt: "ข้อใดมีค่าเท่ากับ 3/4",
      options: [
        { id: "A", text: "3/5" },
        { id: "B", text: "6/8" },
        { id: "C", text: "4/3" },
        { id: "D", text: "2/5" },
      ],
      answerKey: { correctOptionId: "B" },
      explanation: "6/8 ย่อส่วนด้วย 2 ได้ 3/4",
      maxScore: 1,
      tags: ["เศษส่วน"],
    },
  ],
};

const studentImportExample = [
  ["student_code", "first_name", "last_name", "email", "password", "grade_level"],
  ["STU001", "สมชาย", "ใจดี", "stu001@example.com", "Student123!", "ม.1"],
  ["STU002", "สมหญิง", "เรียนเก่ง", "stu002@example.com", "Student123!", "ม.1"],
];

export function AdminApp() {
  const [token, setToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [page, setPage] = useState<PageKey>("dashboard");
  const [mobileNav, setMobileNav] = useState(false);
  const [modal, setModal] = useState<ModalKind>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionFilters, setQuestionFilters] = useState<QuestionFilters>({
    subjectId: "",
    indicatorId: "",
    type: "",
    difficulty: "",
    search: "",
  });
  const [questionMeta, setQuestionMeta] = useState<QuestionMeta>({
    page: 1,
    limit: 20,
    total: 0,
  });
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(
    new Set(),
  );
  const [exams, setExams] = useState<Exam[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [gradeScale, setGradeScale] = useState<Record<string, number>>({
    A: 80,
    B: 70,
    C: 60,
    D: 50,
    F: 0,
  });
  const [examAnalysis, setExamAnalysis] = useState<ExamAnalysis | null>(null);
  const [academicRecords, setAcademicRecords] =
    useState<AcademicRecords | null>(null);
  const [resettingAttemptId, setResettingAttemptId] = useState<string | null>(
    null,
  );
  const [lockedAttempts, setLockedAttempts] = useState<LockedAttempt[]>([]);
  const [unlockingAttemptId, setUnlockingAttemptId] = useState<string | null>(
    null,
  );
  const [aiStatus, setAiStatus] = useState<AiStatusData | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [aiModelCatalog, setAiModelCatalog] = useState<AiCatalogModel[]>([]);
  const [aiUsage, setAiUsage] = useState<AiUsageData | null>(null);
  const [editingOrganization, setEditingOrganization] =
    useState<Organization | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(
    null,
  );
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [editingIndicator, setEditingIndicator] = useState<Indicator | null>(
    null,
  );
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(
    null,
  );
  const [questionDialog, setQuestionDialog] = useState<{
    mode: "view" | "edit" | "create";
    question: Question;
  } | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const questionSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [questionImportOpen, setQuestionImportOpen] = useState(false);

  /* Session hydration and API loading intentionally synchronize external state. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setToken(sessionStorage.getItem("lab_edu_admin_token"));
    setHydrated(true);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem("lab_edu_admin_token");
    setToken(null);
    setProfile(null);
    setDashboard(null);
  }, []);

  const confirmLogout = async () => {
    const answer = await Swal.fire({
      icon: "question",
      title: "ออกจากระบบ?",
      text: "คุณจะต้องเข้าสู่ระบบอีกครั้งเพื่อใช้งานต่อ",
      showCancelButton: true,
      confirmButtonText: "ออกจากระบบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#d65b65",
    });
    if (answer.isConfirmed) logout();
  };

  const questionQuery = (targetPage: number, filters: QuestionFilters) => {
    const params = new URLSearchParams({
      page: String(targetPage),
      limit: "20",
    });
    Object.entries(filters).forEach(
      ([key, value]) => value && params.set(key, value),
    );
    return params.toString();
  };

  const loadQuestionRows = async (
    targetPage: number,
    filters: QuestionFilters,
  ) => {
    if (!token) return;
    setRefreshing(true);
    try {
      const result = await api<{ data: Question[]; meta: QuestionMeta }>(
        `/questions?${questionQuery(targetPage, filters)}`,
        {},
        token,
      );
      setQuestions(result.data);
      setQuestionMeta(result.meta);
      setSelectedQuestionIds(new Set());
    } catch (error) {
      await showError(error);
    } finally {
      setRefreshing(false);
    }
  };

  const applyQuestionFilters = (next: QuestionFilters) => {
    if (questionSearchTimer.current) clearTimeout(questionSearchTimer.current);
    setQuestionFilters(next);
    setSearch(next.search);
    setQuestionMeta((current) => ({ ...current, page: 1 }));
    void loadQuestionRows(1, next);
  };

  const changeQuestionPage = (nextPage: number) => {
    setQuestionMeta((current) => ({ ...current, page: nextPage }));
    void loadQuestionRows(nextPage, questionFilters);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (page !== "questions") return;
    const next = { ...questionFilters, search: value };
    setQuestionFilters(next);
    if (questionSearchTimer.current) clearTimeout(questionSearchTimer.current);
    questionSearchTimer.current = setTimeout(() => {
      setQuestionMeta((current) => ({ ...current, page: 1 }));
      void loadQuestionRows(1, next);
    }, 350);
  };

  const loadPage = useCallback(
    async (target: PageKey, silent = false) => {
      if (!token) return;
      if (silent) setRefreshing(true);
      else setLoading(true);
      try {
        let currentProfile = profile;
        if (!currentProfile) {
          currentProfile = await api<UserProfile>("/auth/me", {}, token);
          setProfile(currentProfile);
        }
        if (target === "dashboard") {
          setDashboard(
            await api<DashboardData>("/analytics/dashboard", {}, token),
          );
        } else if (target === "ai") {
          const [dashboardData, statusData] = await Promise.all([
            api<DashboardData>("/analytics/dashboard", {}, token),
            api<AiStatusData>("/ai/status", {}, token),
          ]);
          setDashboard(dashboardData);
          setAiStatus(statusData);
        } else if (target === "students") {
          const [studentRows, classRows] = await Promise.all([
            api<Student[]>("/academic/students", {}, token),
            api<Classroom[]>("/academic/classrooms", {}, token),
          ]);
          setStudents(studentRows);
          setClassrooms(classRows);
        } else if (target === "teachers") {
          setTeachers(await api<Teacher[]>("/academic/teachers", {}, token));
        } else if (target === "classrooms") {
          if (currentProfile.role === "ADMIN") {
            const [classRows, teacherRows] = await Promise.all([
              api<Classroom[]>("/academic/classrooms", {}, token),
              api<Teacher[]>("/academic/teachers", {}, token),
            ]);
            setClassrooms(classRows);
            setTeachers(teacherRows);
          } else {
            setClassrooms(
              await api<Classroom[]>("/academic/classrooms", {}, token),
            );
            setTeachers([]);
          }
        } else if (target === "subjects") {
          const [subjectRows, indicatorRows] = await Promise.all([
            api<Subject[]>("/academic/subjects", {}, token),
            api<Indicator[]>("/academic/indicators", {}, token),
          ]);
          setSubjects(subjectRows);
          setIndicators(indicatorRows);
        } else if (target === "questions") {
          const [questionResult, subjectRows, indicatorRows] =
            await Promise.all([
              api<{ data: Question[]; meta: QuestionMeta }>(
                `/questions?${questionQuery(questionMeta.page, questionFilters)}`,
                {},
                token,
              ),
              api<Subject[]>("/academic/subjects", {}, token),
              api<Indicator[]>("/academic/indicators", {}, token),
            ]);
          setQuestions(questionResult.data);
          setQuestionMeta(questionResult.meta);
          setSelectedQuestionIds(new Set());
          setSubjects(subjectRows);
          setIndicators(indicatorRows);
        } else if (target === "exams") {
          const [examRows, classRows, subjectRows, questionResult] =
            await Promise.all([
              api<Exam[]>("/exams", {}, token),
              api<Classroom[]>("/academic/classrooms", {}, token),
              api<Subject[]>("/academic/subjects", {}, token),
              api<{ data: Question[] }>("/questions?limit=100", {}, token),
            ]);
          setExams(examRows);
          setClassrooms(classRows);
          setSubjects(subjectRows);
          setQuestions(questionResult.data);
        } else if (target === "assignments") {
          const [assignmentRows, classRows, subjectRows, scale, statusData] =
            await Promise.all([
              api<Assignment[]>("/assignments", {}, token),
              api<Classroom[]>("/academic/classrooms", {}, token),
              api<Subject[]>("/academic/subjects", {}, token),
              api<Record<string, number>>(
                "/assignments/grade-scale",
                {},
                token,
              ),
              api<AiStatusData>("/ai/status", {}, token),
            ]);
          setAssignments(assignmentRows);
          setClassrooms(classRows);
          setSubjects(subjectRows);
          setGradeScale(scale);
          setAiStatus(statusData);
        } else if (target === "results") {
          const examRows = await api<Exam[]>("/exams", {}, token);
          setExams(examRows);
          setExamAnalysis(
            examRows[0]
              ? await api<ExamAnalysis>(
                  `/analytics/exams/${examRows[0].id}`,
                  {},
                  token,
                )
              : null,
          );
        } else if (target === "grades") {
          setAcademicRecords(await api<AcademicRecords>("/records", {}, token));
        } else if (target === "exam-locks") {
          setLockedAttempts(
            await api<LockedAttempt[]>("/exams/locked-attempts", {}, token),
          );
        } else if (target === "settings") {
          setAiStatus(await api<AiStatusData>("/ai/status", {}, token));
        } else if (target === "organizations") {
          setOrganizations(
            await api<Organization[]>("/platform/organizations", {}, token),
          );
        } else if (target === "ai-models") {
          const [organizationRows, catalog] = await Promise.all([
            api<Organization[]>("/platform/organizations", {}, token),
            api<{ models: AiCatalogModel[] }>(
              "/platform/ai-models/catalog",
              {},
              token,
            ),
          ]);
          setOrganizations(organizationRows);
          setAiModelCatalog(catalog.models);
        } else if (target === "ai-usage") {
          setAiUsage(await api<AiUsageData>("/platform/ai-usage", {}, token));
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          logout();
          return;
        }
        await showError(error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [logout, profile, questionFilters, questionMeta.page, token],
  );

  useEffect(() => {
    if (token) void loadPage(page);
  }, [page, token]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!token || page !== "exam-locks") return;
    const timer = window.setInterval(() => {
      void api<LockedAttempt[]>("/exams/locked-attempts", {}, token)
        .then(setLockedAttempts)
        .catch(() => undefined);
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [page, token]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const filteredStudents = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("th-TH");
    if (!keyword) return students;
    return students.filter((student) =>
      `${student.studentCode} ${student.user.firstName} ${student.user.lastName} ${student.user.email}`
        .toLocaleLowerCase("th-TH")
        .includes(keyword),
    );
  }, [search, students]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    try {
      const result = await api<{ accessToken: string }>(
        "/auth/login",
        jsonBody({ identifier: form.get("identifier"), password: form.get("password") }),
      );
      sessionStorage.setItem("lab_edu_admin_token", result.accessToken);
      setToken(result.accessToken);
      await Swal.fire({
        icon: "success",
        title: "เข้าสู่ระบบสำเร็จ",
        timer: 1100,
        showConfirmButton: false,
      });
    } catch (error) {
      await showError(error);
    } finally {
      setLoading(false);
    }
  };

  const submitModal = async (
    kind: Exclude<ModalKind, null>,
    data: FormData,
  ) => {
    if (!token) return;
    setLoading(true);
    try {
      if (kind === "student") {
        await api(
          editingStudent
            ? `/academic/students/${editingStudent.id}`
            : "/academic/students",
          {
            ...jsonBody({
              firstName: data.get("firstName"),
              lastName: data.get("lastName"),
              email: data.get("email"),
              password: data.get("password") || undefined,
              studentCode: data.get("studentCode"),
              gradeLevel: data.get("gradeLevel") || undefined,
              classroomId:
                data.get("classroomId") || (editingStudent ? null : undefined),
            }),
            method: editingStudent ? "PATCH" : "POST",
          },
          token,
        );
      } else if (kind === "teacher") {
        await api(
          "/academic/teachers",
          jsonBody({
            firstName: data.get("firstName"),
            lastName: data.get("lastName"),
            email: data.get("email"),
            password: data.get("password"),
          }),
          token,
        );
      } else if (kind === "classroom") {
        await api(
          editingClassroom
            ? `/academic/classrooms/${editingClassroom.id}`
            : "/academic/classrooms",
          {
            ...jsonBody({
              name: data.get("name"),
              gradeLevel: data.get("gradeLevel") || undefined,
              academicYear: data.get("academicYear"),
              teacherId: data.get("teacherId") || undefined,
            }),
            method: editingClassroom ? "PATCH" : "POST",
          },
          token,
        );
      } else if (kind === "subject") {
        await api(
          editingSubject
            ? `/academic/subjects/${editingSubject.id}`
            : "/academic/subjects",
          {
            ...jsonBody({ code: data.get("code"), name: data.get("name") }),
            method: editingSubject ? "PATCH" : "POST",
          },
          token,
        );
      } else if (kind === "indicator") {
        await api(
          editingIndicator
            ? `/academic/indicators/${editingIndicator.id}`
            : "/academic/indicators",
          {
            ...jsonBody({
              subjectId: data.get("subjectId"),
              code: data.get("code"),
              description: data.get("description"),
              gradeLevel: data.get("gradeLevel") || undefined,
            }),
            method: editingIndicator ? "PATCH" : "POST",
          },
          token,
        );
      } else if (kind === "generate") {
        await api(
          "/questions/generate",
          jsonBody({
            subjectId: data.get("subjectId"),
            indicatorId: data.get("indicatorId") || undefined,
            instruction: data.get("instruction") || undefined,
            count: Number(data.get("count")),
            types: [data.get("type")],
            difficulty: data.get("difficulty"),
            language: "ไทย",
          }),
          token,
        );
      } else if (kind === "exam") {
        const selected = data.getAll("questionIds").map(String);
        if (!selected.length)
          throw new Error("กรุณาเลือกข้อสอบอย่างน้อย 1 ข้อ");
        await api(
          "/exams",
          jsonBody({
            title: data.get("title"),
            classroomId: data.get("classroomId"),
            subjectId: data.get("subjectId"),
            durationMinutes: Number(data.get("durationMinutes")) || undefined,
            maxAttempts: 1,
            isAdaptive: data.get("isAdaptive") === "on",
            items: selected.map((questionId) => ({ questionId, score: 1 })),
          }),
          token,
        );
      } else if (kind === "assignment") {
        await api(
          editingAssignment
            ? `/assignments/${editingAssignment.id}`
            : "/assignments",
          {
            ...jsonBody({
              title: data.get("title"),
              description: data.get("description"),
              classroomId: data.get("classroomId"),
              subjectId: data.get("subjectId"),
              maxScore: Number(data.get("maxScore")),
              dueAt: new Date(String(data.get("dueAt"))).toISOString(),
              status: data.get("status"),
              type: data.get("type"),
              codeLanguage:
                data.get("type") === "CODE"
                  ? data.get("codeLanguage")
                  : undefined,
              aiGradingEnabled:
                data.get("type") === "CODE" &&
                data.get("aiGradingEnabled") === "on",
              aiGradingModel:
                data.get("type") === "CODE" &&
                data.get("aiGradingEnabled") === "on"
                  ? data.get("aiGradingModel")
                  : undefined,
              isGroupWork: data.get("isGroupWork") === "on",
              minGroupSize:
                data.get("isGroupWork") === "on"
                  ? Number(data.get("minGroupSize"))
                  : undefined,
              maxGroupSize:
                data.get("isGroupWork") === "on"
                  ? Number(data.get("maxGroupSize"))
                  : undefined,
            }),
            method: editingAssignment ? "PATCH" : "POST",
          },
          token,
        );
      } else if (kind === "organization") {
        await api(
          editingOrganization
            ? `/platform/organizations/${editingOrganization.id}`
            : "/platform/organizations",
          {
            ...jsonBody(
              editingOrganization
                ? {
                    name: data.get("name"),
                    code: data.get("code"),
                    isActive: data.get("isActive") === "on",
                  }
                : {
                    name: data.get("name"),
                    code: data.get("code"),
                    adminFirstName: data.get("adminFirstName"),
                    adminLastName: data.get("adminLastName"),
                    adminEmail: data.get("adminEmail"),
                    adminPassword: data.get("adminPassword"),
                  },
            ),
            method: editingOrganization ? "PATCH" : "POST",
          },
          token,
        );
      }
      setModal(null);
      setEditingStudent(null);
      setEditingClassroom(null);
      setEditingSubject(null);
      setEditingIndicator(null);
      setEditingAssignment(null);
      setEditingOrganization(null);
      await Swal.fire({
        icon: "success",
        title:
          kind === "generate"
            ? "AI สร้างข้อสอบเรียบร้อย"
            : "บันทึกข้อมูลเรียบร้อย",
        timer: 1300,
        showConfirmButton: false,
      });
      await loadPage(page, true);
    } catch (error) {
      await showError(error);
    } finally {
      setLoading(false);
    }
  };

  const createQuestion = async (payload: Record<string, unknown>) => {
    if (!token) return;
    setLoading(true);
    try {
      await api<Question>(
        "/questions",
        jsonBody({ ...payload, indicatorId: payload.indicatorId || undefined }),
        token,
      );
      setQuestionDialog(null);
      await loadPage("questions", true);
      await Swal.fire({
        icon: "success",
        title: "เพิ่มข้อสอบเข้าธนาคารแล้ว",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (error) {
      await showError(error);
    } finally {
      setLoading(false);
    }
  };

  const openManualQuestion = () => {
    if (!subjects[0]) {
      void Swal.fire({
        icon: "warning",
        title: "กรุณาเพิ่มรายวิชาก่อนสร้างข้อสอบ",
      });
      return;
    }
    setQuestionDialog({
      mode: "create",
      question: {
        id: "",
        type: "MULTIPLE_CHOICE",
        difficulty: "MEDIUM",
        prompt: "",
        source: "MANUAL",
        subject: subjects[0],
        maxScore: 1,
        options: [
          { id: "A", text: "" },
          { id: "B", text: "" },
        ],
        answerKey: { correctOptionId: "A" },
      },
    });
  };

  const deleteStudent = async (student: Student) => {
    if (!token) return;
    const answer = await Swal.fire({
      icon: "warning",
      title: `ลบนักเรียน ${student.user.firstName} ${student.user.lastName}?`,
      text: "บัญชีและการเป็นสมาชิกห้องจะถูกปิด แต่ประวัติการสอบและคะแนนจะยังอยู่",
      showCancelButton: true,
      confirmButtonText: "ลบนักเรียน",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#d65b65",
    });
    if (!answer.isConfirmed) return;
    try {
      await api(
        `/academic/students/${student.id}`,
        { method: "DELETE" },
        token,
      );
      setStudents((current) =>
        current.filter((item) => item.id !== student.id),
      );
      await Swal.fire({
        icon: "success",
        title: "ลบนักเรียนแล้ว",
        timer: 1000,
        showConfirmButton: false,
      });
    } catch (error) {
      await showError(error);
    }
  };

  const deleteClassroom = async (room: Classroom) => {
    if (!token) return;
    const answer = await Swal.fire({
      icon: "warning",
      title: `ลบห้องเรียน ${room.name}?`,
      html: `นักเรียนในห้อง <b>${room._count.enrollments} คน</b> จะถูกนำออกและปิดบัญชี<br>ระบบจะเก็บเฉพาะประวัติการสอบและคะแนนเดิม`,
      showCancelButton: true,
      confirmButtonText: "ลบห้องเรียนและนักเรียน",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#d65b65",
    });
    if (!answer.isConfirmed) return;
    try {
      await api(`/academic/classrooms/${room.id}`, { method: "DELETE" }, token);
      setClassrooms((current) => current.filter((item) => item.id !== room.id));
      await Swal.fire({
        icon: "success",
        title: "ลบห้องเรียนแล้ว",
        text: "ประวัติและคะแนนยังคงอยู่",
        timer: 1400,
        showConfirmButton: false,
      });
    } catch (error) {
      await showError(error);
    }
  };

  const deleteSubject = async (subject: Subject) => {
    if (!token) return;
    const answer = await Swal.fire({
      icon: "warning",
      title: `ลบวิชา ${subject.name}?`,
      html:
        subject._count?.questions ||
        subject._count?.exams ||
        subject._count?.assignments
          ? `วิชานี้มีข้อสอบ <b>${subject._count?.questions ?? 0} ข้อ</b> ชุดสอบ <b>${subject._count?.exams ?? 0} ชุด</b> และงาน <b>${subject._count?.assignments ?? 0} งาน</b><br>ต้องนำข้อมูลที่ใช้งานอยู่ออกก่อนจึงจะลบวิชาได้`
          : `ตัวชี้วัดในวิชานี้ <b>${subject._count?.indicators ?? 0} รายการ</b> จะถูกลบไปด้วย`,
      showCancelButton: true,
      showConfirmButton: !(
        subject._count?.questions ||
        subject._count?.exams ||
        subject._count?.assignments
      ),
      confirmButtonText: "ลบวิชา",
      cancelButtonText:
        subject._count?.questions ||
        subject._count?.exams ||
        subject._count?.assignments
          ? "รับทราบ"
          : "ยกเลิก",
      confirmButtonColor: "#d65b65",
    });
    if (!answer.isConfirmed) return;
    try {
      await api(
        `/academic/subjects/${subject.id}`,
        { method: "DELETE" },
        token,
      );
      await loadPage("subjects", true);
      await Swal.fire({
        icon: "success",
        title: "ลบวิชาแล้ว",
        timer: 1000,
        showConfirmButton: false,
      });
    } catch (error) {
      await showError(error);
    }
  };

  const deleteIndicator = async (indicator: Indicator) => {
    if (!token) return;
    const answer = await Swal.fire({
      icon: "warning",
      title: `ลบตัวชี้วัด ${indicator.code}?`,
      text: indicator._count?.questions
        ? `ข้อสอบ ${indicator._count.questions} ข้อจะยังอยู่ แต่จะไม่ผูกกับตัวชี้วัดนี้อีก`
        : "เมื่อลบแล้วจะไม่สามารถเรียกคืนข้อมูลตัวชี้วัดนี้ได้",
      showCancelButton: true,
      confirmButtonText: "ลบตัวชี้วัด",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#d65b65",
    });
    if (!answer.isConfirmed) return;
    try {
      await api(
        `/academic/indicators/${indicator.id}`,
        { method: "DELETE" },
        token,
      );
      await loadPage("subjects", true);
      await Swal.fire({
        icon: "success",
        title: "ลบตัวชี้วัดแล้ว",
        timer: 1000,
        showConfirmButton: false,
      });
    } catch (error) {
      await showError(error);
    }
  };

  const uploadStudents = async (file: File) => {
    if (!token || !classrooms.length) return;
    const { value: classroomId } = await Swal.fire({
      title: "เลือกห้องเรียน",
      input: "select",
      inputOptions: Object.fromEntries(
        classrooms.map((room) => [room.id, room.name]),
      ),
      showCancelButton: true,
      confirmButtonText: "เริ่มนำเข้า",
      cancelButtonText: "ยกเลิก",
      inputValidator: (value) => (!value ? "กรุณาเลือกห้องเรียน" : undefined),
    });
    if (!classroomId) return;
    const form = new FormData();
    form.append("file", file);
    setLoading(true);
    try {
      const result = await api<{ importedCount: number; errors: unknown[] }>(
        `/academic/classrooms/${classroomId}/students/import`,
        { method: "POST", body: form },
        token,
      );
      await Swal.fire({
        icon: result.errors.length ? "warning" : "success",
        title: `นำเข้าสำเร็จ ${result.importedCount} คน`,
        text: result.errors.length
          ? `มีข้อมูลผิดพลาด ${result.errors.length} แถว`
          : undefined,
      });
      await loadPage("students", true);
    } catch (error) {
      await showError(error);
    } finally {
      setLoading(false);
      if (uploadRef.current) uploadRef.current.value = "";
    }
  };

  const downloadStudentImportExample = () => {
    const csv = "\uFEFF" + studentImportExample
      .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "lab-edu-student-import-example.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const importQuestionsJson = async (
    text: string,
    settings: {
      subjectCode: string;
      indicatorCode?: string;
      type: string;
      difficulty: string;
    },
  ) => {
    if (!token) return;
    try {
      const parsed = JSON.parse(text) as unknown;
      const parsedQuestions = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === "object"
          ? (parsed as { questions?: unknown }).questions
          : undefined;
      const payload = { ...settings, questions: parsedQuestions };
      if (
        !payload ||
        typeof payload !== "object" ||
        !Array.isArray((payload as { questions?: unknown }).questions)
      ) {
        throw new Error(
          'JSON ต้องเป็นรูปแบบ { "questions": [...] } หรือเป็น array ของข้อสอบ',
        );
      }
      setLoading(true);
      const result = await api<{ importedCount: number }>(
        "/questions/import/json",
        jsonBody(payload),
        token,
      );
      setQuestionImportOpen(false);
      await loadPage("questions", true);
      await Swal.fire({
        icon: "success",
        title: `นำเข้าสำเร็จ ${result.importedCount} ข้อ`,
        timer: 1400,
        showConfirmButton: false,
      });
    } catch (error) {
      await showError(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExamAvailability = async (exam: Exam) => {
    if (!token) return;
    const willOpen = exam.status !== "PUBLISHED";
    const answer = await Swal.fire({
      icon: willOpen ? "question" : "warning",
      title: willOpen ? "เปิดชุดข้อสอบให้นักเรียน?" : "ปิดชุดข้อสอบ?",
      text: willOpen
        ? `${exam.title} — นักเรียนในห้องจะเริ่มทำข้อสอบได้`
        : `${exam.title} — นักเรียนจะไม่สามารถเริ่มสอบใหม่ แต่คะแนนเดิมจะยังอยู่`,
      showCancelButton: true,
      confirmButtonText: willOpen ? "เปิดชุดข้อสอบ" : "ปิดชุดข้อสอบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: willOpen ? "#6658e8" : "#d65b65",
    });
    if (!answer.isConfirmed) return;
    try {
      await api(
        `/exams/${exam.id}/availability`,
        { method: "PATCH", body: JSON.stringify({ isOpen: willOpen }) },
        token,
      );
      await loadPage("exams", true);
      await Swal.fire({
        icon: "success",
        title: willOpen ? "เปิดชุดข้อสอบแล้ว" : "ปิดชุดข้อสอบแล้ว",
        timer: 1100,
        showConfirmButton: false,
      });
    } catch (error) {
      await showError(error);
    }
  };

  const updateAssignmentStatus = async (assignment: Assignment) => {
    if (!token) return;
    const status = assignment.status === "PUBLISHED" ? "CLOSED" : "PUBLISHED";
    try {
      await api(
        `/assignments/${assignment.id}`,
        { ...jsonBody({ status }), method: "PATCH" },
        token,
      );
      await loadPage("assignments", true);
    } catch (error) {
      await showError(error);
    }
  };

  const deleteAssignment = async (assignment: Assignment) => {
    if (!token) return;
    const answer = await Swal.fire({
      icon: "warning",
      title: `ลบงาน ${assignment.title}?`,
      text: assignment._count.submissions
        ? "มีนักเรียนส่งงานแล้ว จึงไม่สามารถลบได้"
        : "ข้อมูลนี้จะถูกลบถาวร",
      showCancelButton: true,
      showConfirmButton: !assignment._count.submissions,
      confirmButtonText: "ลบงาน",
      cancelButtonText: assignment._count.submissions ? "รับทราบ" : "ยกเลิก",
      confirmButtonColor: "#d65b65",
    });
    if (!answer.isConfirmed) return;
    try {
      await api(`/assignments/${assignment.id}`, { method: "DELETE" }, token);
      await loadPage("assignments", true);
    } catch (error) {
      await showError(error);
    }
  };

  const gradeSubmission = async (
    assignment: Assignment,
    submission: AssignmentSubmission,
  ) => {
    if (!token) return;
    const isGroup = assignment.isGroupWork && !!submission.members?.length;
    const memberFields = (submission.members ?? [])
      .map(
        (member) =>
          `<label class="swal-member-score"><span><b>${escapeHtml(member.student.user.firstName)} ${escapeHtml(member.student.user.lastName)}</b><small>${escapeHtml(member.role)}</small></span><input data-member-score="${escapeHtml(member.studentId)}" type="number" min="0" max="${Number(assignment.maxScore)}" step="0.01" value="${Number(member.score ?? 0)}"></label>`,
      )
      .join("");
    const result = await Swal.fire({
      title: isGroup
        ? `ให้คะแนนกลุ่ม ${submission.groupName ?? ""}`
        : `ให้คะแนน ${submission.student.user.firstName} ${submission.student.user.lastName}`,
      html: `${isGroup ? `<div class="swal-grade-mode"><label><input type="radio" name="grading-mode" value="SHARED" ${submission.gradingMode !== "INDIVIDUAL" ? "checked" : ""}> คะแนนเดียวทั้งกลุ่ม</label><label><input type="radio" name="grading-mode" value="INDIVIDUAL" ${submission.gradingMode === "INDIVIDUAL" ? "checked" : ""}> แยกรายคน</label></div>` : ""}<div id="shared-score-wrap"><label class="swal-field">คะแนน (เต็ม ${Number(assignment.maxScore)})<input id="assignment-score" type="number" min="0" max="${Number(assignment.maxScore)}" step="0.01" value="${Number(submission.score ?? 0)}"></label></div>${isGroup ? `<div id="member-scores" class="swal-member-scores">${memberFields}</div>` : ""}<label class="swal-field">ความคิดเห็น<textarea id="assignment-feedback" rows="4">${escapeHtml(submission.feedback ?? "")}</textarea></label>`,
      showCancelButton: true,
      confirmButtonText: "บันทึกคะแนน",
      cancelButtonText: "ยกเลิก",
      didOpen: () => {
        if (!isGroup) return;
        const popup = Swal.getPopup();
        const syncMode = () => {
          const mode = (
            popup?.querySelector(
              'input[name="grading-mode"]:checked',
            ) as HTMLInputElement
          )?.value;
          popup
            ?.querySelector("#shared-score-wrap")
            ?.classList.toggle("is-hidden", mode === "INDIVIDUAL");
          popup
            ?.querySelector("#member-scores")
            ?.classList.toggle("is-visible", mode === "INDIVIDUAL");
        };
        popup
          ?.querySelectorAll('input[name="grading-mode"]')
          .forEach((input) => input.addEventListener("change", syncMode));
        syncMode();
      },
      preConfirm: () => {
        const popup = Swal.getPopup();
        const gradingMode = isGroup
          ? ((popup?.querySelector(
              'input[name="grading-mode"]:checked',
            ) as HTMLInputElement)?.value as "SHARED" | "INDIVIDUAL")
          : undefined;
        const score = Number(
          (popup?.querySelector("#assignment-score") as HTMLInputElement)
            ?.value,
        );
        const feedback = (
          popup?.querySelector("#assignment-feedback") as HTMLTextAreaElement
        )?.value;
        if (
          gradingMode !== "INDIVIDUAL" &&
          (!Number.isFinite(score) ||
            score < 0 ||
            score > Number(assignment.maxScore))
        ) {
          Swal.showValidationMessage("คะแนนไม่ถูกต้อง");
          return false;
        }
        const memberScores = Array.from(
          popup?.querySelectorAll<HTMLInputElement>("[data-member-score]") ??
            [],
        ).map((input) => ({
          studentId: input.dataset.memberScore!,
          score: Number(input.value),
        }));
        if (
          gradingMode === "INDIVIDUAL" &&
          memberScores.some(
            (member) =>
              !Number.isFinite(member.score) ||
              member.score < 0 ||
              member.score > Number(assignment.maxScore),
          )
        ) {
          Swal.showValidationMessage("กรุณากรอกคะแนนสมาชิกทุกคนให้ถูกต้อง");
          return false;
        }
        return {
          score: gradingMode === "INDIVIDUAL" ? 0 : score,
          feedback,
          gradingMode,
          memberScores:
            gradingMode === "INDIVIDUAL" ? memberScores : undefined,
        };
      },
    });
    if (!result.isConfirmed) return;
    try {
      await api(
        `/assignments/${assignment.id}/submissions/${submission.id}/grade`,
        { ...jsonBody(result.value), method: "PATCH" },
        token,
      );
      await loadPage("assignments", true);
    } catch (error) {
      await showError(error);
    }
  };

  const gradeClassroom = async (
    assignment: Assignment,
    selectedStudentId?: string,
  ) => {
    if (!token || assignment.isGroupWork) return;
    const submissionByStudent = new Map(
      assignment.submissions.map((submission) => [
        submission.student.id,
        submission,
      ]),
    );
    const studentFields = assignment.students
      .map((student) => {
        const submission = submissionByStudent.get(student.id);
        const hasScore =
          submission?.score !== null && submission?.score !== undefined;
        return `<label class="swal-class-score${student.id === selectedStudentId ? " is-selected" : ""}"><span><b>${escapeHtml(student.user.firstName)} ${escapeHtml(student.user.lastName)}</b><small>${escapeHtml(student.studentCode)} · ${submission?.content || submission?.attachmentUrl || submission?.attachmentUrls?.length ? "ส่งในระบบแล้ว" : hasScore ? "ครูบันทึกคะแนนแล้ว" : "ยังไม่ส่งในระบบ"}</small></span><input data-class-score="${escapeHtml(student.id)}" type="number" min="0" max="${Number(assignment.maxScore)}" step="0.01" value="${hasScore ? Number(submission.score) : ""}" placeholder="—"></label>`;
      })
      .join("");
    const result = await Swal.fire({
      title: `ให้คะแนนทั้งห้อง · ${assignment.classroom.name}`,
      html: `<p class="swal-class-grade-note">กรอกคะแนนได้ทันทีแม้นักเรียนส่งงานนอกระบบหรือยังไม่มีรายการส่งงาน</p><div class="swal-fill-all"><input id="classroom-shared-score" type="number" min="0" max="${Number(assignment.maxScore)}" step="0.01" placeholder="คะแนนเต็ม ${Number(assignment.maxScore)}"><button id="fill-classroom-scores" type="button">ใส่คะแนนนี้ทุกคน</button></div><input id="classroom-student-search" class="swal-class-search" type="search" placeholder="ค้นหาชื่อนักเรียน หรือรหัสนักเรียน"><div class="swal-class-scores">${studentFields}</div><label class="swal-field">ความคิดเห็นเดียวกัน (เว้นว่างได้)<textarea id="classroom-feedback" rows="3"></textarea></label>`,
      width: 680,
      showCancelButton: true,
      confirmButtonText: "บันทึกคะแนน",
      cancelButtonText: "ยกเลิก",
      didOpen: () => {
        const popup = Swal.getPopup();
        const search = popup?.querySelector(
          "#classroom-student-search",
        ) as HTMLInputElement | null;
        search?.addEventListener("input", () => {
          const query = search.value.trim().toLocaleLowerCase();
          popup
            ?.querySelectorAll<HTMLElement>(".swal-class-score")
            .forEach((field) => {
              field.classList.toggle(
                "is-hidden",
                Boolean(query) && !field.textContent?.toLocaleLowerCase().includes(query),
              );
            });
        });
        popup
          ?.querySelector("#fill-classroom-scores")
          ?.addEventListener("click", () => {
            const shared = (
              popup.querySelector(
                "#classroom-shared-score",
              ) as HTMLInputElement
            ).value;
            popup
              .querySelectorAll<HTMLInputElement>("[data-class-score]")
              .forEach((input) => {
                input.value = shared;
              });
          });
        if (selectedStudentId) {
          const selected = popup?.querySelector(".swal-class-score.is-selected");
          selected?.scrollIntoView({ block: "center" });
          selected?.querySelector("input")?.focus();
        }
      },
      preConfirm: () => {
        const popup = Swal.getPopup();
        const grades = Array.from(
          popup?.querySelectorAll<HTMLInputElement>("[data-class-score]") ?? [],
        )
          .filter((input) => input.value.trim() !== "")
          .map((input) => ({
            studentId: input.dataset.classScore!,
            score: Number(input.value),
          }));
        if (!grades.length) {
          Swal.showValidationMessage("กรุณากรอกคะแนนอย่างน้อย 1 คน");
          return false;
        }
        if (
          grades.some(
            ({ score }) =>
              !Number.isFinite(score) ||
              score < 0 ||
              score > Number(assignment.maxScore),
          )
        ) {
          Swal.showValidationMessage(
            `คะแนนต้องอยู่ระหว่าง 0-${Number(assignment.maxScore)}`,
          );
          return false;
        }
        const feedback = (
          popup?.querySelector("#classroom-feedback") as HTMLTextAreaElement
        )?.value;
        return {
          grades: grades.map((grade) => ({
            ...grade,
            feedback:
              feedback.trim() ||
              submissionByStudent.get(grade.studentId)?.feedback ||
              undefined,
          })),
        };
      },
    });
    if (!result.isConfirmed) return;
    try {
      await api(
        `/assignments/${assignment.id}/grades`,
        { ...jsonBody(result.value), method: "PATCH" },
        token,
      );
      await loadPage("assignments", true);
      await Swal.fire({
        icon: "success",
        title: `บันทึกคะแนนแล้ว ${result.value.grades.length} คน`,
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (error) {
      await showError(error);
    }
  };

  const runSubmissionCode = async (
    assignment: Assignment,
    submission: AssignmentSubmission,
  ) => {
    if (!token) return;
    const input = await Swal.fire({
      title: "ทดลองรัน Source Code",
      input: "textarea",
      inputLabel: "ข้อมูลนำเข้า (stdin) — เว้นว่างได้",
      inputPlaceholder: "เช่น 5\n10",
      showCancelButton: true,
      confirmButtonText: "รันโค้ด",
      cancelButtonText: "ยกเลิก",
    });
    if (!input.isConfirmed) return;
    setLoading(true);
    try {
      const result = await api<{
        status: string;
        stdout: string;
        stderr: string;
        compileOutput: string;
        message: string;
        time: number | null;
        memory: number | null;
      }>(
        `/assignments/${assignment.id}/submissions/${submission.id}/run-code`,
        { ...jsonBody({ stdin: input.value || undefined }), method: "POST" },
        token,
      );
      await Swal.fire({
        title: result.status,
        html: `<div class="code-run-output"><b>Output</b><pre>${escapeHtml(result.stdout || result.stderr || result.compileOutput || result.message || "ไม่มีผลลัพธ์")}</pre><small>${result.time != null ? `${result.time}s` : ""}${result.memory != null ? ` · ${result.memory} KB` : ""}</small></div>`,
        confirmButtonText: "ปิด",
      });
    } catch (error) {
      await showError(error);
    } finally {
      setLoading(false);
    }
  };

  const editGradeScale = async () => {
    if (!token) return;
    const result = await Swal.fire({
      title: "เกณฑ์ตัดเกรด",
      input: "textarea",
      inputValue: Object.entries(gradeScale)
        .map(([grade, min]) => `${grade}=${min}`)
        .join("\n"),
      inputLabel: "หนึ่งเกรดต่อหนึ่งบรรทัด เช่น A=80",
      showCancelButton: true,
      confirmButtonText: "บันทึกเกณฑ์",
      cancelButtonText: "ยกเลิก",
      inputValidator: (value) => (!value.trim() ? "กรุณาระบุเกณฑ์" : undefined),
    });
    if (!result.isConfirmed) return;
    const grades = Object.fromEntries(
      String(result.value)
        .split("\n")
        .map((line) => line.split("=").map((part) => part.trim()))
        .filter(([grade, min]) => grade && min !== undefined)
        .map(([grade, min]) => [grade.toUpperCase(), Number(min)]),
    );
    if (Object.values(grades).some((value) => !Number.isFinite(value))) {
      await Swal.fire({ icon: "warning", title: "รูปแบบเกณฑ์ไม่ถูกต้อง" });
      return;
    }
    try {
      setGradeScale(
        await api<Record<string, number>>(
          "/assignments/grade-scale",
          { ...jsonBody({ grades }), method: "PATCH" },
          token,
        ),
      );
      await loadPage("assignments", true);
    } catch (error) {
      await showError(error);
    }
  };

  const openExamAnalysis = async (examId: string) => {
    if (!token) return;
    setLoading(true);
    try {
      setExamAnalysis(
        await api<ExamAnalysis>(`/analytics/exams/${examId}`, {}, token),
      );
    } catch (error) {
      await showError(error);
    } finally {
      setLoading(false);
    }
  };

  const resetExamResult = async (
    examId: string,
    student: ExamAnalysis["students"][number],
  ) => {
    if (!token) return;
    const answer = await Swal.fire({
      icon: "warning",
      title: `รีเซ็ตผลสอบของ ${student.name}?`,
      html: `ผลสอบ คำตอบ และประวัติการทำชุดสอบนี้ของ <b>${student.studentCode}</b> จะถูกลบ<br>นักเรียนจะสามารถเริ่มสอบใหม่ได้เมื่อชุดสอบเปิดอยู่`,
      showCancelButton: true,
      confirmButtonText: "รีเซ็ตผลสอบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#d65b65",
      focusCancel: true,
    });
    if (!answer.isConfirmed) return;

    setResettingAttemptId(student.attemptId);
    try {
      await api(
        `/exams/${examId}/attempts/${student.attemptId}`,
        { method: "DELETE" },
        token,
      );
      const [analysis, examRows] = await Promise.all([
        api<ExamAnalysis>(`/analytics/exams/${examId}`, {}, token),
        api<Exam[]>("/exams", {}, token),
      ]);
      setExamAnalysis(analysis);
      setExams(examRows);
      await Swal.fire({
        icon: "success",
        title: "รีเซ็ตผลสอบแล้ว",
        text: `${student.name} สามารถเริ่มสอบใหม่ได้เมื่อชุดสอบเปิดอยู่`,
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      await showError(error);
    } finally {
      setResettingAttemptId(null);
    }
  };

  const unlockExamAttempt = async (attempt: LockedAttempt) => {
    if (!token) return;
    const studentName = `${attempt.student.user.firstName} ${attempt.student.user.lastName}`;
    const answer = await Swal.fire({
      icon: "question",
      title: `ปลดล็อกให้ ${studentName}?`,
      html: `นักเรียนจะกลับไปทำ <b>${attempt.exam.title}</b> ต่อได้ทันที และเวลาสอบจะไม่ถูกคืน`,
      showCancelButton: true,
      confirmButtonText: "ปลดล็อกการสอบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#2f8b68",
    });
    if (!answer.isConfirmed) return;
    setUnlockingAttemptId(attempt.id);
    try {
      await api(
        `/exams/attempts/${attempt.id}/unlock`,
        { method: "POST" },
        token,
      );
      setLockedAttempts((rows) => rows.filter((row) => row.id !== attempt.id));
      await Swal.fire({
        icon: "success",
        title: "ปลดล็อกแล้ว",
        text: `${studentName} สามารถทำข้อสอบต่อได้`,
        timer: 1300,
        showConfirmButton: false,
      });
    } catch (error) {
      await showError(error);
    } finally {
      setUnlockingAttemptId(null);
    }
  };

  const openQuestion = async (question: Question, mode: "view" | "edit") => {
    if (!token) return;
    setLoading(true);
    try {
      const detail = await api<Question>(
        `/questions/${question.id}`,
        {},
        token,
      );
      setQuestionDialog({ mode, question: detail });
    } catch (error) {
      await showError(error);
    } finally {
      setLoading(false);
    }
  };

  const updateQuestion = async (
    questionId: string,
    payload: Record<string, unknown>,
  ) => {
    if (!token) return;
    setLoading(true);
    try {
      const updated = await api<Question>(
        `/questions/${questionId}`,
        { method: "PATCH", body: JSON.stringify(payload) },
        token,
      );
      setQuestions((current) =>
        current.map((question) =>
          question.id === updated.id ? updated : question,
        ),
      );
      setQuestionDialog({ mode: "view", question: updated });
      await Swal.fire({
        icon: "success",
        title: "แก้ไขข้อสอบเรียบร้อย",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (error) {
      await showError(error);
    } finally {
      setLoading(false);
    }
  };

  const deleteQuestions = async (ids: string[]) => {
    if (!token || !ids.length) return;
    const answer = await Swal.fire({
      icon: "warning",
      title:
        ids.length === 1 ? "ลบข้อสอบนี้?" : `ลบข้อสอบ ${ids.length} รายการ?`,
      text: "ข้อสอบจะถูกนำออกจากธนาคาร แต่ประวัติชุดสอบและผลสอบเดิมจะยังอยู่",
      showCancelButton: true,
      confirmButtonText: "ลบข้อสอบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#d65b65",
    });
    if (!answer.isConfirmed) return;

    setLoading(true);
    try {
      if (ids.length === 1) {
        await api(`/questions/${ids[0]}`, { method: "DELETE" }, token);
      } else {
        await api(
          "/questions",
          { method: "DELETE", body: JSON.stringify({ ids }) },
          token,
        );
      }
      const deleted = new Set(ids);
      setQuestions((current) =>
        current.filter((question) => !deleted.has(question.id)),
      );
      setSelectedQuestionIds(new Set());
      setQuestionDialog((current) =>
        current && deleted.has(current.question.id) ? null : current,
      );
      const nextPage =
        questions.length <= ids.length && questionMeta.page > 1
          ? questionMeta.page - 1
          : questionMeta.page;
      setQuestionMeta((current) => ({ ...current, page: nextPage }));
      await loadQuestionRows(nextPage, questionFilters);
      await Swal.fire({
        icon: "success",
        title:
          ids.length === 1 ? "ลบข้อสอบแล้ว" : `ลบแล้ว ${ids.length} รายการ`,
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (error) {
      await showError(error);
    } finally {
      setLoading(false);
    }
  };

  const updateOwnName = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    const data = new FormData(event.currentTarget);
    setLoading(true);
    try {
      const updated = await api<UserProfile>(
        "/auth/me",
        {
          ...jsonBody({
            firstName: data.get("firstName"),
            lastName: data.get("lastName"),
          }),
          method: "PATCH",
        },
        token,
      );
      setProfile(updated);
      await Swal.fire({
        icon: "success",
        title: "บันทึกชื่อเรียบร้อย",
        timer: 1100,
        showConfirmButton: false,
      });
    } catch (error) {
      await showError(error);
    } finally {
      setLoading(false);
    }
  };

  const changeOwnPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const newPassword = String(data.get("newPassword") ?? "");
    if (newPassword !== String(data.get("confirmPassword") ?? "")) {
      await Swal.fire({ icon: "warning", title: "รหัสผ่านใหม่ไม่ตรงกัน" });
      return;
    }
    setLoading(true);
    try {
      await api(
        "/auth/me",
        {
          ...jsonBody({
            currentPassword: data.get("currentPassword"),
            newPassword,
          }),
          method: "PATCH",
        },
        token,
      );
      form.reset();
      await Swal.fire({
        icon: "success",
        title: "เปลี่ยนรหัสผ่านเรียบร้อย",
        text: "ใช้รหัสผ่านใหม่ในการเข้าสู่ระบบครั้งถัดไป",
      });
    } catch (error) {
      await showError(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStudentAi = async () => {
    if (!token || !aiStatus) return;
    const enabled = !aiStatus.studentAiEnabled;
    if (!enabled) {
      const answer = await Swal.fire({
        icon: "warning",
        title: "ปิด AI สำหรับผู้เรียน?",
        text: "ผู้เรียนยังทำข้อสอบและดูคะแนนได้ แต่จะไม่เห็นคำแนะนำรายข้อและรายงานการเรียนรู้จาก AI",
        showCancelButton: true,
        confirmButtonText: "ปิด AI สำหรับผู้เรียน",
        cancelButtonText: "ยกเลิก",
        confirmButtonColor: "#d65b65",
      });
      if (!answer.isConfirmed) return;
    }
    setLoading(true);
    try {
      const result = await api<{ studentAiEnabled: boolean }>(
        "/ai/student-access",
        { ...jsonBody({ enabled }), method: "PATCH" },
        token,
      );
      setAiStatus((current) =>
        current
          ? { ...current, studentAiEnabled: result.studentAiEnabled }
          : current,
      );
      await Swal.fire({
        icon: "success",
        title: result.studentAiEnabled
          ? "เปิด AI สำหรับผู้เรียนแล้ว"
          : "ปิด AI สำหรับผู้เรียนแล้ว",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (error) {
      await showError(error);
    } finally {
      setLoading(false);
    }
  };

  const updateAiModels = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    const data = new FormData(event.currentTarget);
    const organizationId = String(data.get("organizationId") ?? "");
    setLoading(true);
    try {
      await api(
        `/platform/organizations/${organizationId}/ai-models`,
        {
          ...jsonBody({
            generationModel: data.get("generationModel"),
            reasoningModel: data.get("reasoningModel"),
            reportModel: data.get("reportModel"),
          }),
          method: "PATCH",
        },
        token,
      );
      await loadPage("ai-models", true);
      await Swal.fire({
        icon: "success",
        title: "บันทึกโมเดล AI เรียบร้อย",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (error) {
      await showError(error);
    } finally {
      setLoading(false);
    }
  };

  const updateAiBudget = async (organization: AiUsageOrganization) => {
    if (!token) return;
    const result = await Swal.fire({
      title: `ตั้งโควตา — ${organization.name}`,
      text: "จำนวน token สูงสุดต่อเดือนขององค์กร",
      input: "number",
      inputValue: organization.aiMonthlyTokenBudget,
      inputAttributes: { min: "0", max: "2000000000", step: "1000" },
      showCancelButton: true,
      confirmButtonText: "บันทึกโควตา",
      cancelButtonText: "ยกเลิก",
      inputValidator: (value) =>
        Number(value) < 0 || !Number.isFinite(Number(value))
          ? "กรุณาระบุจำนวน token ที่ถูกต้อง"
          : undefined,
    });
    if (!result.isConfirmed) return;
    setLoading(true);
    try {
      await api(
        `/platform/organizations/${organization.id}/ai-budget`,
        {
          ...jsonBody({ monthlyTokenBudget: Number(result.value) }),
          method: "PATCH",
        },
        token,
      );
      await loadPage("ai-usage", true);
      await Swal.fire({
        icon: "success",
        title: "บันทึกโควตาแล้ว",
        timer: 1000,
        showConfirmButton: false,
      });
    } catch (error) {
      await showError(error);
    } finally {
      setLoading(false);
    }
  };

  if (!hydrated)
    return (
      <div className="app-loader">
        <div className="app-loader-logo" aria-hidden="true" />
        <span>กำลังเตรียมระบบ...</span>
      </div>
    );
  if (!token) return <LoginScreen loading={loading} onSubmit={handleLogin} />;
  const isTeacher = profile?.role === "TEACHER";
  const title =
    (isTeacher ? teacherPageTitles[page] : undefined) ?? pageTitles[page];
  const visibleNavigation = navigation
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        profile
          ? item.roles.includes(profile.role) ||
            (profile.role === "SUPER_ADMIN" && item.roles.includes("ADMIN"))
          : false,
      ),
    }))
    .filter((group) => group.items.length > 0);
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark" aria-hidden="true" />
          <div>
            <strong>Lab EDU</strong>
            <span>AI Assessment</span>
          </div>
          <button
            className="icon-button sidebar-close"
            onClick={() => setMobileNav(false)}
            aria-label="ปิดเมนู"
          >
            <X />
          </button>
        </div>
        <nav>
          {visibleNavigation.map((group) => (
            <div className="nav-group" key={group.section}>
              <span className="nav-label">{group.section}</span>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    className={`nav-item ${page === item.key ? "active" : ""}`}
                    onClick={() => {
                      setPage(item.key);
                      setSearch(
                        item.key === "questions" ? questionFilters.search : "",
                      );
                      setMobileNav(false);
                    }}
                  >
                    <Icon size={19} /> {item.label}
                    {item.key === "ai" && <span className="ai-pill">AI</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="avatar">{profile?.firstName?.[0] ?? "A"}</div>
          <div>
            <strong>
              {profile
                ? `${profile.firstName} ${profile.lastName}`
                : "ผู้ใช้งาน"}
            </strong>
            <span>{isTeacher ? "ครูผู้สอน" : profile?.email}</span>
          </div>
          <button
            className="icon-button"
            onClick={() => void confirmLogout()}
            title="ออกจากระบบ"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {mobileNav && (
        <button
          className="nav-backdrop"
          onClick={() => setMobileNav(false)}
          aria-label="ปิดเมนู"
        />
      )}

      <main className="main-content">
        <header className="topbar">
          <div className="page-heading">
            <button
              className="icon-button menu-button"
              onClick={() => setMobileNav(true)}
            >
              <Menu />
            </button>
            <div>
              <h1>{title.title}</h1>
              <p>{title.subtitle}</p>
            </div>
          </div>
          <div className="topbar-actions">
            <button
              className="icon-button notification"
              aria-label="การแจ้งเตือน"
            >
              <Bell size={20} />
              <i />
            </button>
            <div className="organization">
              <div className="org-icon">
                <Building2 size={18} />
              </div>
              <div>
                <span>โรงเรียน</span>
                <strong>{profile?.organization.name ?? "กำลังโหลด"}</strong>
              </div>
              <ChevronDown size={16} />
            </div>
          </div>
        </header>

        <div className="content-wrap">
          <div className="content-actions">
            {(page === "students" ||
              page === "teachers" ||
              page === "questions") && (
              <label className="search-box">
                <Search size={18} />
                <input
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="ค้นหาข้อมูล..."
                />
              </label>
            )}
            <div className="action-spacer" />
            <button
              className="button secondary refresh-button"
              onClick={() => void loadPage(page, true)}
              disabled={refreshing}
            >
              <RefreshCw size={17} className={refreshing ? "spin" : ""} />{" "}
              รีเฟรช
            </button>
            <PageActions
              page={page}
              setModal={setModal}
              uploadRef={uploadRef}
              onOpenQuestionImport={() => setQuestionImportOpen(true)}
              onDownloadStudentExample={downloadStudentImportExample}
              onManualQuestion={openManualQuestion}
            />
            <input
              ref={uploadRef}
              type="file"
              accept=".xlsx"
              hidden
              onChange={(e) =>
                e.target.files?.[0] && void uploadStudents(e.target.files[0])
              }
            />
          </div>

          {loading && <div className="progress-line" />}
          {!loading && page === "dashboard" && (
            <DashboardView data={dashboard} isTeacher={isTeacher} />
          )}
          {!loading && page === "students" && (
            <StudentsView
              rows={filteredStudents}
              onEdit={(student) => {
                setEditingStudent(student);
                setModal("student");
              }}
              onDelete={deleteStudent}
            />
          )}
          {!loading && page === "teachers" && (
            <TeachersView
              rows={teachers.filter((teacher) =>
                `${teacher.firstName} ${teacher.lastName} ${teacher.email}`
                  .toLocaleLowerCase("th-TH")
                  .includes(search.toLocaleLowerCase("th-TH")),
              )}
            />
          )}
          {!loading && page === "classrooms" && (
            <ClassroomsView
              rows={classrooms}
              onEdit={(room) => {
                setEditingClassroom(room);
                setModal("classroom");
              }}
              onDelete={deleteClassroom}
            />
          )}
          {!loading && page === "subjects" && (
            <SubjectsView
              subjects={subjects}
              indicators={indicators}
              onEditSubject={(subject) => {
                setEditingSubject(subject);
                setModal("subject");
              }}
              onDeleteSubject={deleteSubject}
              onEditIndicator={(indicator) => {
                setEditingIndicator(indicator);
                setModal("indicator");
              }}
              onDeleteIndicator={deleteIndicator}
            />
          )}
          {!loading && page === "questions" && (
            <QuestionsView
              rows={questions}
              subjects={subjects}
              indicators={indicators}
              filters={questionFilters}
              meta={questionMeta}
              selectedIds={selectedQuestionIds}
              onFiltersChange={applyQuestionFilters}
              onPageChange={changeQuestionPage}
              onSelectionChange={setSelectedQuestionIds}
              onOpen={openQuestion}
              onDelete={deleteQuestions}
            />
          )}
          {!loading && page === "exams" && (
            <ExamsView
              rows={exams}
              onToggleAvailability={toggleExamAvailability}
            />
          )}
          {!loading && page === "assignments" && (
            <AssignmentsView
              rows={assignments}
              gradeScale={gradeScale}
              onEdit={(assignment) => {
                setEditingAssignment(assignment);
                setModal("assignment");
              }}
              onDelete={deleteAssignment}
              onStatus={updateAssignmentStatus}
              onGrade={gradeSubmission}
              onGradeClassroom={gradeClassroom}
              onRunCode={runSubmissionCode}
              onEditScale={editGradeScale}
            />
          )}
          {!loading && page === "grades" && (
            <AcademicRecordsView data={academicRecords} />
          )}
          {!loading && page === "results" && (
            <ResultsView
              rows={exams}
              analysis={examAnalysis}
              onOpen={openExamAnalysis}
              onReset={resetExamResult}
              resettingAttemptId={resettingAttemptId}
            />
          )}
          {!loading && page === "exam-locks" && (
            <ExamLocksView
              rows={lockedAttempts}
              onUnlock={unlockExamAttempt}
              unlockingAttemptId={unlockingAttemptId}
            />
          )}
          {!loading && page === "ai" && (
            <AiInsightsView data={dashboard} aiStatus={aiStatus} />
          )}
          {!loading && page === "organizations" && (
            <OrganizationsView
              rows={organizations}
              onEdit={(organization) => {
                setEditingOrganization(organization);
                setModal("organization");
              }}
            />
          )}
          {!loading && page === "ai-models" && (
            <AiModelsView
              rows={organizations}
              models={aiModelCatalog}
              onSubmit={updateAiModels}
            />
          )}
          {!loading && page === "ai-usage" && (
            <AiUsageView data={aiUsage} onEditBudget={updateAiBudget} />
          )}
          {!loading && page === "settings" && (
            <SettingsView
              profile={profile}
              aiStatus={aiStatus}
              isTeacher={isTeacher}
              onUpdateName={updateOwnName}
              onChangePassword={changeOwnPassword}
              onToggleStudentAi={toggleStudentAi}
            />
          )}
        </div>
      </main>

      {modal && (
        <DataModal
          kind={modal}
          classrooms={classrooms}
          teachers={teachers}
          subjects={subjects}
          indicators={indicators}
          questions={questions}
          isTeacher={isTeacher}
          editingStudent={editingStudent}
          editingClassroom={editingClassroom}
          editingSubject={editingSubject}
          editingIndicator={editingIndicator}
          editingAssignment={editingAssignment}
          editingOrganization={editingOrganization}
          aiStatus={aiStatus}
          onClose={() => {
            setModal(null);
            setEditingStudent(null);
            setEditingClassroom(null);
            setEditingSubject(null);
            setEditingIndicator(null);
            setEditingAssignment(null);
            setEditingOrganization(null);
          }}
          onSubmit={(data) => void submitModal(modal, data)}
        />
      )}
      {questionDialog && (
        <QuestionDialog
          mode={questionDialog.mode}
          question={questionDialog.question}
          subjects={subjects}
          indicators={indicators}
          onClose={() => setQuestionDialog(null)}
          onEdit={() =>
            setQuestionDialog((current) =>
              current ? { ...current, mode: "edit" } : current,
            )
          }
          onSave={(payload) =>
            questionDialog.mode === "create"
              ? void createQuestion(payload)
              : void updateQuestion(questionDialog.question.id, payload)
          }
        />
      )}
      {questionImportOpen && (
        <QuestionImportDialog
          loading={loading}
          subjects={subjects}
          indicators={indicators}
          onClose={() => setQuestionImportOpen(false)}
          onImport={importQuestionsJson}
        />
      )}
    </div>
  );
}

function LoginScreen({
  loading,
  onSubmit,
}: {
  loading: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <main className="login-page">
      <section className="login-visual">
        <div className="login-brand">
          <div className="brand-mark" aria-hidden="true" />
          <div>
            <strong>Lab EDU</strong>
            <span>AI Assessment Platform</span>
          </div>
        </div>
        <div className="login-copy">
          <span className="eyebrow">
            <Sparkles size={15} /> วัดผลอย่างเข้าใจผู้เรียน
          </span>
          <h1>
            เปลี่ยนข้อมูลการสอบ
            <br />
            ให้เป็นการเรียนรู้ที่ดีขึ้น
          </h1>
          <p>
            สร้างข้อสอบ ตรวจคำตอบ และวิเคราะห์ผู้เรียนด้วย AI
            ในพื้นที่ทำงานเดียว
          </p>
        </div>
        <div className="visual-cards">
          <div>
            <BrainCircuit />
            <strong>สร้างด้วย AI</strong>
            <span>ตรงตามตัวชี้วัด</span>
          </div>
          <div>
            <Activity />
            <strong>Adaptive Test</strong>
            <span>เหมาะกับผู้เรียน</span>
          </div>
          <div>
            <BarChart3 />
            <strong>วิเคราะห์ทันที</strong>
            <span>เห็นจุดที่ต้องเสริม</span>
          </div>
        </div>
        <div className="orb orb-one" />
        <div className="orb orb-two" />
      </section>
      <section className="login-panel">
        <form className="login-form" onSubmit={onSubmit}>
          <div className="mobile-login-brand">
            <div className="brand-mark" aria-hidden="true" />
            <strong>Lab EDU</strong>
          </div>
          <span className="login-kicker">LAB EDU PORTAL</span>
          <h2>ยินดีต้อนรับกลับมา</h2>
          <p>เข้าสู่ระบบสำหรับผู้ดูแล ครู และนักเรียน</p>
          <label>
            อีเมล หรือรหัสประจำตัวนักเรียน
            <input name="identifier" required autoComplete="username" />
          </label>
          <label>
            รหัสผ่าน
            <input
              type="password"
              name="password"
              required
              minLength={8}
              autoComplete="current-password"
            />
          </label>
          <div className="login-options">
            <label className="check-line">
              <input type="checkbox" defaultChecked /> จดจำอีเมล
            </label>
            <button type="button">ลืมรหัสผ่าน?</button>
          </div>
          <button className="button primary login-button" disabled={loading}>
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
          <div className="secure-note">
            <ShieldCheck size={17} /> ข้อมูลของคุณได้รับการเข้ารหัสและปกป้อง
          </div>
        </form>
      </section>
    </main>
  );
}

function PageActions({
  page,
  setModal,
  uploadRef,
  onOpenQuestionImport,
  onManualQuestion,
  onDownloadStudentExample,
}: {
  page: PageKey;
  setModal: (kind: ModalKind) => void;
  uploadRef: React.RefObject<HTMLInputElement | null>;
  onOpenQuestionImport: () => void;
  onManualQuestion: () => void;
  onDownloadStudentExample: () => void;
}) {
  if (page === "organizations")
    return (
      <button
        className="button primary"
        onClick={() => setModal("organization")}
      >
        <Plus size={17} /> เพิ่มองค์กร
      </button>
    );
  if (page === "students")
    return (
      <>
        <button
          className="button secondary"
          onClick={() => uploadRef.current?.click()}
        >
          <Upload size={17} /> นำเข้า Excel
        </button>
        <button className="button secondary" onClick={onDownloadStudentExample}>
          <FileQuestion size={17} /> ดาวน์โหลดไฟล์ตัวอย่าง
        </button>
        <button className="button primary" onClick={() => setModal("student")}>
          <Plus size={17} /> เพิ่มนักเรียน
        </button>
      </>
    );
  if (page === "teachers")
    return (
      <button className="button primary" onClick={() => setModal("teacher")}>
        <UserRoundPlus size={17} /> เพิ่มครู
      </button>
    );
  if (page === "classrooms")
    return (
      <button className="button primary" onClick={() => setModal("classroom")}>
        <Plus size={17} /> สร้างห้องเรียน
      </button>
    );
  if (page === "subjects")
    return (
      <>
        <button
          className="button secondary"
          onClick={() => setModal("indicator")}
        >
          <Plus size={17} /> เพิ่มตัวชี้วัด
        </button>
        <button className="button primary" onClick={() => setModal("subject")}>
          <Plus size={17} /> เพิ่มวิชา
        </button>
      </>
    );
  if (page === "questions")
    return (
      <>
        <button className="button secondary" onClick={onOpenQuestionImport}>
          <Upload size={17} /> นำเข้า JSON
        </button>
        <button className="button secondary" onClick={onManualQuestion}>
          <Plus size={17} /> เพิ่มข้อสอบเอง
        </button>
        <button
          className="button ai-button"
          onClick={() => setModal("generate")}
        >
          <Sparkles size={17} /> สร้างข้อสอบด้วย AI
        </button>
      </>
    );
  if (page === "exams")
    return (
      <button className="button primary" onClick={() => setModal("exam")}>
        <Plus size={17} /> สร้างชุดข้อสอบ
      </button>
    );
  if (page === "assignments")
    return (
      <button className="button primary" onClick={() => setModal("assignment")}>
        <Plus size={17} /> เพิ่มงาน
      </button>
    );
  return null;
}

function DashboardView({
  data,
  isTeacher,
}: {
  data: DashboardData | null;
  isTeacher: boolean;
}) {
  if (!data) return <EmptyState title="ยังไม่มีข้อมูลภาพรวม" />;
  const totalGrouped =
    Object.values(data.studentGroups).reduce((a, b) => a + b, 0) || 1;
  const strong = data.studentGroups.STRONG ?? 0;
  const average = data.studentGroups.AVERAGE ?? 0;
  const support = data.studentGroups.NEEDS_SUPPORT ?? 0;
  const angle1 = (strong / totalGrouped) * 360;
  const angle2 = angle1 + (average / totalGrouped) * 360;
  const metrics = [
    {
      label: "นักเรียนทั้งหมด",
      value: data.totals.students,
      icon: GraduationCap,
      tone: "violet",
      note: "พร้อมใช้งานในระบบ",
    },
    {
      label: "ห้องเรียน",
      value: data.totals.classrooms,
      icon: School,
      tone: "blue",
      note: "ปีการศึกษาปัจจุบัน",
    },
    {
      label: "ข้อสอบในคลัง",
      value: data.totals.questions,
      icon: FileQuestion,
      tone: "amber",
      note: "พร้อมนำไปสร้างชุดสอบ",
    },
    {
      label: "ชุดข้อสอบ",
      value: data.totals.exams,
      icon: ClipboardCheck,
      tone: "green",
      note: "รวมฉบับร่างและเผยแพร่",
    },
  ];
  return (
    <div className="dashboard-grid">
      <section className="welcome-card">
        <div>
          <span className="eyebrow">
            <Sparkles size={15} /> AI Assessment Overview
          </span>
          <h2>{isTeacher ? "สวัสดีคุณครู 👋" : "สวัสดีผู้ดูแลระบบ 👋"}</h2>
          <p>
            {isTeacher
              ? "ติดตามผู้เรียน สร้างข้อสอบ และวางแผนการสอนได้จากพื้นที่ทำงานของคุณ"
              : "วันนี้ระบบพร้อมช่วยให้ทีมครูเห็นภาพการเรียนรู้ของนักเรียนได้ชัดเจนขึ้น"}
          </p>
        </div>
        <div className="welcome-orbit">
          <BrainCircuit size={48} />
          <span />
          <i />
        </div>
      </section>
      <section className="metric-grid">
        {metrics.map(({ label, value, icon: Icon, tone, note }) => (
          <article className="metric-card" key={label}>
            <div className={`metric-icon ${tone}`}>
              <Icon size={21} />
            </div>
            <div>
              <span>{label}</span>
              <strong>{value.toLocaleString("th-TH")}</strong>
              <small>{note}</small>
            </div>
          </article>
        ))}
      </section>
      <section className="panel performance-panel">
        <PanelHeader
          title="ภาพรวมระดับผู้เรียน"
          subtitle="แบ่งกลุ่มจากคะแนนเฉลี่ยสะสม"
        />
        <div className="performance-content">
          <div
            className="donut"
            style={{
              background: `conic-gradient(#6658e8 0 ${angle1}deg, #36a3f7 ${angle1}deg ${angle2}deg, #f59e5b ${angle2}deg 360deg)`,
            }}
          >
            <div>
              <strong>{data.totals.students}</strong>
              <span>นักเรียน</span>
            </div>
          </div>
          <div className="legend">
            <Legend color="#6658e8" label="กลุ่มเก่ง" value={strong} />
            <Legend color="#36a3f7" label="กลุ่มกลาง" value={average} />
            <Legend color="#f59e5b" label="ต้องเสริม" value={support} />
            <Legend
              color="#dbe1ea"
              label="ยังไม่มีข้อมูล"
              value={data.studentGroups.NO_DATA ?? 0}
            />
          </div>
        </div>
      </section>
      <section className="panel recent-panel">
        <PanelHeader
          title="ชุดข้อสอบล่าสุด"
          subtitle="สถานะและผลการสอบล่าสุด"
        />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ชุดข้อสอบ</th>
                <th>ห้องเรียน</th>
                <th>ส่งแล้ว</th>
                <th>เฉลี่ย</th>
                <th>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {data.recentExams.length ? (
                data.recentExams.map((exam) => (
                  <tr key={exam.id}>
                    <td>
                      <strong>{exam.title}</strong>
                      <span>{exam.subject}</span>
                    </td>
                    <td>{exam.classroom}</td>
                    <td>{exam.submissions}</td>
                    <td>
                      {exam.average === null
                        ? "—"
                        : `${exam.average.toFixed(1)}%`}
                    </td>
                    <td>
                      <StatusBadge status={exam.status} />
                    </td>
                  </tr>
                ))
              ) : (
                <TableEmpty colSpan={5} />
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel quick-panel">
        <PanelHeader title="สิ่งที่ควรติดตาม" subtitle="สรุปจากข้อมูลในระบบ" />
        <div className="insight-list">
          <Insight
            icon={Bot}
            tone="purple"
            title="AI พร้อมสร้างข้อสอบ"
            text={`มี ${data.totals.questions} ข้อในคลัง สามารถสร้างข้อใหม่ตามตัวชี้วัดได้ทันที`}
          />
          <Insight
            icon={Activity}
            tone="orange"
            title="นักเรียนที่ต้องเสริม"
            text={`${support} คน ควรได้รับแบบฝึกหัดซ่อมเสริมเฉพาะจุด`}
          />
          <Insight
            icon={CircleHelp}
            tone="blue"
            title="ข้อมูลยังไม่ครบ"
            text={`${data.studentGroups.NO_DATA ?? 0} คน ยังไม่มีผลสอบสำหรับการวิเคราะห์`}
          />
        </div>
      </section>
    </div>
  );
}

function StudentsView({
  rows,
  onEdit,
  onDelete,
}: {
  rows: Student[];
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => void;
}) {
  return (
    <section className="panel full-panel">
      <PanelHeader
        title={`นักเรียน ${rows.length} คน`}
        subtitle="บัญชีนักเรียนภายในโรงเรียน"
      />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>รหัส</th>
              <th>ชื่อ–นามสกุล</th>
              <th>ระดับชั้น</th>
              <th>ห้องเรียน</th>
              <th>อีเมล</th>
              <th>สถานะ</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((student) => (
                <tr key={student.id}>
                  <td>
                    <span className="code-chip">{student.studentCode}</span>
                  </td>
                  <td>
                    <div className="person-cell">
                      <Avatar name={student.user.firstName} />
                      <strong>
                        {student.user.firstName} {student.user.lastName}
                      </strong>
                    </div>
                  </td>
                  <td>{student.gradeLevel || "—"}</td>
                  <td>
                    {student.enrollments
                      .map((e) => e.classroom.name)
                      .join(", ") || "ยังไม่เข้าห้อง"}
                  </td>
                  <td>{student.user.email}</td>
                  <td>
                    <StatusBadge
                      status={student.user.isActive ? "ACTIVE" : "INACTIVE"}
                    />
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        onClick={() => onEdit(student)}
                        title="แก้ไขนักเรียน"
                      >
                        <PencilLine />
                      </button>
                      <button
                        className="delete-action"
                        onClick={() => void onDelete(student)}
                        title="ลบนักเรียน"
                      >
                        <Trash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <TableEmpty colSpan={7} />
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TeachersView({ rows }: { rows: Teacher[] }) {
  return (
    <section className="panel full-panel">
      <PanelHeader
        title={`ครูผู้สอน ${rows.length} คน`}
        subtitle="บัญชีและภาระการดูแลห้องเรียน"
      />
      <div className="card-list">
        {rows.length ? (
          rows.map((teacher) => (
            <article className="teacher-card" key={teacher.id}>
              <Avatar name={teacher.firstName} large />
              <div>
                <strong>
                  {teacher.firstName} {teacher.lastName}
                </strong>
                <span>{teacher.email}</span>
              </div>
              <div className="teacher-stat">
                <small>ห้องเรียนที่ดูแล</small>
                <b>{teacher._count.taughtClasses}</b>
              </div>
              <StatusBadge status={teacher.isActive ? "ACTIVE" : "INACTIVE"} />
            </article>
          ))
        ) : (
          <EmptyState title="ยังไม่มีบัญชีครู" />
        )}
      </div>
    </section>
  );
}

function ClassroomsView({
  rows,
  onEdit,
  onDelete,
}: {
  rows: Classroom[];
  onEdit: (room: Classroom) => void;
  onDelete: (room: Classroom) => void;
}) {
  return (
    <div className="cards-grid">
      {rows.length ? (
        rows.map((room, index) => (
          <article className="classroom-card" key={room.id}>
            <div className={`classroom-cover cover-${index % 4}`}>
              <School size={27} />
              <span>{room.gradeLevel || "ชั้นเรียน"}</span>
              <div className="classroom-actions">
                <button onClick={() => onEdit(room)} title="แก้ไขห้องเรียน">
                  <PencilLine />
                </button>
                <button onClick={() => void onDelete(room)} title="ลบห้องเรียน">
                  <Trash2 />
                </button>
              </div>
            </div>
            <div className="classroom-body">
              <div>
                <h3>{room.name}</h3>
                <span>ปีการศึกษา {room.academicYear}</span>
              </div>
              <p>
                ครูผู้สอน {room.teacher.firstName} {room.teacher.lastName}
              </p>
              <div className="classroom-meta">
                <span>
                  <Users size={16} /> {room._count.enrollments} นักเรียน
                </span>
                <span>
                  <ClipboardCheck size={16} /> {room._count.exams} ชุดสอบ
                </span>
              </div>
            </div>
          </article>
        ))
      ) : (
        <section className="panel full-panel">
          <EmptyState title="ยังไม่มีห้องเรียน" />
        </section>
      )}
    </div>
  );
}

function SubjectsView({
  subjects,
  indicators,
  onEditSubject,
  onDeleteSubject,
  onEditIndicator,
  onDeleteIndicator,
}: {
  subjects: Subject[];
  indicators: Indicator[];
  onEditSubject: (subject: Subject) => void;
  onDeleteSubject: (subject: Subject) => void;
  onEditIndicator: (indicator: Indicator) => void;
  onDeleteIndicator: (indicator: Indicator) => void;
}) {
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [indicatorSearch, setIndicatorSearch] = useState("");
  const activeSubjectId = subjects.some(
    (subject) => subject.id === selectedSubjectId,
  )
    ? selectedSubjectId
    : "";
  const keyword = indicatorSearch.trim().toLocaleLowerCase("th-TH");
  const visibleIndicators = indicators.filter(
    (indicator) =>
      (!activeSubjectId || indicator.subject.id === activeSubjectId) &&
      (!keyword ||
        `${indicator.code} ${indicator.description} ${indicator.subject.name} ${indicator.gradeLevel ?? ""}`
          .toLocaleLowerCase("th-TH")
          .includes(keyword)),
  );
  const selectedSubject = subjects.find(
    (subject) => subject.id === activeSubjectId,
  );

  return (
    <div className="subject-management">
      <section className="panel subject-panel">
        <header className="subject-section-header">
          <div>
            <span className="section-eyebrow">SUBJECTS</span>
            <h3>รายวิชาทั้งหมด</h3>
            <p>เลือกวิชาเพื่อกรองตัวชี้วัดด้านขวา</p>
          </div>
          <button
            type="button"
            className={!activeSubjectId ? "active" : ""}
            onClick={() => setSelectedSubjectId("")}
          >
            ดูทั้งหมด
          </button>
        </header>
        <div className="subject-list">
          {subjects.length ? (
            subjects.map((subject, index) => (
              <article
                className={`subject-row ${activeSubjectId === subject.id ? "active" : ""}`}
                key={subject.id}
              >
                <button
                  type="button"
                  className="subject-main"
                  onClick={() => setSelectedSubjectId(subject.id)}
                >
                  <div className={`subject-icon subject-${index % 4}`}>
                    <BookOpen size={22} />
                  </div>
                  <div>
                    <span className="subject-code">{subject.code}</span>
                    <strong>{subject.name}</strong>
                    <small>
                      {subject._count?.questions ?? 0} ข้อสอบ ·{" "}
                      {subject._count?.indicators ?? 0} ตัวชี้วัด ·{" "}
                      {subject._count?.exams ?? 0} ชุดสอบ
                    </small>
                  </div>
                </button>
                <div className="subject-actions">
                  <button
                    type="button"
                    onClick={() => onEditSubject(subject)}
                    title={`แก้ไขวิชา ${subject.name}`}
                  >
                    <PencilLine />
                  </button>
                  <button
                    type="button"
                    className="delete-action"
                    onClick={() => void onDeleteSubject(subject)}
                    title={`ลบวิชา ${subject.name}`}
                  >
                    <Trash2 />
                  </button>
                </div>
              </article>
            ))
          ) : (
            <EmptyState title="ยังไม่มีรายวิชา" />
          )}
        </div>
      </section>
      <section className="panel indicator-panel">
        <header className="subject-section-header indicator-header">
          <div>
            <span className="section-eyebrow">INDICATORS</span>
            <h3>
              {selectedSubject
                ? `ตัวชี้วัด — ${selectedSubject.name}`
                : "ตัวชี้วัดทั้งหมด"}
            </h3>
            <p>
              แสดง {visibleIndicators.length} จาก {indicators.length} รายการ
            </p>
          </div>
        </header>
        <label className="indicator-search">
          <Search />
          <input
            value={indicatorSearch}
            onChange={(event) => setIndicatorSearch(event.target.value)}
            placeholder="ค้นหารหัส คำอธิบาย หรือระดับชั้น..."
          />
          {indicatorSearch && (
            <button
              type="button"
              onClick={() => setIndicatorSearch("")}
              aria-label="ล้างคำค้น"
            >
              <X />
            </button>
          )}
        </label>
        <div className="indicator-list">
          {visibleIndicators.length ? (
            visibleIndicators.map((indicator) => (
              <article key={indicator.id}>
                <div className="indicator-content">
                  <div className="indicator-meta">
                    <span>{indicator.code}</span>
                    <small>{indicator.subject.name}</small>
                    <small>{indicator.gradeLevel || "ทุกระดับชั้น"}</small>
                  </div>
                  <strong>{indicator.description}</strong>
                  <p>ใช้กับข้อสอบ {indicator._count?.questions ?? 0} ข้อ</p>
                </div>
                <div className="indicator-actions">
                  <button
                    type="button"
                    onClick={() => onEditIndicator(indicator)}
                  >
                    <PencilLine /> แก้ไข
                  </button>
                  <button
                    type="button"
                    className="delete-action"
                    onClick={() => void onDeleteIndicator(indicator)}
                  >
                    <Trash2 /> ลบ
                  </button>
                </div>
              </article>
            ))
          ) : (
            <EmptyState
              title={
                keyword || activeSubjectId
                  ? "ไม่พบตัวชี้วัดตามเงื่อนไข"
                  : "ยังไม่มีตัวชี้วัด"
              }
            />
          )}
        </div>
      </section>
    </div>
  );
}

function QuestionsView({
  rows,
  subjects,
  indicators,
  filters,
  meta,
  selectedIds,
  onFiltersChange,
  onPageChange,
  onSelectionChange,
  onOpen,
  onDelete,
}: {
  rows: Question[];
  subjects: Subject[];
  indicators: Indicator[];
  filters: QuestionFilters;
  meta: QuestionMeta;
  selectedIds: Set<string>;
  onFiltersChange: (filters: QuestionFilters) => void;
  onPageChange: (page: number) => void;
  onSelectionChange: (ids: Set<string>) => void;
  onOpen: (question: Question, mode: "view" | "edit") => void;
  onDelete: (ids: string[]) => void;
}) {
  const visibleIds = rows.map((question) => question.id);
  const allSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  };
  const toggleAll = () => {
    const next = new Set(selectedIds);
    if (allSelected) visibleIds.forEach((id) => next.delete(id));
    else visibleIds.forEach((id) => next.add(id));
    onSelectionChange(next);
  };
  const pageCount = Math.max(1, Math.ceil(meta.total / meta.limit));
  const pageStart = meta.total ? (meta.page - 1) * meta.limit + 1 : 0;
  const pageEnd = Math.min(meta.page * meta.limit, meta.total);
  const visiblePages = Array.from(
    { length: Math.min(5, pageCount) },
    (_, index) => {
      const start = Math.max(1, Math.min(meta.page - 2, pageCount - 4));
      return start + index;
    },
  );
  const filteredIndicators = filters.subjectId
    ? indicators.filter(
        (indicator) => indicator.subject.id === filters.subjectId,
      )
    : indicators;
  const hasFilters = Boolean(
    filters.subjectId ||
    filters.indicatorId ||
    filters.type ||
    filters.difficulty ||
    filters.search,
  );

  return (
    <section className="panel full-panel question-bank">
      <header className="panel-header question-panel-header">
        <div>
          <h3>ข้อสอบทั้งหมด {meta.total.toLocaleString("th-TH")} ข้อ</h3>
          <p>
            {hasFilters
              ? "ผลลัพธ์ตามตัวกรองที่เลือก"
              : "คำถามทั้งหมดในธนาคารข้อสอบ"}
          </p>
        </div>
        {selectedIds.size > 0 && (
          <button
            className="button danger"
            onClick={() => void onDelete([...selectedIds])}
          >
            <Trash2 size={15} /> ลบที่เลือก ({selectedIds.size})
          </button>
        )}
      </header>
      <div className="question-filters">
        <label>
          รายวิชา
          <select
            value={filters.subjectId}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                subjectId: event.target.value,
                indicatorId: "",
              })
            }
          >
            <option value="">ทุกวิชา</option>
            {subjects.map((subject) => (
              <option value={subject.id} key={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          ตัวชี้วัด
          <select
            value={filters.indicatorId}
            onChange={(event) =>
              onFiltersChange({ ...filters, indicatorId: event.target.value })
            }
          >
            <option value="">ทุกตัวชี้วัด</option>
            {filteredIndicators.map((indicator) => (
              <option value={indicator.id} key={indicator.id}>
                {indicator.code}
              </option>
            ))}
          </select>
        </label>
        <label>
          ประเภท
          <select
            value={filters.type}
            onChange={(event) =>
              onFiltersChange({ ...filters, type: event.target.value })
            }
          >
            <option value="">ทุกประเภท</option>
            {Object.entries(questionTypeLabel).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          ความยาก
          <select
            value={filters.difficulty}
            onChange={(event) =>
              onFiltersChange({ ...filters, difficulty: event.target.value })
            }
          >
            <option value="">ทุกระดับ</option>
            {Object.entries(difficultyLabel).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="filter-reset"
          onClick={() =>
            onFiltersChange({
              subjectId: "",
              indicatorId: "",
              type: "",
              difficulty: "",
              search: "",
            })
          }
          disabled={!hasFilters}
        >
          ล้างตัวกรอง
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th className="select-cell">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="เลือกข้อสอบทั้งหมดที่แสดง"
                />
              </th>
              <th>คำถาม</th>
              <th>วิชา</th>
              <th>ประเภท</th>
              <th>ความยาก</th>
              <th>แหล่งที่มา</th>
              <th>คะแนน</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((question) => (
                <tr
                  className={selectedIds.has(question.id) ? "selected-row" : ""}
                  key={question.id}
                >
                  <td className="select-cell">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(question.id)}
                      onChange={() => toggleOne(question.id)}
                      aria-label={`เลือกข้อสอบ ${question.prompt}`}
                    />
                  </td>
                  <td className="question-cell">
                    <button
                      className="question-link"
                      onClick={() => void onOpen(question, "view")}
                    >
                      <strong>{question.prompt}</strong>
                      <span>
                        {question.indicator?.code || "ไม่ระบุตัวชี้วัด"}
                      </span>
                    </button>
                  </td>
                  <td>{question.subject.name}</td>
                  <td>
                    <span className="soft-chip">
                      {questionTypeLabel[question.type] || question.type}
                    </span>
                  </td>
                  <td>
                    <DifficultyBadge value={question.difficulty} />
                  </td>
                  <td>
                    {question.source === "MANUAL" ? (
                      "สร้างเอง"
                    ) : (
                      <span className="ai-source">
                        <Sparkles size={14} /> AI
                      </span>
                    )}
                  </td>
                  <td>{Number(question.maxScore)}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        onClick={() => void onOpen(question, "view")}
                        title="ดูรายละเอียด"
                      >
                        <Eye />
                      </button>
                      <button
                        onClick={() => void onOpen(question, "edit")}
                        title="แก้ไข"
                      >
                        <PencilLine />
                      </button>
                      <button
                        className="delete-action"
                        onClick={() => void onDelete([question.id])}
                        title="ลบข้อสอบ"
                      >
                        <Trash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <TableEmpty colSpan={8} />
            )}
          </tbody>
        </table>
      </div>
      <footer className="pagination">
        <span>
          แสดง {pageStart.toLocaleString("th-TH")}–
          {pageEnd.toLocaleString("th-TH")} จาก{" "}
          {meta.total.toLocaleString("th-TH")} ข้อ
        </span>
        <div>
          <button
            type="button"
            onClick={() => onPageChange(meta.page - 1)}
            disabled={meta.page <= 1}
          >
            ‹
          </button>
          {visiblePages.map((pageNumber) => (
            <button
              type="button"
              className={pageNumber === meta.page ? "active" : ""}
              onClick={() => onPageChange(pageNumber)}
              key={pageNumber}
            >
              {pageNumber}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onPageChange(meta.page + 1)}
            disabled={meta.page >= pageCount}
          >
            ›
          </button>
        </div>
      </footer>
    </section>
  );
}

function ExamsView({
  rows,
  onToggleAvailability,
}: {
  rows: Exam[];
  onToggleAvailability: (exam: Exam) => void;
}) {
  return (
    <section className="panel full-panel">
      <PanelHeader
        title={`ชุดข้อสอบ ${rows.length} ชุด`}
        subtitle="เปิด–ปิดการเข้าสอบและติดตามจำนวนผู้เข้าสอบ"
      />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ชื่อชุดข้อสอบ</th>
              <th>วิชา / ห้อง</th>
              <th>รูปแบบ</th>
              <th>จำนวนข้อ</th>
              <th>ผู้เข้าสอบ</th>
              <th>สถานะ</th>
              <th>เปิดให้นักเรียนสอบ</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((exam) => {
                const isOpen = exam.status === "PUBLISHED";
                return (
                  <tr key={exam.id}>
                    <td>
                      <strong>{exam.title}</strong>
                      <span>
                        {exam.durationMinutes
                          ? `${exam.durationMinutes} นาที`
                          : "ไม่จำกัดเวลา"}
                      </span>
                    </td>
                    <td>
                      <strong>{exam.subject.name}</strong>
                      <span>{exam.classroom.name}</span>
                    </td>
                    <td>
                      {exam.isAdaptive ? (
                        <span className="ai-source">
                          <Activity size={14} /> Adaptive
                        </span>
                      ) : (
                        "ทั่วไป"
                      )}
                    </td>
                    <td>{exam._count.items}</td>
                    <td>{exam._count.attempts}</td>
                    <td>
                      <StatusBadge status={exam.status} />
                    </td>
                    <td>
                      {exam.status === "ARCHIVED" ? (
                        <span className="archived-control">เก็บถาวร</span>
                      ) : (
                        <button
                          type="button"
                          className={`availability-switch ${isOpen ? "on" : "off"}`}
                          role="switch"
                          aria-checked={isOpen}
                          aria-label={`${isOpen ? "ปิด" : "เปิด"}ชุดข้อสอบ ${exam.title}`}
                          onClick={() => void onToggleAvailability(exam)}
                        >
                          <i />
                          <span>{isOpen ? "เปิด" : "ปิด"}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <TableEmpty colSpan={7} />
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AssignmentsView({
  rows,
  gradeScale,
  onEdit,
  onDelete,
  onStatus,
  onGrade,
  onGradeClassroom,
  onRunCode,
  onEditScale,
}: {
  rows: Assignment[];
  gradeScale: Record<string, number>;
  onEdit: (row: Assignment) => void;
  onDelete: (row: Assignment) => void;
  onStatus: (row: Assignment) => void;
  onGrade: (assignment: Assignment, submission: AssignmentSubmission) => void;
  onGradeClassroom: (
    assignment: Assignment,
    selectedStudentId?: string,
  ) => void;
  onRunCode: (assignment: Assignment, submission: AssignmentSubmission) => void;
  onEditScale: () => void;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [type, setType] = useState("ALL");
  const [subjectId, setSubjectId] = useState("ALL");
  const [classroomId, setClassroomId] = useState("ALL");
  const [page, setPage] = useState(1);
  const perPage = 6;
  const date = (value: string) =>
    new Intl.DateTimeFormat("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  const classrooms = useMemo(
    () =>
      Array.from(
        new Map(
          rows.map((row) => [row.classroom.id, row.classroom.name]),
        ).entries(),
      ),
    [rows],
  );
  const subjects = useMemo(
    () =>
      Array.from(
        new Map(
          rows.map((row) => [row.subject.id, row.subject.name]),
        ).entries(),
      ),
    [rows],
  );
  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("th-TH");
    return rows.filter(
      (row) =>
        (!keyword ||
          `${row.title} ${row.subject.name} ${row.classroom.name}`
            .toLocaleLowerCase("th-TH")
            .includes(keyword)) &&
        (status === "ALL" || row.status === status) &&
        (type === "ALL" || row.type === type) &&
        (subjectId === "ALL" || row.subject.id === subjectId) &&
        (classroomId === "ALL" || row.classroom.id === classroomId),
    );
  }, [rows, search, status, type, subjectId, classroomId]);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / perPage));
  const activePage = Math.min(page, totalPages);
  const visibleRows = filteredRows.slice(
    (activePage - 1) * perPage,
    activePage * perPage,
  );
  const resetFilters = () => {
    setSearch("");
    setStatus("ALL");
    setType("ALL");
    setSubjectId("ALL");
    setClassroomId("ALL");
  };
  return (
    <div className="assignment-layout">
      <section className="grade-scale-bar">
        <div>
          <strong>เกณฑ์ประเมินงาน</strong>
          <span>
            ดีเยี่ยม ≥ 80% · ดี ≥ 70% · พอใช้ ≥ 60% · ปรับปรุง &lt; 60%
          </span>
        </div>
        <button className="button secondary" title={`เกณฑ์เกรดรายวิชา ${Object.entries(gradeScale).length} ระดับ`} onClick={() => void onEditScale()}>
          <PencilLine size={15} /> เกณฑ์เกรดรายวิชา
        </button>
      </section>
      <section className="panel assignment-browser">
        <div className="assignment-browser-head">
          <div>
            <span className="section-eyebrow">ASSIGNMENT CENTER</span>
            <h3>งานทั้งหมด</h3>
            <p>พบ {filteredRows.length} งาน · เลือกงานเพื่อดูและให้คะแนน</p>
          </div>
          <div className="assignment-stats">
            <span>
              <b>{rows.filter((row) => row.status === "PUBLISHED").length}</b>{" "}
              เปิดรับ
            </span>
            <span>
              <b>
                {rows.reduce((sum, row) => sum + row._count.submissions, 0)}
              </b>{" "}
              งานที่ส่ง
            </span>
          </div>
        </div>
        <div className="assignment-filters">
          <label className="assignment-search">
            <Search size={16} />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="ค้นหาชื่องาน วิชา หรือห้องเรียน"
            />
          </label>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">ทุกสถานะ</option>
            <option value="PUBLISHED">เปิดรับงาน</option>
            <option value="DRAFT">ฉบับร่าง</option>
            <option value="CLOSED">ปิดรับงาน</option>
          </select>
          <select
            value={type}
            onChange={(event) => {
              setType(event.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">ทุกประเภท</option>
            <option value="GENERAL">งานทั่วไป</option>
            <option value="CODE">งาน Code</option>
          </select>
          <select
            value={subjectId}
            onChange={(event) => {
              setSubjectId(event.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">ทุกวิชา</option>
            {subjects.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          <select
            value={classroomId}
            onChange={(event) => {
              setClassroomId(event.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">ทุกห้องเรียน</option>
            {classrooms.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="filter-reset"
            onClick={resetFilters}
            disabled={
              !search &&
              status === "ALL" &&
              type === "ALL" &&
              subjectId === "ALL" &&
              classroomId === "ALL"
            }
          >
            ล้างตัวกรอง
          </button>
        </div>
      </section>
      {visibleRows.length ? (
        visibleRows.map((assignment) => (
          <details className="panel assignment-card" key={assignment.id}>
            <summary>
              <div className="assignment-summary">
                <span
                  className={`assignment-status status-${assignment.status.toLowerCase()}`}
                >
                  {assignment.status === "PUBLISHED"
                    ? "เปิดรับงาน"
                    : assignment.status === "CLOSED"
                      ? "ปิดรับงาน"
                      : "ฉบับร่าง"}
                </span>
                <strong>{assignment.title}</strong>
                <small>
                  {assignment.isGroupWork
                    ? `งานกลุ่ม ${assignment.minGroupSize}-${assignment.maxGroupSize} คน · `
                    : "งานเดี่ยว · "}
                  {assignment.type === "CODE"
                    ? `Code ${codeLanguageLabel(assignment.codeLanguage)} · ${assignment.aiGradingEnabled ? `ตรวจอัตโนมัติ (${assignment.aiGradingModel})` : "ครูตรวจ"} · `
                    : ""}
                  {assignment.subject.name} · {assignment.classroom.name} ·
                  ส่งภายใน {date(assignment.dueAt)}
                </small>
              </div>
              <div className="assignment-count">
                <b>{assignment._count.submissions}</b>
                <span>{assignment.isGroupWork ? "กลุ่มส่งแล้ว" : "ส่งแล้ว"}</span>
              </div>
            </summary>
            <div className="assignment-detail">
              <p>{assignment.description}</p>
              <div className="assignment-toolbar">
                <span>
                  คะแนนเต็ม <b>{Number(assignment.maxScore)}</b>
                </span>
                {!assignment.isGroupWork && (
                  <button
                    className="grade-classroom-button"
                    onClick={() => void onGradeClassroom(assignment)}
                  >
                    <Users /> ให้คะแนนทั้งห้อง
                  </button>
                )}
                <button onClick={() => onEdit(assignment)}>
                  <PencilLine /> แก้ไข
                </button>
                <button onClick={() => void onStatus(assignment)}>
                  {assignment.status === "PUBLISHED"
                    ? "ปิดรับงาน"
                    : "เปิดรับงาน"}
                </button>
                <button
                  className="danger-text"
                  onClick={() => void onDelete(assignment)}
                >
                  <Trash2 /> ลบ
                </button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>นักเรียน</th>
                      <th>ส่งเมื่อ</th>
                      <th>งานที่ส่ง</th>
                      <th>คะแนน / ผลประเมิน</th>
                      <th>จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignment.isGroupWork ? (
                      assignment.submissions.length ? (
                        assignment.submissions.map((submission) => (
                        <tr key={submission.id}>
                          <td>
                            {assignment.isGroupWork ? (
                              <div className="submission-group">
                                <strong>
                                  <Users size={14} /> กลุ่ม {submission.groupName}
                                </strong>
                                {(submission.members ?? []).map((member) => (
                                  <span key={member.studentId}>
                                    {member.student.user.firstName}{" "}
                                    {member.student.user.lastName} · {member.role}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <>
                                <strong>
                                  {submission.student.user.firstName}{" "}
                                  {submission.student.user.lastName}
                                </strong>
                                <span>{submission.student.studentCode}</span>
                              </>
                            )}
                          </td>
                          <td>
                            {date(submission.submittedAt)}
                            {new Date(submission.submittedAt) >
                              new Date(assignment.dueAt) && (
                              <span className="late-label">ส่งช้า</span>
                            )}
                          </td>
                          <td>
                            {assignment.type === "CODE" &&
                            submission.content ? (
                              <button
                                className="code-read-button"
                                onClick={() =>
                                  void showCodeSubmission(
                                    assignment,
                                    submission,
                                  )
                                }
                              >
                                <Eye /> อ่าน Source Code
                              </button>
                            ) : submission.content ? (
                              <span>{submission.content}</span>
                            ) : null}
                            {(submission.attachmentUrls?.length
                              ? submission.attachmentUrls
                              : submission.attachmentUrl
                                ? [submission.attachmentUrl]
                                : []
                            ).map((url, index) => (
                              <a
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                key={url}
                              >
                                เปิดลิงก์งาน {index + 1}
                              </a>
                            ))}
                          </td>
                          <td>
                            {submission.gradingMode === "INDIVIDUAL" ? (
                              <div className="individual-scores">
                                <b>คะแนนรายคน</b>
                                {(submission.members ?? []).map((member) => (
                                  <span key={member.studentId}>
                                    {member.student.user.firstName}: {member.score == null ? "-" : Number(member.score)}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <strong>
                                {submission.score == null
                                  ? "ยังไม่ตรวจ"
                                  : `${Number(submission.score)}/${Number(assignment.maxScore)}`}
                              </strong>
                            )}
                            {submission.assessment && (
                              <span className="grade-chip">
                                {submission.assessment}
                              </span>
                            )}
                          </td>
                          <td>
                            {assignment.type === "CODE" &&
                              submission.content && (
                                <button
                                  className="button secondary compact-button"
                                  onClick={() =>
                                    onRunCode(assignment, submission)
                                  }
                                >
                                  รันโค้ด
                                </button>
                              )}
                            <button
                              className="button secondary compact-button"
                              onClick={() =>
                                void onGrade(assignment, submission)
                              }
                            >
                              ให้คะแนน
                            </button>
                          </td>
                        </tr>
                        ))
                      ) : (
                        <TableEmpty colSpan={5} />
                      )
                    ) : (
                      assignment.students.length ? (
                        assignment.students.map((student) => {
                          const submission = assignment.submissions.find(
                            (item) => item.student.id === student.id,
                          );
                          const hasWork = Boolean(
                            submission?.content ||
                              submission?.attachmentUrl ||
                              submission?.attachmentUrls?.length,
                          );
                          return (
                            <tr key={student.id}>
                              <td>
                                <strong>
                                  {student.user.firstName} {student.user.lastName}
                                </strong>
                                <span>{student.studentCode}</span>
                              </td>
                              <td>
                                {hasWork && submission
                                  ? date(submission.submittedAt)
                                  : "—"}
                                {!hasWork && (
                                  <span className="not-submitted-label">
                                    ยังไม่ส่งในระบบ
                                  </span>
                                )}
                              </td>
                              <td>
                                {assignment.type === "CODE" &&
                                submission?.content ? (
                                  <button
                                    className="code-read-button"
                                    onClick={() =>
                                      void showCodeSubmission(
                                        assignment,
                                        submission,
                                      )
                                    }
                                  >
                                    <Eye /> อ่าน Source Code
                                  </button>
                                ) : submission?.content ? (
                                  <span>{submission.content}</span>
                                ) : (
                                  <span className="muted-cell">
                                    รับงานนอกระบบได้
                                  </span>
                                )}
                                {(submission?.attachmentUrls?.length
                                  ? submission.attachmentUrls
                                  : submission?.attachmentUrl
                                    ? [submission.attachmentUrl]
                                    : []
                                ).map((url, index) => (
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    key={url}
                                  >
                                    เปิดลิงก์งาน {index + 1}
                                  </a>
                                ))}
                              </td>
                              <td>
                                <strong>
                                  {submission?.score == null
                                    ? "ยังไม่ให้คะแนน"
                                    : `${Number(submission.score)}/${Number(assignment.maxScore)}`}
                                </strong>
                                {submission?.assessment && (
                                  <span className="grade-chip">
                                    {submission.assessment}
                                  </span>
                                )}
                              </td>
                              <td>
                                {assignment.type === "CODE" &&
                                  submission?.content && (
                                    <button
                                      className="button secondary compact-button"
                                      onClick={() =>
                                        onRunCode(assignment, submission)
                                      }
                                    >
                                      รันโค้ด
                                    </button>
                                  )}
                                <button
                                  className="button secondary compact-button"
                                  onClick={() =>
                                    void onGradeClassroom(
                                      assignment,
                                      student.id,
                                    )
                                  }
                                >
                                  ให้คะแนน
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <TableEmpty colSpan={5} />
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </details>
        ))
      ) : (
        <section className="panel full-panel">
          <EmptyState
            title={
              rows.length ? "ไม่พบงานที่ตรงกับตัวกรอง" : "ยังไม่มีงานที่มอบหมาย"
            }
          />
        </section>
      )}
      {filteredRows.length > perPage && (
        <footer className="pagination assignment-pagination">
          <span>
            แสดง {(activePage - 1) * perPage + 1}-
            {Math.min(activePage * perPage, filteredRows.length)} จาก{" "}
            {filteredRows.length} งาน
          </span>
          <div>
            <button
              type="button"
              onClick={() => setPage((current) => current - 1)}
              disabled={activePage === 1}
            >
              ก่อนหน้า
            </button>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map(
              (number) => (
                <button
                  type="button"
                  key={number}
                  className={activePage === number ? "active" : ""}
                  onClick={() => setPage(number)}
                >
                  {number}
                </button>
              ),
            )}
            <button
              type="button"
              onClick={() => setPage((current) => current + 1)}
              disabled={activePage === totalPages}
            >
              ถัดไป
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function LegacyAssignmentsView({
  rows,
  gradeScale,
  onEdit,
  onDelete,
  onStatus,
  onGrade,
  onEditScale,
}: {
  rows: Assignment[];
  gradeScale: Record<string, number>;
  onEdit: (row: Assignment) => void;
  onDelete: (row: Assignment) => void;
  onStatus: (row: Assignment) => void;
  onGrade: (assignment: Assignment, submission: AssignmentSubmission) => void;
  onEditScale: () => void;
}) {
  const date = (value: string) =>
    new Intl.DateTimeFormat("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  return (
    <div className="assignment-layout">
      <section className="grade-scale-bar">
        <div>
          <strong>เกณฑ์ประเมินงาน</strong>
          <span>
            ดีเยี่ยม ≥ 80% · ดี ≥ 70% · พอใช้ ≥ 60% · ปรับปรุง &lt; 60%
          </span>
        </div>
        <button className="button secondary" title={`เกณฑ์เกรดรายวิชา ${Object.entries(gradeScale).length} ระดับ`} onClick={() => void onEditScale()}>
          <PencilLine size={15} /> เกณฑ์เกรดรายวิชา
        </button>
      </section>
      {rows.length ? (
        rows.map((assignment) => (
          <details className="panel assignment-card" key={assignment.id}>
            <summary>
              <div className="assignment-summary">
                <span
                  className={`assignment-status status-${assignment.status.toLowerCase()}`}
                >
                  {assignment.status === "PUBLISHED"
                    ? "เปิดรับงาน"
                    : assignment.status === "CLOSED"
                      ? "ปิดรับงาน"
                      : "ฉบับร่าง"}
                </span>
                <strong>{assignment.title}</strong>
                <small>
                  {assignment.subject.name} · {assignment.classroom.name} ·
                  ส่งภายใน {date(assignment.dueAt)}
                </small>
              </div>
              <div className="assignment-count">
                <b>{assignment._count.submissions}</b>
                <span>ส่งแล้ว</span>
              </div>
            </summary>
            <div className="assignment-detail">
              <p>{assignment.description}</p>
              <div className="assignment-toolbar">
                <span>
                  คะแนนเต็ม <b>{Number(assignment.maxScore)}</b>
                </span>
                <button onClick={() => onEdit(assignment)}>
                  <PencilLine /> แก้ไข
                </button>
                <button onClick={() => void onStatus(assignment)}>
                  {assignment.status === "PUBLISHED"
                    ? "ปิดรับงาน"
                    : "เปิดรับงาน"}
                </button>
                <button
                  className="danger-text"
                  onClick={() => void onDelete(assignment)}
                >
                  <Trash2 /> ลบ
                </button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>นักเรียน</th>
                      <th>ส่งเมื่อ</th>
                      <th>งานที่ส่ง</th>
                      <th>คะแนน / ผลประเมิน</th>
                      <th>จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignment.submissions.length ? (
                      assignment.submissions.map((submission) => (
                        <tr key={submission.id}>
                          <td>
                            <strong>
                              {submission.student.user.firstName}{" "}
                              {submission.student.user.lastName}
                            </strong>
                            <span>{submission.student.studentCode}</span>
                          </td>
                          <td>
                            {date(submission.submittedAt)}
                            {new Date(submission.submittedAt) >
                              new Date(assignment.dueAt) && (
                              <span className="late-label">ส่งช้า</span>
                            )}
                          </td>
                          <td>
                            {submission.content && (
                              <span>{submission.content}</span>
                            )}
                            {submission.attachmentUrl && (
                              <a
                                href={submission.attachmentUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                เปิดลิงก์งาน
                              </a>
                            )}
                          </td>
                          <td>
                            <strong>
                              {submission.score == null
                                ? "ยังไม่ตรวจ"
                                : `${Number(submission.score)}/${Number(assignment.maxScore)}`}
                            </strong>
                            {submission.assessment && (
                              <span className="grade-chip">
                                {submission.assessment}
                              </span>
                            )}
                          </td>
                          <td>
                            <button
                              className="button secondary compact-button"
                              onClick={() =>
                                void onGrade(assignment, submission)
                              }
                            >
                              ให้คะแนน
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <TableEmpty colSpan={5} />
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </details>
        ))
      ) : (
        <section className="panel full-panel">
          <EmptyState title="ยังไม่มีงานที่มอบหมาย" />
        </section>
      )}
    </div>
  );
}

function AcademicRecordsView({ data }: { data: AcademicRecords | null }) {
  const [classroomId, setClassroomId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null,
  );
  const classroom =
    data?.classrooms.find((item) => item.classroom.id === classroomId) ??
    data?.classrooms[0];
  const subject =
    classroom?.subjects.find((item) => item.subject.id === subjectId) ??
    classroom?.subjects[0];
  const measured =
    subject?.students.filter((student) => student.percentage !== null) ?? [];
  const average = measured.length
    ? measured.reduce((sum, student) => sum + Number(student.percentage), 0) /
      measured.length
    : null;
  const selectedStudent = subject?.students.find(
    (student) => student.id === selectedStudentId,
  );
  return (
    <div className="academic-records">
      <section className="record-filters">
        <label>
          ห้องเรียน
          <select
            value={classroom?.classroom.id ?? ""}
            onChange={(event) => {
              setClassroomId(event.target.value);
              setSubjectId("");
              setSelectedStudentId(null);
            }}
          >
            {data?.classrooms.map((item) => (
              <option key={item.classroom.id} value={item.classroom.id}>
                {item.classroom.name} · {item.classroom.academicYear}
              </option>
            ))}
          </select>
        </label>
        <label>
          รายวิชา
          <select
            value={subject?.subject.id ?? ""}
            onChange={(event) => {
              setSubjectId(event.target.value);
              setSelectedStudentId(null);
            }}
          >
            {classroom?.subjects.map((item) => (
              <option key={item.subject.id} value={item.subject.id}>
                {item.subject.code} · {item.subject.name}
              </option>
            ))}
          </select>
        </label>
        <div>
          <span>เกณฑ์เกรด</span>
          <strong>
            {data
              ? Object.entries(data.gradeScale)
                  .sort((a, b) => b[1] - a[1])
                  .map(([grade, min]) => `${grade} ≥ ${min}%`)
                  .join(" · ")
              : "—"}
          </strong>
        </div>
      </section>
      {subject ? (
        <>
          <section className="record-metrics">
            <article>
              <span>นักเรียนทั้งหมด</span>
              <strong>{subject.students.length}</strong>
            </article>
            <article>
              <span>มีผลคะแนน</span>
              <strong>{measured.length}</strong>
            </article>
            <article>
              <span>คะแนนเฉลี่ย</span>
              <strong>
                {average === null ? "—" : `${average.toFixed(1)}%`}
              </strong>
            </article>
            <article>
              <span>รายวิชา</span>
              <strong>{subject.subject.name}</strong>
            </article>
          </section>
          <section className="panel full-panel">
            <PanelHeader
              title={`${subject.subject.name} — ${classroom?.classroom.name}`}
              subtitle="กดชื่อนักเรียนเพื่อดูคะแนนรายงานและรายข้อสอบ"
            />
            <div className="table-wrap">
              <table className="records-table">
                <thead>
                  <tr>
                    <th>รหัสนักเรียน</th>
                    <th>ชื่อ–นามสกุล</th>
                    <th>คะแนนสอบ</th>
                    <th>คะแนนงาน</th>
                    <th>คะแนนรวม</th>
                    <th>เปอร์เซ็นต์</th>
                    <th>เกรด</th>
                  </tr>
                </thead>
                <tbody>
                  {subject.students.length ? (
                    subject.students.map((student) => (
                      <tr key={student.id}>
                        <td>
                          <span className="code-chip">
                            {student.studentCode}
                          </span>
                        </td>
                        <td>
                          <button
                            className="record-student-link"
                            onClick={() => setSelectedStudentId(student.id)}
                          >
                            <strong>{student.name}</strong>
                          </button>
                        </td>
                        <td>
                          <strong>
                            {student.examMaxScore
                              ? `${student.examScore}/${student.examMaxScore}`
                              : "—"}
                          </strong>
                          <span>{student.examCount} รายการ</span>
                        </td>
                        <td>
                          <strong>
                            {student.assignmentMaxScore
                              ? `${student.assignmentScore}/${student.assignmentMaxScore}`
                              : "—"}
                          </strong>
                          <span>{student.assignmentCount} รายการ</span>
                        </td>
                        <td>
                          <strong>
                            {student.maxScore
                              ? `${student.score}/${student.maxScore}`
                              : "—"}
                          </strong>
                        </td>
                        <td>
                          {student.percentage === null
                            ? "—"
                            : `${student.percentage.toFixed(1)}%`}
                        </td>
                        <td>
                          <span
                            className={`record-grade ${student.grade ? "has-grade" : ""}`}
                          >
                            {student.grade ?? "—"}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <TableEmpty colSpan={7} />
                  )}
                </tbody>
              </table>
            </div>
          </section>
          {selectedStudent && (
            <section className="panel record-detail-panel">
              <PanelHeader
                title={`${selectedStudent.name} · รายละเอียดคะแนน`}
                subtitle={`${subject.subject.name} · ${classroom?.classroom.name}`}
              />
              <div className="record-detail-summary">
                <strong>
                  {selectedStudent.score}/{selectedStudent.maxScore} คะแนน ·{" "}
                  {selectedStudent.percentage?.toFixed(1) ?? "—"}% · เกรด{" "}
                  {selectedStudent.grade ?? "—"}
                </strong>
                <button
                  className="button secondary compact-button"
                  onClick={() => setSelectedStudentId(null)}
                >
                  ปิดรายละเอียด
                </button>
              </div>
              <div className="record-detail-columns">
                <div>
                  <h4>คะแนนสอบ</h4>
                  {selectedStudent.examResults.length ? (
                    selectedStudent.examResults.map((item) => (
                      <div className="record-detail-row" key={item.id}>
                        <span>{item.title}</span>
                        <strong>
                          {item.score}/{item.maxScore}
                        </strong>
                      </div>
                    ))
                  ) : (
                    <p className="record-no-data">ยังไม่มีผลสอบ</p>
                  )}
                </div>
                <div>
                  <h4>คะแนนงาน</h4>
                  {selectedStudent.assignmentResults.length ? (
                    selectedStudent.assignmentResults.map((item) => (
                      <div className="record-detail-row" key={item.id}>
                        <span>{item.title}</span>
                        <strong>
                          {item.score}/{item.maxScore}
                        </strong>
                      </div>
                    ))
                  ) : (
                    <p className="record-no-data">ยังไม่มีงานที่ตรวจแล้ว</p>
                  )}
                </div>
              </div>
            </section>
          )}
        </>
      ) : (
        <section className="panel full-panel">
          <EmptyState title="ยังไม่มีรายวิชาที่มีงานหรือข้อสอบในห้องนี้" />
        </section>
      )}
    </div>
  );
}

function ResultsView({
  rows,
  analysis,
  onOpen,
  onReset,
  resettingAttemptId,
}: {
  rows: Exam[];
  analysis: ExamAnalysis | null;
  onOpen: (examId: string) => void;
  onReset: (examId: string, student: ExamAnalysis["students"][number]) => void;
  resettingAttemptId: string | null;
}) {
  const measured = analysis?.students.length ?? 0;
  const average = measured
    ? analysis!.students.reduce(
        (sum, student) => sum + Number(student.percentage ?? 0),
        0,
      ) / measured
    : null;
  return (
    <div className="results-layout">
      <section className="panel">
        <PanelHeader
          title="เลือกชุดข้อสอบ"
          subtitle={`${rows.length} ชุดข้อสอบที่คุณดูแล`}
        />
        <div className="result-exam-list">
          {rows.length ? (
            rows.map((exam) => (
              <button
                className={analysis?.id === exam.id ? "active" : ""}
                key={exam.id}
                onClick={() => void onOpen(exam.id)}
              >
                <span>
                  <strong>{exam.title}</strong>
                  <small>
                    {exam.subject.name} · {exam.classroom.name}
                  </small>
                </span>
                <StatusBadge status={exam.status} />
              </button>
            ))
          ) : (
            <EmptyState title="ยังไม่มีชุดข้อสอบ" />
          )}
        </div>
      </section>
      <section className="panel result-detail">
        {analysis ? (
          <>
            <PanelHeader
              title={analysis.title}
              subtitle={`${analysis.subject} · ${analysis.classroom}`}
            />
            <div className="result-metrics">
              <article>
                <span>ผู้ส่งข้อสอบ</span>
                <strong>{measured}</strong>
              </article>
              <article>
                <span>คะแนนเฉลี่ย</span>
                <strong>
                  {average === null ? "—" : `${average.toFixed(1)}%`}
                </strong>
              </article>
              <article>
                <span>กลุ่มเก่ง</span>
                <strong>{analysis.distribution.strong}</strong>
              </article>
              <article>
                <span>ต้องเสริม</span>
                <strong>{analysis.distribution.needsSupport}</strong>
              </article>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>รหัสนักเรียน</th>
                    <th>ชื่อ–นามสกุล</th>
                    <th>คะแนน</th>
                    <th>กลุ่ม</th>
                    <th>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.students.length ? (
                    analysis.students.map((student) => {
                      const score = Number(student.percentage ?? 0);
                      const isResetting =
                        resettingAttemptId === student.attemptId;
                      return (
                        <tr key={student.attemptId}>
                          <td>
                            <span className="code-chip">
                              {student.studentCode}
                            </span>
                          </td>
                          <td>
                            <strong>{student.name}</strong>
                          </td>
                          <td>{score.toFixed(1)}%</td>
                          <td>
                            {score >= 80
                              ? "เก่ง"
                              : score >= 50
                                ? "กลาง"
                                : "ต้องเสริม"}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="reset-result-button"
                              onClick={() => void onReset(analysis.id, student)}
                              disabled={Boolean(resettingAttemptId)}
                              title="รีเซ็ตผลสอบเพื่อให้นักเรียนสอบใหม่"
                            >
                              <RotateCcw
                                className={isResetting ? "spin" : ""}
                              />{" "}
                              {isResetting ? "กำลังรีเซ็ต..." : "รีเซ็ตผลสอบ"}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <TableEmpty colSpan={5} />
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <EmptyState title="เลือกชุดข้อสอบเพื่อดูผลวิเคราะห์" />
        )}
      </section>
    </div>
  );
}

const violationLabel: Record<string, string> = {
  TAB_HIDDEN: "สลับแท็บหรือพับหน้าจอ",
  WINDOW_BLUR: "ออกจากหน้าต่างสอบ",
  COPY: "คัดลอกข้อความ",
  PASTE: "วางข้อความ",
  CUT: "ตัดข้อความ",
  PAGE_EXIT: "ออกหรือปิดหน้าสอบ",
};

function ExamLocksView({
  rows,
  onUnlock,
  unlockingAttemptId,
}: {
  rows: LockedAttempt[];
  onUnlock: (attempt: LockedAttempt) => void;
  unlockingAttemptId: string | null;
}) {
  const date = (value: string) =>
    new Intl.DateTimeFormat("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  return (
    <section className="panel full-panel exam-locks-panel">
      <PanelHeader
        title={`รอปลดล็อก ${rows.length} คน`}
        subtitle="รายการอัปเดตอัตโนมัติทุก 10 วินาที"
      />
      {rows.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>นักเรียน</th>
                <th>ชุดข้อสอบ</th>
                <th>เหตุการณ์ที่ตรวจพบ</th>
                <th>เวลาที่ล็อก</th>
                <th>จำนวนครั้ง</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((attempt) => {
                const isUnlocking = unlockingAttemptId === attempt.id;
                return (
                  <tr key={attempt.id}>
                    <td>
                      <div className="person-cell">
                        <span className="lock-avatar">
                          <LockKeyhole />
                        </span>
                        <span>
                          <strong>
                            {attempt.student.user.firstName}{" "}
                            {attempt.student.user.lastName}
                          </strong>
                          <small>{attempt.student.studentCode}</small>
                        </span>
                      </div>
                    </td>
                    <td>
                      <strong>{attempt.exam.title}</strong>
                      <span>
                        {attempt.exam.subject.name} ·{" "}
                        {attempt.exam.classroom.name}
                      </span>
                    </td>
                    <td>
                      <span className="violation-reason">
                        <ShieldAlert />
                        {violationLabel[attempt.lockReason] ||
                          attempt.lockReason}
                      </span>
                    </td>
                    <td>
                      <strong>{date(attempt.lockedAt)}</strong>
                      <span>ครั้งที่ {attempt.attemptNumber}</span>
                    </td>
                    <td>
                      <span className="violation-count">
                        {attempt.violationCount}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="unlock-attempt-button"
                        onClick={() => void onUnlock(attempt)}
                        disabled={Boolean(unlockingAttemptId)}
                      >
                        <LockKeyhole className={isUnlocking ? "spin" : ""} />
                        {isUnlocking ? "กำลังปลดล็อก..." : "ปลดล็อก"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="exam-locks-empty">
          <ShieldCheck />
          <strong>ไม่มีนักเรียนที่ถูกล็อก</strong>
          <span>เมื่อระบบตรวจพบเหตุการณ์ผิดปกติ รายการจะปรากฏที่นี่ทันที</span>
        </div>
      )}
    </section>
  );
}

function AiInsightsView({
  data,
  aiStatus,
}: {
  data: DashboardData | null;
  aiStatus: AiStatusData | null;
}) {
  const support = data?.studentGroups.NEEDS_SUPPORT ?? 0;
  return (
    <div className="ai-insights">
      {aiStatus?.mockMode && (
        <div className="ai-mode-alert">
          <Bot />
          <div>
            <strong>กำลังใช้โหมดจำลอง</strong>
            <span>
              AI Key ยังไม่ได้ตั้งค่า ผลลัพธ์จะเป็นข้อมูลตัวอย่างจนกว่าจะปิด
              AI_MOCK_MODE และเพิ่ม Key
            </span>
          </div>
        </div>
      )}
      <section className="ai-hero">
        <div className="ai-hero-icon">
          <Sparkles />
        </div>
        <div>
          <span>LAB EDU INTELLIGENCE</span>
          <h2>AI ช่วยมองเห็นสิ่งที่คะแนนอย่างเดียวบอกไม่ได้</h2>
          <p>ข้อมูลส่วนนี้จะชัดขึ้นเมื่อมีการสอบและการตอบคำถามมากขึ้น</p>
        </div>
      </section>
      <div className="insight-cards">
        <article>
          <div className="insight-top">
            <BrainCircuit />
            <span>ภาพรวมผู้เรียน</span>
          </div>
          <strong>
            {support > 0
              ? `พบ ${support} คนที่ควรได้รับการดูแล`
              : "ยังไม่พบสัญญาณที่ต้องเร่งดูแล"}
          </strong>
          <p>
            ระบบแบ่งกลุ่มจากคะแนนเฉลี่ย และพร้อมต่อยอดเป็นคำแนะนำรายตัวชี้วัด
          </p>
        </article>
        <article>
          <div className="insight-top">
            <FileQuestion />
            <span>คุณภาพคลังข้อสอบ</span>
          </div>
          <strong>มีข้อสอบ {data?.totals.questions ?? 0} ข้อ</strong>
          <p>
            ควรมีข้อสอบหลายระดับความยากในทุกตัวชี้วัดเพื่อให้ Adaptive Test
            ทำงานได้ดีที่สุด
          </p>
        </article>
        <article>
          <div className="insight-top">
            <Activity />
            <span>Adaptive Readiness</span>
          </div>
          <strong>
            {(data?.totals.questions ?? 0) >= 20
              ? "พร้อมเริ่มใช้งาน"
              : "ควรเพิ่มข้อสอบอีกเล็กน้อย"}
          </strong>
          <p>
            ข้อสอบที่หลากหลายช่วยให้ระบบเลือกระดับที่เหมาะสมกับนักเรียนแต่ละคน
          </p>
        </article>
      </div>
    </div>
  );
}

function OrganizationsView({
  rows,
  onEdit,
}: {
  rows: Organization[];
  onEdit: (organization: Organization) => void;
}) {
  return (
    <section className="panel full-panel">
      <PanelHeader
        title={`องค์กรทั้งหมด ${rows.length} แห่ง`}
        subtitle="แต่ละองค์กรมีข้อมูลและการตั้งค่า AI แยกจากกัน"
      />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>องค์กร</th>
              <th>ผู้ดูแลองค์กร</th>
              <th>ผู้ใช้งาน</th>
              <th>ห้องเรียน</th>
              <th>ชุดสอบ</th>
              <th>สถานะ</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((organization) => {
                const admin = organization.users[0];
                return (
                  <tr key={organization.id}>
                    <td>
                      <strong>{organization.name}</strong>
                      <span className="code-chip">{organization.code}</span>
                    </td>
                    <td>
                      {admin ? (
                        <>
                          <strong>
                            {admin.firstName} {admin.lastName}
                          </strong>
                          <span>{admin.email}</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{organization._count.users}</td>
                    <td>{organization._count.classrooms}</td>
                    <td>{organization._count.exams}</td>
                    <td>
                      <StatusBadge
                        status={organization.isActive ? "ACTIVE" : "INACTIVE"}
                      />
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          onClick={() => onEdit(organization)}
                          title="แก้ไของค์กร"
                        >
                          <PencilLine />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <TableEmpty colSpan={7} />
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AiModelsView({
  rows,
  models,
  onSubmit,
}: {
  rows: Organization[];
  models: AiCatalogModel[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [organizationId, setOrganizationId] = useState(rows[0]?.id ?? "");
  const selected =
    rows.find((organization) => organization.id === organizationId) ?? rows[0];
  if (!selected)
    return (
      <section className="panel full-panel">
        <EmptyState title="กรุณาเพิ่มองค์กรก่อนตั้งค่าโมเดล AI" />
      </section>
    );
  const gptModels = models.filter((model) => model.provider === "OPENAI");
  const geminiModels = models.filter((model) => model.provider === "GOOGLE");
  return (
    <div className="ai-model-layout">
      <section className="panel settings-card">
        <PanelHeader
          title="เลือกองค์กร"
          subtitle="ค่าโมเดลจะมีผลกับคำขอ AI ขององค์กรที่เลือก"
        />
        <div className="organization-picker">
          {rows.map((organization) => (
            <button
              type="button"
              className={selected.id === organization.id ? "active" : ""}
              key={organization.id}
              onClick={() => setOrganizationId(organization.id)}
            >
              <span className="org-list-icon">
                <Building2 />
              </span>
              <span>
                <strong>{organization.name}</strong>
                <small>{organization.code}</small>
              </span>
              <StatusBadge
                status={organization.isActive ? "ACTIVE" : "INACTIVE"}
              />
            </button>
          ))}
        </div>
      </section>
      <section className="panel settings-card">
        <PanelHeader
          title={`โมเดล AI — ${selected.name}`}
          subtitle={`พบ GPT ${gptModels.length} โมเดล และ Gemini ${geminiModels.length} โมเดล`}
        />
        <form
          className="settings-form ai-model-form"
          key={selected.id}
          onSubmit={onSubmit}
        >
          <input type="hidden" name="organizationId" value={selected.id} />
          <div className="model-field">
            <div className="provider-icon luna">G</div>
            <ModelSelect
              label="โมเดลสร้างข้อสอบ"
              name="generationModel"
              models={gptModels}
              currentValue={selected.aiGenerationModel ?? "gpt-5.6-luna"}
            />
          </div>
          <div className="model-field">
            <div className="provider-icon gemini">AI</div>
            <ModelSelect
              label="โมเดลตรวจคำตอบและให้เหตุผล"
              name="reasoningModel"
              models={models}
              currentValue={selected.aiReasoningModel ?? "gemini-2.5-flash"}
            />
          </div>
          <div className="model-field">
            <div className="provider-icon report">AI</div>
            <ModelSelect
              label="โมเดลสร้างรายงาน"
              name="reportModel"
              models={models}
              currentValue={selected.aiReportModel ?? "gemini-2.5-flash-lite"}
            />
          </div>
          <div className="ai-config-note">
            <ShieldCheck />
            <span>
              <strong>ราคาอ้างอิงจาก OpenRouter</strong> แสดงเป็น USD ต่อ 1M
              tokens และอาจต่างจากราคาที่เรียกผู้ให้บริการโดยตรง
            </span>
          </div>
          <div className="settings-form-actions">
            <button className="button primary" type="submit">
              <Bot size={16} /> บันทึกโมเดล AI
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function AiUsageView({
  data,
  onEditBudget,
}: {
  data: AiUsageData | null;
  onEditBudget: (organization: AiUsageOrganization) => void;
}) {
  if (!data) return <EmptyState title="ยังไม่มีข้อมูลการใช้งาน AI" />;
  const period = new Intl.DateTimeFormat("th-TH", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(data.periodStart));
  const token = (value: number) => value.toLocaleString("th-TH");
  const money = (value: number) =>
    new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: value < 1 ? 4 : 2,
      maximumFractionDigits: value < 1 ? 4 : 2,
    }).format(value);
  const rateMoney = (value: number) =>
    new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(value);
  const rateDate = data.exchangeRate
    ? new Intl.DateTimeFormat("th-TH", {
        dateStyle: "medium",
        timeZone: "UTC",
      }).format(new Date(`${data.exchangeRate.date}T00:00:00Z`))
    : null;
  return (
    <div className="usage-dashboard">
      <section className="usage-period">
        <div>
          <span>รอบการใช้งาน</span>
          <strong>{period}</strong>
        </div>
        <p>
          {data.exchangeRate ? (
            <>
              อัตราอ้างอิง 1 USD = {rateMoney(data.exchangeRate.rate)} · วันที่{" "}
              {rateDate}
            </>
          ) : (
            "ไม่สามารถดึงอัตราแลกเปลี่ยนล่าสุดได้"
          )}
        </p>
      </section>
      {!data.priceCatalogAvailable && (
        <div className="ai-mode-alert">
          <CircleHelp />
          <div>
            <strong>ยังคำนวณราคาโมเดลไม่ได้</strong>
            <span>
              ระบบแสดง token ได้ตามปกติ
              แต่แหล่งข้อมูลราคาโมเดลไม่พร้อมใช้งานชั่วคราว
            </span>
          </div>
        </div>
      )}
      {!data.exchangeRateAvailable && (
        <div className="ai-mode-alert">
          <CircleHelp />
          <div>
            <strong>ยังแปลงค่าใช้จ่ายเป็นเงินบาทไม่ได้</strong>
            <span>
              ระบบไม่พบอัตราแลกเปลี่ยน USD เป็น THB กรุณาลองรีเฟรชอีกครั้ง
            </span>
          </div>
        </div>
      )}
      <section className="metric-grid usage-metrics">
        <article className="metric-card">
          <div className="metric-icon violet">
            <Activity />
          </div>
          <div>
            <span>Token ที่ใช้</span>
            <strong>{token(data.totals.totalTokens)}</strong>
            <small>
              Input {token(data.totals.inputTokens)} · Output{" "}
              {token(data.totals.outputTokens)}
            </small>
          </div>
        </article>
        <article className="metric-card">
          <div className="metric-icon blue">
            <BarChart3 />
          </div>
          <div>
            <span>Token คงเหลือ</span>
            <strong>{token(data.totals.remainingTokens)}</strong>
            <small>จากโควตารวม {token(data.totals.totalBudget)}</small>
          </div>
        </article>
        <article className="metric-card">
          <div className="metric-icon green">
            <CircleDollarSign />
          </div>
          <div>
            <span>ค่าใช้จ่ายประมาณ</span>
            <strong>{money(data.totals.estimatedCostThb)}</strong>
            <small>ราคาโมเดลแปลงตามอัตรา USD/THB ล่าสุด</small>
          </div>
        </article>
        <article className="metric-card">
          <div className="metric-icon amber">
            <Bot />
          </div>
          <div>
            <span>คำขอ AI</span>
            <strong>{token(data.totals.requests)}</strong>
            <small>
              สำเร็จ {token(data.totals.successfulRequests)} · ล้มเหลว{" "}
              {token(data.totals.failedRequests)}
            </small>
          </div>
        </article>
      </section>
      <section className="panel full-panel usage-organizations">
        <PanelHeader
          title="การใช้งานแยกตามองค์กร"
          subtitle="โควตาและยอดใช้สะสมของเดือนปัจจุบัน"
        />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>องค์กร</th>
                <th>Token ที่ใช้</th>
                <th>โควตารายเดือน</th>
                <th>คงเหลือ</th>
                <th>ค่าใช้จ่าย (บาท)</th>
                <th>คำขอ</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {data.organizations.length ? (
                data.organizations.map((organization) => (
                  <tr key={organization.id}>
                    <td>
                      <strong>{organization.name}</strong>
                      <span>{organization.code}</span>
                    </td>
                    <td>
                      <strong>{token(organization.totalTokens)}</strong>
                      <div className="usage-progress">
                        <i style={{ width: `${organization.usagePercent}%` }} />
                      </div>
                      <span>{organization.usagePercent.toFixed(1)}%</span>
                    </td>
                    <td>{token(organization.aiMonthlyTokenBudget)}</td>
                    <td>
                      <strong
                        className={
                          organization.remainingTokens === 0 &&
                          organization.totalTokens > 0
                            ? "usage-exhausted"
                            : ""
                        }
                      >
                        {token(organization.remainingTokens)}
                      </strong>
                    </td>
                    <td>
                      <strong>{money(organization.estimatedCostThb)}</strong>
                      {organization.unknownCostRequests > 0 && (
                        <span>
                          ไม่ทราบราคา {organization.unknownCostRequests} คำขอ
                        </span>
                      )}
                    </td>
                    <td>
                      <strong>{token(organization.requests)}</strong>
                      <span>ผิดพลาด {token(organization.failedRequests)}</span>
                    </td>
                    <td>
                      <button
                        className="text-button"
                        onClick={() => void onEditBudget(organization)}
                      >
                        ตั้งโควตา
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <TableEmpty colSpan={7} />
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel usage-models">
        <PanelHeader
          title="การใช้งานแยกตามโมเดล"
          subtitle="รวมทุกองค์กรในรอบเดือนนี้"
        />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>โมเดล</th>
                <th>ผู้ให้บริการ</th>
                <th>Input</th>
                <th>Output</th>
                <th>รวม Token</th>
                <th>ค่าใช้จ่ายประมาณ (บาท)</th>
              </tr>
            </thead>
            <tbody>
              {data.totals.byModel.length ? (
                data.totals.byModel.map((model) => (
                  <tr key={`${model.provider}-${model.model}`}>
                    <td>
                      <strong>{model.model}</strong>
                      <span>{token(model.requests)} คำขอ</span>
                    </td>
                    <td>{model.provider}</td>
                    <td>{token(model.inputTokens)}</td>
                    <td>{token(model.outputTokens)}</td>
                    <td>
                      <strong>{token(model.totalTokens)}</strong>
                    </td>
                    <td>{money(model.estimatedCostThb)}</td>
                  </tr>
                ))
              ) : (
                <TableEmpty colSpan={6} />
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ModelSelect({
  label,
  name,
  models,
  currentValue,
}: {
  label: string;
  name: string;
  models: AiCatalogModel[];
  currentValue: string;
}) {
  const hasCurrent = models.some((model) => model.id === currentValue);
  return (
    <label className="form-field">
      {label}
      <select name={name} defaultValue={currentValue} required>
        {!hasCurrent && (
          <option value={currentValue}>{currentValue} — ค่าที่ใช้อยู่</option>
        )}
        {models.map((model) => (
          <option value={model.id} key={`${model.provider}-${model.id}`}>
            {model.name} — Input {formatTokenPrice(model.inputPricePerMillion)}{" "}
            / Output {formatTokenPrice(model.outputPricePerMillion)} ต่อ 1M
          </option>
        ))}
      </select>
    </label>
  );
}

function formatTokenPrice(value: number) {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: value > 0 && value < 0.01 ? 4 : 2, maximumFractionDigits: 4 })}`;
}

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        character
      ] ?? character,
  );
}

function codeLanguageLabel(language?: Assignment["codeLanguage"]) {
  return language === "CPP"
    ? "C++"
    : language === "CSHARP"
      ? "C#"
      : (language ?? "Code");
}

async function showCodeSubmission(
  assignment: Assignment,
  submission: AssignmentSubmission,
) {
  const language = assignment.codeLanguage ?? "PYTHON";
  const extension =
    language === "PYTHON"
      ? "py"
      : language === "CSHARP"
        ? "cs"
        : language === "CPP"
          ? "cpp"
          : "c";
  await Swal.fire({
    width: 900,
    title: `${submission.student.user.firstName} ${submission.student.user.lastName}`,
    html: `<div class="admin-code-viewer"><div class="admin-ide-bar"><i></i><i></i><i></i><span>main.${extension} · ${escapeHtml(assignment.title)}</span></div><pre><code>${highlightCodeHtml(submission.content ?? "", language)}</code></pre></div>`,
    showCloseButton: true,
    showConfirmButton: false,
  });
}

function highlightCodeHtml(code: string, language: string) {
  const words =
    "auto|break|case|catch|char|class|const|continue|def|delete|do|double|else|enum|except|false|finally|float|for|foreach|from|if|import|in|include|int|interface|lambda|long|namespace|new|null|None|operator|private|protected|public|raise|return|short|signed|sizeof|static|string|struct|switch|this|throw|true|True|try|typedef|typename|union|unsigned|using|var|virtual|void|while";
  const pattern =
    language === "PYTHON"
      ? new RegExp(
          `(#.*$)|("(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*')|(\\b\\d+(?:\\.\\d+)?\\b)|(\\b(?:${words})\\b)`,
          "gm",
        )
      : new RegExp(
          `(/\\*[\\s\\S]*?\\*/|//.*$)|("(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*')|(\\b\\d+(?:\\.\\d+)?\\b)|(\\b(?:${words})\\b)`,
          "gm",
        );
  let html = "";
  let last = 0;
  for (const match of code.matchAll(pattern)) {
    html += escapeHtml(code.slice(last, match.index));
    const tone = match[1]
      ? "comment"
      : match[2]
        ? "string"
        : match[3]
          ? "number"
          : "keyword";
    html += `<span class="token-${tone}">${escapeHtml(match[0])}</span>`;
    last = (match.index ?? 0) + match[0].length;
  }
  return html + escapeHtml(code.slice(last));
}

function SettingsView({
  profile,
  aiStatus,
  isTeacher,
  onUpdateName,
  onChangePassword,
  onToggleStudentAi,
}: {
  profile: UserProfile | null;
  aiStatus: AiStatusData | null;
  isTeacher: boolean;
  onUpdateName: (event: FormEvent<HTMLFormElement>) => void;
  onChangePassword: (event: FormEvent<HTMLFormElement>) => void;
  onToggleStudentAi: () => void;
}) {
  if (isTeacher)
    return (
      <div className="settings-grid teacher-settings">
        <section className="panel settings-card">
          <PanelHeader
            title="ข้อมูลบัญชีครู"
            subtitle="แก้ไขชื่อที่แสดงภายในระบบ"
          />
          <div className="account-summary">
            <Avatar name={profile?.firstName ?? "ครู"} large />
            <div>
              <strong>
                {profile?.firstName} {profile?.lastName}
              </strong>
              <span>{profile?.email}</span>
              <small>ครูผู้สอน · {profile?.organization.name}</small>
            </div>
          </div>
          <form className="settings-form" onSubmit={onUpdateName}>
            <div className="field-row">
              <Field
                label="ชื่อ"
                name="firstName"
                defaultValue={profile?.firstName}
                required
              />
              <Field
                label="นามสกุล"
                name="lastName"
                defaultValue={profile?.lastName}
                required
              />
            </div>
            <label className="form-field">
              อีเมล
              <input value={profile?.email ?? ""} readOnly />
            </label>
            <div className="settings-form-actions">
              <button className="button primary" type="submit">
                <PencilLine size={16} /> บันทึกข้อมูล
              </button>
            </div>
          </form>
        </section>
        <section className="panel settings-card">
          <PanelHeader
            title="เปลี่ยนรหัสผ่าน"
            subtitle="ยืนยันรหัสผ่านเดิมก่อนตั้งรหัสผ่านใหม่"
          />
          <div className="password-note">
            <ShieldCheck />
            <div>
              <strong>รักษาความปลอดภัยบัญชี</strong>
              <span>รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร</span>
            </div>
          </div>
          <form className="settings-form" onSubmit={onChangePassword}>
            <Field
              label="รหัสผ่านปัจจุบัน"
              name="currentPassword"
              type="password"
              minLength={8}
              autoComplete="current-password"
              required
            />
            <Field
              label="รหัสผ่านใหม่"
              name="newPassword"
              type="password"
              minLength={8}
              autoComplete="new-password"
              required
            />
            <Field
              label="ยืนยันรหัสผ่านใหม่"
              name="confirmPassword"
              type="password"
              minLength={8}
              autoComplete="new-password"
              required
            />
            <div className="settings-form-actions">
              <button className="button primary" type="submit">
                <ShieldCheck size={16} /> เปลี่ยนรหัสผ่าน
              </button>
            </div>
          </form>
        </section>
      </div>
    );
  return (
    <div className="settings-grid">
      <section className="panel settings-card">
        <PanelHeader
          title="ข้อมูลองค์กร"
          subtitle="ข้อมูลโรงเรียนที่เชื่อมกับบัญชีนี้"
        />
        <div className="school-profile">
          <div className="school-logo">
            <School />
          </div>
          <div>
            <h3>{profile?.organization.name}</h3>
            <p>รหัสองค์กร: {profile?.organization.code}</p>
          </div>
        </div>
        <div className="readonly-grid">
          <label>
            ชื่อผู้ดูแล
            <span>
              {profile?.firstName} {profile?.lastName}
            </span>
          </label>
          <label>
            อีเมล<span>{profile?.email}</span>
          </label>
          <label>
            สิทธิ์การใช้งาน<span>ผู้ดูแลระบบ</span>
          </label>
          <label>
            API Status<span className="online-dot">เชื่อมต่อแล้ว</span>
          </label>
        </div>
      </section>
      <section className="panel settings-card">
        <PanelHeader
          title="การเชื่อมต่อ AI"
          subtitle="กำหนดการใช้งาน AI ของผู้เรียนและตรวจสอบผู้ให้บริการ"
        />
        {profile?.role === "ADMIN" && (
          <div className="student-ai-control">
            <div>
              <Bot />
              <span>
                <strong>AI สำหรับผู้เรียน</strong>
                <small>คำแนะนำรายข้อและรายงานการเรียนรู้หลังสอบ</small>
              </span>
            </div>
            <button
              type="button"
              className={`availability-switch ${aiStatus?.studentAiEnabled ? "on" : "off"}`}
              role="switch"
              aria-checked={aiStatus?.studentAiEnabled ?? false}
              onClick={() => void onToggleStudentAi()}
              disabled={!aiStatus}
            >
              <i />
              <span>{aiStatus?.studentAiEnabled ? "เปิด" : "ปิด"}</span>
            </button>
          </div>
        )}
        {aiStatus?.mockMode && (
          <div className="mock-mode-note">
            <Bot />
            <div>
              <strong>AI Mock Mode เปิดอยู่</strong>
              <span>
                ระบบกำลังตอบด้วยข้อมูลจำลอง ไม่ได้เรียกผู้ให้บริการ AI จริง
              </span>
            </div>
          </div>
        )}
        <div className="connection-list">
          {aiStatus?.services.map((service) => (
            <div key={service.id}>
              <div
                className={`provider-icon ${service.id === "generation" ? "luna" : service.id === "reasoning" ? "gemini" : "report"}`}
              >
                {service.provider[0]}
              </div>
              <div>
                <strong>{service.provider}</strong>
                <span>
                  {service.purpose} · {service.model}
                </span>
                {!service.configured && <small>ยังไม่ได้เพิ่ม API Key</small>}
              </div>
              <ConnectionBadge mode={service.mode} />
            </div>
          )) ?? (
            <div className="status-loading">กำลังตรวจสอบการตั้งค่า AI...</div>
          )}
        </div>
      </section>
    </div>
  );
}

function QuestionImportDialog({
  loading,
  subjects,
  indicators,
  onClose,
  onImport,
}: {
  loading: boolean;
  subjects: Subject[];
  indicators: Indicator[];
  onClose: () => void;
  onImport: (
    text: string,
    settings: {
      subjectCode: string;
      indicatorCode?: string;
      type: string;
      difficulty: string;
    },
  ) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [indicatorCode, setIndicatorCode] = useState("");
  const [type, setType] = useState("MULTIPLE_CHOICE");
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const fileRef = useRef<HTMLInputElement>(null);
  const selectedSubject = subjects.find((subject) => subject.id === subjectId);
  const validation = useMemo(
    () => validateQuestionImportJson(text, type),
    [text, type],
  );
  const loadFile = async (file: File) => {
    try {
      setText(await file.text());
    } catch (error) {
      await showError(error);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };
  const downloadExample = () => {
    const blob = new Blob([JSON.stringify(questionImportExample, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "lab-edu-questions-example.json";
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) =>
        event.target === event.currentTarget && !loading && onClose()
      }
    >
      <section
        className="modal question-import-modal"
        role="dialog"
        aria-modal="true"
        aria-label="นำเข้าข้อสอบ JSON"
      >
        <header>
          <div>
            <span>JSON IMPORT</span>
            <h2>นำเข้าข้อสอบ JSON</h2>
          </div>
          <button className="icon-button" onClick={onClose} disabled={loading}>
            <X />
          </button>
        </header>
        <div className="modal-content">
          <div className="json-import-config">
            <label className="form-field">
              รายวิชา
              <select
                value={subjectId}
                onChange={(event) => {
                  setSubjectId(event.target.value);
                  setIndicatorCode("");
                }}
                required
              >
                {subjects.map((subject) => (
                  <option value={subject.id} key={subject.id}>
                    {subject.name} ({subject.code})
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              ตัวชี้วัด
              <select
                value={indicatorCode}
                onChange={(event) => setIndicatorCode(event.target.value)}
              >
                <option value="">ไม่ระบุ</option>
                {indicators
                  .filter((indicator) => indicator.subject.id === subjectId)
                  .map((indicator) => (
                    <option value={indicator.code} key={indicator.id}>
                      {indicator.code} — {indicator.description}
                    </option>
                  ))}
              </select>
            </label>
            <label className="form-field">
              ประเภทข้อสอบ
              <select
                value={type}
                onChange={(event) => setType(event.target.value)}
              >
                {Object.entries(questionTypeLabel).map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              ความยาก
              <select
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value)}
              >
                {Object.entries(difficultyLabel).map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="json-import-note">
            <CircleHelp />
            <span>
              ค่าด้านบนจะถูกใช้กับข้อสอบทุกข้อใน JSON จึงไม่ต้องใส่ subjectCode,
              indicatorCode, type หรือ difficulty ในแต่ละข้อ
            </span>
          </div>
          <div className="json-import-actions">
            <button
              className="button secondary"
              type="button"
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={16} /> เลือกไฟล์ JSON
            </button>
            <button
              className="button secondary"
              type="button"
              onClick={() =>
                setText(JSON.stringify(questionImportExample, null, 2))
              }
            >
              <FileQuestion size={16} /> เติมข้อมูลตัวอย่าง
            </button>
            <button
              className="text-button"
              type="button"
              onClick={downloadExample}
            >
              ดาวน์โหลดตัวอย่าง
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(event) =>
                event.target.files?.[0] && void loadFile(event.target.files[0])
              }
            />
          </div>
          <label className="form-field">
            วาง JSON ที่นี่
            <textarea
              className="json-import-editor"
              rows={18}
              value={text}
              onChange={(event) => setText(event.target.value)}
              spellCheck={false}
              placeholder={'{\n  "questions": [\n    ...\n  ]\n}'}
            />
          </label>
          <div
            className={`json-validation ${validation.valid ? "valid" : text.trim() ? "invalid" : "idle"}`}
          >
            <span>
              {validation.valid
                ? `พร้อมนำเข้า ${validation.count} ข้อ`
                : validation.message}
            </span>
            {validation.valid && (
              <small>ระบบจะตรวจสอบรายวิชาและตัวชี้วัดอีกครั้งก่อนบันทึก</small>
            )}
          </div>
        </div>
        <footer>
          <button
            type="button"
            className="button secondary"
            onClick={onClose}
            disabled={loading}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            className="button primary"
            onClick={() =>
              selectedSubject &&
              void onImport(text, {
                subjectCode: selectedSubject.code,
                indicatorCode: indicatorCode || undefined,
                type,
                difficulty,
              })
            }
            disabled={!validation.valid || !selectedSubject || loading}
          >
            {loading
              ? "กำลังนำเข้า..."
              : `นำเข้า ${validation.valid ? validation.count : 0} ข้อ`}
          </button>
        </footer>
      </section>
    </div>
  );
}

function validateQuestionImportJson(
  text: string,
  type: string,
):
  | { valid: true; count: number; message: string }
  | { valid: false; count: 0; message: string } {
  if (!text.trim())
    return {
      valid: false,
      count: 0,
      message: "วาง JSON หรือเลือกไฟล์เพื่อเริ่มตรวจสอบ",
    };
  try {
    const parsed = JSON.parse(text) as unknown;
    const questions = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object"
        ? (parsed as { questions?: unknown }).questions
        : undefined;
    if (!Array.isArray(questions))
      return {
        valid: false,
        count: 0,
        message: 'ต้องเป็น { "questions": [...] } หรือ array ของข้อสอบ',
      };
    if (!questions.length)
      return { valid: false, count: 0, message: "ต้องมีข้อสอบอย่างน้อย 1 ข้อ" };
    if (questions.length > 500)
      return {
        valid: false,
        count: 0,
        message: "นำเข้าได้สูงสุดครั้งละ 500 ข้อ",
      };
    for (let index = 0; index < questions.length; index += 1) {
      const item = questions[index];
      if (!item || typeof item !== "object" || Array.isArray(item))
        return {
          valid: false,
          count: 0,
          message: `ข้อที่ ${index + 1}: รูปแบบข้อมูลไม่ถูกต้อง`,
        };
      const question = item as Record<string, unknown>;
      for (const field of ["prompt"]) {
        if (
          typeof question[field] !== "string" ||
          !String(question[field]).trim()
        )
          return {
            valid: false,
            count: 0,
            message: `ข้อที่ ${index + 1}: ไม่พบ ${field}`,
          };
      }
      if (
        !question.answerKey ||
        typeof question.answerKey !== "object" ||
        Array.isArray(question.answerKey)
      )
        return {
          valid: false,
          count: 0,
          message: `ข้อที่ ${index + 1}: answerKey ไม่ถูกต้อง`,
        };
      if (type === "MULTIPLE_CHOICE" || type === "TRUE_FALSE") {
        if (!Array.isArray(question.options) || question.options.length < 2)
          return {
            valid: false,
            count: 0,
            message: `ข้อที่ ${index + 1}: ต้องมีตัวเลือกอย่างน้อย 2 ตัวเลือก`,
          };
        const correctId = String(
          (question.answerKey as Record<string, unknown>).correctOptionId ?? "",
        );
        if (
          !question.options.some(
            (option) =>
              option &&
              typeof option === "object" &&
              String((option as { id?: unknown }).id ?? "") === correctId,
          )
        )
          return {
            valid: false,
            count: 0,
            message: `ข้อที่ ${index + 1}: correctOptionId ไม่ตรงกับตัวเลือก`,
          };
      }
    }
    return { valid: true, count: questions.length, message: "ข้อมูลถูกต้อง" };
  } catch (error) {
    return {
      valid: false,
      count: 0,
      message: `JSON ไม่ถูกต้อง: ${error instanceof Error ? error.message : "ไม่สามารถอ่านข้อมูลได้"}`,
    };
  }
}

function QuestionDialog({
  mode,
  question,
  subjects,
  indicators,
  onClose,
  onEdit,
  onSave,
}: {
  mode: "view" | "edit" | "create";
  question: Question;
  subjects: Subject[];
  indicators: Indicator[];
  onClose: () => void;
  onEdit: () => void;
  onSave: (payload: Record<string, unknown>) => void;
}) {
  const initialOptions = Array.isArray(question.options)
    ? question.options
    : [];
  const initialKey = question.answerKey ?? {};
  const [subjectId, setSubjectId] = useState(question.subject.id);
  const [indicatorId, setIndicatorId] = useState(question.indicator?.id ?? "");
  const [type, setType] = useState(question.type);
  const [difficulty, setDifficulty] = useState(question.difficulty);
  const [prompt, setPrompt] = useState(question.prompt);
  const [options, setOptions] =
    useState<Array<{ id: string; text: string }>>(initialOptions);
  const [correctOptionId, setCorrectOptionId] = useState(
    String(initialKey.correctOptionId ?? initialOptions[0]?.id ?? ""),
  );
  const [answerText, setAnswerText] = useState(() => {
    if (Array.isArray(initialKey.acceptedAnswers))
      return initialKey.acceptedAnswers.map(String).join("\n");
    if (typeof initialKey.rubric === "string") return initialKey.rubric;
    if (typeof initialKey.idealAnswer === "string")
      return initialKey.idealAnswer;
    if (typeof initialKey.answer === "string") return initialKey.answer;
    return Object.keys(initialKey).length
      ? JSON.stringify(initialKey, null, 2)
      : "";
  });
  const [explanation, setExplanation] = useState(question.explanation ?? "");
  const [maxScore, setMaxScore] = useState(Number(question.maxScore) || 1);
  const isChoice = type === "MULTIPLE_CHOICE" || type === "TRUE_FALSE";

  const changeType = (nextType: string) => {
    setType(nextType);
    if (
      (nextType === "MULTIPLE_CHOICE" || nextType === "TRUE_FALSE") &&
      options.length < 2
    ) {
      const defaults =
        nextType === "TRUE_FALSE"
          ? [
              { id: "T", text: "ถูก" },
              { id: "F", text: "ผิด" },
            ]
          : [
              { id: "A", text: "ตัวเลือก A" },
              { id: "B", text: "ตัวเลือก B" },
            ];
      setOptions(defaults);
      setCorrectOptionId(defaults[0].id);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanOptions = options.filter((option) => option.text.trim());
    if (isChoice && cleanOptions.length < 2) {
      void Swal.fire({
        icon: "warning",
        title: "กรุณาระบุตัวเลือกอย่างน้อย 2 ตัวเลือก",
      });
      return;
    }
    if (
      isChoice &&
      !cleanOptions.some((option) => option.id === correctOptionId)
    ) {
      void Swal.fire({ icon: "warning", title: "กรุณาเลือกคำตอบที่ถูกต้อง" });
      return;
    }
    const acceptedAnswers = answerText
      .split("\n")
      .map((answer) => answer.trim())
      .filter(Boolean);
    onSave({
      subjectId,
      indicatorId: indicatorId || "",
      type,
      difficulty,
      prompt,
      options: isChoice ? cleanOptions : [],
      answerKey: isChoice
        ? { correctOptionId }
        : type === "ESSAY"
          ? { rubric: answerText }
          : { acceptedAnswers },
      explanation,
      maxScore,
    });
  };

  if (mode === "view") {
    return (
      <div
        className="modal-backdrop"
        role="presentation"
        onMouseDown={(event) =>
          event.target === event.currentTarget && onClose()
        }
      >
        <section
          className="modal question-detail-modal"
          role="dialog"
          aria-modal="true"
          aria-label="รายละเอียดข้อสอบ"
        >
          <header>
            <div>
              <span>QUESTION DETAIL</span>
              <h2>รายละเอียดข้อสอบ</h2>
            </div>
            <button className="icon-button" onClick={onClose}>
              <X />
            </button>
          </header>
          <div className="question-detail-content">
            <div className="question-detail-meta">
              <span className="soft-chip">
                {questionTypeLabel[question.type] || question.type}
              </span>
              <DifficultyBadge value={question.difficulty} />
              <span>{question.subject.name}</span>
              <span>{Number(question.maxScore)} คะแนน</span>
            </div>
            <section className="question-block">
              <label>คำถาม</label>
              <h3>{question.prompt}</h3>
            </section>
            {initialOptions.length > 0 && (
              <section className="question-block">
                <label>ตัวเลือก</label>
                <div className="detail-options">
                  {initialOptions.map((option) => (
                    <div
                      className={
                        String(initialKey.correctOptionId) === option.id
                          ? "correct"
                          : ""
                      }
                      key={option.id}
                    >
                      <b>{option.id}</b>
                      <span>{option.text}</span>
                      {String(initialKey.correctOptionId) === option.id && (
                        <small>คำตอบที่ถูก</small>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
            <section className="answer-panel">
              <label>เฉลย / เกณฑ์คำตอบ</label>
              <pre>{formatAnswerKey(initialKey, initialOptions)}</pre>
            </section>
            <section className="question-block">
              <label>คำอธิบาย</label>
              <p>{question.explanation || "ยังไม่มีคำอธิบาย"}</p>
            </section>
            <div className="question-audit">
              <span>ตัวชี้วัด: {question.indicator?.code || "ไม่ระบุ"}</span>
              <span>ใช้ในชุดสอบ {question._count?.examItems ?? 0} ชุด</span>
              <span>
                สร้างโดย{" "}
                {question.createdBy
                  ? `${question.createdBy.firstName} ${question.createdBy.lastName}`
                  : "—"}
              </span>
            </div>
          </div>
          <footer>
            <button
              type="button"
              className="button secondary"
              onClick={onClose}
            >
              ปิด
            </button>
            <button type="button" className="button primary" onClick={onEdit}>
              <PencilLine size={16} /> แก้ไขข้อสอบ
            </button>
          </footer>
        </section>
      </div>
    );
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="modal question-edit-modal"
        role="dialog"
        aria-modal="true"
        aria-label={mode === "create" ? "เพิ่มข้อสอบด้วยตนเอง" : "แก้ไขข้อสอบ"}
      >
        <header>
          <div>
            <span>
              {mode === "create" ? "MANUAL QUESTION" : "EDIT QUESTION"}
            </span>
            <h2>
              {mode === "create"
                ? "เพิ่มข้อสอบด้วยตนเอง"
                : "แก้ไขข้อสอบและเฉลย"}
            </h2>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X />
          </button>
        </header>
        <form onSubmit={submit}>
          <div className="modal-content">
            <div className="field-row">
              <label className="form-field">
                รายวิชา
                <select
                  value={subjectId}
                  onChange={(event) => {
                    setSubjectId(event.target.value);
                    setIndicatorId("");
                  }}
                  required
                >
                  {subjects.map((subject) => (
                    <option value={subject.id} key={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                ตัวชี้วัด
                <select
                  value={indicatorId}
                  onChange={(event) => setIndicatorId(event.target.value)}
                >
                  <option value="">ไม่ระบุ</option>
                  {indicators
                    .filter((indicator) => indicator.subject.id === subjectId)
                    .map((indicator) => (
                      <option value={indicator.id} key={indicator.id}>
                        {indicator.code} — {indicator.description}
                      </option>
                    ))}
                </select>
              </label>
            </div>
            <div className="field-row">
              <label className="form-field">
                ประเภท
                <select
                  value={type}
                  onChange={(event) => changeType(event.target.value)}
                >
                  {Object.entries(questionTypeLabel).map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                ความยาก
                <select
                  value={difficulty}
                  onChange={(event) => setDifficulty(event.target.value)}
                >
                  {Object.entries(difficultyLabel).map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="form-field">
              คำถาม
              <textarea
                rows={4}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                required
              />
            </label>
            {isChoice && (
              <div className="option-editor">
                <label>ตัวเลือกและเฉลย</label>
                {options.map((option, index) => (
                  <div
                    className="option-edit-row"
                    key={`${option.id}-${index}`}
                  >
                    <input
                      type="radio"
                      name="correctOption"
                      checked={correctOptionId === option.id}
                      onChange={() => setCorrectOptionId(option.id)}
                      aria-label={`เลือก ${option.id} เป็นคำตอบที่ถูก`}
                    />
                    <span>{option.id}</span>
                    <input
                      value={option.text}
                      onChange={(event) =>
                        setOptions((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, text: event.target.value }
                              : item,
                          ),
                        )
                      }
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setOptions((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                      disabled={options.length <= 2}
                    >
                      <X />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="add-option-button"
                  onClick={() => {
                    const id = String.fromCharCode(65 + options.length);
                    setOptions((current) => [...current, { id, text: "" }]);
                  }}
                >
                  + เพิ่มตัวเลือก
                </button>
              </div>
            )}
            {!isChoice && (
              <label className="form-field">
                {type === "ESSAY"
                  ? "แนวคำตอบ / Rubric"
                  : "คำตอบที่ยอมรับ (หนึ่งคำตอบต่อหนึ่งบรรทัด)"}
                <textarea
                  rows={4}
                  value={answerText}
                  onChange={(event) => setAnswerText(event.target.value)}
                  required
                />
              </label>
            )}
            <label className="form-field">
              คำอธิบายเฉลย
              <textarea
                rows={3}
                value={explanation}
                onChange={(event) => setExplanation(event.target.value)}
              />
            </label>
            <Field
              label="คะแนนเต็ม"
              name="maxScore"
              type="number"
              min={0.01}
              max={1000}
              step={0.01}
              value={maxScore}
              onChange={(event) => setMaxScore(Number(event.target.value))}
              required
            />
          </div>
          <footer>
            <button
              type="button"
              className="button secondary"
              onClick={onClose}
            >
              ยกเลิก
            </button>
            <button type="submit" className="button primary">
              {mode === "create" ? "เพิ่มเข้าธนาคารข้อสอบ" : "บันทึกการแก้ไข"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function formatAnswerKey(
  answerKey: Record<string, unknown>,
  options: Array<{ id: string; text: string }>,
) {
  if (answerKey.correctOptionId) {
    const option = options.find(
      (item) => item.id === String(answerKey.correctOptionId),
    );
    return option
      ? `${option.id}. ${option.text}`
      : String(answerKey.correctOptionId);
  }
  if (Array.isArray(answerKey.acceptedAnswers))
    return answerKey.acceptedAnswers.join("\n");
  if (typeof answerKey.rubric === "string") return answerKey.rubric;
  if (typeof answerKey.idealAnswer === "string") return answerKey.idealAnswer;
  return JSON.stringify(answerKey, null, 2);
}

function DataModal({
  kind,
  classrooms,
  teachers,
  subjects,
  indicators,
  questions,
  isTeacher,
  editingStudent,
  editingClassroom,
  editingSubject,
  editingIndicator,
  editingAssignment,
  editingOrganization,
  aiStatus,
  onClose,
  onSubmit,
}: {
  kind: Exclude<ModalKind, null>;
  classrooms: Classroom[];
  teachers: Teacher[];
  subjects: Subject[];
  indicators: Indicator[];
  questions: Question[];
  isTeacher: boolean;
  editingStudent: Student | null;
  editingClassroom: Classroom | null;
  editingSubject: Subject | null;
  editingIndicator: Indicator | null;
  editingAssignment: Assignment | null;
  editingOrganization: Organization | null;
  aiStatus: AiStatusData | null;
  onClose: () => void;
  onSubmit: (data: FormData) => void;
}) {
  const [examSubjectId, setExamSubjectId] = useState(subjects[0]?.id ?? "");
  const [generateSubjectId, setGenerateSubjectId] = useState(
    subjects[0]?.id ?? "",
  );
  const [generateIndicatorId, setGenerateIndicatorId] = useState("");
  const [assignmentType, setAssignmentType] = useState<"GENERAL" | "CODE">(
    editingAssignment?.type ?? "GENERAL",
  );
  const [assignmentAiEnabled, setAssignmentAiEnabled] = useState(
    editingAssignment?.aiGradingEnabled ?? false,
  );
  const [assignmentGroupWork, setAssignmentGroupWork] = useState(
    editingAssignment?.isGroupWork ?? false,
  );
  const codeModels = [
    ...new Set(
      (aiStatus?.services ?? [])
        .filter(
          (service) => service.id === "reasoning" || service.id === "report",
        )
        .map((service) => service.model),
    ),
  ];
  const titles: Record<Exclude<ModalKind, null>, string> = {
    student: editingStudent ? "แก้ไขนักเรียน" : "เพิ่มนักเรียน",
    teacher: "เพิ่มครูผู้สอน",
    classroom: editingClassroom ? "แก้ไขห้องเรียน" : "สร้างห้องเรียน",
    subject: editingSubject ? "แก้ไขรายวิชา" : "เพิ่มรายวิชา",
    indicator: editingIndicator ? "แก้ไขตัวชี้วัด" : "เพิ่มตัวชี้วัด",
    generate: "สร้างข้อสอบด้วย AI",
    exam: "สร้างชุดข้อสอบ",
    assignment: editingAssignment ? "แก้ไขงาน" : "เพิ่มงาน",
    organization: editingOrganization ? "แก้ไของค์กร" : "เพิ่มองค์กร",
  };
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(new FormData(event.currentTarget));
  };
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={titles[kind]}
      >
        <header>
          <div>
            <span>{kind === "generate" ? "AI ASSISTANT" : "LAB EDU"}</span>
            <h2>{titles[kind]}</h2>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X />
          </button>
        </header>
        <form onSubmit={handleSubmit}>
          <div className="modal-content">
            {(kind === "student" || kind === "teacher") && (
              <>
                <div className="field-row">
                  <Field
                    label="ชื่อ"
                    name="firstName"
                    defaultValue={editingStudent?.user.firstName}
                    required
                  />
                  <Field
                    label="นามสกุล"
                    name="lastName"
                    defaultValue={editingStudent?.user.lastName}
                    required
                  />
                </div>
                <Field
                  label="อีเมล"
                  name="email"
                  type="email"
                  defaultValue={editingStudent?.user.email}
                  required
                />
                <Field
                  label={
                    editingStudent
                      ? "รหัสผ่านใหม่ (เว้นว่างหากไม่เปลี่ยน)"
                      : "รหัสผ่านเริ่มต้น"
                  }
                  name="password"
                  type="password"
                  minLength={8}
                  defaultValue={editingStudent ? "" : "Welcome123!"}
                  required={!editingStudent}
                />
                {kind === "student" && (
                  <>
                    <div className="field-row">
                      <Field
                        label="รหัสนักเรียน"
                        name="studentCode"
                        defaultValue={editingStudent?.studentCode}
                        required
                      />
                      <Field
                        label="ระดับชั้น"
                        name="gradeLevel"
                        placeholder="เช่น ม.1"
                        defaultValue={editingStudent?.gradeLevel}
                      />
                    </div>
                    <SelectField
                      label="ห้องเรียน"
                      name="classroomId"
                      options={classrooms.map((room) => ({
                        value: room.id,
                        label: room.name,
                      }))}
                      optional={!isTeacher || !!editingStudent}
                      defaultValue={
                        editingStudent?.enrollments[0]?.classroom.id
                      }
                    />
                  </>
                )}
              </>
            )}
            {kind === "classroom" && (
              <>
                <Field
                  label="ชื่อห้องเรียน"
                  name="name"
                  placeholder="เช่น ม.1/1"
                  defaultValue={editingClassroom?.name}
                  required
                />
                <div className="field-row">
                  <Field
                    label="ระดับชั้น"
                    name="gradeLevel"
                    placeholder="ม.1"
                    defaultValue={editingClassroom?.gradeLevel}
                  />
                  <Field
                    label="ปีการศึกษา"
                    name="academicYear"
                    defaultValue={editingClassroom?.academicYear ?? "2569"}
                    required
                  />
                </div>
                {!isTeacher && (
                  <SelectField
                    label="ครูผู้สอน"
                    name="teacherId"
                    options={teachers
                      .filter(
                        (teacher) =>
                          teacher.isActive ||
                          teacher.id === editingClassroom?.teacher.id,
                      )
                      .map((teacher) => ({
                        value: teacher.id,
                        label: `${teacher.firstName} ${teacher.lastName}`,
                      }))}
                    defaultValue={editingClassroom?.teacher.id}
                  />
                )}
              </>
            )}
            {kind === "subject" && (
              <>
                <Field
                  label="รหัสวิชา"
                  name="code"
                  defaultValue={editingSubject?.code}
                  placeholder="เช่น MATH"
                  required
                />
                <Field
                  label="ชื่อวิชา"
                  name="name"
                  defaultValue={editingSubject?.name}
                  placeholder="เช่น คณิตศาสตร์"
                  required
                />
              </>
            )}
            {kind === "indicator" && (
              <>
                <SelectField
                  label="รายวิชา"
                  name="subjectId"
                  options={subjects.map((subject) => ({
                    value: subject.id,
                    label: `${subject.name} (${subject.code})`,
                  }))}
                  defaultValue={editingIndicator?.subject.id}
                />
                <Field
                  label="รหัสตัวชี้วัด"
                  name="code"
                  defaultValue={editingIndicator?.code}
                  placeholder="เช่น ค 1.1 ม.1/1"
                  required
                />
                <label className="form-field">
                  คำอธิบาย
                  <textarea
                    name="description"
                    rows={4}
                    defaultValue={editingIndicator?.description}
                    required
                  />
                </label>
                <Field
                  label="ระดับชั้น"
                  name="gradeLevel"
                  defaultValue={editingIndicator?.gradeLevel}
                  placeholder="เช่น ม.1"
                />
              </>
            )}
            {kind === "generate" && (
              <>
                <div className="ai-modal-note">
                  <Sparkles />
                  <p>
                    <strong>ให้ AI ช่วยออกแบบข้อสอบ</strong>
                    <span>
                      ระบบจะสร้างโจทย์ เฉลย
                      และคำอธิบายพร้อมบันทึกเข้าธนาคารข้อสอบ
                    </span>
                  </p>
                </div>
                <label className="form-field">
                  รายวิชา
                  <select
                    name="subjectId"
                    value={generateSubjectId}
                    onChange={(event) => {
                      setGenerateSubjectId(event.target.value);
                      setGenerateIndicatorId("");
                    }}
                    required
                  >
                    {subjects.map((subject) => (
                      <option value={subject.id} key={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  ตัวชี้วัด
                  <select
                    name="indicatorId"
                    value={generateIndicatorId}
                    onChange={(event) =>
                      setGenerateIndicatorId(event.target.value)
                    }
                  >
                    <option value="">ไม่ระบุ</option>
                    {indicators
                      .filter(
                        (indicator) =>
                          indicator.subject.id === generateSubjectId,
                      )
                      .map((indicator) => (
                        <option value={indicator.id} key={indicator.id}>
                          {indicator.code} — {indicator.description}
                        </option>
                      ))}
                  </select>
                  <small className="field-hint">
                    แสดงเฉพาะตัวชี้วัดของรายวิชาที่เลือก
                  </small>
                </label>
                <div className="field-row">
                  <SelectField
                    label="ประเภทข้อสอบ"
                    name="type"
                    options={Object.entries(questionTypeLabel).map(
                      ([value, label]) => ({ value, label }),
                    )}
                  />
                  <SelectField
                    label="ความยาก"
                    name="difficulty"
                    options={Object.entries(difficultyLabel).map(
                      ([value, label]) => ({ value, label }),
                    )}
                  />
                </div>
                <Field
                  label="จำนวนข้อ"
                  name="count"
                  type="number"
                  defaultValue="5"
                  min={1}
                  max={50}
                  required
                />
                <label className="form-field">
                  คำสั่งเพิ่มเติม
                  <textarea
                    name="instruction"
                    rows={3}
                    placeholder="เช่น เน้นการประยุกต์ใช้ในชีวิตประจำวัน"
                  />
                </label>
              </>
            )}
            {kind === "exam" && (
              <>
                <Field label="ชื่อชุดข้อสอบ" name="title" required />
                <div className="field-row">
                  <SelectField
                    label="ห้องเรียน"
                    name="classroomId"
                    options={classrooms.map((room) => ({
                      value: room.id,
                      label: room.name,
                    }))}
                  />
                  <label className="form-field">
                    รายวิชา
                    <select
                      name="subjectId"
                      value={examSubjectId}
                      onChange={(event) => setExamSubjectId(event.target.value)}
                      required
                    >
                      {subjects.map((subject) => (
                        <option value={subject.id} key={subject.id}>
                          {subject.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <Field
                  label="เวลาสอบ (นาที)"
                  name="durationMinutes"
                  type="number"
                  defaultValue="60"
                  min={1}
                  max={1440}
                />
                <label className="toggle-line">
                  <input type="checkbox" name="isAdaptive" />
                  <span>
                    <b>เปิด Adaptive Test</b>
                    <small>ปรับระดับความยากตามคำตอบของนักเรียน</small>
                  </span>
                </label>
                <div className="question-picker">
                  <label>เลือกข้อสอบ</label>
                  {questions
                    .filter((question) => question.subject.id === examSubjectId)
                    .map((question) => (
                      <label key={question.id}>
                        <input
                          type="checkbox"
                          name="questionIds"
                          value={question.id}
                        />
                        <span>
                          <b>{question.prompt}</b>
                          <small>
                            {questionTypeLabel[question.type]} ·{" "}
                            {difficultyLabel[question.difficulty]}
                          </small>
                        </span>
                      </label>
                    ))}
                  {!questions.some(
                    (question) => question.subject.id === examSubjectId,
                  ) && <p>ยังไม่มีข้อสอบในวิชานี้</p>}
                </div>
              </>
            )}
            {kind === "assignment" && (
              <>
                <Field
                  label="ชื่องาน"
                  name="title"
                  defaultValue={editingAssignment?.title}
                  required
                />
                <label className="form-field">
                  รายละเอียดงาน / เกณฑ์การตรวจ
                  <textarea
                    name="description"
                    rows={5}
                    defaultValue={editingAssignment?.description}
                    required
                  />
                </label>
                <div className="field-row">
                  <SelectField
                    label="ห้องเรียน"
                    name="classroomId"
                    options={classrooms.map((room) => ({
                      value: room.id,
                      label: room.name,
                    }))}
                    defaultValue={editingAssignment?.classroom.id}
                  />
                  <SelectField
                    label="รายวิชา"
                    name="subjectId"
                    options={subjects.map((subject) => ({
                      value: subject.id,
                      label: subject.name,
                    }))}
                    defaultValue={editingAssignment?.subject.id}
                  />
                </div>
                <label className="form-field">
                  ชนิดของงาน
                  <select
                    name="type"
                    value={assignmentType}
                    onChange={(event) => {
                      const value = event.target.value as "GENERAL" | "CODE";
                      setAssignmentType(value);
                      if (value === "GENERAL") setAssignmentAiEnabled(false);
                    }}
                  >
                    <option value="GENERAL">งานทั่วไป</option>
                    <option value="CODE">งานเขียนโปรแกรม (Code)</option>
                  </select>
                </label>
                <label className="toggle-line group-work-toggle">
                  <input
                    type="checkbox"
                    name="isGroupWork"
                    checked={assignmentGroupWork}
                    onChange={(event) =>
                      setAssignmentGroupWork(event.target.checked)
                    }
                  />
                  <span>
                    <b>งานกลุ่ม</b>
                    <small>
                      นักเรียนตั้งชื่อกลุ่ม เลือกเพื่อนในห้องเดียวกัน และระบุหน้าที่สมาชิกได้
                    </small>
                  </span>
                </label>
                {assignmentGroupWork && (
                  <div className="field-row group-size-fields">
                    <Field
                      label="สมาชิกขั้นต่ำ (รวมผู้ส่ง)"
                      name="minGroupSize"
                      type="number"
                      min={1}
                      max={50}
                      defaultValue={editingAssignment?.minGroupSize ?? 1}
                      required
                    />
                    <Field
                      label="สมาชิกสูงสุด (รวมผู้ส่ง)"
                      name="maxGroupSize"
                      type="number"
                      min={1}
                      max={50}
                      defaultValue={editingAssignment?.maxGroupSize ?? 5}
                      required
                    />
                  </div>
                )}
                {assignmentType === "CODE" && (
                  <>
                    <SelectField
                      label="ภาษาโปรแกรม"
                      name="codeLanguage"
                      options={[
                        { value: "C", label: "C" },
                        { value: "CPP", label: "C++" },
                        { value: "CSHARP", label: "C#" },
                        { value: "PYTHON", label: "Python" },
                      ]}
                      defaultValue={editingAssignment?.codeLanguage ?? "PYTHON"}
                    />
                    <label className="toggle-line">
                      <input
                        type="checkbox"
                        name="aiGradingEnabled"
                        checked={assignmentAiEnabled}
                        onChange={(event) =>
                          setAssignmentAiEnabled(event.target.checked)
                        }
                      />
                      <span>
                        <b>ตรวจและให้คะแนนอัตโนมัติทันที</b>
                        <small>เมื่อปิด นักเรียนต้องรอครูตรวจด้วยตนเอง</small>
                      </span>
                    </label>
                    {assignmentAiEnabled && (
                      <SelectField
                        label="โมเดลสำหรับตรวจ Code"
                        name="aiGradingModel"
                        options={(codeModels.length
                          ? codeModels
                          : ["gemini-3.5-flash"]
                        ).map((model) => ({ value: model, label: model }))}
                        defaultValue={
                          editingAssignment?.aiGradingModel ??
                          codeModels[0] ??
                          "gemini-3.5-flash"
                        }
                      />
                    )}
                  </>
                )}
                <div className="field-row">
                  <Field
                    label="คะแนนเต็ม"
                    name="maxScore"
                    type="number"
                    min={0.01}
                    step={0.01}
                    defaultValue={
                      editingAssignment
                        ? Number(editingAssignment.maxScore)
                        : 10
                    }
                    required
                  />
                  <Field
                    label="กำหนดส่ง"
                    name="dueAt"
                    type="datetime-local"
                    defaultValue={
                      editingAssignment
                        ? toDateTimeLocal(editingAssignment.dueAt)
                        : ""
                    }
                    required
                  />
                </div>
                <SelectField
                  label="สถานะ"
                  name="status"
                  options={[
                    { value: "DRAFT", label: "ฉบับร่าง" },
                    { value: "PUBLISHED", label: "เผยแพร่ให้นักเรียน" },
                    { value: "CLOSED", label: "ปิดรับงาน" },
                  ]}
                  defaultValue={editingAssignment?.status ?? "DRAFT"}
                />
              </>
            )}
            {kind === "organization" && (
              <>
                <div className="field-row">
                  <Field
                    label="ชื่อองค์กร"
                    name="name"
                    defaultValue={editingOrganization?.name}
                    placeholder="เช่น โรงเรียนตัวอย่าง"
                    required
                  />
                  <Field
                    label="รหัสองค์กร"
                    name="code"
                    defaultValue={editingOrganization?.code}
                    placeholder="เช่น DEMO"
                    required
                  />
                </div>
                {editingOrganization ? (
                  <label className="toggle-line">
                    <input
                      type="checkbox"
                      name="isActive"
                      defaultChecked={editingOrganization.isActive}
                    />
                    <span>
                      <b>เปิดใช้งานองค์กร</b>
                      <small>
                        เมื่อปิด ผู้ใช้ทั้งหมดในองค์กรจะเข้าสู่ระบบไม่ได้
                      </small>
                    </span>
                  </label>
                ) : (
                  <>
                    <div className="modal-section-label">
                      บัญชีผู้ดูแลองค์กร
                    </div>
                    <div className="field-row">
                      <Field label="ชื่อ" name="adminFirstName" required />
                      <Field label="นามสกุล" name="adminLastName" required />
                    </div>
                    <Field
                      label="อีเมลผู้ดูแล"
                      name="adminEmail"
                      type="email"
                      required
                    />
                    <Field
                      label="รหัสผ่านเริ่มต้น"
                      name="adminPassword"
                      type="password"
                      minLength={8}
                      defaultValue="Welcome123!"
                      required
                    />
                  </>
                )}
              </>
            )}
          </div>
          <footer>
            <button
              type="button"
              className="button secondary"
              onClick={onClose}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className={`button ${kind === "generate" ? "ai-button" : "primary"}`}
            >
              {kind === "generate" && <Sparkles size={17} />}{" "}
              {kind === "generate" ? "เริ่มสร้างข้อสอบ" : "บันทึกข้อมูล"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function Field({
  label,
  name,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
}) {
  return (
    <label className="form-field">
      {label}
      <input name={name} {...props} />
    </label>
  );
}
function SelectField({
  label,
  name,
  options,
  optional,
  defaultValue,
}: {
  label: string;
  name: string;
  options: Array<{ value: string; label: string }>;
  optional?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="form-field">
      {label}
      <select name={name} required={!optional} defaultValue={defaultValue}>
        {optional && <option value="">ไม่ระบุ</option>}
        {options.map((option) => (
          <option value={option.value} key={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
function PanelHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="panel-header">
      <div>
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
    </header>
  );
}
function Legend({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <div>
      <i style={{ background: color }} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
function Insight({
  icon: Icon,
  tone,
  title,
  text,
}: {
  icon: typeof Bot;
  tone: string;
  title: string;
  text: string;
}) {
  return (
    <article>
      <div className={`insight-icon ${tone}`}>
        <Icon />
      </div>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </article>
  );
}
function Avatar({ name, large }: { name: string; large?: boolean }) {
  return (
    <span className={`table-avatar ${large ? "large" : ""}`}>
      {name?.[0] || "?"}
    </span>
  );
}
function EmptyState({ title }: { title: string }) {
  return (
    <div className="empty-state">
      <FileQuestion />
      <strong>{title}</strong>
      <span>เริ่มเพิ่มข้อมูลเพื่อใช้งานส่วนนี้</span>
    </div>
  );
}
function TableEmpty({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan}>
        <EmptyState title="ยังไม่มีข้อมูล" />
      </td>
    </tr>
  );
}
function StatusBadge({ status }: { status: string }) {
  const label: Record<string, string> = {
    ACTIVE: "ใช้งาน",
    INACTIVE: "ปิดใช้งาน",
    DRAFT: "ฉบับร่าง",
    PUBLISHED: "เผยแพร่",
    CLOSED: "ปิดสอบ",
    ARCHIVED: "เก็บถาวร",
  };
  return (
    <span className={`status status-${status.toLowerCase()}`}>
      {label[status] || status}
    </span>
  );
}
function ConnectionBadge({
  mode,
}: {
  mode: AiStatusData["services"][number]["mode"];
}) {
  const label = {
    LIVE: "ใช้งานจริง",
    MOCK: "โหมดจำลอง",
    NOT_CONFIGURED: "ยังไม่ตั้งค่า",
  };
  return (
    <span className={`connection-status connection-${mode.toLowerCase()}`}>
      {label[mode]}
    </span>
  );
}
function DifficultyBadge({ value }: { value: string }) {
  return (
    <span className={`difficulty difficulty-${value.toLowerCase()}`}>
      {difficultyLabel[value] || value}
    </span>
  );
}
async function showError(error: unknown) {
  await Swal.fire({
    icon: "error",
    title: "เกิดข้อผิดพลาด",
    text: error instanceof Error ? error.message : "กรุณาลองใหม่อีกครั้ง",
    confirmButtonText: "ตกลง",
  });
}
