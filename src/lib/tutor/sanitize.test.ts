import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { containsInternalArtifacts, sanitizeTutorText } from "./sanitize";

describe("sanitizeTutorText", () => {
  it("removes card and topic tags", () => {
    const input =
      "A stack is LIFO [card:550e8400-e29b-41d4-a716-446655440000] and [topic:data-structure].";
    const out = sanitizeTutorText(input);
    assert.match(out, /A stack is LIFO/);
    assert.ok(!out.includes("[card:"));
    assert.ok(!out.includes("[topic:"));
    assert.ok(!containsInternalArtifacts(out));
  });

  it("removes UUIDs and REF labels", () => {
    const input = "See [REF-2] and id 550e8400-e29b-41d4-a716-446655440000 for more.";
    const out = sanitizeTutorText(input);
    assert.ok(!out.includes("550e8400"));
    assert.ok(!out.includes("[REF-2]"));
  });

  it("strips retrieval boilerplate", () => {
    const input = "Based on your study materials, a queue is FIFO.";
    const out = sanitizeTutorText(input);
    assert.equal(out, "a queue is FIFO.");
  });
});

describe("containsInternalArtifacts", () => {
  it("detects leaked artifacts", () => {
    assert.equal(containsInternalArtifacts("[card:abc]"), true);
    assert.equal(containsInternalArtifacts("Clean tutor answer."), false);
  });
});
