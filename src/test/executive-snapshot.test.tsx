import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ExecutiveSnapshot } from "@/components/executive-snapshot";

describe("ExecutiveSnapshot", () => {
  it("shows headline measures before upcoming callback work", () => {
    const markup = renderToStaticMarkup(
      createElement(ExecutiveSnapshot, {
        metrics: { totalLeads: 42, bookedLeads: 8, followUpsDue: 3, newLeads: 6 },
        callbacks: [
          {
            followUpId: "follow-up-1",
            leadId: "lead-1",
            scheduledAt: "2026-11-03T10:00:00.000Z",
            leadName: "Jordan Example",
          },
        ],
      }),
    );

    expect(markup.indexOf("Total Leads")).toBeLessThan(markup.indexOf("Calls due"));
    expect(markup).toContain("42");
    expect(markup).toContain("Jordan Example");
    expect(markup).toContain('href="/leads/lead-1"');
    expect(markup).toContain('href="/follow-ups"');
  });
});
