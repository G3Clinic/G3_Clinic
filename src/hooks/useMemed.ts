import { useCallback, useRef, useState } from 'react';
import { memedApi } from '../services/api';

/**
 * Integração com a Prescrição Digital da Memed seguindo o Manual de Validação
 * Técnica (homologação):
 *  - o script é injetado UMA ÚNICA vez (guard contra duplicação de iframes);
 *  - o botão só habilita após o evento core:moduleInit;
 *  - os listeners LGPD (prescricaoImpressa / prescricaoExcluida) são registrados
 *    UMA vez e persistem/removem no backend;
 *  - no clique só se chama setPaciente (com idExterno obrigatório) + module.show.
 *
 * Todas as chamadas à API Memed (token) são feitas pelo backend — a API_KEY/
 * SECRET_KEY nunca chegam ao frontend.
 */

// Singletons de módulo: garantem "carrega uma vez" mesmo com remontagens/rotas.
let listenersRegistrados = false;
let prescricaoPronta = false;  // core:moduleInit da prescrição já disparou nesta sessão

const SCRIPT_SELETOR = 'script[src*="sinapse-prescricao"]';

function aguardarMdHub(timeoutMs = 20000): Promise<any> {
  return new Promise((resolve, reject) => {
    const inicio = Date.now();
    const tick = () => {
      const MdHub = (window as any).MdHub;
      if (MdHub) return resolve(MdHub);
      if (Date.now() - inicio > timeoutMs) return reject(new Error('SDK da Memed não carregou a tempo.'));
      setTimeout(tick, 200);
    };
    tick();
  });
}

function registrarListenersUmaVez(MdHub: any) {
  if (listenersRegistrados) return;
  listenersRegistrados = true;
  // ✅ LGPD: salvar prescrição emitida
  MdHub.event.add('prescricaoImpressa', (prescricao: any) => {
    memedApi.salvarPrescricao(prescricao).catch(() => {});
  });
  // ✅ Remover prescrição excluída pelo médico
  MdHub.event.add('prescricaoExcluida', (data: any) => {
    if (data?.id != null) memedApi.excluirPrescricao(data.id).catch(() => {});
  });
}

const sexoMemed = (s?: string | null) => (s === 'M' ? 'Masculino' : s === 'F' ? 'Feminino' : s || undefined);
const nascMemed = (iso?: string | null) => {
  if (!iso) return undefined;
  const [a, m, d] = String(iso).slice(0, 10).split('-');
  return a && m && d ? `${d}/${m}/${a}` : undefined;
};

export type MemedPacienteInput = {
  id: string | number; nome: string; sexo?: string | null;
  cpf?: string | null; data_nascimento?: string | null; telefone?: string | null; email?: string | null;
};
export type MemedWorkplace = {
  id?: string | number; nome?: string; endereco?: string; telefone?: string; cidade?: string; uf?: string;
};

export function useMemed() {
  const [pronto, setPronto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const iniciado = useRef(false);
  const prefixoRef = useRef('g3clinica');

  // Carrega o script UMA vez (idealmente ao abrir o atendimento).
  const iniciar = useCallback(async () => {
    if (iniciado.current) return;
    iniciado.current = true;
    setCarregando(true);
    setErro(null);
    try {
      const amb = await memedApi.ambiente();
      prefixoRef.current = amb.id_prefixo || 'g3clinica';
      const jaTemScript = !!document.querySelector(SCRIPT_SELETOR);
      if (!jaTemScript) {
        const { token } = await memedApi.getToken();
        if (!token) throw new Error('Token da Memed não obtido.');
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = amb.script_url;
        script.setAttribute('data-token', token);
        document.head.appendChild(script);
      }
      const MdHub = await aguardarMdHub();
      // Se o módulo de prescrição já inicializou nesta sessão (ex.: reabrir a aba),
      // o core:moduleInit NÃO dispara de novo — então habilitamos direto.
      if (prescricaoPronta) {
        registrarListenersUmaVez(MdHub);
        setPronto(true);
      }
      // Os comandos (setPaciente/module.show) só funcionam DEPOIS do core:moduleInit
      // do módulo de prescrição — por isso habilitamos o botão quando ele dispara.
      // O listener é anexado assim que o MdHub existe (o módulo, num iframe, ainda
      // vai carregar e disparar o evento), então não perdemos o disparo.
      MdHub.event.add('core:moduleInit', (m: any) => {
        if (m?.name === 'plataforma.prescricao') {
          prescricaoPronta = true;
          registrarListenersUmaVez(MdHub);
          setPronto(true);
        }
      });
    } catch (e) {
      iniciado.current = false;
      setErro(e instanceof Error ? e.message : 'Falha ao iniciar a Memed.');
    } finally {
      setCarregando(false);
    }
  }, []);

  // No clique do botão: só setPaciente (idExterno obrigatório) + module.show.
  const abrirPrescricao = useCallback(async (paciente: MemedPacienteInput, workplace?: MemedWorkplace) => {
    const MdHub = (window as any).MdHub;
    console.log('[Memed] abrirPrescricao — MdHub:', !!MdHub, '| module.show:', !!(MdHub && MdHub.module && MdHub.module.show));
    if (!MdHub) { setErro('Memed ainda não está pronta.'); return; }
    const p: any = {
      idExterno: `${prefixoRef.current}-pac-${paciente.id}`,   // OBRIGATÓRIO e único
      nome: paciente.nome,
      sexo: sexoMemed(paciente.sexo) || 'Masculino',
    };
    if (paciente.cpf) p.cpf = String(paciente.cpf).replace(/\D/g, '');
    const nasc = nascMemed(paciente.data_nascimento); if (nasc) p.data_nascimento = nasc;
    if (paciente.telefone) p.telefone = paciente.telefone;
    if (paciente.email) p.email = paciente.email;

    // Aguarda o comando, mas com teto de tempo — se a Memed demorar/pendurar,
    // abrimos o módulo mesmo assim (o setPaciente também é reenviado após o show).
    const comTimeout = (promessa: any, ms: number) =>
      Promise.race([Promise.resolve(promessa).catch(() => {}), new Promise(r => setTimeout(r, ms))]);

    try {
      console.log('[Memed] enviando setPaciente…', p);
      await comTimeout(MdHub.command.send('plataforma.prescricao', 'setPaciente', p), 6000);
      console.log('[Memed] setPaciente concluído (ou timeout)');
      if (workplace) {
        await comTimeout(MdHub.command.send('plataforma.prescricao', 'setWorkplace', workplace), 2500);
      }
    } catch (e) { console.warn('[Memed] erro no setPaciente/workplace:', e); }

    // module.show é o único comando obrigatório no clique — sempre executado.
    try {
      console.log('[Memed] chamando module.show…');
      MdHub.module.show('plataforma.prescricao');
      console.log('[Memed] module.show OK');
    } catch (e) {
      console.error('[Memed] erro no module.show:', e);
      setErro(e instanceof Error ? e.message : 'Erro ao abrir a prescrição.');
      return;
    }
    // Reenvia o paciente após abrir (garante que o módulo receba os dados).
    setTimeout(() => { try { MdHub.command.send('plataforma.prescricao', 'setPaciente', p); } catch { /* ok */ } }, 800);
  }, []);

  return { pronto, carregando, erro, iniciar, abrirPrescricao };
}
