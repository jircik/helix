import { ThemePicker } from '@/components/settings/ThemePicker';

export default function AparenciaPage() {
  return (
    <div className="view">
      <span className="mono">Aparência</span>
      <h1>Tema</h1>
      <p className="page-description">
        Vale para este navegador e fica guardado nele. O mapa acompanha a escolha.
      </p>
      <ThemePicker />
    </div>
  );
}
