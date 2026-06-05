export type QuizQuestionDto = {
  id: string;
  prompt: string;
  options: string[];
  correct: number;
  explanation: string;
};

export type QuizGenerateResponse = {
  questions: QuizQuestionDto[];
  topic: { slug: string; name: string };
  generatedAt: string;
};
