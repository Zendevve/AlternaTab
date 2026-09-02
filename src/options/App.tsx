import { type Component, createSignal, For, onMount, Show } from "solid-js";
import type { ExtensionConfig, KeyboardProfile, PluginItem, ThemeVariant } from "../types/models";
import { sendMessage } from "../types/protocol";
import { DEFAULT_CONFIG } from "../utils/validation";

export const App: Component = () => {
  const [config, setConfig] = createSignal<ExtensionConfig>({ ...DEFAULT_CONFIG });
  const [status, setStatus] = createSignal<string>("");
  const [plugins, setPlugins] = createSignal<PluginItem[]>([]);
  const [newCode, setNewCode] = createSignal<string>("");
  const [newSourceUrl, setNewSourceUrl] = createSignal<string>("");
  const [pluginStatus, setPluginStatus] = createSignal<string>("");

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
