# GW de IA por jugador y proveedor de chips

Web estática (HTML, CSS y JavaScript, sin compilar) con:

- **Mapa** de GW por jugador de IA y proveedor de chips.
- **Barras** con la suma por proveedor y Nvidia frente al resto.
- **Tendencias** por jugador (OpenAI, Anthropic, Meta y SpaceX/xAI).

Todos los números salen de `data/datos.json`. Para cambiar una cifra no hace falta tocar el código.

## Publicarla en GitHub Pages

1. Crea un repositorio nuevo en GitHub y sube todo el contenido de esta carpeta.
2. En el repositorio: **Settings → Pages → Build and deployment**.
3. Elige **Deploy from a branch**, rama `main`, carpeta `/ (root)` y guarda.
4. En uno o dos minutos tendrás la web en `https://TU_USUARIO.github.io/NOMBRE_DEL_REPO/`.

## Probarla en tu PC

No abras `index.html` con doble clic: el navegador bloquea la lectura del JSON. Sírvela con un servidor local:

```powershell
cd ruta\a\esta\carpeta
py -m http.server 8000
```

y abre `http://localhost:8000`.

## "Tiempo real": qué significa aquí

No existe ninguna API pública con los GW de cada acuerdo, así que los datos no se descargan solos. Lo que hace la web es **releer `data/datos.json` cada 30 s, 60 s o 5 min** (lo eliges arriba a la derecha) y redibujarlo si ha cambiado. El flujo es:

1. Editas `data/datos.json` (en tu PC o directamente en GitHub con el botón del lápiz).
2. Haces commit.
3. Cuando GitHub Pages termina de publicar (normalmente 1 o 2 minutos), cualquiera que tenga la página abierta ve el cambio sin recargar.

## Cómo editar `data/datos.json`

- `jugadores[].celdas.<proveedor>`: `{ "gw": 10, "nota": "…" }`. Con `"gw": null` se muestra **n/d**. Si falta la clave, se muestra "—".
- Los totales, las barras y los porcentajes se calculan solos a partir de esas celdas.
- `tendencias[]`: cada gráfica tiene `etiquetas` (eje X) y `series[]` con un valor por etiqueta (`null` para dejar un hueco). `escalon: true` dibuja la línea en escalones, que es lo adecuado para compromisos acumulados.
- `actualizado`: cambia la fecha cuando toques datos.
- `fuentes[]`: la lista de enlaces del final.

## Para que lo leas bien

- OpenAI, Meta y Anthropic son **compromisos anunciados**, muchos condicionados a hitos y con entrega repartida en años. SpaceX es **capacidad instalada** que reporta la propia empresa. No son comparables directamente.
- Las celdas **n/d** no suman, así que la cuota de Nvidia está infravalorada.
- Algunas cifras vienen de fuentes secundarias (blogs de análisis). Contrástalas antes de usarlas para decidir.
- No es una recomendación de inversión.

## Estructura

```
index.html
style.css
app.js
data/datos.json
README.md
```
