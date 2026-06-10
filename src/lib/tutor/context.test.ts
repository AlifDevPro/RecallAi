import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { assessContextQuality, formatTutorContext } from "./context";
import type { TutorRetrievedChunk } from "./types";

const chunk = (similarity: number): TutorRetrievedChunk => ({
  ref: "REF-1",
  sourceType: "topic",
  sourceId: "hidden-slug",
  title: "Data Structure",
  content: "Sample content.",
  similarity,
  displayLabel: "From: Data Structure deck",
});

describe("formatTutorContext", () => {
  it("uses REF labels and display names, not raw IDs", () => {
    const text = formatTutorContext([chunk(0.9)]);
    assert.ok(text.includes("[REF-1]"));
    assert.ok(text.includes("From: Data Structure deck"));
    assert.ok(!text.includes("hidden-slug"));
    assert.ok(!text.includes("[topic:"));
  });

  it("reports empty context clearly", () => {
    assert.ok(formatTutorContext([]).includes("No matching"));
  });
});

describe("assessContextQuality", () => {
  it("classifies retrieval strength", () => {
    assert.equal(assessContextQuality([]), "empty");
    assert.equal(assessContextQuality([chunk(0.4)]), "thin");
    assert.equal(assessContextQuality([chunk(0.8)]), "rich");
  });
});
