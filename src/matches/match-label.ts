// "Local vs Visitante", para los mensajes. Sirve con la entidad y con el DTO de respuesta: los dos
// traen homeTeam y awayTeam con su nombre.
export function matchLabel(match: {
  homeTeam: { name: string };
  awayTeam: { name: string };
}): string {
  return `"${match.homeTeam.name} vs ${match.awayTeam.name}"`;
}
