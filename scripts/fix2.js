const fs = require('fs');
let c = fs.readFileSync('src/components/records/history-detail-view.tsx', 'utf8');
c = c.replace(/cartõesAtivosPerc/g, "cartoesAtivosPerc");
fs.writeFileSync('src/components/records/history-detail-view.tsx', c, 'utf8');
