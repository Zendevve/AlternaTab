export function FooterHints() {
  return (
    <div className="footer-hints">
      <div className="hint-item">
        <kbd>↑↓</kbd> Navigate
      </div>
      <div className="hint-item">
        <kbd>Enter</kbd> Switch
      </div>
      <div className="hint-item">
        <kbd>Esc</kbd> Close Launcher
      </div>
      <div className="hint-item hints-extended">
        <kbd>⌘/Ctrl</kbd> + <kbd>P</kbd> Pin/Unpin, <kbd>M</kbd> Mute/Unmute, <kbd>D</kbd> Duplicate, <kbd>N</kbd> New Window, <kbd>C</kbd> Copy URL
      </div>
    </div>
  );
}
