import { describe, expect, it } from "vitest";

import {
  getDesktopSidebarWidthClass,
  getSidebarLabelAnimationClass,
  resolveSidebarExpanded,
  serializeSidebarExpanded,
} from "~/components/layout/sidebar-state";

describe("resolveSidebarExpanded", () => {
  it("returns true only for persisted expanded value", () => {
    expect(resolveSidebarExpanded("1")).toBe(true);
    expect(resolveSidebarExpanded("0")).toBe(false);
    expect(resolveSidebarExpanded("anything-else")).toBe(false);
    expect(resolveSidebarExpanded(null)).toBe(false);
  });
});

describe("serializeSidebarExpanded", () => {
  it("stores expanded state as 1 or 0", () => {
    expect(serializeSidebarExpanded(true)).toBe("1");
    expect(serializeSidebarExpanded(false)).toBe("0");
  });
});

describe("getDesktopSidebarWidthClass", () => {
  it("returns collapsed and expanded width classes", () => {
    expect(getDesktopSidebarWidthClass(false)).toBe("w-16");
    expect(getDesktopSidebarWidthClass(true)).toBe("w-72");
  });
});

describe("getSidebarLabelAnimationClass", () => {
  it("returns visible label classes when expanded", () => {
    expect(getSidebarLabelAnimationClass(true)).toContain("opacity-100");
    expect(getSidebarLabelAnimationClass(true)).toContain("translate-x-0");
    expect(getSidebarLabelAnimationClass(true)).toContain("max-w-[12rem]");
  });

  it("returns hidden label classes when collapsed", () => {
    expect(getSidebarLabelAnimationClass(false)).toContain("opacity-0");
    expect(getSidebarLabelAnimationClass(false)).toContain("-translate-x-1");
    expect(getSidebarLabelAnimationClass(false)).toContain("pointer-events-none");
    expect(getSidebarLabelAnimationClass(false)).toContain("max-w-0");
  });
});
