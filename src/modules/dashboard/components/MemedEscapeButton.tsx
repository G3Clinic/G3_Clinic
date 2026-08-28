import { useEffect } from 'react';
import { X } from 'lucide-react';
import { fecharMemedForcado, iniciarVigiaMemed, useMemedAberta } from '../../../hooks/useMemed';

/**
 * Botão de escape global da Memed — sempre montado no layout do dashboard,
 * independente de qual página abriu o módulo (Prontuário ou Pacientes).
 *
 * Existe porque o fechamento normal depende da Memed disparar
 * core:moduleHide; se o módulo dela travar ao carregar (rede, token,
 * indisponibilidade do lado deles), esse evento nunca vem e o overlay em
 * tela cheia fica bloqueando clique de tudo por trás, sem conteúdo visível
 * e sem jeito de sair — era o travamento reportado. Este botão fecha na
 * marra (fecharMemedForcado), sem depender de nada vindo da Memed.
 *
 * Também liga o vigia de DOM (iniciarVigiaMemed): confirmado ao vivo em
 * produção que a Memed pode reabrir seu iframe sozinha (provavelmente
 * restaurando um estado salvo dela mesma) sem passar pelo nosso botão
 * "Abrir Prescrição" — nesse caso "memed-ativa" nunca seria ligada só com
 * o clique, e nem este botão apareceria. O vigia sincroniza com o que está
 * de fato visível no DOM, então cobre esse caminho também.
 */
export function MemedEscapeButton() {
  const aberta = useMemedAberta();
  useEffect(() => { iniciarVigiaMemed(); }, []);
  if (!aberta) return null;
  return (
    <button
      onClick={fecharMemedForcado}
      style={{ zIndex: 2147483647 }}
      className="fixed top-3 right-3 flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-2 rounded-full shadow-lg pointer-events-auto"
      title="Fechar a Memed (use se a tela travar)"
    >
      <X size={14} /> Fechar Memed
    </button>
  );
}
