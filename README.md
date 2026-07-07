# G3 Clínica — Sistema de Gestão Clínica

Sistema de gestão para clínicas médicas e odontológicas com frontend React (Vite + Tailwind) e backend FastAPI (Python).

---

## 🗂️ Estrutura do Projeto

```
clinica-redesign/
├── src/                     # Frontend React
│   ├── modules/dashboard/pages/   # Todas as telas do sistema
│   ├── services/api.ts            # 🔌 Camada de API (conecta ao backend)
│   └── components/ui/shared.tsx   # Componentes reutilizáveis
│
├── backend/                 # Backend FastAPI (Python)
│   ├── app/
│   │   ├── database.py      # Conexão SQLite
│   │   ├── models.py        # Tabelas (Paciente, Consulta, Prescricao)
│   │   ├── schemas.py       # Validação Pydantic
│   │   └── services/
│   │       ├── memed.py     # Integração Memed (prescrição digital)
│   │       └── cid.py       # Busca CID (diagnósticos)
│   ├── main.py              # Ponto de entrada da API
│   ├── requirements.txt     # Dependências Python
│   └── .env.example         # Variáveis de ambiente necessárias
│
├── .env.example             # Variáveis do frontend
└── .env                     # (criar localmente, não commitado)
```

---

## 🚀 Como Rodar Localmente

### 1. Frontend (React)

```bash
# Instalar dependências
npm install

# Criar arquivo de ambiente
cp .env.example .env   # (Linux/Mac) ou copy .env.example .env (Windows)

# Rodar o servidor de desenvolvimento
npm run dev
# → http://localhost:5173
```

### 2. Backend (FastAPI)

```bash
cd backend

# Instalar dependências Python
pip install -r requirements.txt

# Criar arquivo de ambiente com as chaves reais
copy .env.example .env
# ⚠️ Editar .env com as chaves da Memed (ver seção abaixo)

# Rodar o servidor
python main.py
# → http://localhost:8000
# → Documentação Swagger: http://localhost:8000/docs
```

---

## 🔌 Endpoints da API

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/pacientes` | Lista todos os pacientes |
| POST | `/api/pacientes` | Cadastra novo paciente |
| GET | `/api/pacientes/{id}/consultas` | Lista consultas de um paciente |
| POST | `/api/consultas` | Registra nova consulta |
| GET | `/api/cid/search?q=termo` | Busca CID por código ou nome |
| GET | `/api/memed/token` | Gera token para o módulo de prescrição |
| GET | `/api/memed/medicamentos?q=termo` | Busca medicamentos/princípios ativos |
| POST | `/upload` | Upload de arquivos/imagens |

---

## 🔑 Variáveis de Ambiente

### backend/.env

```env
MEMED_API_KEY=sua_chave_aqui
MEMED_SECRET_KEY=sua_chave_secreta_aqui
MEMED_BASE_URL=https://api.memed.com.br/v1
```

> Para obter as chaves da Memed: https://memed.com.br/desenvolvedores

### .env (frontend)

```env
VITE_API_URL=http://localhost:8000
```

---

## 🧪 Como Testar as Integrações

### Testar CID
```bash
# Com o backend rodando:
curl http://localhost:8000/api/cid/search?q=diabetes
# Retorna: {"data":[{"codigo":"E11.9","descricao":"Diabetes mellitus..."}]}
```

### Testar Memed
```bash
# Requer chaves no backend/.env
curl http://localhost:8000/api/memed/token
```

### Testar via Swagger (recomendado)
Acesse: **http://localhost:8000/docs**

### Testar pela Interface
1. Frontend rodando em `http://localhost:5173`
2. Backend rodando em `http://localhost:8000`
3. Vá em **Pacientes → clique em qualquer paciente → aba "Nova Consulta"**
4. No campo **Diagnóstico (CID)** — digite "diabetes" ou "hipertensão" → aparecerá autocomplete
5. No campo **Alergias** — digite "dipirona" ou "penicilina" → busca via Memed
6. Clique em **"Abrir Prescrição"** → injeta o módulo Memed (requer chaves reais)

---

## 📋 Status das Integrações

| Integração | Status | Observação |
|------------|--------|------------|
| CID Busca | ✅ Funcionando | Mock interno com 8 CIDs — expandir com tabela completa |
| Memed Token | ✅ Funcionando | Requer `MEMED_API_KEY` + `MEMED_SECRET_KEY` no `.env` |
| Memed Medicamentos (alergias) | ✅ Funcionando | Mesmas chaves acima |
| Memed Script (UI prescrição) | ✅ Funcionando | Injeta `mdhub.js` com token no DOM |
| Pacientes CRUD | ✅ Funcionando | SQLite local |
| Consultas | ✅ Funcionando | SQLite local |

---

## 🖥️ Telas do Sistema

| Módulo | Tela | Dados Demo |
|--------|------|------------|
| Dashboard | Visão geral, gráficos | ✅ Demo |
| Pacientes | Lista, Perfil, Nova Consulta | ✅ 3 pacientes demo |
| Prontuário | Triagem, Evolução, Receituário | ✅ Demo |
| Agenda | Calendário de consultas | ✅ Demo |
| Odontograma | Arcadas, Histórico dental | ✅ Demo |
| Estoque | Produtos, Validade | ✅ Demo |
| Financeiro | Caixa, DRE, Recebimentos | ✅ Demo |
| Relatórios | Exportação de dados | ✅ Demo |
| Administração | Configurações, Usuários | ✅ Demo |

> Os dados de demonstração são carregados diretamente no frontend para que o sistema seja navegável sem backend.

---

## 🔧 Próximos Passos — Conectar Backend

O arquivo `src/services/api.ts` já tem todos os métodos prontos. Para cada tela, substituir o array mockado pela chamada de API:

### Exemplo: Lista de Pacientes

```typescript
// Antes (mockado em PacientesPage.tsx)
const pacientes = [
  { nome: 'João da Silva', ... },
  ...
]

// Depois (conectado ao backend)
import { pacientesApi } from '../../../services/api';

const [pacientes, setPacientes] = useState([]);
useEffect(() => {
  pacientesApi.listar().then(setPacientes);
}, []);
```

### Checklist do Backend

- [ ] Expandir CID — importar tabela completa CID-10 (CSV disponível no DataSUS)
- [ ] Conectar lista de pacientes ao banco real
- [ ] Implementar autenticação JWT
- [ ] Migrar SQLite → PostgreSQL para produção
- [ ] Adicionar endpoints de Agenda
- [ ] Adicionar endpoints de Estoque
- [ ] Adicionar endpoints Financeiros

---

## 📦 Tecnologias

**Frontend:** React 18, TypeScript, Vite, Tailwind CSS, React Router  
**Backend:** FastAPI, SQLAlchemy, Pydantic, SQLite (dev) → PostgreSQL (prod)  
**Integrações:** Memed API v1 (prescrição digital), CID-10/11
