import { App as ContentOverlay } from "../content/App";
import { type Component, createMemo, createSignal, For, onMount, Show } from "solid-js";
import type { CommandPack, ExtensionConfig, KeyboardProfile, PluginItem, SearchTemplateItem, ThemeVariant } from "../types/models";
import { sendMessage } from "../types/protocol";
import { findMatchingBangs } from "../utils/search/templates";
import { DEFAULT_CONFIG } from "../utils/validation";
export const App: Component = () => {
  const isHudMode = () => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return params.get("mode") === "hud";
  };

  if (isHudMode()) {
    return (
      <div style={{ width: "100vw", height: "100vh", background: "transparent", margin: 0, padding: 0 }}>
        <ContentOverlay initialVisible={true} onClose={() => window.close()} />
      </div>
    );
  }

  const [config, setConfig] = createSignal<ExtensionConfig>({ ...DEFAULT_CONFIG });
  const [status, setStatus] = createSignal<string>("");
  const [plugins, setPlugins] = createSignal<PluginItem[]>([]);
  const [newCode, setNewCode] = createSignal<string>("");
  const [newSourceUrl, setNewSourceUrl] = createSignal<string>("");
  const [pluginStatus, setPluginStatus] = createSignal<string>("");
  const [customTemplates, setCustomTemplates] = createSignal<SearchTemplateItem[]>([]);
  const [newTplId, setNewTplId] = createSignal<string>("");
  const [newTplTitle, setNewTplTitle] = createSignal<string>("");
  const [newTplUrl, setNewTplUrl] = createSignal<string>("");
  const [newTplKeywords, setNewTplKeywords] = createSignal<string>("");
  const [templateStatus, setTemplateStatus] = createSignal<string>("");
  const [packs, setPacks] = createSignal<CommandPack[]>([]);
  const [packJson, setPackJson] = createSignal<string>("");
  const [packStatus, setPackStatus] = createSignal<string>("");
  const [bangSearchQuery, setBangSearchQuery] = createSignal<string>("");
  const [bangCopyToast, setBangCopyToast] = createSignal<string>("");

  const exploredBangs = createMemo(() => {
    return findMatchingBangs(bangSearchQuery(), customTemplates(), 120);
  });

  const handleCopyBang = (alias: string) => {
    try {
      navigator.clipboard?.writeText(`!${alias} `);
      setBangCopyToast(`Copied !${alias} to clipboard`);
      setTimeout(() => setBangCopyToast(""), 2200);
    } catch {}
  };
  onMount(async () => {
    try {
      const stored = await sendMessage("getConfig", undefined);
      if (stored) {
        setConfig(stored);
      }
    } catch {
      // Background worker not yet active
    }
    try {
      const pls = await (sendMessage as any)("getPlugins", undefined);
      if (pls) setPlugins(pls);
    } catch {
      // plugins not available
    }
    try {
      const tpl = await (sendMessage as any)("getCustomTemplates", undefined);
      if (tpl) setCustomTemplates(tpl);
    } catch {
      // templates not available
    }
    try {
      const ps = await (sendMessage as any)("getCommandPacks", undefined);
      if (ps) setPacks(ps);
    } catch {
      // packs not available
    }
  });

  const loadPlugins = async () => {
    try {
      const pls = await (sendMessage as any)("getPlugins", undefined);
      if (pls) setPlugins(pls);
    } catch {}
  };

  const handleAddPlugin = async () => {
    const code = newCode().trim();
    if (!code) {
      setPluginStatus("Plugin code required");
      return;
    }
    try {
      const res = await sendMessage("registerPlugin", { code, sourceUrl: newSourceUrl().trim() || undefined });
      if ((res as any).ok) {
        setPluginStatus("Plugin registered: " + (res as any).value.prefix);
        setNewCode("");
        setNewSourceUrl("");
        await loadPlugins();
        setTimeout(() => setPluginStatus(""), 3000);
      } else {
        setPluginStatus((res as any).error ?? "Failed to register");
      }
    } catch (e) {
      setPluginStatus(e instanceof Error ? e.message : String(e));
    }
  };

  const handleTogglePlugin = async (id: string, enabled: boolean) => {
    try {
      const res = await sendMessage("togglePlugin", { id, enabled });
      if ((res as any).ok) await loadPlugins();
    } catch {}
  };

  const handleDeletePlugin = async (id: string) => {
    try {
      const res = await sendMessage("deletePlugin", { id });
      if ((res as any).ok) await loadPlugins();
    } catch {}
  };

  const loadCustomTemplates = async () => {
    try {
      const tpl = await (sendMessage as any)("getCustomTemplates", undefined);
      if (tpl) setCustomTemplates(tpl);
    } catch {}
  };

  const handleAddTemplate = async () => {
    const id = newTplId().trim().toLowerCase();
    const title = newTplTitle().trim();
    const urlTemplate = newTplUrl().trim();
    const keywords = newTplKeywords().split(",").map((s) => s.trim()).filter(Boolean);
    if (!id || !title || !urlTemplate) {
      setTemplateStatus("id, title and urlTemplate required");
      return;
    }
    try {
      const res = await sendMessage("addCustomTemplate", { id, title, category: "quicklink", urlTemplate, keywords } as unknown as SearchTemplateItem);
      if ((res as unknown as { ok: boolean; value?: SearchTemplateItem; error?: string }).ok) {
        setTemplateStatus("Template added: " + ((res as unknown as { value: SearchTemplateItem }).value.id));
        setNewTplId("");
        setNewTplTitle("");
        setNewTplUrl("");
        setNewTplKeywords("");
        await loadCustomTemplates();
        setTimeout(() => setTemplateStatus(""), 3000);
      } else {
        setTemplateStatus(((res as unknown as { error?: string }).error) ?? "Failed");
      }
    } catch (e) {
      setTemplateStatus(e instanceof Error ? e.message : String(e));
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      const res = await sendMessage("deleteCustomTemplate", { id });
      if ((res as unknown as { ok: boolean }).ok) await loadCustomTemplates();
    } catch {}
  };

  const loadPacks = async () => {
    try {
      const ps = await (sendMessage as unknown as (type: string, data: unknown) => Promise<CommandPack[]>)("getCommandPacks", undefined);
      if (ps) setPacks(ps);
    } catch {}
  };

  const handleImportPack = async () => {
    const json = packJson().trim();
    if (!json) { setPackStatus("JSON required"); return; }
    try {
      const res = await sendMessage("importCommandPack", { json });
      if ((res as unknown as { ok: boolean; value?: CommandPack; error?: string }).ok) {
        setPackStatus("Pack imported: " + ((res as unknown as { value: CommandPack }).value.id));
        setPackJson("");
        await loadPacks();
        setTimeout(() => setPackStatus(""), 3000);
      } else {
        setPackStatus(((res as unknown as { error?: string }).error) ?? "Failed");
      }
    } catch (e) {
      setPackStatus(e instanceof Error ? e.message : String(e));
    }
  };

  const handleExportPack = async (id: string) => {
    try {
      const res = await sendMessage("exportCommandPack", { id });
      if ((res as unknown as { ok: boolean; value?: string }).ok) {
        setPackJson(((res as unknown as { value: string }).value));
        setPackStatus("Exported " + id);
        setTimeout(() => setPackStatus(""), 3000);
      }
    } catch (e) {
      setPackStatus(e instanceof Error ? e.message : String(e));
    }
  };

  const handleDeletePack = async (id: string) => {
    try {
      const res = await sendMessage("deleteCommandPack", { id });
      if ((res as unknown as { ok: boolean }).ok) await loadPacks();
    } catch {}
  };

  const save = async () => {
    try {
      const res = await sendMessage("updateConfig", config());
      if (res.ok) {
        setConfig(res.value);
        setStatus("Settings saved successfully!");
        setTimeout(() => setStatus(""), 3000);
      }
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Failed to save settings");
    }
  };

  const reset = async () => {
    try {
      const res = await sendMessage("resetConfig", undefined);
      if (res.ok) {
        setConfig(res.value);
        setStatus("Settings reset to default.");
        setTimeout(() => setStatus(""), 3000);
      }
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Failed to reset settings");
    }
  };

  return (
    <div class="options-container">
      <h1>AlternaTab NextGen</h1>
      <p class="subtitle">High-performance keyboard-first tab switching & HUD configuration</p>

      <div class="section">
        <div class="section-title">Appearance & Theme</div>
        <div class="section-desc">Choose your visual aesthetic and backdrop blur</div>

        <div class="form-group">
          <label class="form-label" for="theme-select">
            Theme Variant
          </label>
          <select
            id="theme-select"
            value={config().theme}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, theme: e.currentTarget.value as ThemeVariant }))
            }
          >
            <option value="dark">Dark Slate</option>
            <option value="light">Light</option>
            <option value="oled">OLED Pure Black</option>
            <option value="system">System Adaptive</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" for="blur-input">
            Glass Blur Radius (0–24px)
          </label>
          <input
            id="blur-input"
            type="number"
            min="0"
            max="24"
            value={config().blurRadiusPx}
            onInput={(e) =>
              setConfig((prev) => ({ ...prev, blurRadiusPx: Number(e.currentTarget.value) }))
            }
          />
        </div>
      </div>

      <div class="section">
        <div class="section-title">Keyboard Navigation</div>
        <div class="section-desc">Configure your preferred keyboard control model</div>

        <div class="form-group">
          <label class="form-label" for="profile-select">
            Keyboard Profile
          </label>
          <select
            id="profile-select"
            value={config().keyboardProfile}
            onChange={(e) => {
              const val = e.currentTarget.value as KeyboardProfile;
              setConfig((prev) => ({
                ...prev,
                keyboardProfile: val,
                enableVimMode: val === "vim",
              }));
            }}
          >
            <option value="standard">Standard (Arrow Keys)</option>
            <option value="vim">Vim (j / k / d / x / o)</option>
            <option value="emacs">Emacs (Ctrl+N / Ctrl+P / Ctrl+W)</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" for="hotkey-display">
            Global Hotkey
          </label>
          <input
            id="hotkey-display"
            type="text"
            value={config().hotkey}
            disabled
            title="Configure global shortcuts in chrome://extensions/shortcuts"
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="mru-cycle">
            Enable MRU Tab cycle (Tab to cycle while HUD open)
          </label>
          <input
            id="mru-cycle"
            type="checkbox"
            checked={config().enableMruCycle}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, enableMruCycle: e.currentTarget.checked }))
            }
          />
        </div>
      </div>
      <div class="section">
        <div class="section-title">Search & Performance</div>
        <div class="section-desc">Tuning ranking weights and rendering thresholds</div>

        <div class="form-group">
          <label class="form-label" for="scope-select">
            Default Search Scope
          </label>
          <select
            id="scope-select"
            value={config().searchScopeDefault}
            onChange={(e) =>
              setConfig((prev) => ({
                ...prev,
                searchScopeDefault: e.currentTarget.value as "all" | "window" | "tabs-only",
              }))
            }
          >
            <option value="all">All Windows & Tabs</option>
            <option value="window">Current Window Only</option>
            <option value="tabs-only">Tabs Only (Exclude Bookmarks/Commands)</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" for="halflife-input">
            Frecency Half-Life (Minutes)
          </label>
          <input
            id="halflife-input"
            type="number"
            min="10"
            max="1440"
            value={config().frecencyHalfLifeMinutes}
            onInput={(e) =>
              setConfig((prev) => ({
                ...prev,
                frecencyHalfLifeMinutes: Number(e.currentTarget.value),
              }))
            }
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="max-items-input">
            Max Rendered Items
          </label>
          <input
            id="max-items-input"
            type="number"
            min="10"
            max="100"
            value={config().maxRenderedItems}
            onInput={(e) =>
              setConfig((prev) => ({ ...prev, maxRenderedItems: Number(e.currentTarget.value) }))
            }
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="engine-select">
            Default search engine
          </label>
          <select
            id="engine-select"
            value={config().defaultSearchEngine}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, defaultSearchEngine: e.currentTarget.value as ExtensionConfig["defaultSearchEngine"] }))
            }
          >
            <option value="google">Google</option>
            <option value="duckduckgo">DuckDuckGo</option>
            <option value="bing">Bing</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <Show when={config().defaultSearchEngine === "custom"}>
          <div class="form-group">
            <label class="form-label" for="custom-template-input">
              Custom search template (must contain {"{q}"})
            </label>
            <input
              id="custom-template-input"
              type="text"
              placeholder="https://example.com/search?q={q}"
              value={config().customSearchTemplate}
              onInput={(e) =>
                setConfig((prev) => ({ ...prev, customSearchTemplate: e.currentTarget.value }))
              }
            />
          </div>
        </Show>

        <div class="form-group">
          <label class="form-label" for="blur-dismiss">
            Close Overlay on Backdrop Click
          </label>
          <input
            id="blur-dismiss"
            type="checkbox"
            checked={config().closeOnBlur}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, closeOnBlur: e.currentTarget.checked }))
            }
          />
        </div>
      </div>

      <div class="section">
        <div class="section-title">Plugins (Flow / Ueli model)</div>
        <div class="section-desc">Lightweight JS plugins — one prefix, one file, no fork. Runs in service worker via data: import with 2s timeout.</div>

        <div style={{ "margin-bottom": "16px" }}>
          <Show when={plugins().length === 0}>
            <p style={{ "font-size": "12px", color: "var(--text-muted)" }}>No plugins installed. Try prefix <code>gh</code> example below.</p>
          </Show>
          <For each={plugins()}>
            {(pl) => (
              <div style={{ display: "flex", "align-items": "center", gap: "10px", padding: "8px 10px", border: "1px solid var(--border)", "border-radius": "6px", "margin-bottom": "8px" }}>
                <div style={{ flex: "1" }}>
                  <div style={{ "font-weight": "600", "font-size": "13px" }}>{pl.title} <span style={{ color: "var(--text-muted)", "font-weight": "400" }}>({pl.prefix})</span></div>
                  <div style={{ "font-size": "11px", color: "var(--text-muted)" }}>{pl.description}</div>
                  <Show when={pl.sourceUrl}>
                    <div style={{ "font-size": "10px", color: "var(--text-muted)" }}>{pl.sourceUrl}</div>
                  </Show>
                </div>
                <label style={{ display: "flex", "align-items": "center", gap: "6px", "font-size": "12px" }}>
                  <input type="checkbox" checked={pl.enabled} onChange={(e) => handleTogglePlugin(pl.id, e.currentTarget.checked)} />
                  enabled
                </label>
                <button type="button" class="btn btn-secondary" style={{ padding: "4px 8px", "font-size": "12px" }} onClick={() => handleDeletePlugin(pl.id)}>Delete</button>
              </div>
            )}
          </For>
        </div>

        <div class="form-group">
          <label class="form-label" for="plugin-code">Plugin code (JS module with prefix, title, run)</label>
          <textarea
            id="plugin-code"
            placeholder={`Example:\nexport const prefix = "gh";\nexport const title = "GitHub";\nexport async function run(query, api) {\n  const url = \"https://api.github.com/search/repositories?q=" + encodeURIComponent(query);\n  const res = await api.fetch(url);\n  const data = await res.json();\n  return data.items.slice(0,5).map(i => ({ title: i.full_name, url: i.html_url, subtitle: i.description }));\n}`}
            value={newCode()}
            onInput={(e) => setNewCode(e.currentTarget.value)}
            style={{ width: "100%", "min-height": "120px", "font-family": "monospace", "font-size": "12px", padding: "8px", "border-radius": "6px", border: "1px solid var(--border)" }}
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="plugin-source">Source URL (optional)</label>
          <input id="plugin-source" type="text" placeholder="https://example.com/plugin.js" value={newSourceUrl()} onInput={(e) => setNewSourceUrl(e.currentTarget.value)} />
        </div>

        <div class="form-group">
          <button type="button" class="btn btn-primary" onClick={handleAddPlugin}>Add Plugin</button>
          <Show when={pluginStatus()}>
            <span class="status-msg" data-show="">{pluginStatus()}</span>
          </Show>
        </div>

        <div style={{ "margin-top": "12px", "font-size": "11px", color: "var(--text-muted)" }}>
          Registry preview: <code>src/data/plugins-registry.json</code> — 4 sample plugins (gh, npm, so, mdn). Future Phase D will fetch remote registry via <code>&gt; plugin marketplace</code>.
        </div>
      </div>

      <div class="section">
        <div class="section-title">Explore !Bangs & Search Templates (Helium-inspired)</div>
        <div class="section-desc">
          Browse and search websites to see their shortcut bangs. Type any website, keyword, or bang (e.g. Letterboxd, IMDb, Claude, YouTube, !gh). Click any badge to copy it.
        </div>

        <div class="form-group" style={{ "margin-top": "12px", "margin-bottom": "8px" }}>
          <input
            type="text"
            placeholder="Search websites or bangs (e.g. letterboxd, !cgpt, imdb, wiki, steam)..."
            value={bangSearchQuery()}
            onInput={(e) => setBangSearchQuery(e.currentTarget.value)}
          />
        </div>

        <div style={{ display: "flex", "align-items": "center", "justify-content": "space-between", "font-size": "11.5px", color: "var(--text-muted)", "margin-bottom": "4px" }}>
          <span>Showing {exploredBangs().length} matching services</span>
          <Show when={bangCopyToast()}>
            <span style={{ color: "var(--accent)", "font-weight": "600" }}>{bangCopyToast()}</span>
          </Show>
        </div>

        <div class="bangs-grid">
          <For each={exploredBangs()}>
            {(item) => (
              <div class="bang-card">
                <div class="bang-card-header">
                  <span class="bang-card-title">{item.template.title}</span>
                  <span class="bang-card-domain">{item.template.domain || "web"}</span>
                </div>
                <div class="bang-card-aliases">
                  <For each={item.allAliases}>
                    {(alias) => (
                      <span
                        class="bang-alias-badge"
                        title={`Click to copy !${alias}`}
                        onClick={() => handleCopyBang(alias)}
                      >
                        !{alias}
                      </span>
                    )}
                  </For>
                </div>
              </div>
            )}
          </For>
        </div>

        <div class="section-title" style={{ "margin-top": "24px", "font-size": "13px" }}>Custom Templates & Overrides</div>
        <div class="section-desc">Add your own custom bangs or override bundled defaults. Custom templates win on collision.</div>
        <div style={{ "margin-bottom": "16px" }}>
          <Show when={customTemplates().length === 0}>
            <p style={{ "font-size": "12px", color: "var(--text-muted)" }}>No custom templates yet. Add one below — e.g. id <code>mywiki</code> url <code>https://example.com/search?q=&#123;q&#125;</code></p>
          </Show>
          <For each={customTemplates()}>
            {(tpl) => (
              <div style={{ display: "flex", "align-items": "center", gap: "10px", padding: "8px 10px", border: "1px solid var(--border)", "border-radius": "6px", "margin-bottom": "8px" }}>
                <div style={{ flex: "1" }}>
                  <div style={{ "font-weight": "600", "font-size": "13px" }}>{tpl.title} <span style={{ color: "var(--text-muted)", "font-weight": "400" }}>!{tpl.id}</span> <span style={{ "font-size": "10px", color: "var(--text-muted)" }}>[{tpl.category}]</span></div>
                  <div style={{ "font-size": "11px", color: "var(--text-muted)", "word-break": "break-all" }}>{tpl.urlTemplate}</div>
                  <Show when={tpl.keywords && tpl.keywords.length > 0}>
                    <div style={{ "font-size": "10px", color: "var(--text-muted)" }}>{tpl.keywords.join(", ")}</div>
                  </Show>
                </div>
                <button type="button" class="btn btn-secondary" style={{ padding: "4px 8px", "font-size": "12px" }} onClick={() => handleDeleteTemplate(tpl.id)}>Delete</button>
              </div>
            )}
          </For>
          <div style={{ "margin-top": "8px", "font-size": "11px", color: "var(--text-muted)" }}>Tip: add a quicklink id "fmhy" with urlTemplate "https://fmhy.net/search?q={"{q}"}" to recreate FMHY Search.</div>
        </div>
        <div class="form-group">
          <label class="form-label" for="tpl-id">Template id (bang without !) — e.g. yt, mysearch</label>
          <input id="tpl-id" type="text" placeholder="mysearch" value={newTplId()} onInput={(e) => setNewTplId(e.currentTarget.value)} />
        </div>
        <div class="form-group">
          <label class="form-label" for="tpl-title">Title — e.g. My Search</label>
          <input id="tpl-title" type="text" placeholder="My Search" value={newTplTitle()} onInput={(e) => setNewTplTitle(e.currentTarget.value)} />
        </div>
        <div class="form-group">
          <label class="form-label" for="tpl-url">urlTemplate — must contain {"{q}"}</label>
          <input id="tpl-url" type="text" placeholder="https://example.com/search?q={q}" value={newTplUrl()} onInput={(e) => setNewTplUrl(e.currentTarget.value)} />
        </div>
        <div class="form-group">
          <label class="form-label" for="tpl-keywords">Keywords (comma separated, optional)</label>
          <input id="tpl-keywords" type="text" placeholder="example, search" value={newTplKeywords()} onInput={(e) => setNewTplKeywords(e.currentTarget.value)} />
        </div>
        <div class="form-group">
          <button type="button" class="btn btn-primary" onClick={handleAddTemplate}>Add Template</button>
          <Show when={templateStatus()}>
            <span class="status-msg" data-show="">{templateStatus()}</span>
          </Show>
        </div>
        <div style={{ "margin-top": "12px", "font-size": "11px", color: "var(--text-muted)" }}>
          Bundled: <code>src/data/searchTemplates.json</code> — 62 engines. Custom stored in <code>chrome.storage.local[user]</code> and wins on id collision. Try <code>!yt lo-fi</code> or <code>cats !gh</code> in the palette.
        </div>
      </div>

      <div class="section">
        <div class="section-title">Command Packs (Shareable)</div>
        <div class="section-desc">Declarative JSON packs for aliases and chained commands — share via gist.</div>
        <div style={{ "margin-bottom": "16px" }}>
          <Show when={packs().length === 0}>
            <p style={{ "font-size": "12px", color: "var(--text-muted)" }}>No packs installed. Paste JSON below to import.</p>
          </Show>
          <For each={packs()}>
            {(pack) => (
              <div style={{ display: "flex", "align-items": "center", gap: "10px", padding: "8px 10px", border: "1px solid var(--border)", "border-radius": "6px", "margin-bottom": "8px" }}>
                <div style={{ flex: "1" }}>
                  <div style={{ "font-weight": "600", "font-size": "13px" }}>{pack.title} <span style={{ color: "var(--text-muted)", "font-weight": "400" }}>({pack.id})</span></div>
                  <div style={{ "font-size": "11px", color: "var(--text-muted)" }}>{pack.commands.map((c) => c.alias).join(", ")}</div>
                </div>
                <button type="button" class="btn btn-secondary" style={{ padding: "4px 8px", "font-size": "12px" }} onClick={() => handleExportPack(pack.id)}>Export</button>
                <button type="button" class="btn btn-secondary" style={{ padding: "4px 8px", "font-size": "12px" }} onClick={() => handleDeletePack(pack.id)}>Delete</button>
              </div>
            )}
          </For>
        </div>
        <div class="form-group">
          <label class="form-label" for="pack-json">Pack JSON</label>
          <textarea id="pack-json" placeholder={`{"id":"cleanup","title":"Cleanup","commands":[{"id":"close-duplicates","title":"Close Dupes","alias":"cleanup","chain":["close-duplicates","suspend-inactive","sort-domain"]}]}`} value={packJson()} onInput={(e) => setPackJson(e.currentTarget.value)} style={{ width: "100%", "min-height": "100px", "font-family": "monospace", "font-size": "12px", padding: "8px", "border-radius": "6px", border: "1px solid var(--border)" }} />
        </div>
        <div class="form-group">
          <button type="button" class="btn btn-primary" onClick={handleImportPack}>Import Pack</button>
          <Show when={packStatus()}>
            <span class="status-msg" data-show="">{packStatus()}</span>
          </Show>
        </div>
      </div>

      <div class="actions-row">
        <button type="button" class="btn btn-primary" onClick={save}>
          Save Settings
        </button>
        <button type="button" class="btn btn-secondary" onClick={reset}>
          Reset to Defaults
        </button>
        <span class="status-msg" data-show={status().length > 0 ? "" : undefined}>
          {status()}
        </span>
      </div>
    </div>
  );
};
