import { useState, useRef, useEffect } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { Minus, X, ClipboardList } from 'lucide-react';
import { useProntuarioFloat } from '../../../contexts/ProntuarioFloatContext';
import { ProntuarioPage } from '../pages/ProntuarioPage';

const SIZE = { width: 960, height: 640 };
const MARGEM = 16;

// Janela flutuante e minimizável do Prontuário Eletrônico. Fica montada aqui em
// DashboardLayout (fora das <Route>), então navegar para outra tela do sistema
// não a desmonta — o usuário consegue clicar/rolar por baixo dela normalmente,
// sem overlay/backdrop bloqueando o resto da tela.
export function ProntuarioFloatWindow() {
  const { aberto, minimizado, fecharProntuario, minimizarProntuario, restaurarProntuario } = useProntuarioFloat();
  const [pos, setPos] = useState(() => ({
    x: Math.max(MARGEM, window.innerWidth - SIZE.width - 40),
    y: 76,
  }));
  const arrastoRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  useEffect(() => {
    const aoMover = (e: MouseEvent) => {
      if (!arrastoRef.current) return;
      const { startX, startY, origX, origY } = arrastoRef.current;
      const maxX = window.innerWidth - 160;
      const maxY = window.innerHeight - 48;
      setPos({
        x: Math.min(Math.max(MARGEM - SIZE.width + 160, origX + (e.clientX - startX)), maxX),
        y: Math.min(Math.max(0, origY + (e.clientY - startY)), maxY),
      });
    };
    const aoSoltar = () => { arrastoRef.current = null; };
    window.addEventListener('mousemove', aoMover);
    window.addEventListener('mouseup', aoSoltar);
    return () => {
      window.removeEventListener('mousemove', aoMover);
      window.removeEventListener('mouseup', aoSoltar);
    };
  }, []);

  const iniciarArraste = (e: ReactMouseEvent) => {
    arrastoRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
  };

  if (!aberto) return null;

  // Importante: <ProntuarioPage/> fica montada o tempo todo enquanto aberto=true,
  // minimizada ou não — só escondemos a janela via CSS (display:none). Se
  // desmontássemos ao minimizar (como uma versão anterior fazia), o componente
  // perderia o paciente selecionado e tudo que ainda não foi salvo ao restaurar.
  return (
    <>
      {minimizado && (
        <button
          onClick={restaurarProntuario}
          className="fixed bottom-5 right-5 z-[70] flex items-center gap-2 bg-brand-primary text-white pl-4 pr-5 py-3 rounded-full shadow-2xl hover:bg-brand-dark transition-all animate-fade-in-up"
        >
          <ClipboardList size={18} />
          <span className="text-sm font-bold">Prontuário Eletrônico</span>
        </button>
      )}
      <div
        className="fixed z-[70] bg-white rounded-2xl shadow-2xl border border-gray-200 flex-col overflow-hidden"
        style={{
          left: pos.x, top: pos.y, width: SIZE.width, maxWidth: 'calc(100vw - 24px)',
          height: SIZE.height, maxHeight: 'calc(100vh - 24px)',
          display: minimizado ? 'none' : 'flex',
        }}
      >
        <div
          onMouseDown={iniciarArraste}
          className="flex items-center justify-between px-4 py-2.5 bg-slate-800 text-white cursor-move select-none shrink-0"
        >
          <div className="flex items-center gap-2 text-sm font-bold">
            <ClipboardList size={16} />
            Prontuário Eletrônico
          </div>
          <div className="flex items-center gap-1">
            <button onClick={minimizarProntuario} title="Minimizar" className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"><Minus size={16} /></button>
            <button onClick={fecharProntuario} title="Fechar" className="p-1.5 hover:bg-red-500 rounded-lg transition-colors"><X size={16} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
          <ProntuarioPage />
        </div>
      </div>
    </>
  );
}
