export function Topbar({ title }: { title: string }) {
  return (
    <header className="topbar">
      <div className="breadcrumb">
        <span>HELIX</span>
        <span>/</span>
        <strong>{title}</strong>
      </div>
    </header>
  );
}
