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
        <kbd>Esc</kbd> Close
      </div>
      <div className="hint-item hints-extended">
        <kbd>⌘/Ctrl</kbd> + <kbd>W</kbd> Close Tab, <kbd>P</kbd> Pin, <kbd>M</kbd> Mute, <kbd>D</kbd> Dup
      </div>
    </div>
  );
}
