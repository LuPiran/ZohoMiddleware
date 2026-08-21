/**
 * Ponte para os arquivos de evidência entre a tela do Lead Médico e a
 * página de Compra, quando o consultor é navegado para /compra ao registrar
 * uma tentativa (ver LeadFirstAttemptCard -> Compra).
 *
 * Por quê não vai em location.state: o React Router usa
 * `history.pushState` por baixo, que tem limite prático (~640KB no
 * Chrome) no state serializado. Com até 5 evidências de até 5MB cada,
 * colocar os `File[]` ali estouraria esse limite. Um singleton em módulo
 * sobrevive à navegação SPA (sem reload de página) sem esse limite — e se
 * perde num F5 no meio do fluxo, o que é aceitável (o próprio contexto via
 * location.state também se perderia).
 */
let pendingFiles = null;

export function setPendingLeadAttemptFiles(files) {
  pendingFiles = Array.isArray(files) ? files : null;
}

export function takePendingLeadAttemptFiles() {
  const files = pendingFiles;
  pendingFiles = null;
  return files || [];
}
