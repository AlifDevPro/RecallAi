import type { DigitalSection, ExamType, Paper, ScanPage } from "./question-papers";

export const UNIVERSITIES = [
  "IIT Bombay",
  "IIT Delhi",
  "IIT Madras",
  "NIT Trichy",
  "BITS Pilani",
  "IIIT Hyderabad",
  "Anna University",
  "DTU",
  "Jadavpur University",
  "VIT",
];

export const DEPARTMENTS: Record<string, string[]> = {
  "IIT Bombay": ["Computer Science", "Electrical", "Mechanical", "Chemical"],
  "IIT Delhi": ["Computer Science", "Electrical", "Civil"],
  "IIT Madras": ["Computer Science", "Aerospace", "Mechanical"],
  "NIT Trichy": ["Computer Science", "ECE", "Mechanical"],
  "BITS Pilani": ["Computer Science", "ECE", "Pharmacy"],
  "IIIT Hyderabad": ["Computer Science", "ECE"],
  "Anna University": ["Computer Science", "ECE", "Civil"],
  DTU: ["Computer Science", "Mechanical"],
  "Jadavpur University": ["Computer Science", "Chemical"],
  VIT: ["Computer Science", "ECE"],
};

export const ALL_DEPARTMENTS = Array.from(new Set(Object.values(DEPARTMENTS).flat())).sort();

export const EXAM_TYPES: ExamType[] = ["Mid", "Final", "Quiz", "Class Test", "Improvement"];

const COURSES: { code: string; title: string; dept: string }[] = [
  { code: "CSE 213", title: "Data Structures", dept: "Computer Science" },
  { code: "CSE 305", title: "Algorithms", dept: "Computer Science" },
  { code: "CSE 351", title: "Operating Systems", dept: "Computer Science" },
  { code: "CSE 421", title: "Database Systems", dept: "Computer Science" },
  { code: "CSE 471", title: "Computer Networks", dept: "Computer Science" },
  { code: "ECE 311", title: "Signals & Systems", dept: "ECE" },
  { code: "ME 241", title: "Thermodynamics", dept: "Mechanical" },
  { code: "EE 205", title: "Circuit Theory", dept: "Electrical" },
];

const DIGITAL_TEMPLATES: Record<string, DigitalSection[]> = {
  "CSE 213": [
    {
      title: "Section A — Short Answer",
      instructions: "Answer all questions. Each carries 4 marks.",
      questions: [
        { q: "Compare singly vs doubly linked lists with insertion complexity.", marks: 4 },
        { q: "Define a min-heap. Show the array representation after inserting 7, 3, 9, 1.", marks: 4 },
        { q: "What is amortized analysis? Give one example.", marks: 4 },
      ],
    },
    {
      title: "Section B — Long Answer",
      instructions: "Answer any two. Each carries 14 marks.",
      questions: [
        { q: "Implement an LRU cache with O(1) operations. Justify data-structure choices.", marks: 14 },
        { q: "Derive the average case time complexity of quicksort with random pivots.", marks: 14 },
        { q: "Design a graph traversal that detects a cycle in a directed graph. Prove correctness.", marks: 14 },
      ],
    },
  ],
  "CSE 421": [
    {
      title: "Part I — Concepts",
      questions: [
        { q: "State the ACID properties. Why is isolation hardest to provide?", marks: 5 },
        { q: "Differentiate 2NF and 3NF with a counter-example.", marks: 5 },
      ],
    },
    {
      title: "Part II — Query Design",
      questions: [
        { q: "Given Employee(id, dept, salary), write a SQL query to find the second-highest salary per department.", marks: 8 },
        { q: "Design indices for a read-heavy reporting workload. Discuss trade-offs.", marks: 12 },
      ],
    },
  ],
};

function genDigital(code: string): { sections: DigitalSection[] } {
  return {
    sections: DIGITAL_TEMPLATES[code] ?? [
      {
        title: "Section A",
        questions: [
          { q: `Explain a core concept of ${code} with one example.`, marks: 5 },
          { q: `Solve a numerical problem related to ${code}.`, marks: 8 },
        ],
      },
    ],
  };
}

function genScans(seed: number): ScanPage[] {
  const pages = (seed % 3) + 2;
  return Array.from({ length: pages }, (_, i) => ({
    pageUrl: `https://placehold.co/850x1100/0e0e18/64748b?text=Paper+Page+${i + 1}`,
    ocrConfidence: 0.78 + ((seed + i) % 20) / 100,
  }));
}

export const PAPERS: Paper[] = Array.from({ length: 24 }, (_, i) => {
  const course = COURSES[i % COURSES.length];
  const uni = UNIVERSITIES[i % UNIVERSITIES.length];
  const examType = EXAM_TYPES[i % EXAM_TYPES.length];
  const year = 2018 + (i % 7);
  const sem = (i % 8) + 1;
  const hasPhoto = true;
  const hasDigital = i % 7 !== 6;

  return {
    id: `paper_${1000 + i}`,
    course: course.code,
    courseTitle: course.title,
    university: uni,
    department: course.dept,
    semester: sem,
    year,
    examType,
    duration: examType === "Final" ? "3 hours" : examType === "Mid" ? "90 min" : "45 min",
    totalMarks: examType === "Final" ? 70 : examType === "Mid" ? 40 : 20,
    uploaderId: `u${(i % 11) + 1}`,
    uploaderName: ["Asha M.", "Ravi K.", "Lin W.", "Sara P.", "Diego O.", "Hana T."][i % 6],
    verified: i % 3 !== 2,
    views: 80 + ((i * 31) % 1200),
    hasDigital,
    hasPhoto,
    digital: hasDigital ? genDigital(course.code) : { sections: [] },
    scans: genScans(i + 1),
  };
});

export function getPaper(id: string): Paper | undefined {
  return PAPERS.find((p) => p.id === id);
}
