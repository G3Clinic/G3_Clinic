import { useState, useRef, useEffect } from 'react';
import { Palette, Save, Image as ImageIcon, UploadCloud, RefreshCcw } from 'lucide-react';
import { PageHeader, Card, Btn, InputField } from '../../../components/ui/shared';
import { useTheme } from '../../../contexts/ThemeContext';
import { configApi } from '../../../services/api';

export function AdminIdentidadePage() {
  const { theme, updateTheme } = useTheme();
  
  const [primaryColor, setPrimaryColor] = useState(theme.primaryColor);
  const [sidebarColor, setSidebarColor] = useState(theme.sidebarColor);
  const [topbarColor, setTopbarColor] = useState(theme.topbarColor);
  const [logoFullUrl, setLogoFullUrl] = useState(theme.logoFullUrl);
  const [logoIconUrl, setLogoIconUrl] = useState(theme.logoIconUrl);
  const [companyName, setCompanyName] = useState(theme.companyName);

  const [isUploading, setIsUploading] = useState(false);
  // Sinaliza quando a URL salva aponta para um arquivo que não carrega.
  const [logoFullBroken, setLogoFullBroken] = useState(false);
  const [logoIconBroken, setLogoIconBroken] = useState(false);

  const fileInputFullRef = useRef<HTMLInputElement>(null);
  const fileInputIconRef = useRef<HTMLInputElement>(null);

  // Carrega o tema salvo no backend (por empresa), se houver
  useEffect(() => {
    configApi.obter('tema').then((t: any) => {
      if (!t) return;
      if (t.primaryColor) setPrimaryColor(t.primaryColor);
      if (t.sidebarColor) setSidebarColor(t.sidebarColor);
      if (t.topbarColor) setTopbarColor(t.topbarColor);
      if (t.logoFullUrl) setLogoFullUrl(t.logoFullUrl);
      if (t.logoIconUrl) setLogoIconUrl(t.logoIconUrl);
      if (t.companyName) setCompanyName(t.companyName);
      updateTheme(t);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileUpload = async (file: File, type: 'full' | 'icon') => {
    // Logos são arquivos pequenos: guardamos como data-URL (base64) dentro do tema
    // salvo no banco. Assim não dependem de arquivos no servidor (o filesystem do
    // Railway é efêmero e some a cada deploy) nem de PUBLIC_URL/origem correta.
    if (file.size > 1.5 * 1024 * 1024) {
      alert('Imagem muito grande (máx. 1,5 MB). Envie uma versão otimizada/menor.');
      return;
    }
    setIsUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      if (type === 'full') { setLogoFullUrl(dataUrl); setLogoFullBroken(false); }
      if (type === 'icon') { setLogoIconUrl(dataUrl); setLogoIconBroken(false); }
    } catch (error) {
      console.error("Erro ao processar imagem:", error);
      alert("Não foi possível ler a imagem. Tente outro arquivo.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    const tema = { primaryColor, sidebarColor, topbarColor, logoFullUrl, logoIconUrl, companyName };
    updateTheme(tema);
    try {
      await configApi.salvar('tema', tema);
      alert('Identidade visual atualizada com sucesso!');
    } catch (e) {
      console.error('Falha ao salvar tema no servidor:', e);
      alert('Aplicado nesta sessão, mas não foi possível salvar no servidor. Tente novamente.');
    }
  };

  const handleReset = () => {
    // Reset context
    updateTheme({
      primaryColor: '#10B981',
      sidebarColor: '#FFFFFF',
      topbarColor: '#FFFFFF',
    });
    // Reset local state
    setPrimaryColor('#10B981');
    setSidebarColor('#FFFFFF');
    setTopbarColor('#FFFFFF');
    alert('Cores restauradas para o padrão!');
  };

  return (
    <div className="space-y-6">
      <PageHeader icon={Palette} title="Identidade Visual" subtitle="Personalize as cores, logos e nome da sua clínica" />

      <Card>
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
          <ImageIcon size={18} className="text-brand-primary" />
          Logos e Identificação
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <InputField 
            label="Nome da Empresa" 
            value={companyName} 
            onChange={(e: any) => setCompanyName(e.target.value)} 
            placeholder="Ex: Clínica Saúde" 
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col items-center justify-center relative min-h-[140px]">
            {logoFullUrl && !logoFullBroken ? (
              <img src={logoFullUrl} alt="Logo Completa" className="h-12 object-contain mb-4" onError={() => setLogoFullBroken(true)} />
            ) : logoFullBroken ? (
              <div className="w-full max-w-[160px] h-12 bg-amber-50 border border-amber-200 rounded mb-4 flex items-center justify-center text-[11px] text-amber-700 text-center px-2">Imagem não encontrada — envie novamente</div>
            ) : (
              <div className="w-16 h-12 bg-gray-200 rounded mb-4 flex items-center justify-center text-xs text-slate-400">Sem Imagem</div>
            )}
            <input 
              type="file" 
              accept="image/*,.svg" 
              className="hidden" 
              ref={fileInputFullRef}
              onChange={(e) => e.target.files && handleFileUpload(e.target.files[0], 'full')}
            />
            <Btn size="sm" variant="secondary" icon={UploadCloud} onClick={() => fileInputFullRef.current?.click()} disabled={isUploading}>
              {isUploading ? 'Enviando...' : 'Upload Logo Completa'}
            </Btn>
            <p className="text-xs text-slate-500 mt-2 text-center">Utilizada no cabeçalho superior (Topbar).<br/>Recomendado: Imagem horizontal (PNG/SVG).</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col items-center justify-center relative min-h-[140px]">
            {logoIconUrl && !logoIconBroken ? (
              <img src={logoIconUrl} alt="Ícone da Logo" className="w-12 h-12 object-contain mb-4" onError={() => setLogoIconBroken(true)} />
            ) : logoIconBroken ? (
              <div className="w-12 h-12 bg-amber-50 border border-amber-200 rounded-lg mb-4 flex items-center justify-center text-[9px] text-amber-700 text-center px-1">Reenvie</div>
            ) : (
              <div className="w-12 h-12 bg-gray-200 rounded-lg mb-4 flex items-center justify-center text-xs text-slate-400">Sem Ícone</div>
            )}
            <input 
              type="file" 
              accept="image/*,.svg" 
              className="hidden" 
              ref={fileInputIconRef}
              onChange={(e) => e.target.files && handleFileUpload(e.target.files[0], 'icon')}
            />
            <Btn size="sm" variant="secondary" icon={UploadCloud} onClick={() => fileInputIconRef.current?.click()} disabled={isUploading}>
              {isUploading ? 'Enviando...' : 'Upload Ícone'}
            </Btn>
            <p className="text-xs text-slate-500 mt-2 text-center">Utilizado no menu lateral (Sidebar).<br/>Recomendado: Formato quadrado (PNG/SVG).</p>
          </div>
        </div>
        <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl">
          <p className="text-xs text-blue-700"><strong>Dica de Contraste:</strong> Caso a sua logo não tenha contraste suficiente com a cor de fundo escolhida para os menus, recomendamos fazer o upload de uma versão monocromática (toda em branco ou toda em preto - versão positiva/negativa) com fundo transparente (.png ou .svg).</p>
        </div>
      </Card>

      <Card>
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
          <Palette size={18} className="text-brand-primary" />
          Cores do Sistema
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Cor Principal (Botões e Destaques)</label>
            <div className="flex gap-2 items-center">
              <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-10 h-10 rounded border border-gray-200 cursor-pointer p-1" />
              <input type="text" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary uppercase" />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Cor do Menu Lateral (Sidebar)</label>
            <div className="flex gap-2 items-center">
              <input type="color" value={sidebarColor} onChange={(e) => setSidebarColor(e.target.value)} className="w-10 h-10 rounded border border-gray-200 cursor-pointer p-1" />
              <input type="text" value={sidebarColor} onChange={(e) => setSidebarColor(e.target.value)} className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary uppercase" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Cor do Cabeçalho (Topbar)</label>
            <div className="flex gap-2 items-center">
              <input type="color" value={topbarColor} onChange={(e) => setTopbarColor(e.target.value)} className="w-10 h-10 rounded border border-gray-200 cursor-pointer p-1" />
              <input type="text" value={topbarColor} onChange={(e) => setTopbarColor(e.target.value)} className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary uppercase" />
            </div>
          </div>
        </div>
      </Card>

      <div className="flex justify-between items-center pt-4">
        <Btn variant="cancel" icon={RefreshCcw} onClick={handleReset}>Restaurar Cores Padrão</Btn>
        <Btn icon={Save} onClick={handleSave}>Salvar Configurações</Btn>
      </div>
    </div>
  );
}
