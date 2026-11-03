import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BrandLogo } from "@/components/brand-logo";

describe("BrandLogo", () => {
  it("renders the supplied ASG logo with an accessible name", () => {
    const markup = renderToStaticMarkup(createElement(BrandLogo));

    expect(markup).toContain('src="/asg-logo.png"');
    expect(markup).toContain('alt="Amplify Solutions Group"');
    expect(markup).toContain("bg-white");
  });
});
