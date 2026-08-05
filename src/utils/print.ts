// Impressão de documentos clínicos (exames, receituário, atestado) — abre uma janela
// separada com um layout formatado (cabeçalho da clínica, dados do paciente, assinatura)
// e aciona o print do navegador. Mantém o layout fora da tela principal para não
// poluir o CSS da aplicação com regras @media print.

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface ImprimirDocumentoOpts {
  titulo: string;
  empresa: { nome: string; logoUrl?: string };
  paciente: { nome: string; cpf?: string | null; dataNascimento?: string | null };
  medico?: { nome?: string | null; conselho?: string | null };
  conteudoHtml: string;
  rodapeExtra?: string;
}

export function imprimirDocumento({ titulo, empresa, paciente, medico, conteudoHtml, rodapeExtra }: ImprimirDocumentoOpts) {
  const win = window.open('', '_blank', 'width=800,height=900');
  if (!win) {
    alert('Não foi possível abrir a janela de impressão. Verifique o bloqueador de pop-ups do navegador.');
    return;
  }

  const dataHora = new Date().toLocaleString('pt-BR');
  const idade = paciente.dataNascimento
    ? Math.floor((Date.now() - new Date(paciente.dataNascimento).getTime()) / 31557600000)
    : null;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(titulo)}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #1e293b; margin: 0; padding: 24px; }
  .cabecalho { display: flex; align-items: center; gap: 14px; border-bottom: 2px solid #1e293b; padding-bottom: 12px; margin-bottom: 20px; }
  .cabecalho img { height: 48px; width: auto; object-fit: contain; }
  .cabecalho h1 { font-size: 16px; margin: 0; font-weight: 700; letter-spacing: .3px; }
  .titulo-doc { text-align: center; font-size: 18px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 4px 0 20px; }
  .paciente { display: flex; flex-wrap: wrap; gap: 4px 24px; font-size: 13px; margin-bottom: 22px; padding: 10px 14px; background: #f8fafc; border-radius: 8px; }
  .paciente b { color: #0f172a; }
  .conteudo { font-size: 14px; line-height: 1.6; }
  .conteudo p { margin: 0 0 10px; }
  .conteudo ol, .conteudo ul { margin: 0 0 10px; padding-left: 22px; }
  .rodape-extra { font-size: 12px; color: #475569; margin-top: 16px; }
  .assinatura { margin-top: 70px; text-align: center; font-size: 13px; }
  .assinatura .linha { border-top: 1px solid #1e293b; width: 280px; margin: 0 auto 6px; }
  .rodape { margin-top: 40px; font-size: 10px; color: #94a3b8; text-align: center; }
  .no-print { text-align: center; margin-top: 24px; }
  .no-print button { font-family: inherit; padding: 8px 18px; border-radius: 8px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer; }
  @media print { .no-print { display: none; } body { padding: 0; } }
</style>
</head>
<body>
  <div class="cabecalho">
    ${empresa.logoUrl ? `<img src="${empresa.logoUrl}" alt="" />` : ''}
    <h1>${escapeHtml(empresa.nome)}</h1>
  </div>
  <div class="titulo-doc">${escapeHtml(titulo)}</div>
  <div class="paciente">
    <span><b>Paciente:</b> ${escapeHtml(paciente.nome)}</span>
    ${paciente.cpf ? `<span><b>CPF:</b> ${escapeHtml(paciente.cpf)}</span>` : ''}
    ${idade != null ? `<span><b>Idade:</b> ${idade} anos</span>` : ''}
    <span><b>Data:</b> ${dataHora}</span>
  </div>
  <div class="conteudo">${conteudoHtml}</div>
  ${rodapeExtra ? `<p class="rodape-extra">${escapeHtml(rodapeExtra)}</p>` : ''}
  <div class="assinatura">
    <div class="linha"></div>
    ${medico?.nome ? escapeHtml(medico.nome) : ''}${medico?.conselho ? ' — ' + escapeHtml(medico.conselho) : ''}
  </div>
  <div class="rodape">Documento gerado em ${dataHora} — ${escapeHtml(empresa.nome)}</div>
  <div class="no-print"><button onclick="window.print()">Imprimir</button></div>
</body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { try { win.print(); } catch { /* usuário pode clicar no botão da própria janela */ } }, 400);
}
