const fs = require('fs');

const filesToFix = {
  'src/components/ui/Button.tsx': ['React'],
  'src/components/ui/Input.tsx': ['React'],
  'src/modules/auth/pages/ForgotPasswordPage.tsx': ['React'],
  'src/modules/dashboard/components/BloodCard.tsx': ['Droplets'],
  'src/modules/dashboard/components/Sidebar.tsx': ['TrendingUp', 'FileSearch', 'Building2', 'DoorOpen', 'Stethoscope', 'Handshake', 'PieChart', 'Repeat2', 'DownloadCloud', 'UploadCloud'],
  'src/modules/dashboard/components/StockDistributionChart.tsx': ['entry'],
  'src/modules/dashboard/components/Topbar.tsx': ['theme'],
  'src/modules/dashboard/pages/AdminAuditPage.tsx': ['Filter', 'User', 'ArrowDownUp'],
  'src/modules/dashboard/pages/AdminUsersPage.tsx': ['CheckCircle2'],
  'src/modules/dashboard/pages/CommunicationPage.tsx': ['AlertCircle'],
  'src/modules/dashboard/pages/DashboardHome.tsx': ['Droplets', 'Calendar', 'Users', 'MapPin', 'OperationsChart', 'StockDistributionChart'],
  'src/modules/dashboard/pages/DonorFormPage.tsx': ['Phone'],
  'src/modules/dashboard/pages/LabConfigurationPage.tsx': ['React'],
  'src/modules/dashboard/pages/LabPage.tsx': ['FileText'],
  'src/modules/dashboard/pages/RelatoriosPage.tsx': ['FileSpreadsheet', 'Download', 'ChevronRight'],
  'src/modules/dashboard/pages/StockConfigurationPage.tsx': ['React', 'AlertTriangle']
};

for (const [file, words] of Object.entries(filesToFix)) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    for (const word of words) {
      if (word === 'React') {
        // Special case for React default import: `import React, { ... }` or `import React from`
        content = content.replace(/import\s+React\s*,\s*\{/g, 'import {');
        content = content.replace(/import\s+React\s+from\s+['"]react['"];?\r?\n/g, '');
      } else {
        // Named import removal.
        // Match `, Word` or `Word, ` or just `Word` inside braces.
        const regex1 = new RegExp(',\\s*' + word + '\\b', 'g');
        const regex2 = new RegExp('\\b' + word + '\\s*,', 'g');
        const regex3 = new RegExp('\\{\\s*' + word + '\\s*\\}', 'g');
        content = content.replace(regex1, '');
        content = content.replace(regex2, '');
        content = content.replace(regex3, '{}');
      }
    }
    
    // Remove whole import line if it became empty: import {} from 'lucide-react'; or import from './components/OperationsChart';
    content = content.replace(/import\s*\{\s*\}\s*from\s*['"][^'"]+['"];?\r?\n/g, '');
    content = content.replace(/import\s+from\s+['"][^'"]+['"];?\r?\n/g, '');
    
    fs.writeFileSync(file, content);
  }
}
console.log('Safe fix done!');
