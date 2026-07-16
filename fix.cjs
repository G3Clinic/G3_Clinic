const fs = require('fs');

// Update api.ts
const apiPath = 'src/services/api.ts';
let apiCode = fs.readFileSync(apiPath, 'utf8');
apiCode = apiCode.replace(
  'export interface APIOrcamentoItem { id: string; orcamento_id?: string | null; dente_numero?: string | null; faces?: string | null; procedimento_id?: string | null; valor_cobrado?: number | null; status_item?: string | null; status_visual?: string | null; }',
  'export interface APIOrcamentoItem { id: string; orcamento_id?: string | null; dente_numero?: string | null; faces?: string | null; procedimento_id?: string | null; valor_cobrado?: number | null; status_item?: string | null; status_visual?: string | null; odonto_procedimentos?: any; }'
);
fs.writeFileSync(apiPath, apiCode);

// Fix unused imports using standard regexes for the ones we know
const filesToFix = {
  'src/components/ui/Button.tsx': [/import React from .react.;?\r?\n/],
  'src/components/ui/Input.tsx': [/import React from .react.;?\r?\n/],
  'src/modules/auth/pages/ForgotPasswordPage.tsx': [/import React[, ]*.*? from .react.;?\r?\n/, 'import { useState } from \"react\";\n'],
  'src/modules/dashboard/components/BloodCard.tsx': [/, Droplets/g],
  'src/modules/dashboard/components/Sidebar.tsx': [/TrendingUp, /g, /FileSearch, /g, /Building2, /g, /DoorOpen, /g, /Stethoscope, /g, /Handshake, /g, /PieChart, /g, /Repeat2, /g, /DownloadCloud, /g, /UploadCloud, /g],
  'src/modules/dashboard/components/StockDistributionChart.tsx': [/, entry/g],
  'src/modules/dashboard/components/Topbar.tsx': [/, theme/g, /theme, /g],
  'src/modules/dashboard/pages/AdminAuditPage.tsx': [/, Filter/g, /Filter, /g, /, User/g, /User, /g, /, ArrowDownUp/g, /ArrowDownUp, /g],
  'src/modules/dashboard/pages/AdminUsersPage.tsx': [/, CheckCircle2/g, /CheckCircle2, /g],
  'src/modules/dashboard/pages/CommunicationPage.tsx': [/, AlertCircle/g, /AlertCircle, /g],
  'src/modules/dashboard/pages/DashboardHome.tsx': [/, Droplets/g, /Droplets, /g, /, Calendar/g, /Calendar, /g, /, Users/g, /Users, /g, /, MapPin/g, /MapPin, /g, /import OperationsChart from .\.\/components\/OperationsChart.;?\r?\n/, /import StockDistributionChart from .\.\/components\/StockDistributionChart.;?\r?\n/],
  'src/modules/dashboard/pages/DonorFormPage.tsx': [/, Phone/g, /Phone, /g],
  'src/modules/dashboard/pages/LabConfigurationPage.tsx': [/import React from .react.;?\r?\n/],
  'src/modules/dashboard/pages/LabPage.tsx': [/, FileText/g, /FileText, /g],
  'src/modules/dashboard/pages/RelatoriosPage.tsx': [/, FileSpreadsheet/g, /FileSpreadsheet, /g, /, Download/g, /Download, /g, /, ChevronRight/g, /ChevronRight, /g],
  'src/modules/dashboard/pages/StockConfigurationPage.tsx': [/import React[, ]*.*? from .react.;?\r?\n/, 'import { useState } from \"react\";\n', /, AlertTriangle/g, /AlertTriangle, /g]
};

for (const [file, fixes] of Object.entries(filesToFix)) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    if (fixes.length === 2 && typeof fixes[1] === 'string') {
        content = content.replace(fixes[0], fixes[1]);
        fixes.splice(0, 2);
    }
    for (const fix of fixes) {
      content = content.replace(fix, '');
    }
    // Clean up empty braces like import { } from 'lucide-react';
    content = content.replace(/import\s*{\s*}\s*from\s*['\"][^'\"]+['\"];?\r?\n/g, '');
    fs.writeFileSync(file, content);
  }
}
console.log('Done!');
