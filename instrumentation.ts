export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || !process.env.BACKUP_DIR) return;
  const { startBackups } = await import('@/lib/db/backup');
  startBackups(process.env.BACKUP_DIR);
}
