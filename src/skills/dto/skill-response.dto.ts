// Lo que responde la API: nunca la entidad directamente. Una habilidad tiene pocos datos, así que
// la misma forma sirve para el detalle y para mostrarla en las habilidades de un jugador.
export class SkillResponseDto {
  id: number;
  name: string;
  description: string | null;
}
