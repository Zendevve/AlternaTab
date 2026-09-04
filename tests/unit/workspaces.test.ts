import { describe, expect, it } from "vitest";
import type { WorkspaceItem } from "../../src/types/models";
import { searchWorkspaces } from "../../src/utils/search";

describe("Workspaces Storage & Search Logic", () => {
  const sampleWorkspaces: WorkspaceItem[] = [
    {
      id: "ws_1",
      name: "Research Dev",
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
      tabs: [
        {
          title: "MDN Web Docs",
          url: "https://developer.mozilla.org/en-US/",
          domain: "developer.mozilla.org",
          pinned: false,
        },
        {
          title: "SolidJS Documentation",
          url: "https://solidjs.com/tutorial",
          domain: "solidjs.com",
          pinned: true,
        },
      ],
    },
    {
      id: "ws_2",
      name: "Personal Finances",
      createdAt: 1700000050000,
      updatedAt: 1700000050000,
      tabs: [
        {
          title: "Bank Account",
          url: "https://mybank.com/dashboard",
          domain: "mybank.com",
          pinned: false,
        },
      ],
    },
  ];

  it("validates workspace record structure and tab fields", () => {
    const ws = sampleWorkspaces[0];
    expect(ws).toBeDefined();
    if (!ws) return;
    expect(ws.id).toBe("ws_1");
    expect(ws.tabs).toHaveLength(2);
    expect(ws.tabs[0]?.title).toBe("MDN Web Docs");
    expect(ws.tabs[1]?.pinned).toBe(true);
  });

  it("searches workspaces by workspace name", () => {
    const matches = searchWorkspaces(sampleWorkspaces, "Research");
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(matches[0]?.name).toBe("Research Dev");
  });

  it("searches workspaces by nested tab title or domain", () => {
    const matches = searchWorkspaces(sampleWorkspaces, "solidjs");
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(matches[0]?.name).toBe("Research Dev");
  });

  it("returns all workspaces when query is empty", () => {
    const matches = searchWorkspaces(sampleWorkspaces, "");
    expect(matches).toHaveLength(2);
  });
});
