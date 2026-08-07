import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

// Controla o Prontuário Eletrônico como janela flutuante/minimizável (ver
// ProntuarioFloatWindow) em vez de página cheia — assim dá pra continuar
// usando o resto do sistema (Recepção, Agenda etc.) com o prontuário aberto
// ao lado, sem perder o que já foi preenchido ao minimizar.
interface ProntuarioFloatContextValue {
  aberto: boolean;
  minimizado: boolean;
  abrirProntuario: () => void;
  fecharProntuario: () => void;
  minimizarProntuario: () => void;
  restaurarProntuario: () => void;
}

const ProntuarioFloatContext = createContext<ProntuarioFloatContextValue | undefined>(undefined);

export function ProntuarioFloatProvider({ children }: { children: ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const [minimizado, setMinimizado] = useState(false);

  const abrirProntuario = useCallback(() => { setAberto(true); setMinimizado(false); }, []);
  const fecharProntuario = useCallback(() => { setAberto(false); setMinimizado(false); }, []);
  const minimizarProntuario = useCallback(() => setMinimizado(true), []);
  const restaurarProntuario = useCallback(() => setMinimizado(false), []);

  return (
    <ProntuarioFloatContext.Provider value={{ aberto, minimizado, abrirProntuario, fecharProntuario, minimizarProntuario, restaurarProntuario }}>
      {children}
    </ProntuarioFloatContext.Provider>
  );
}

export function useProntuarioFloat() {
  const ctx = useContext(ProntuarioFloatContext);
  if (!ctx) throw new Error('useProntuarioFloat deve ser usado dentro de <ProntuarioFloatProvider>');
  return ctx;
}
