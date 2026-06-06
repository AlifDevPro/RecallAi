export type ExamType = "Mid" | "Final" | "Quiz" | "Class Test" | "Improvement";

export type DigitalQuestion = { q: string; marks: number };
export type DigitalSection = { title: string; instructions?: string; questions: DigitalQuestion[] };
export type ScanPage = { pageUrl: string; ocrConfidence: number };

export type Paper = {
  id: string;
  course: string;
  courseTitle: string;
  university: string;
  department: string;
  semester: number;
  year: number;
  examType: ExamType;
  duration: string;
  totalMarks: number;
  uploaderId: string;
  uploaderName: string;
  verified: boolean;
  views: number;
  hasDigital: boolean;
  hasPhoto: boolean;
  digital: { sections: DigitalSection[] };
  scans: ScanPage[];
};
