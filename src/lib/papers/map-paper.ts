import type { ExamType, Paper } from "@/lib/data/question-papers";

type DbPaper = {
  id: string;
  course: string;
  course_title: string;
  university: string;
  department: string;
  semester: string | number;
  year: number;
  exam_type: string;
  duration: string;
  total_marks: number;
  uploader: string;
  verified: boolean;
  views: number;
  has_digital: boolean;
  has_photo: boolean;
  digital: { sections: Paper["digital"]["sections"] };
  scans: Paper["scans"];
};

export function mapDbPaper(row: DbPaper): Paper {
  return {
    id: row.id,
    course: row.course,
    courseTitle: row.course_title,
    university: row.university,
    department: row.department,
    semester: Number(row.semester) || 1,
    year: row.year,
    examType: row.exam_type as ExamType,
    duration: row.duration,
    totalMarks: row.total_marks,
    uploaderId: row.uploader,
    uploaderName: row.uploader,
    verified: row.verified,
    views: row.views,
    hasDigital: row.has_digital,
    hasPhoto: row.has_photo,
    digital: row.digital ?? { sections: [] },
    scans: row.scans ?? [],
  };
}

export function paperToDbRow(paper: Paper) {
  return {
    id: paper.id,
    course: paper.course,
    course_title: paper.courseTitle,
    university: paper.university,
    department: paper.department,
    semester: String(paper.semester),
    year: paper.year,
    exam_type: paper.examType,
    duration: paper.duration,
    total_marks: paper.totalMarks,
    uploader: paper.uploaderName,
    verified: paper.verified,
    views: paper.views,
    has_digital: paper.hasDigital,
    has_photo: paper.hasPhoto,
    digital: paper.digital,
    scans: paper.scans,
    visibility: "public",
  };
}
