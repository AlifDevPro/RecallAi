/** Bangladesh universities — used for mock config, question bank facets, and institution search. */
export const BD_UNIVERSITIES = [
  "University of Dhaka (DU)",
  "BUET",
  "Rajshahi University (RU)",
  "Chittagong University (CU)",
  "Jahangirnagar University (JU)",
  "Khulna University (KU)",
  "Khulna University of Engineering & Technology (KUET)",
  "Shahjalal University of Science and Technology (SUST)",
  "Jagannath University (JnU)",
  "Bangladesh Agricultural University (BAU)",
  "North South University (NSU)",
  "BRAC University",
  "Independent University, Bangladesh (IUB)",
  "East West University (EWU)",
  "Ahsanullah University of Science and Technology (AUST)",
  "Daffodil International University (DIU)",
  "American International University-Bangladesh (AIUB)",
  "United International University (UIU)",
  "Green University of Bangladesh",
  "Military Institute of Science and Technology (MIST)",
] as const;

export const BD_MOCK_TOPICS = [
  "Data Structures",
  "Algorithms",
  "Database Systems",
  "Operating Systems",
  "Computer Networks",
  "Software Engineering",
  "Discrete Mathematics",
  "Digital Logic Design",
  "Theory of Computation",
  "Compiler Design",
  "Machine Learning",
  "System Design",
] as const;

export const BD_DEPARTMENTS: Record<string, string[]> = {
  "University of Dhaka (DU)": ["Computer Science & Engineering", "Applied Mathematics", "Physics"],
  BUET: ["Computer Science and Engineering", "Electrical and Electronic Engineering", "Mechanical Engineering"],
  "Rajshahi University (RU)": ["Computer Science & Engineering", "Applied Mathematics"],
  "Chittagong University (CU)": ["Computer Science & Engineering", "Mathematics"],
  "North South University (NSU)": ["Computer Science & Engineering", "Electrical & Electronic Engineering"],
  "BRAC University": ["Computer Science", "Electrical & Electronic Engineering"],
};
