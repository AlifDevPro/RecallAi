import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { composeTutorReply, parseTutorModelOutput } from "./compose";
import { containsInternalArtifacts } from "./sanitize";
import type { TutorRetrievedChunk } from "./types";

const sampleChunks: TutorRetrievedChunk[] = [
  {
    ref: "REF-1",
    sourceType: "topic",
    sourceId: "data-structure",
    title: "Data Structure",
    content: "Organized way to store and access data.",
    similarity: 0.82,
    displayLabel: "From: Data Structure deck",
  },
  {
    ref: "REF-2",
    sourceType: "card",
    sourceId: "card-uuid-123",
    title: "What is a stack?",
    content: "LIFO structure.",
    similarity: 0.75,
    displayLabel: "From: Data Structure → What is a stack?",
  },
];

describe("parseTutorModelOutput", () => {
  it("parses valid JSON and sanitizes fields", () => {
    const raw = JSON.stringify({
      answer: "A data structure organizes data efficiently [card:leak].",
      explanation: "Think of it as a filing system.",
      example: "An array stores elements in order.",
      source_refs: ["REF-1"],
    });
    const parsed = parseTutorModelOutput(raw);
    assert.ok(!containsInternalArtifacts(parsed.answer));
    assert.equal(parsed.explanation, "Think of it as a filing system.");
  });

  it("falls back when JSON is invalid", () => {
    const parsed = parseTutorModelOutput("not json at all");
    assert.ok(parsed.answer.includes("trouble"));
  });

  it("recovers from thin context with honest answer shape", () => {
    const raw = JSON.stringify({
      answer: "I don't have much on this in your decks yet, but here's the core idea.",
      next_step: "Add flashcards on linked lists, then ask again.",
      source_refs: [],
    });
    const parsed = parseTutorModelOutput(raw);
    assert.ok(parsed.next_step?.includes("linked lists"));
    assert.equal(parsed.source_refs?.length, 0);
  });
});

describe("composeTutorReply", () => {
  it("produces human-readable sources only", () => {
    const raw = JSON.stringify({
      answer: "A data structure is a way to organize and store data.",
      explanation: "It defines how data is laid out and accessed.",
      example: "An array keeps items in contiguous memory.",
      common_mistake: "Confusing abstract data types with implementations.",
      recap: "Structures organize data; pick the right one for the operation.",
      source_refs: ["REF-1", "REF-2"],
    });
    const reply = composeTutorReply(raw, sampleChunks);
    assert.ok(!containsInternalArtifacts(reply.displayText));
    assert.equal(reply.sources.length, 2);
    assert.equal(reply.sources[0].label, "From: Data Structure deck");
    assert.ok(!reply.sources[0].label.includes("data-structure"));
    assert.ok(!reply.sources.some((s) => s.label.includes("uuid")));
  });

  it("never leaks IDs in display text", () => {
    const raw = JSON.stringify({
      answer: "Stacks are LIFO [topic:data-structure] structures.",
      source_refs: ["REF-2"],
    });
    const reply = composeTutorReply(raw, sampleChunks);
    assert.equal(reply.structured.answer, "Stacks are LIFO structures.");
    assert.ok(!containsInternalArtifacts(reply.displayText));
  });
});
