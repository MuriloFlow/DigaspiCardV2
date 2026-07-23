const fs = require('fs');
let c = fs.readFileSync('src/components/records/history-detail-view.tsx', 'utf8');
c = c.replace(/Ver m.tricas/g, 'Ver métricas');
c = c.replace(/\} Digita.es/g, '} Digitações');
c = c.replace(/'cart.o' : 'cart.es'/g, "'cartão' : 'cartões'");
c = c.replace(/title=.Digita.es do Dia./g, 'title="Digitações do Dia"');
c = c.replace(/Sem c.lculo dia a dia por enquanto/g, 'Sem cálculo dia a dia por enquanto');
c = c.replace(/Participacao percentual/g, 'Participação percentual');
fs.writeFileSync('src/components/records/history-detail-view.tsx', c, 'utf8');
