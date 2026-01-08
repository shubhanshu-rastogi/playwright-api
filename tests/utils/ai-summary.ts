export function summariseApiLogs(logs: any[]) {
  const last = logs[logs.length - 1];
  const statuses = logs.map(l => l.status).join(' -> ');
  return [
    `Total calls: ${logs.length}`,
    `Statuses: ${statuses}`,
    last ? `Last: ${last.method} ${last.url} (${last.status}) in ${last.durationMs ?? 'n/a'}ms` : '',
  ].filter(Boolean).join('\n');
}