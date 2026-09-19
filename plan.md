# Guion narrativo — Portafolio 3D

> Documento de referencia para desarrollo local. Stack: Astro + React Three Fiber + GSAP + Tailwind + Three.js.
> Complemento técnico: [`ARCHITECTURE.md`](./ARCHITECTURE.md).
> Cada acto sigue el mismo formato: **Qué se muestra** / **Qué se hace** / **Contenido que carga** / **Cámara** / **Notas técnicas**.

---

## Resumen en 5 líneas (referencia única)

1. **Galaxia** — agujero negro + estrellas con parallax. Título y rol. Todo clean.
2. **Espacio de soluciones** — más sobre mí: pensamiento sistémico y analítico, principios y axiomas de diseño, implementación con fundamento computacional.
3. **Muelle y mar** — muelle oscuro con medusas: mi trayectoria (empleos, prácticas, estudios, certificaciones).
4. **El faro** — al entrar está el piano; siguiendo el scroll se llega a la partitura, cuyas hojas (formato álbum) son los stacks que manejo.
5. **Dentro del piano** — el mundo-circuito con mis proyectos, y el buzón para contactarme.

Si algo en este documento contradice estas 5 líneas, mandan las 5 líneas.

---

## 0. Núcleo conceptual

Los seis pilares de identidad (Espacio, Computación, Matemática, Música, Idiomas, Filosofía) comparten una misma forma visual: **nodos conectados por líneas**. Una galaxia, un campo de gradientes, un muelle con puntos de luz y las calles de una ciudad-circuito son, geométricamente, la misma figura dibujada distinto.

El tono emocional es **liminal**: espacios de tránsito, vacíos, con una sola fuente de luz — contemplativo, no oscuro ni gótico.

---

## 1. Mapa — secciones clásicas → dónde viven ahora

| Sección clásica                           | Acto               | Cómo se ve                                      |
| ----------------------------------------- | ------------------ | ----------------------------------------------- |
| Hero                                      | 1 — Galaxia        | Título + rol sobre un agujero negro             |
| About                                     | 2 — Espacio de soluciones | Paisaje de puntos y malla; texto por capítulos |
| Experience / Educación / Certificaciones  | 3 — Muelle y mar   | Medusas bioluminiscentes, una por hito          |
| Skills / Stack                            | 4 — El faro        | Hojas de la partitura (álbum)                   |
| Projects                                  | 5 — Dentro del piano | Edificios de la ciudad-circuito               |
| Contact (+ Blog, si existe)               | 5 — Dentro del piano | Buzón → hoja con el formulario                |

Cada sección clásica vive en **un solo** acto. El orden cuenta una historia: quién soy (1–2), por dónde he pasado (3), con qué herramientas trabajo (4) y qué he construido con ellas (5).

---

## 2. Los cinco actos

### Acto 1 — Galaxia (Hero)
- **Qué se muestra:** título + subtítulo: nombre y rol. Tipografía protagonista, nada más.
- **Qué se hace:** campo de estrellas con parallax de mouse. Al centro, un agujero negro con disco de acreción. Nada es clicable; el único gesto es hacer scroll (indicador sutil abajo).
- **Contenido que carga:** `site.name`, `site.role`, `site.tagline`.
- **Cámara:** frente al agujero negro; el scroll la empuja hacia él y lo atraviesa → Acto 2.
- **Notas técnicas:** shader de lente gravitacional "barato" (una uniform de distorsión) + `RingGeometry` rotando para el disco + bloom. Estrellas con `Points`.
- **Tipografía sugerida:** `Fraunces` (nombre) + `Space Grotesk` (UI). Pendiente probar con tu nombre real.

### Acto 2 — Espacio de soluciones (About)
- **Qué se muestra:** estamos *dentro* del agujero negro: todo negro, sin estrellas. Aparece un **paisaje blanco** f(x, y) hecho de puntos y malla que respira (ondas lentas), con notación matemática flotando (ℝ, ℂ, ℍ, ∇f, e^{iπ} + 1 = 0…). Cada fragmento de bio es un **mínimo** del paisaje, marcado por una esfera luminosa que sube y baja con él. Representa cómo piensas: cada punto de un problema tiene una dirección de mejora.
- **Qué se hace:**
  - El scroll recorre un **capítulo por fragmento**: el texto (título + cuerpo) está siempre a la vista en una columna a la izquierda, y el pozo del capítulo activo se hunde y su esfera brilla. Sin clic ni panel.
  - **Sonda del cursor:** bajo el puntero se dibujan los dos cortes ortogonales de la malla (x fija, y fija) y, en su cruce, el vector de descenso −∇f con el valor de f.
  - Hover en una esfera → crece y muestra su título; clic → viaja a su capítulo. Los puntos de progreso bajo el texto hacen lo mismo.
- **Contenido que carga:** colección `bio` (`gridPos` = posición (x, z) del pozo en el paisaje).
- **Cámara:** sale del negro mirando desde arriba; órbita lenta a tres cuartos con el paisaje a la derecha del texto; al final baja la mirada hacia la superficie.
- **Notas técnicas:** f se define una sola vez y se genera en GLSL (desplaza malla y puntos en GPU) y en TS (esferas y sonda, con raycast propio contra la altura). Malla con líneas por shader (`fract` + `fwidth`), puntos con `Points`, glifos en un atlas de canvas con un solo draw call.
- **Transición → 3 (sin velo, sin volver al negro):** el paisaje se **calma** hasta ser un mar suave mientras vuelven las estrellas (salimos del agujero negro) y la cámara pica hacia abajo. La malla aplanada **se vuelve el océano** en el mismo sitio: quedamos flotando a la altura de los ojos sobre mar abierto, sin nada más.

### Acto 3 — Muelle y mar (Trayectoria)
Muelle de noche, mar oscuro, medusas bioluminiscentes bajo y sobre el agua, y el faro al fondo. Representa el camino recorrido — *no todo es instantáneo en esta vida*.

- **Qué se muestra:**
  1. **Llegada y construcción:** flotas sobre el mar abierto bajo la luna: el paisaje aplanado se desvaneció y quedó el agua. El faro (el destino) sale del mar a lo lejos y el muelle se arma **rápido**, tabla a tabla, desde el faro hacia la cámara, con un leve efecto ojo de pez, hasta que la última tabla queda bajo tus pies: el primer contacto con tierra.
  2. **Recorrido:** la cámara avanza por el muelle hacia el faro. A los lados flotan las **medusas; cada medusa = un hito de tu trayectoria**, en orden cronológico (el más antiguo primero, el más reciente junto al faro). El color de la medusa indica el tipo: empleo, prácticas, estudios, certificación, reconocimiento.
  3. Los **faroles** del muelle son solo luz: se encienden al pasar, sin contenido.
- **Qué se hace:**
  - Al acercarte a una medusa (o con hover) aparece una tarjeta breve: tipo, empresa/institución, título, fechas.
  - Clic en la medusa → panel con el detalle (qué hiciste, tecnologías, link a la credencial si es certificación).
  - Música: Chopin, *Nocturno Op. 9 No. 1* (piano). Arranca casi inaudible al terminar la construcción, sube con el recorrido y se apaga al entrar al faro.
- **Contenido que carga:** colección `milestones`.
- **Cámara:** perspectiva a altura de ojos mirando al faro; el mouse deja mirar a los lados (al mar, a las medusas).
- **Notas técnicas:** tablas y faroles con `InstancedMesh`; medusas = geometría procedural + shader emisivo con pulso; agua = `Water` de three.js (el de `react-three-ocean`): reflejo planar real + normales animadas. Luces reales solo en los 2–3 faroles más cercanos; el resto emisivo + bloom.
- **Transición → 4:** al llegar, la puerta del faro se abre hacia el muelle y sale la luz del interior; al acercarte su luz lo llena todo (fundido a blanco cálido) y, al disiparse, ya estás dentro.

### Acto 4 — El faro (Stack)
- **Qué se muestra:** el interior del faro: cuarto circular casi vacío, un solo foco de luz, un piano de cola y un violín recostado.
- **Qué se hace:**
  1. **El piano:** al entrar lo ves completo. Las teclas se pueden tocar (hover/clic suena la nota); no llevan etiquetas — el piano representa dedicación y esfuerzo, no un listado.
  2. **La partitura:** al seguir haciendo scroll, la cámara se acerca al atril y se queda quieta. La partitura es un **álbum**: clic en la esquina de la hoja la pasa, y arrastrarla la dobla y la pasa (el scroll no pasa hojas). Cada hoja es un "movimiento": una familia de tu stack (lenguajes, web y backend, IA y datos, bases de datos, cloud, arquitectura, idiomas) con cada tecnología como una nota y su dinámica (p / mf / f).
  - Música: *Liebestraum No. 3* (Liszt) en violín. Entra al cruzar la puerta y se apaga en el super zoom de salida.
- **Contenido que carga:** colección `skills`.
- **Cámara:** perspectiva; plano general del piano → acercamiento al atril guiado por el scroll.
- **Notas técnicas:** raycasting sobre las teclas; notas con Web Audio (pocos samples, pitch por `playbackRate`). Hoja del álbum = plano con curvatura animada por el drag.
- **Transición → 5:** la cámara sube a vista superior y hace zoom dentro del piano; se funde a un color plano ("super zoom") y aparece la ciudad-circuito.

### Acto 5 — Dentro del piano (Projects + Contact)
- **Qué se muestra:** una **PCB vista en isométrico (2.5D)**: máscara negra mate, cobre dorado, serigrafía clara. **Chips = proyectos** (hacer un proyecto es como construir un edificio), cada uno en su distrito de una grilla de 4 × 4 (máximo 16; los zócalos libres quedan como huellas sin poblar). **Calles = pistas de circuito** entre proyectos relacionados, con pulsos de energía: todo se coordina. El resto es una placa realista generada: abanicos de pistas desde los pines, buses, vías, pasivos, conectores en el borde.
- **Qué se hace:**
  - Tras el fundido dorado se ve la placa entera y se **enciende** desde el centro (las pistas se iluminan, los componentes se levantan); luego la cámara baja y recorre los distritos por filas diagonales.
  - Hover en un chip → se levanta y sus calles brillan; la tarjeta breve sigue al chip en hover o al más cercano. Clic → panel del proyecto (rol, año, descripción, stack, links a repo/demo/otros).
  - **Buzón = Contact:** al final del recorrido, en la esquina de la placa. Clic → la tapa se abre y sale una hoja de papel con el formulario (nombre / email / asunto / mensaje). Si hay blog, se menciona ahí. Debajo, sellos postales con las redes.
- **Contenido que carga:** `projects` (orden por `order`, luego año), `posts` (solo la mención), `site.email`, `site.socials`.
- **Cámara:** perspectiva **telefoto** (FOV 10°, muy lejos) en ángulo isométrico: se ve casi ortográfica. El scroll hace pan sobre la placa y termina en el buzón.
- **Notas técnicas:** placa generada de forma determinista desde los proyectos (A* con giros a 45° para las calles; cruzar otra calle baja a la capa inferior con vías). Todo en ~10 draw calls: pistas en una geometría, pads y rótulos instanciados, componentes como cajas y cilindros instanciados con sombreado de 3 tonos por cara. **Paleta cambiable en caliente** (`theme.ts` → `CITY_PALETTES`, `applyCityPalette`). El formulario es HTML real en el overlay.

---

## 3. Sistemas transversales

### Navegación
- **Navbar flotante en la parte inferior central**, siempre visible: 5 íconos (uno por acto) que llevan directo a cada acto, con el actual resaltado y una barra fina de progreso. A la derecha, idioma y sonido.
- El scroll mueve la cámara por una curva (`CatmullRomCurve3` + GSAP `ScrollTrigger`); el mouse añade un leve mirar a los lados.

### Audio
- El navegador no deja sonar nada hasta el primer clic/tecla del usuario → botón de sonido visible en la navbar desde el Hero.
- Acto 3: Chopin, Op. 9 No. 1 (piano), volumen atado al recorrido del muelle; se apaga al entrar al faro.
- Acto 4: Liszt, Liebestraum No. 3 (violín) de fondo + teclas del piano tocables encima.

### Idioma (i18n)
- **EN + ES desde el lanzamiento.** JA se añade después solo con un diccionario y los textos `ja` del contenido.
- Detección: preferencia guardada → idioma del navegador → inglés. Selector manual en la navbar.

### Contact
Sitio estático; el formulario del buzón envía a Web3Forms desde el navegador, con `mailto:` de respaldo. Sin servidor propio.

### Rendimiento
Solo se monta el acto actual y sus vecinos; instancing para todo lo repetido; modelos Draco y texturas KTX2. Detalle en `ARCHITECTURE.md`.

---

## 4. Referencias técnicas

| Qué                                  | Para qué                                              | Link                                                               |
| ------------------------------------ | ----------------------------------------------------- | ------------------------------------------------------------------ |
| ITOM — 3D Portfolio                  | Cámara scroll + mouse, referencia de navegación       | https://itomdev.com                                                |
| blackhole-ts                         | Agujero negro físicamente preciso (stretch goal)      | https://github.com/rmarchet/blackhole-ts                           |
| Shader de lente gravitacional barato | Versión MVP del Acto 1                                | https://gist.github.com/shricodev/2a87d241dff2a7630f31e1d504b32cd8 |
| react-three-ocean                    | Agua lista para R3F                                   | https://github.com/haf-decent/react-three-ocean                    |
| waves-gerstner                       | Shader de olas ligero, más control del look           | https://github.com/madblade/waves-gerstner                         |
| Low Poly Grand Piano (Printables)    | Piano del Acto 4 — ya descargado, CC-BY 4.0           | https://www.printables.com/model/1287354                           |
| Violin (Blend Swap #92873)           | Violín del Acto 4 — ya descargado, CC0                | https://www.blendswap.com/blends/view/92873                        |
| Poly Pizza                           | Modelos low-poly CC0 (buzón)                          | https://poly.pizza                                                 |
| Space aesthetic — Awwwards           | Moodboard del Acto 1                                  | https://www.awwwards.com/inspiration/space-aesthetic               |
| 8 mejores sitios Three.js 2026       | Scroll-como-narrativa como tendencia                  | https://www.utsubo.com/blog/best-threejs-websites-2026             |

---

## 5. Preguntas abiertas / próximos pasos

- [x] Lista real de hitos para las medusas (desde el CV). Pendiente: meses exactos de inicio/fin de empleos y grado.
- [ ] Los 5–7 fragmentos de tu presentación para los puntos del Acto 2.
- [x] Familias del stack y qué tecnologías van en cada hoja de la partitura (siete hojas, desde el CV).
- [ ] Grabaciones concretas con licencia libre: ~~Chopin~~ (ya está Op. 9 No. 1; falta fuente/licencia en `CREDITS.md`) y Liszt Liebestraum No. 3 (violín).
- [x] Proyectos para la ciudad desde el CV (8, borrador) y sus conexiones. Pendiente: el resto de proyectos (hasta 16) y revisar textos.
- [ ] Crear la key de Web3Forms (`PUBLIC_WEB3FORMS_KEY`); sin ella el buzón abre el correo (`mailto:`).
- [ ] Tipografía final del Hero (probar `Fraunces` con tu nombre `Over Haider Castrillón Valencia`).
- [ ] Orden de construcción: ver hitos en `ARCHITECTURE.md` (Actos 1 + 2 primero para validar la cámara).
