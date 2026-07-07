import { type ReactNode } from 'react';
import { Droplets } from 'lucide-react';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  // Pattern Geométrico no Background da página
  const backgroundPattern = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25'%3E%3Cdefs%3E%3ClinearGradient id='a' gradientUnits='userSpaceOnUse' x1='0' x2='0' y1='0' y2='100%25' gradientTransform='rotate(240)'%3E%3Cstop offset='0' stop-color='%23ffffff'/%3E%3Cstop offset='1' stop-color='%234FE'/%3E%3C/linearGradient%3E%3Cpattern patternUnits='userSpaceOnUse' id='b' width='719' height='599.2' x='0' y='0' viewBox='0 0 1080 900'%3E%3Cg%3E%3Cpolygon fill='%23444' points='90 150 0 300 180 300'/%3E%3Cpolygon points='90 150 180 0 0 0'/%3E%3Cpolygon fill='%23AAA' points='270 150 360 0 180 0'/%3E%3Cpolygon fill='%23DDD' points='450 150 360 300 540 300'/%3E%3Cpolygon fill='%23999' points='450 150 540 0 360 0'/%3E%3Cpolygon points='630 150 540 300 720 300'/%3E%3Cpolygon fill='%23DDD' points='630 150 720 0 540 0'/%3E%3Cpolygon fill='%23444' points='810 150 720 300 900 300'/%3E%3Cpolygon fill='%23FFF' points='810 150 900 0 720 0'/%3E%3Cpolygon fill='%23DDD' points='990 150 900 300 1080 300'/%3E%3Cpolygon fill='%23444' points='990 150 1080 0 900 0'/%3E%3Cpolygon fill='%23DDD' points='90 450 0 600 180 600'/%3E%3Cpolygon points='90 450 180 300 0 300'/%3E%3Cpolygon fill='%23666' points='270 450 180 600 360 600'/%3E%3Cpolygon fill='%23AAA' points='270 450 360 300 180 300'/%3E%3Cpolygon fill='%23DDD' points='450 450 360 600 540 600'/%3E%3Cpolygon fill='%23999' points='450 450 540 300 360 300'/%3E%3Cpolygon fill='%23999' points='630 450 540 600 720 600'/%3E%3Cpolygon fill='%23FFF' points='630 450 720 300 540 300'/%3E%3Cpolygon points='810 450 720 600 900 600'/%3E%3Cpolygon fill='%23DDD' points='810 450 900 300 720 300'/%3E%3Cpolygon fill='%23AAA' points='990 450 900 600 1080 600'/%3E%3Cpolygon fill='%23444' points='990 450 1080 300 900 300'/%3E%3Cpolygon fill='%23222' points='90 750 0 900 180 900'/%3E%3Cpolygon points='270 750 180 900 360 900'/%3E%3Cpolygon fill='%23DDD' points='270 750 360 600 180 600'/%3E%3Cpolygon points='450 750 540 600 360 600'/%3E%3Cpolygon points='630 750 540 900 720 900'/%3E%3Cpolygon fill='%23444' points='630 750 720 600 540 600'/%3E%3Cpolygon fill='%23AAA' points='810 750 720 900 900 900'/%3E%3Cpolygon fill='%23666' points='810 750 900 600 720 600'/%3E%3Cpolygon fill='%23999' points='990 750 900 900 1080 900'/%3E%3Cpolygon fill='%23999' points='180 0 90 150 270 150'/%3E%3Cpolygon fill='%23444' points='360 0 270 150 450 150'/%3E%3Cpolygon fill='%23FFF' points='540 0 450 150 630 150'/%3E%3Cpolygon points='900 0 810 150 990 150'/%3E%3Cpolygon fill='%23222' points='0 300 -90 450 90 450'/%3E%3Cpolygon fill='%23FFF' points='0 300 90 150 -90 150'/%3E%3Cpolygon fill='%23FFF' points='180 300 90 450 270 450'/%3E%3Cpolygon fill='%23666' points='180 300 270 150 90 150'/%3E%3Cpolygon fill='%23222' points='360 300 270 450 450 450'/%3E%3Cpolygon fill='%23FFF' points='360 300 450 150 270 150'/%3E%3Cpolygon fill='%23444' points='540 300 450 450 630 450'/%3E%3Cpolygon fill='%23222' points='540 300 630 150 450 150'/%3E%3Cpolygon fill='%23AAA' points='720 300 630 450 810 450'/%3E%3Cpolygon fill='%23666' points='720 300 810 150 630 150'/%3E%3Cpolygon fill='%23FFF' points='900 300 810 450 990 450'/%3E%3Cpolygon fill='%23999' points='900 300 990 150 810 150'/%3E%3Cpolygon points='0 600 -90 750 90 750'/%3E%3Cpolygon fill='%23666' points='0 600 90 450 -90 450'/%3E%3Cpolygon fill='%23AAA' points='180 600 90 750 270 750'/%3E%3Cpolygon fill='%23444' points='180 600 270 450 90 450'/%3E%3Cpolygon fill='%23444' points='360 600 270 750 450 750'/%3E%3Cpolygon fill='%23999' points='360 600 450 450 270 450'/%3E%3Cpolygon fill='%23666' points='540 600 630 450 450 450'/%3E%3Cpolygon fill='%23222' points='720 600 630 750 810 750'/%3E%3Cpolygon fill='%23FFF' points='900 600 810 750 990 750'/%3E%3Cpolygon fill='%23222' points='900 600 990 450 810 450'/%3E%3Cpolygon fill='%23DDD' points='0 900 90 750 -90 750'/%3E%3Cpolygon fill='%23444' points='180 900 270 750 90 750'/%3E%3Cpolygon fill='%23FFF' points='360 900 450 750 270 750'/%3E%3Cpolygon fill='%23AAA' points='540 900 630 750 450 750'/%3E%3Cpolygon fill='%23FFF' points='720 900 810 750 630 750'/%3E%3Cpolygon fill='%23222' points='900 900 990 750 810 750'/%3E%3Cpolygon fill='%23222' points='1080 300 990 450 1170 450'/%3E%3Cpolygon fill='%23FFF' points='1080 300 1170 150 990 150'/%3E%3Cpolygon points='1080 600 990 750 1170 750'/%3E%3Cpolygon fill='%23666' points='1080 600 1170 450 990 450'/%3E%3Cpolygon fill='%23DDD' points='1080 900 1170 750 990 750'/%3E%3C/g%3E%3C/pattern%3E%3C/defs%3E%3Crect x='0' y='0' fill='url(%23a)' width='100%25' height='100%25'/%3E%3Crect x='0' y='0' fill='url(%23b)' width='100%25' height='100%25'/%3E%3C/svg%3E")`;

  return (
    // Fundo da Página (Tela Inteira) com Pattern
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F2F4F8] p-4 font-sans relative">
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] grayscale"
           style={{
             backgroundImage: backgroundPattern,
             backgroundSize: 'cover',
             backgroundPosition: 'center'
           }}
      />
      
      {/* O Cartão Flutuante (Imagem + Formulário juntos) */}
      <div className="w-full max-w-5xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex min-h-[650px] relative z-10">
        
        {/* Lado Esquerdo (Fixo) - Imagem */}
        <div className="hidden lg:flex w-1/2 relative p-3">
          <div className="relative w-full h-full rounded-[2rem] overflow-hidden">
             <div 
               className="absolute inset-0 bg-cover bg-center"
               style={{ 
                 backgroundImage: 'url("https://images.unsplash.com/photo-1579154204601-01588f351e67?q=80&w=2070&auto=format&fit=crop")',
               }}
             />
             <div className="absolute inset-0 bg-gradient-to-t from-black via-gray-900/80 to-transparent mix-blend-multiply" />
             <div className="absolute inset-0 bg-black/30" />

             <div className="relative z-10 h-full flex flex-col justify-between p-8 text-white">
                <div className="flex items-center gap-3">
                  <Droplets className="w-8 h-8 text-brand-red drop-shadow-md" />
                  <span className="text-2xl font-bold tracking-tight text-white drop-shadow-md">Hemogestor</span>
                </div>

                <div className="mb-4">
                   <div className="bg-black/20 backdrop-blur-md p-6 rounded-2xl border border-white/5 shadow-lg">
                      <p className="text-lg font-medium leading-relaxed text-gray-100">
                        "Gestão inteligente para salvar vidas. Conectando doadores e hemocentros com eficiência e segurança."
                      </p>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Lado Direito (Dinâmico) - Formulário com Fundo Branco Limpo */}
        <div className="w-full lg:w-1/2 p-12 flex flex-col justify-center bg-white relative">
          
          <div className="max-w-sm mx-auto w-full relative z-10">
            
            {/* Header Mobile */}
            <div className="flex lg:hidden flex-col items-center mb-8">
              <Droplets className="w-12 h-12 text-brand-red mb-3" />
              <span className="text-2xl font-bold text-brand-red">Hemogestor</span>
            </div>

            <div className="mb-10 text-center lg:text-left">
              <h1 className="text-3xl font-bold text-ui-text mb-2">{title}</h1>
              <p className="text-ui-muted">{subtitle}</p>
            </div>

            {children}

          </div>
        </div>
      </div>
      
      {/* Footer fora do card */}
      <div className="absolute bottom-4 text-center w-full pointer-events-none opacity-40 text-xs hidden lg:block">
        &copy; 2026 Avda Software &bull; Hemogestor
      </div>
    </div>
  );
}