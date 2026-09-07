import type { Temperature } from '@/lib/db/schema';

const LABELS: Record<Temperature, string> = {
  quente: 'Quente',
  morno: 'Morno',
  frio: 'Frio',
};

const TITLES: Record<Temperature, string> = {
  quente: 'Sem site — alvo da prospecção',
  morno: 'Só rede social ou marketplace — tem canal, não tem site',
  frio: 'Tem site próprio',
};

export function TemperatureBadge({ temperature }: { temperature: Temperature }) {
  return (
    <span className="badge" data-temperature={temperature} title={TITLES[temperature]}>
      {LABELS[temperature]}
    </span>
  );
}
