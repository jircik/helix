/** Recarrega a página atual. Isolado para ser substituído em teste (jsdom não navega). */
export function reloadPage(): void {
  window.location.reload();
}
