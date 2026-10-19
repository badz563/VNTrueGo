import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import seed from "../data/seed.json";
import credits from "../data/photo-credits.json";

describe("destination photographs", () => {
  it("has a real photo file and a usable credit for every seed destination", () => {
    expect(credits).toHaveLength(seed.length);
    const byId = new Map(credits.map(credit => [credit.id, credit]));
    for (const destination of seed) {
      const credit = byId.get(destination.id);
      expect(credit?.image).toBe(destination.image);
      expect(credit?.sourceUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      expect(credit?.creator.length).toBeGreaterThan(0);
      expect(credit?.license).toMatch(/CC|Public domain/);
      const file = path.join(process.cwd(), "public", destination.image.slice(1));
      expect(existsSync(file), destination.id).toBe(true);
      expect(readFileSync(file).subarray(0, 4).toString()).toBe("RIFF");
    }
  });

  it("marks stock food photos as not depicting the named restaurants", () => {
    expect(credits.filter(credit => credit.photoRole !== "actual place").map(credit => credit.id)).toEqual(["d25", "d27"]);
  });
});
