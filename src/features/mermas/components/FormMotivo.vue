<template>
  <!-- El formulario de un motivo, el mismo para crear y para editar. -->
  <div class="form">
    <div class="grupo">
      <label :for="id('nombre')">Nombre</label>
      <input :id="id('nombre')" class="campo" maxlength="60" placeholder="Pétalos manchados"
        :value="modelValue.nombre" @input="cambiar('nombre', $event.target.value)">
    </div>

    <div class="rejilla">
      <div class="grupo">
        <label :for="id('cat')">Categoría</label>
        <select :id="id('cat')" class="campo" :value="modelValue.categoria"
          @change="cambiar('categoria', $event.target.value)">
          <option v-for="c in CATEGORIAS" :key="c.valor" :value="c.valor">{{ c.texto }}</option>
        </select>
      </div>

      <!-- "Llegó en mal estado" casi siempre es devolución al proveedor:
           proponerlo evita que se cuente como pérdida algo que se abona. -->
      <div class="grupo">
        <label :for="id('dest')">Destino sugerido</label>
        <select :id="id('dest')" class="campo" :value="modelValue.destinoSugerido || ''"
          @change="cambiar('destinoSugerido', $event.target.value || null)">
          <option value="">Ninguno</option>
          <option v-for="d in DESTINOS" :key="d.valor" :value="d.valor">{{ d.texto }}</option>
        </select>
      </div>
    </div>

    <label class="check">
      <input type="checkbox" :checked="modelValue.requiereDetalle"
        @change="cambiar('requiereDetalle', $event.target.checked)">
      <span>Exigir detalle al registrar</span>
    </label>

    <label v-if="conActivo" class="check">
      <input type="checkbox" :checked="modelValue.activo" @change="cambiar('activo', $event.target.checked)">
      <span>Activo (aparece en la lista)</span>
    </label>
  </div>
</template>

<script>
import { CATEGORIAS, DESTINOS } from '../store/mermas.module'

export default {
  name: 'FormMotivo',
  props: {
    modelValue: { type: Object, required: true },
    conActivo: { type: Boolean, default: false }
  },
  emits: ['update:modelValue'],

  setup(props, { emit }) {
    const cambiar = (campo, valor) => emit('update:modelValue', { ...props.modelValue, [campo]: valor })
    const id = (s) => `mot-${props.modelValue.id ?? 'nuevo'}-${s}`

    return { CATEGORIAS, DESTINOS, cambiar, id }
  }
}
</script>

<style scoped>
.rejilla {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.grupo { margin-bottom: 12px; }
.rejilla .grupo { margin-bottom: 0; }

label {
  display: block;
  font-size: .8rem;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 6px;
}

.campo {
  width: 100%;
  min-height: 46px;
  padding: .6rem .75rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: max(.9rem, 16px);
}

.campo:focus {
  outline: 0;
  border-color: var(--accent);
}

.check {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 36px;
  margin: 0;
  font-weight: 500;
  color: var(--text);
  cursor: pointer;
}

.check input {
  width: 18px;
  height: 18px;
  margin: 0;
  accent-color: var(--accent);
}
</style>
