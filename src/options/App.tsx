import { type Component, createSignal, onMount, Show } from "solid-js";
import type { ExtensionConfig, KeyboardProfile, ThemeVariant } from "../types/models";
import { sendMessage } from "../types/protocol";
import { DEFAULT_CONFIG } from "../utils/validation";

export const App: Component = () => {
  const [config, setConfig] = createSignal<ExtensionConfig>({ ...DEFAULT_CONFIG });
  const [status, setStatus] = createSignal<string>("");

  onMount(async () => {
    try {
      const stored = await sendMessage("getConfig", undefined);
      if (stored) {
        setConfig(stored);
      }
    } catch {
      // Background worker not yet active
    }
  });

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

      <div class="actions-row">
        <button type="button" class="btn btn-primary" onClick={save}>
          Save Settings
        </button>
        <button type="button" class="btn btn-secondary" onClick={reset}>
          Reset to Defaults
        </button>
        <Show when={status().length > 0}>
          <span class="status-msg">{status()}</span>
        </Show>
      </div>
    </div>
  );
};
