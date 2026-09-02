import { describe, expect, it } from "vitest";
import { deletePack, exportPack, importPack, loadPacks } from "../../src/background/commandPacks";

describe("commandPacks", () => {
  it("imports a valid command pack", async () => {
    const validPackJson = JSON.stringify({
      id: "cleanup",
      title: "Cleanup Pack",
      commands: [
        {
          id: "close-duplicates",
          title: "Close Duplicates",
          alias: "cleanup",
          chain: ["close-duplicates", "suspend-inactive", "sort-domain"],
        },
      ],
    });

    const pack = await importPack(validPackJson);
    expect(pack.id).toBe("cleanup");
    expect(pack.title).toBe("Cleanup Pack");
    expect(pack.commands).toHaveLength(1);
    expect(pack.commands[0]?.chain).toEqual(["close-duplicates", "suspend-inactive", "sort-domain"]);
    const packs = await loadPacks();
    expect(packs.some((p) => p.id === "cleanup")).toBe(true);

    const exported = await exportPack("cleanup");
    expect(JSON.parse(exported).id).toBe("cleanup");

    await deletePack("cleanup");
    const afterDelete = await loadPacks();
    expect(afterDelete.some((p) => p.id === "cleanup")).toBe(false);
  });

  it("rejects invalid JSON", async () => {
    await expect(importPack("invalid-json")).rejects.toThrow("Invalid JSON");
  });

  it("rejects unknown command id", async () => {
    const invalidJson = JSON.stringify({
      id: "bad",
      title: "Bad Pack",
      commands: [
        {
          id: "non-existent-cmd",
          title: "Bad",
          alias: "bad",
        },
      ],
    });
    await expect(importPack(invalidJson)).rejects.toThrow('Invalid command id "non-existent-cmd"');
  });

  it("rejects duplicate aliases within pack", async () => {
    const duplicateAliasJson = JSON.stringify({
      id: "dup",
      title: "Dup Pack",
      commands: [
        { id: "close-duplicates", title: "Cmd 1", alias: "same" },
        { id: "group-domain", title: "Cmd 2", alias: "same" },
      ],
    });
    await expect(importPack(duplicateAliasJson)).rejects.toThrow('Duplicate alias "same"');
  });
});
