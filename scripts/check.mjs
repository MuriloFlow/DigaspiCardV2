import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://kwidcuhdecowitehwydf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3aWRjdWhkZWNvd2l0ZWh3eWRmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDQ1MTcyNCwiZXhwIjoyMTAwMDI3NzI0fQ.z9M7Trq812mSyBm2i_68DSGwuKEPaRQHgSBfz8vMGBc'
);

async function run() {
  const { data: records, error } = await supabase
    .from('records')
    .select('id, operator_name, client_name, amount_in_cents, amount_used_in_cents, activated, activated_later, created_at')
    .not('amount_used_in_cents', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Erro:', error.message);
    process.exit(1);
  }

  console.log('\n=== REGISTROS COM amount_used_in_cents ===');
  let totalUsed = 0;
  for (const r of records) {
    console.log(`${r.operator_name} / ${r.client_name} | amount_in_cents: ${r.amount_in_cents} | amount_used_in_cents: ${r.amount_used_in_cents} | activated: ${r.activated} | activated_later: ${r.activated_later} | data: ${r.created_at.substring(0,10)}`);
    totalUsed += r.amount_used_in_cents ?? 0;
  }
  console.log(`\nTotal registros com uso: ${records.length}`);
  console.log(`Soma amount_used_in_cents (raw): ${totalUsed}`);
  console.log(`Soma em reais (raw/100): R$ ${(totalUsed/100).toFixed(2)}`);
  
  const { data: trocas, error: err2 } = await supabase
    .from('trocas')
    .select('*')
    .order('created_at', { ascending: false });

  console.log('\n=== TROCAS ===');
  console.log(trocas);
}

run();

