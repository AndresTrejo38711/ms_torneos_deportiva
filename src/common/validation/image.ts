// Imágenes pequeñas que se guardan como texto junto a su dueño: la foto del jugador y el escudo del
// equipo. Llegan ya reducidas por el front (unos 20 KB) como "data:image/webp;base64,...". El límite
// deja margen y cabe en los 100 KB que Nest acepta por petición. No se aceptan SVG: pueden llevar
// código adentro.
export const IMAGE_MAX_LENGTH = 90_000;
export const IMAGE_DATA_URL =
  /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
