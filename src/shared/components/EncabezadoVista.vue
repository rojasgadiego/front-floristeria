<template>
  <header class="encabezado">
    <h2 class="titulo" :class="{ 'con-icono': icono }">
      <span v-if="icono" class="icono" aria-hidden="true">{{ icono }}</span>
      <span class="titulo-texto">{{ titulo }}</span>
    </h2>

    <!--
      Etiqueta y acciones son hermanas del título, no hijas de su fila.
      Así en escritorio se alinean al borde derecho del header completo y
      no al del bloque de texto.
    -->
    <div v-if="$slots.etiqueta" class="etiqueta">
      <slot name="etiqueta" />
    </div>

    <p v-if="bajada || $slots.bajada" class="bajada" :class="{ 'sin-sangria': icono }">
      <slot name="bajada">{{ bajada }}</slot>
    </p>

    <div v-if="$slots.acciones" class="acciones">
      <slot name="acciones" />
    </div>
  </header>
</template>

<script>
export default {
  name: 'EncabezadoVista',

  props: {
    titulo: { type: String, required: true },

    /** Texto secundario. Usa el slot `bajada` si necesitas marcado. */
    bajada: { type: String, default: '' },

    /** Emoji opcional. Si se pasa, reemplaza la barra de acento. */
    icono: { type: String, default: '' }
  }
}
</script>

<style scoped>
.encabezado,
.encabezado * {
  box-sizing: border-box;
}

/*
 * Grid con áreas nombradas: es lo que permite que el mismo marcado
 * ordene distinto en escritorio y en móvil sin duplicar los slots. Un
 * slot renderizado dos veces montaría dos componentes — dos relojes con
 * dos temporizadores, por ejemplo.
 *
 * Escritorio:  [ título ]        [etiqueta] [acciones]
 *              [ bajada ]
 */
.encabezado {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  grid-template-areas:
    "titulo etiqueta acciones"
    "bajada bajada   bajada";
  align-items: center;
  column-gap: 16px;
  padding-bottom: 15px;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--borde);
}

.titulo {
  grid-area: titulo;
  display: flex;
  align-items: center;
  gap: 11px;
  margin: 0;
  min-width: 0;
  font-size: clamp(1.28rem, 5vw, 1.55rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.2;
  color: var(--texto);
}

/* La barra de acento es la firma que une las vistas: no ocupa alto y se
 * reconoce de inmediato. */
.titulo::before {
  content: '';
  flex-shrink: 0;
  width: 4px;
  height: 1.05em;
  border-radius: var(--radio-pill);
  background: linear-gradient(var(--marca-claro), var(--marca));
}

.titulo.con-icono::before {
  display: none;
}

.titulo-texto {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.icono {
  flex-shrink: 0;
  font-size: 1.15em;
  line-height: 1;
}

.etiqueta {
  grid-area: etiqueta;
  display: flex;
  align-items: center;
  gap: 8px;
}

.bajada {
  grid-area: bajada;
  /* Alineada con el texto del título, no con la barra de acento */
  margin: 7px 0 0;
  padding-left: 15px;
  font-size: 0.875rem;
  color: var(--texto-suave);
  line-height: 1.5;
  max-width: 64ch;
}

.bajada.sin-sangria {
  padding-left: 0;
}

.acciones {
  grid-area: acciones;
  display: flex;
  align-items: center;
  gap: 9px;
}

/* ================================================================
 * MÓVIL
 *
 * Móvil:  [ título ] [etiqueta]
 *         [ bajada ]
 *         [ acciones a lo ancho ]
 * ================================================================ */
@media (max-width: 640px) {
  .encabezado {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      "titulo etiqueta"
      "bajada bajada"
      "acciones acciones";
    column-gap: 10px;
    padding-bottom: 13px;
    margin-bottom: 15px;
  }

  .bajada {
    font-size: 0.84rem;
  }

  .acciones {
    margin-top: 13px;
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  /* Alcanza al contenido del slot, que vive en el componente padre */
  .acciones :deep(.btn),
  .acciones :deep(button),
  .acciones :deep(a) {
    width: 100%;
    justify-content: center;
  }
}

/* Pantallas muy angostas: la etiqueta baja bajo el título */
@media (max-width: 380px) {
  .encabezado {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      "titulo"
      "etiqueta"
      "bajada"
      "acciones";
  }

  .etiqueta {
    margin-top: 9px;
    padding-left: 15px;
  }
}
</style>