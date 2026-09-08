<template>
  <div class="proveedores">
    <header class="cabecera">
      <div class="min0">
        <h1>Proveedores</h1>
        <!-- <p class="ayuda">
          A quién le compras la flor. Lo que ves acá es con lo que se negocia:
          cuánto le has comprado y cuándo fue el último pedido.
        </p> -->
      </div>
      <button v-if="puedeEditar" class="btn" @click="abrirNuevo">
        <span aria-hidden="true">＋</span> Nuevo proveedor
      </button>
    </header>

    <div v-if="error" class="banda banda-error">
      <span aria-hidden="true">⚠️</span><span>{{ error }}</span>
      <button class="btn btn-mini" @click="recargar">Reintentar</button>
    </div>

    <!-- ─── Filtros ─── -->
    <div class="filtros">
      <div class="buscador">
        <span aria-hidden="true">🔎</span>
        <input v-model="busqueda" placeholder="Nombre, RUT o contacto…" aria-label="Buscar proveedor">
        <button v-if="busqueda" class="btn-icono chico" @click="busqueda = ''" aria-label="Limpiar">✕</button>
      </div>

      <label class="check">
        <input type="checkbox" :checked="filtro.activo === null"
          @change="filtrar({ activo: $event.target.checked ? null : true })">
        <span>Ver desactivados</span>
      </label>

      <span class="conteo">{{ lista.length }} proveedor(es)</span>
    </div>

    <div v-if="cargando && !lista.length" class="vacio">Cargando proveedores…</div>

    <div v-else-if="!lista.length" class="vacio">
      <strong>{{ busqueda ? 'Ninguno coincide' : 'Sin proveedores' }}</strong>
      {{ busqueda
        ? 'Prueba con otro texto.'
        : 'Agrega el primero para poder registrar compras.' }}
    </div>

    <!-- ─── Lista ─── -->
    <!-- Era una grilla de tarjetas altas: con veinte proveedores había que
         scrollear un muro para encontrar uno. Cerradas son una línea. -->
    <div v-else class="lista" :class="{ atenuada: cargando }">

      <!-- Los rótulos comparten la grilla con las cabeceras: una sola
           definición de columnas para los dos. -->
      <div class="lista-cab" aria-hidden="true">
        <span></span>
        <span></span>
        <span>Proveedor</span>
        <span>RUT</span>
        <span>Contacto</span>
        <span class="der">Compras</span>
        <span class="der">Total comprado</span>
        <span class="der">Último pedido</span>
      </div>

      <article v-for="p in lista" :key="p.id" class="prov"
        :class="{ inactivo: !p.activo, resaltada: p.id === resalte.id, abierta: abiertaId === p.id }">

        <button class="cab" :aria-expanded="abiertaId === p.id" @click="alternar(p.id)">
          <span class="chevron" aria-hidden="true">›</span>

          <!-- Las iniciales dan un ancla visual, y el ámbar dice que la
               relación se enfrió antes de leer ninguna fecha. -->
          <span class="avatar" :class="{ frio: p.frio }" aria-hidden="true">{{ p.iniciales }}</span>

          <span class="c-nombre">
            <span class="nombre">{{ p.nombre }}</span>
            <span v-if="!p.activo" class="etiqueta">desactivado</span>
          </span>

          <span class="c-rut">
            <span v-if="p.rut" class="mono">{{ p.rut }}</span>
            <span v-else class="tenue">sin RUT</span>
          </span>

          <span class="c-contacto">
            <span v-if="p.contacto">{{ p.contacto }}</span>
            <span v-else class="tenue">—</span>
          </span>

          <span class="c-compras der dato">{{ p.compras }}</span>
          <span class="c-total der dato">{{ clp(p.totalComprado) }}</span>
          <span class="c-ultima der dato" :class="{ frio: p.frio }">
            {{ p.ultimaCompra ? fecha(p.ultimaCompra) : 'nunca' }}
          </span>
        </button>

        <div v-if="abiertaId === p.id" class="cuerpo">
          <!-- En móvil la cabecera solo lleva nombre y total: el resto se
               recupera acá en una línea. -->
          <p class="meta-movil">
            <span v-if="p.rut" class="mono">{{ p.rut }}</span>
            <span v-else class="tenue">sin RUT</span>
            · {{ p.compras }} compra(s)
            · último {{ p.ultimaCompra ? fecha(p.ultimaCompra) : 'nunca' }}
          </p>

          <p v-if="p.frio" class="aviso-frio">
            Sin comprarle hace {{ p.dias }} días.
          </p>

          <dl v-if="p.tieneContacto" class="ficha">
            <div v-if="p.contacto">
              <dt>Contacto</dt>
              <dd>{{ p.contacto }}</dd>
            </div>
            <div v-if="p.telefono">
              <dt>Teléfono</dt>
              <dd><a :href="`tel:${p.telefono}`" class="enlace">{{ p.telefono }}</a></dd>
            </div>
            <div v-if="p.correo">
              <dt>Correo</dt>
              <dd class="corta"><a :href="`mailto:${p.correo}`" class="enlace">{{ p.correo }}</a></dd>
            </div>
            <div v-if="p.direccion">
              <dt>Dirección</dt>
              <dd>{{ p.direccion }}</dd>
            </div>
          </dl>

          <p v-else class="tenue mini">Sin datos de contacto cargados.</p>

          <p v-if="p.notas" class="notas">{{ p.notas }}</p>

          <div v-if="puedeEditar" class="acciones">
            <button class="btn btn-linea btn-mini" @click="abrirEdicion(p)">Editar</button>
            <button v-if="p.activo" class="btn btn-linea btn-mini" @click="cambiarEstado(p, false)">
              Desactivar
            </button>
            <button v-else class="btn btn-mini" @click="cambiarEstado(p, true)">Reactivar</button>
          </div>
        </div>
      </article>
    </div>

    <!-- ═══════════════ MODAL ═══════════════ -->
    <!-- El fondo ya no cierra a ciegas: siete campos escritos se perdían con
         un clic afuera, sin preguntar. -->
    <div v-if="modal" class="fondo" @click.self="intentarCerrar">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="titulo-prov">
        <div class="modal-cab">
          <h3 id="titulo-prov">{{ modal.f.id ? 'Editar proveedor' : 'Nuevo proveedor' }}</h3>
          <p>Solo el nombre es obligatorio; el resto ayuda al hacer el pedido.</p>
        </div>

        <div class="modal-cuerpo">
          <div v-if="modal.f.error" class="error">{{ modal.f.error }}</div>

          <div class="rejilla">
            <div class="grupo">
              <label for="p-nombre">Nombre</label>
              <input id="p-nombre" ref="campoNombre" class="campo" v-model="modal.f.nombre" maxlength="160"
                placeholder="Flores del Maipo">
            </div>

            <div class="grupo">
              <label for="p-rut">RUT</label>
              <input id="p-rut" class="campo mono" v-model="modal.f.rut" maxlength="20"
                :class="{ malo: rutMalo }" placeholder="76.543.210-K" @blur="normalizarRut">
              <!-- El dígito sugerido convierte un "está malo" en un "quisiste
                   decir esto": casi siempre es un dedo, no un RUT inventado. -->
              <p v-if="rutMalo" class="ayuda-campo mala">
                El dígito verificador no calza{{ dvSugerido ? `: debería ser ${dvSugerido}` : '' }}.
              </p>
            </div>
          </div>

          <div class="rejilla">
            <div class="grupo">
              <label for="p-contacto">Persona de contacto</label>
              <input id="p-contacto" class="campo" v-model="modal.f.contacto" maxlength="120"
                placeholder="Don Manuel">
            </div>

            <div class="grupo">
              <label for="p-tel">Teléfono</label>
              <input id="p-tel" class="campo mono" type="tel" v-model="modal.f.telefono"
                maxlength="40" placeholder="+56 9 1234 5678">
            </div>
          </div>

          <div class="grupo">
            <label for="p-correo">Correo</label>
            <input id="p-correo" class="campo" type="email" v-model="modal.f.correo" maxlength="160"
              placeholder="ventas@proveedor.cl">
          </div>

          <div class="grupo">
            <label for="p-dir">Dirección</label>
            <input id="p-dir" class="campo" v-model="modal.f.direccion" maxlength="240"
              placeholder="Puesto 42, Terminal de Flores">
          </div>

          <div class="grupo">
            <label for="p-notas">Notas</label>
            <textarea id="p-notas" class="campo" v-model="modal.f.notas" maxlength="600" rows="3"
              placeholder="Llega los martes y viernes. Las peonías las trae solo en temporada."></textarea>
            <p class="ayuda-campo">
              Días de entrega, qué especies maneja, cómo prefiere que le pidan.
              Es lo que hace falta recordar al momento de comprar.
            </p>
          </div>
        </div>

        <div class="modal-pie">
          <button class="btn btn-linea" :disabled="guardando" @click="intentarCerrar">Cancelar</button>
          <button class="btn" :disabled="guardando" @click="guardar">
            {{ guardando ? 'Guardando…' : 'Guardar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Confirmación de descarte -->
    <div v-if="confirmarDescarte" class="fondo z-alto" @click.self="confirmarDescarte = false">
      <div class="modal angosto" role="dialog" aria-modal="true">
        <div class="modal-cab">
          <h3>¿Descartar los cambios?</h3>
          <p>Lo que escribiste en la ficha se va a perder.</p>
        </div>
        <div class="modal-pie">
          <button class="btn btn-linea" @click="confirmarDescarte = false">Seguir editando</button>
          <button class="btn peligro" @click="descartar">Descartar</button>
        </div>
      </div>
    </div>

    <div v-if="aviso" class="aviso" :class="{ malo: aviso.malo }" role="status">{{ aviso.texto }}</div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useStore } from 'vuex'
import { useTemporizadores } from '@/shared/composables/useTemporizadores'
import { rutValido, formatearRut, limpiarRut, digitoVerificador } from '@/core/utils/rut'

const DIAS_FRIO = 90

/* Primera letra de las dos primeras palabras: "Vivero Los Aromos" → VL */
const iniciales = (nombre) => {
  if (!nombre) return '?'
  const partes = nombre.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[1][0]).toUpperCase()
}

export default {
  name: 'ProveedoresView',

  setup () {
    const store = useStore()
    const { usarResalte, usarAviso } = useTemporizadores()

    const puedeEditar = computed(() => store.getters['auth/tieneRol']('admin', 'bodega'))

    /* ---------------- Datos ---------------- */
    const proveedores = computed(() => store.getters['proveedores/proveedores'])
    const filtro = computed(() => store.getters['proveedores/filtro'])
    const cargando = computed(() => store.getters['proveedores/cargando'])
    const guardando = computed(() => store.getters['proveedores/guardando'])
    const error = computed(() => store.getters['proveedores/error'])

    /* Todo lo derivado se calcula una vez por proveedor, no cuatro veces por
       render como cuando diasSin() se llamaba desde el template. */
    const lista = computed(() => proveedores.value.map(p => {
      const dias = p.ultimaCompra
        ? Math.floor((Date.now() - new Date(p.ultimaCompra).getTime()) / 86400000)
        : null
      return {
        ...p,
        dias,
        frio: dias !== null && dias > DIAS_FRIO,
        iniciales: iniciales(p.nombre),
        tieneContacto: !!(p.contacto || p.telefono || p.correo || p.direccion)
      }
    }))

    let control = null

    onMounted(() => {
      control = new AbortController()
      /* Forzar: el módulo cachea para el select de compras, pero acá la
         lista es el contenido de la pantalla y tiene que venir fresca. */
      store.dispatch('proveedores/cargar', { signal: control.signal, forzar: true })
      document.addEventListener('keydown', alTeclado)
    })

    onUnmounted(() => {
      control?.abort()
      document.removeEventListener('keydown', alTeclado)
    })

    const recargar = () => store.dispatch('proveedores/cargar', { forzar: true })
    const filtrar = (cambios) => store.dispatch('proveedores/filtrar', cambios)

    const busqueda = ref(filtro.value.buscar || '')
    let tmr = null
    watch(busqueda, (v) => {
      clearTimeout(tmr)
      tmr = setTimeout(() => filtrar({ buscar: v.trim() }), 350)
    })
    onUnmounted(() => clearTimeout(tmr))

    /* ---------------- Acordeón ---------------- */
    /* Uno abierto a la vez. Con varios vuelve el muro de tarjetas que la
       lista viene a resolver. */
    const abiertaId = ref(null)

    const alternar = (id) => {
      abiertaId.value = abiertaId.value === id ? null : id
    }

    /* Lo abierto puede dejar de existir al filtrar */
    watch(() => [filtro.value.buscar, filtro.value.activo], () => { abiertaId.value = null })

    /* ---------------- Modal ---------------- */
    const modal = ref(null)
    const confirmarDescarte = ref(false)
    const campoNombre = ref(null)
    const resalte = usarResalte()
    const { aviso, avisar } = usarAviso()

    const cerrarModal = () => {
      modal.value = null
      confirmarDescarte.value = false
    }

    const fichaVacia = () => ({
      id: null, nombre: '', rut: '', contacto: '', telefono: '',
      correo: '', direccion: '', notas: '', error: ''
    })

    /* El sello es la ficha tal como se abrió. Comparar contra él evita
       preguntar "¿descartar?" cuando no se tocó nada. */
    const sellar = (f) => JSON.stringify({ ...f, error: '' })

    const abrir = (f) => {
      modal.value = { f, sello: sellar(f) }
      nextTick(() => campoNombre.value?.focus())
    }

    const abrirNuevo = () => abrir(fichaVacia())

    const abrirEdicion = (p) => abrir({
      ...fichaVacia(),
      id: p.id,
      nombre: p.nombre || '',
      rut: p.rut || '',
      contacto: p.contacto || '',
      telefono: p.telefono || '',
      correo: p.correo || '',
      direccion: p.direccion || '',
      notas: p.notas || ''
    })

    const sucio = () => !!modal.value && sellar(modal.value.f) !== modal.value.sello

    const intentarCerrar = () => {
      if (sucio()) {
        confirmarDescarte.value = true
        return
      }
      cerrarModal()
    }

    const descartar = () => cerrarModal()

    const alTeclado = (e) => {
      if (e.key !== 'Escape') return
      if (confirmarDescarte.value) confirmarDescarte.value = false
      else if (modal.value) intentarCerrar()
      else if (abiertaId.value) abiertaId.value = null
    }

    /* ---------------- RUT ----------------
     * Opcional acá, a diferencia del cliente: a un puesto del terminal a
     * veces se le compra sin factura. Pero si se escribe, tiene que estar
     * bien: un RUT malo en una factura es un problema tributario. */
    const rutMalo = computed(() =>
      !!modal.value?.f?.rut && !rutValido(modal.value.f.rut)
    )

    const dvSugerido = computed(() => {
      const limpio = limpiarRut(modal.value?.f?.rut || '')
      const cuerpo = limpio.slice(0, -1)
      return cuerpo.length >= 7 && /^\d+$/.test(cuerpo) ? digitoVerificador(cuerpo) : ''
    })

    const normalizarRut = () => {
      const f = modal.value.f
      if (f.rut && rutValido(f.rut)) f.rut = formatearRut(f.rut)
    }

    /* ---------------- Guardar ---------------- */
    const guardar = async () => {
      const f = modal.value.f
      f.error = ''

      const nombre = (f.nombre || '').trim()
      if (nombre.length < 2) return (f.error = 'El nombre debe tener al menos 2 caracteres.')
      if (rutMalo.value) return (f.error = 'El RUT no es válido.')

      const datos = {
        nombre,
        rut: (f.rut || '').trim() || null,
        contacto: (f.contacto || '').trim() || null,
        telefono: (f.telefono || '').trim() || null,
        correo: (f.correo || '').trim() || null,
        direccion: (f.direccion || '').trim() || null,
        notas: (f.notas || '').trim() || null
      }

      try {
        const guardado = f.id
          ? await store.dispatch('proveedores/actualizar', { id: f.id, ...datos })
          : await store.dispatch('proveedores/crear', datos)
        cerrarModal()
        avisar(`${guardado.nombre} guardado`)
        resalte.marcar(guardado.id)
      } catch (e) {
        /* El mensaje viene del RAISE del SP: "Ya existe un proveedor con el
           RUT 76.543.210-3". Ya está redactado, no se reformula. */
        f.error = e.message
      }
    }

    const cambiarEstado = async (p, activo) => {
      try {
        await store.dispatch('proveedores/cambiarEstado', { id: p.id, activo })
        avisar(`${p.nombre} ${activo ? 'reactivado' : 'desactivado'}`)
        resalte.marcar(p.id)
      } catch (e) {
        avisar(e.message, true)
      }
    }

    /* ---------------- Utilidades ---------------- */
    const fmt = new Intl.NumberFormat('es-CL', {
      style: 'currency', currency: 'CLP', maximumFractionDigits: 0
    })
    const clp = (n) => fmt.format(Math.round(n || 0))

    const fmtFecha = new Intl.DateTimeFormat('es-CL', {
      day: '2-digit', month: 'short', year: '2-digit'
    })
    const fecha = (v) => (v ? fmtFecha.format(new Date(v)) : '—')

    return {
      puedeEditar, lista, filtro, cargando, guardando, error,
      recargar, filtrar, busqueda,
      abiertaId, alternar,
      modal, confirmarDescarte, campoNombre,
      cerrarModal, intentarCerrar, descartar,
      abrirNuevo, abrirEdicion, guardar, cambiarEstado,
      rutMalo, dvSugerido, normalizarRut,
      resalte, aviso, clp, fecha
    }
  }
}
</script>

<style scoped>
.proveedores {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.min0 { min-width: 0; }
.der { text-align: right; }
.mono { font-family: var(--font-mono); font-size: .95em; }
.tenue { color: var(--text-faint); }
.mini { font-size: .8rem; }
.mala { color: var(--danger); }

.dato {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

/* ─── Cabecera ─── */

.cabecera {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

h1 {
  font-size: clamp(1.2rem, 5vw, 1.5rem);
  font-weight: 700;
  letter-spacing: -.02em;
}

.ayuda {
  font-size: .85rem;
  color: var(--text-muted);
  line-height: 1.55;
  margin-top: 4px;
  max-width: 58ch;
}

/* ─── Filtros ─── */

.filtros {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.buscador {
  display: flex;
  align-items: center;
  gap: 9px;
  flex: 1 1 260px;
  min-width: 0;
  min-height: 46px;
  padding: 0 14px;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--r-sm);
  transition: border-color var(--t-fast);
}

.buscador:focus-within { border-color: var(--accent); }

.buscador input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: none;
  color: var(--text);
  font: inherit;
  /* 16px mínimo: bajo eso iOS hace zoom al enfocar. */
  font-size: max(.9rem, 16px);
}

.check {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: .85rem;
  color: var(--text-muted);
  cursor: pointer;
  white-space: nowrap;
}

.check input {
  width: 18px;
  height: 18px;
  accent-color: var(--accent);
  cursor: pointer;
}

.conteo {
  margin-left: auto;
  font-size: .8rem;
  color: var(--text-faint);
  white-space: nowrap;
}

/* ─── Lista ─── */

.lista {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  overflow: hidden;
  transition: opacity .14s ease;
}

.lista.atenuada { opacity: .45; }

/* Una sola definición de columnas para rótulos y cabeceras */
.lista-cab,
.cab {
  display: grid;
  grid-template-columns: 16px 40px minmax(150px, 1.5fr) 118px minmax(110px, 1fr) 74px 118px 96px;
  align-items: center;
  gap: 12px;
}

.lista-cab {
  padding: 9px 16px;
  background: var(--surface-2);
  border-bottom: 1px solid var(--border);
  font-size: .64rem;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--text-faint);
  white-space: nowrap;
}

.prov {
  display: block;
  border-bottom: 1px solid var(--border);
}

.prov:last-child { border-bottom: 0; }

/* Un proveedor desactivado se atenúa pero sigue visible: las compras
   históricas lo referencian y su ficha tiene que poder consultarse. */
.prov.inactivo { opacity: .58; }

.prov.resaltada {
  background: var(--accent-soft);
}

.prov.abierta { background: var(--surface-2); }

.cab {
  width: 100%;
  min-height: 56px;
  padding: 8px 16px;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  white-space: nowrap;
}

.cab:hover { background: color-mix(in srgb, var(--accent) 4%, transparent); }

.cab:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

.chevron {
  color: var(--text-faint);
  font-size: 1.15rem;
  line-height: 1;
  transition: transform .16s ease;
}

.prov.abierta .chevron { transform: rotate(90deg); }

/* Las iniciales dan un ancla visual: en una lista larga el ojo necesita
   dónde apoyarse. */
.avatar {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: var(--r-sm);
  background: var(--accent-soft);
  color: var(--accent-text);
  font-size: .82rem;
  font-weight: 700;
}

/* Ámbar en el que lleva meses sin pedidos: la relación se enfrió y eso se
   ve antes de leer la fecha. */
.avatar.frio {
  background: var(--warn-soft);
  color: var(--warn);
}

.c-nombre {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

.nombre {
  font-size: .94rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
}

.c-rut,
.c-contacto {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: .82rem;
  color: var(--text-muted);
}

.c-compras,
.c-total { font-size: .88rem; }

.c-ultima {
  font-size: .82rem;
  color: var(--text-muted);
}

.c-ultima.frio { color: var(--warn); }

.etiqueta {
  flex-shrink: 0;
  padding: 1px 8px;
  border-radius: var(--r-full);
  background: var(--surface-2);
  color: var(--text-muted);
  font-size: .62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .04em;
}

/* ─── Cuerpo ─── */

.cuerpo {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px 16px 16px 72px;
}

.meta-movil { display: none; }

.aviso-frio {
  font-size: .8rem;
  color: var(--warn);
}

.ficha {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  font-size: .84rem;
}

.ficha > div {
  display: flex;
  gap: 10px;
}

.ficha dt {
  min-width: 78px;
  flex-shrink: 0;
  color: var(--text-faint);
}

.ficha dd {
  margin: 0;
  min-width: 0;
  color: var(--text);
  overflow-wrap: break-word;
}

.corta {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Teléfono y correo como enlaces: en el celular, tocar el número marca. */
.enlace {
  color: var(--accent-text);
  text-decoration: none;
}

.enlace:hover { text-decoration: underline; }

.notas {
  padding: 10px 12px;
  background: var(--surface);
  border-left: 3px solid var(--secondary);
  border-radius: 0 var(--r-sm) var(--r-sm) 0;
  font-size: .82rem;
  line-height: 1.55;
  color: var(--text-muted);
  font-style: italic;
}

.acciones {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* ─── Modal ─── */

.fondo {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: var(--overlay);
}

.fondo.z-alto { z-index: 110; }

.modal {
  width: 100%;
  max-width: 520px;
  max-height: 92dvh;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.modal.angosto { max-width: 380px; }

.modal-cab {
  padding: 20px 22px 14px;
  border-bottom: 1px solid var(--border);
}

.modal-cab h3 { font-size: 1.1rem; font-weight: 700; }

.modal-cab p {
  font-size: .82rem;
  color: var(--text-muted);
  margin-top: 4px;
}

.modal-cuerpo {
  flex: 1;
  overflow-y: auto;
  padding: 20px 22px;
}

.modal-pie {
  display: flex;
  gap: 10px;
  padding: 16px 22px;
  border-top: 1px solid var(--border);
  background: var(--surface-2);
}

.modal-pie .btn { flex: 1; }

.rejilla {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
}

.grupo { margin-bottom: 14px; }
.rejilla .grupo { margin-bottom: 0; }
.rejilla + .rejilla,
.rejilla + .grupo { margin-top: 14px; }

label {
  display: block;
  font-size: .8rem;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 6px;
}

.campo {
  width: 100%;
  min-height: 44px;
  padding: .6rem .75rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: max(.9rem, 16px);
  transition: border-color var(--t-fast);
}

.campo:focus { outline: 0; border-color: var(--accent); }

.campo.malo { border-color: var(--danger); }

textarea.campo {
  min-height: 74px;
  resize: vertical;
  line-height: 1.5;
}

.ayuda-campo {
  font-size: .76rem;
  color: var(--text-faint);
  line-height: 1.5;
  margin-top: 5px;
}

/* ─── Botones ─── */

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 44px;
  padding: .65rem 1.15rem;
  border: none;
  border-radius: var(--r-sm);
  background: var(--accent);
  color: var(--accent-contrast);
  font: inherit;
  font-size: .92rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color var(--t-fast);
}

.btn:hover:not(:disabled) { background: var(--accent-hover); }
.btn:disabled { opacity: .55; cursor: not-allowed; }

.btn.peligro { background: var(--danger); }

.btn-linea {
  background: transparent;
  border: 1px solid var(--border-strong);
  color: var(--text-muted);
}

.btn-linea:hover:not(:disabled) { background: var(--surface-2); color: var(--text); }

.btn-mini {
  min-height: 36px;
  padding: .35rem .85rem;
  font-size: .82rem;
}

.btn-icono {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--text-muted);
  font: inherit;
  cursor: pointer;
}

.btn-icono.chico { width: 26px; height: 26px; font-size: .78rem; }

/* ─── Bandas y avisos ─── */

.banda {
  display: flex;
  align-items: center;
  gap: 11px;
  flex-wrap: wrap;
  padding: 12px 16px;
  border-radius: var(--r-sm);
  font-size: .85rem;
}

.banda-error {
  background: var(--danger-soft);
  border: 1px solid var(--danger-border);
  color: var(--danger);
}

.banda .btn { margin-left: auto; }

.error {
  padding: 11px 13px;
  margin-bottom: 16px;
  border-radius: var(--r-sm);
  border-left: 4px solid var(--danger);
  background: var(--danger-soft);
  color: var(--danger);
  font-size: .85rem;
  line-height: 1.5;
}

.vacio {
  text-align: center;
  padding: 48px 20px;
  color: var(--text-muted);
  font-size: .88rem;
  background: var(--surface);
  border: 1px dashed var(--border-strong);
  border-radius: var(--r-md);
}

.vacio strong {
  display: block;
  color: var(--text);
  font-size: 1.02rem;
  margin-bottom: 5px;
}

.aviso {
  position: fixed;
  left: 50%;
  bottom: calc(24px + env(safe-area-inset-bottom, 0));
  transform: translateX(-50%);
  z-index: 200;
  max-width: calc(100vw - 32px);
  padding: 12px 22px;
  border-radius: var(--r-full);
  background: var(--success);
  color: #fff;
  font-size: .88rem;
  font-weight: 600;
  text-align: center;
  box-shadow: var(--shadow-lg);
}

.aviso.malo { background: var(--danger); }

/* ─── Anchos intermedios ─── */
/* El RUT es lo primero que sobra: está en el cuerpo y casi nunca se busca
   con la vista. */

@media (max-width: 1080px) {
  .lista-cab,
  .cab {
    grid-template-columns: 16px 40px minmax(150px, 1.5fr) minmax(110px, 1fr) 74px 118px 96px;
  }

  .c-rut,
  .lista-cab > span:nth-child(4) { display: none; }
}

/* ─── Móvil ─── */

@media (max-width: 640px) {
  .cabecera .btn { width: 100%; }

  .conteo { margin-left: 0; }

  .lista-cab { display: none; }

  /* Cabecera mínima: nombre y total comprado */
  .cab {
    grid-template-columns: 16px 36px minmax(0, 1fr) auto;
    gap: 10px;
    padding: 8px 12px;
  }

  .c-rut,
  .c-contacto,
  .c-compras,
  .c-ultima { display: none; }

  .avatar { width: 32px; height: 32px; font-size: .76rem; }

  .cuerpo { padding: 0 12px 14px 12px; }

  /* Lo que salió de la cabecera vuelve acá, en una línea */
  .meta-movil {
    display: block;
    font-size: .78rem;
    color: var(--text-faint);
  }

  .ficha dt { min-width: 68px; }

  .acciones .btn { flex: 1; min-height: 42px; }

  /* El modal sube desde abajo a pantalla completa: un diálogo flotante con
     márgenes desperdicia el alto que el formulario necesita. */
  .fondo { padding: 0; align-items: flex-end; }

  .modal {
    max-width: none;
    max-height: 100dvh;
    height: 100dvh;
    border: none;
    border-radius: 0;
  }

  .modal.angosto {
    height: auto;
    max-height: 90dvh;
    border-radius: var(--r-lg) var(--r-lg) 0 0;
  }

  .modal-pie {
    padding-bottom: calc(16px + env(safe-area-inset-bottom, 0));
  }
}

@media (prefers-reduced-motion: reduce) {
  .chevron, .campo, .buscador, .btn, .lista { transition: none; }
}
</style>