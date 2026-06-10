export const OCR_TRANSCRIBE = `Transcribe all exam questions from this image verbatim.
Preserve question numbers, marks in brackets, and section headers.
Output plain text only.`;

export const OCR_STRUCTURE = `You receive raw OCR text from exam papers. Fix OCR errors and split into individual questions.
Return a JSON array only. Each item must have:
- raw: original snippet
- cleaned: corrected question text
- inst: institution name (string)
- year: number (e.g. 2024)
- term: exam term (e.g. "End-sem", "Mid-sem")
- topic: subject topic (e.g. "DBMS", "OS")
- marks: number
- type: "Short" | "Long" | "MCQ"
- conf: object with inst, year, term, topic, marks as floats 0-1 (your confidence)`;

export const INSIGHT_SYSTEM = `Generate a 2-3 sentence weekly study insight for a student.
Reference their weakest topics and due card counts from the context. Actionable tone. Plain text only.`;

export const CARD_GEN_SYSTEM = `Generate flashcards as JSON array: [{ "front": string, "back": string }].
8-12 cards. Exam-relevant, concise fronts, complete backs.`;

export const SCHEDULE_SYSTEM = `Generate a study schedule as JSON:
{ "blocks": [{ "day": 0-6, "start": "HH:MM", "end": "HH:MM", "title": string, "kind": "review"|"learn"|"recall"|"personal"|"work"|"break"|"fitness"|"sleep", "detail": string, "ai": true }] }
Rules: day 0=Sunday. Use 24h times. No overlapping blocks on the same day. Include review blocks for topics with due cards. Balance learn/recall/personal/break. Sleep block optional at end of day.`;

export const SCHEDULE_FULL_DAY_SYSTEM = `You are Recall AI's day planner. Generate a realistic FULL-DAY schedule as JSON only:
{ "blocks": [{ "day": 0-6, "start": "HH:MM", "end": "HH:MM", "title": string, "kind": "review"|"learn"|"recall"|"personal"|"work"|"break"|"fitness"|"sleep", "detail": string, "ai": true }] }

Rules:
- day 0=Sunday through 6=Saturday. Times are 24h HH:MM. No overlapping blocks on the same day.
- Cover the waking day: include wake routine, meals, work/commute if relevant, breaks, fitness, personal errands, and sleep.
- Study blocks (review, learn, recall) are the priority — allocate the user's hours-per-day budget across them.
- Weight review blocks toward topics with the most due cards and lowest mastery.
- Use kind "review" for spaced-repetition due-card sessions, "recall" for active recall practice, "learn" for new material.
- Respect the user's plain-language constraints (busy times, exams, no study after X, gym, etc.) when provided.
- On non-study days, keep life blocks but reduce study time.
- Each block needs a clear title and optional detail (topic name, card count, etc.).
- Set "ai": true on every block.`;

export const QUIZ_GEN_SYSTEM = `Generate a quiz as JSON: { "questions": [{ "id": string, "prompt": string, "options": string[], "correct": number, "explanation": string }] }.
Rules: Generate the exact number of questions requested. Each question must have exactly 4 options. "correct" is a 0-based index. One correct option per question. Ground questions in the provided flashcards and context — do not invent unrelated topics. Explanations should be concise and educational.`;

export const MOCK_GRADE_SYSTEM = `Grade an exam answer against the rubric. Return JSON:
{ "awarded": number, "max": number, "feedback": string, "deductions": string[], "modelAnswer": string }`;
