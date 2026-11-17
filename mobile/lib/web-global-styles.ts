import { Platform } from 'react-native';

const STYLE_ID = 'app-global-styles';

const CSS = `
[tabindex="0"] {
  transition: opacity 120ms ease, transform 120ms ease, background-color 120ms ease;
}
[tabindex="0"]:hover {
  opacity: 0.85;
}
[tabindex="0"]:active {
  transform: scale(0.98);
}
[tabindex="0"]:focus-visible {
  outline: 2px solid #7F77B2;
  outline-offset: 2px;
}
`;

export function injectWebGlobalStyles() {
  if (Platform.OS !== 'web' || typeof document === 'undefined' || document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}
