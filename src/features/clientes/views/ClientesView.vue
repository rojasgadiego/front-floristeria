<template>
  <div class="clientes">
    <header class="cabecera">
      <div class="min0">
        <h1>Clientes</h1>
        <!-- <p class="ayuda">
          Quién compra y qué se lleva. Los puntos son plata que el local debe:
          cada uno vale {{ clp(valorPunto) }}.
        </p> -->
      </div>
      <button class="btn" @click="abrirNuevo">
        <span aria-hidden="true">＋</span> Nuevo cliente
      </button>
    </header>

    <div v-if="error" class="banda banda-error">
      <span aria-hidden="true">⚠️</span><span>{{ error }}</span>
      <button class="btn btn-mini" @click="recargar">Reintentar</button>
    </div>

    <!-- El pasivo de puntos a la vista: es lo que el local debe si todos
         canjearan mañana, y casi nunca se mira hasta que alguien canjea. -->
    <div v-if="pasivoPuntos > 0" class="tira-pasivo">
      <div>
        <span class="rot">Puntos en circulación</span>
        <b class="dato">{{ puntosEnCirculacion }}</b>
      </div>
      <div>
        <span class="rot">Lo que valen</span>
        <b class="dato">{{ clp(pasivoPuntos) }}</b>
      </div>
      <span v-if="parcial" class="nota-parcial">
        de los {{ clientes.length }} cargados
      </span>
    </div>

    <div class="buscador">
      <span aria-hidden="true">🔎</span>
      <input v-model="busqueda" placeholder="Nombre, RUT, teléfono o correo…"
        aria-label="Buscar cliente">
      <button v-if="busqueda" class="btn-icono chico" @click="busqueda = ''" aria-label="Limpiar">✕</button>
    </div>

    <!-- Los filtros como pastillas y no como selects: son tres estados
         excluyentes que se alternan de un toque, y en el teléfono un select
         abre una hoja entera para elegir entre tres cosas. -->
    <div class="filtros">
      <div class="pastillas">
        <button :class="{ on: !filtro.conPuntos && !filtro.sinComprarDias }"
          @click="filtrar({ conPuntos: false, sinComprarDias: null })">Todos</button>
        <button :class="{ on: filtro.conPuntos }"
          @click="filtrar({ conPuntos: true, sinComprarDias: null })">Con puntos</button>
        <button :class="{ on: !!filtro.sinComprarDias }"
          @click="filtrar({ conPuntos: false, sinComprarDias: 90 })">Se alejaron</button>
      </div>

      <select class="campo corto" :value="filtro.cumpleMes ?? ''"
        @change="filtrar({ cumpleMes: $event.target.value ? Number($event.target.value) : null })"
        aria-label="Cumpleaños">
        <option value="">Cualquier mes</option>
        <option v-for="(m, i) in MESES" :key="i" :value="i + 1">Cumple en {{ m }}</option>
      </select>

      <label class="check">
        <input type="checkbox" :checked="filtro.activo === null"
          @change="filtrar({ activo: $event.target.checked ? null : true })">
        <span>Ver desactivados</span>
      </label>
    </div>

    <div v-if="cargando && !clientes.length" class="vacio">Cargando…</div>

    <div v-else-if="!clientes.length" class="vacio">
      <strong>{{ hayFiltro ? 'Ninguno coincide' : 'Sin clientes' }}</strong>
      {{ hayFiltro
        ? 'Prueba con otro texto o quita los filtros.'
        : 'Registra el primero para empezar a acumular puntos.' }}
    </div>

    <div v-else class="tarjetas" :class="{ atenuada: cargando }">
      <article v-for="c in clientes" :key="c.id" class="tarjeta"
        :class="{ inactivo: !c.activo, abierta: detalleId === c.id }">

        <!-- La cabecera entera abre el detalle: buscar un botón chico con el
             pulgar es fricción sin motivo. -->
        <button class="cab" @click="alternarDetalle(c.id)">
          <div class="avatar" :class="claseAvatar(c)" aria-hidden="true">
            {{ iniciales(c.nombre) }}
          </div>

          <div class="min0">
            <div class="nombre-fila">
              <b class="nombre">{{ c.nombre }}</b>
              <span v-if="!c.activo" class="etiqueta">off</span>
            </div>
            <div class="sub">
              <span class="mono">{{ c.rut }}</span>
              <template v-if="c.telefono"> · {{ c.telefono }}</template>
            </div>
          </div>

          <div class="derecha">
            <!-- Los puntos con su valor en pesos debajo: "340 puntos" no
                 dice nada, "$3.400" sí. -->
            <template v-if="c.puntos > 0">
              <b class="puntos">{{ c.puntos }}</b>
              <span class="puntos-valor">{{ clp(c.valorPuntos) }}</span>
            </template>
            <span v-else class="tenue mini">sin puntos</span>
          </div>

          <span class="flecha" :class="{ girada: detalleId === c.id }" aria-hidden="true">›</span>
        </button>

        <div class="resumen-fila">
          <div>
            <span class="rot">Compras</span>
            <b class="dato">{{ c.compras }}</b>
          </div>
          <div>
            <span class="rot">Gastado</span>
            <b class="dato">{{ clp(c.totalGastado) }}</b>
          </div>
          <div v-if="c.ticketPromedio">
            <span class="rot">Promedio</span>
            <b class="dato">{{ clp(c.ticketPromedio) }}</b>
          </div>
          <div>
            <span class="rot">Última</span>
            <b class="dato" :class="{ frio: c.diasSinComprar > 90 }">
              {{ c.ultimaCompra ? fecha(c.ultimaCompra) : 'nunca' }}
            </b>
          </div>
        </div>

        <!-- El cumpleaños cerca es la razón por la que existe esa columna en
             la base: sirve para llamar, no para adornar la ficha. -->
        <p v-if="cumpleCerca(c)" class="cumple">
          🎂 Cumple {{ c.diasParaCumple === 0 ? 'hoy' : `en ${c.diasParaCumple} día(s)` }}
        </p>

        <p v-else-if="c.diasSinComprar > 90" class="frio-aviso">
          Sin comprar hace {{ c.diasSinComprar }} días.
        </p>

        <!-- ═══ Detalle ═══ -->
        <div v-if="detalleId === c.id" class="detalle">
          <div v-if="cargandoDetalle === c.id" class="cargando">Cargando…</div>

          <template v-else-if="detalle">
            <div v-if="detalle.frecuentes?.length" class="bloque">
              <h4>Lo que siempre se lleva</h4>
              <div class="frecuentes">
                <span v-for="p in detalle.frecuentes" :key="p.productoId" class="frecuente">
                  {{ p.emoji }} {{ p.producto }}
                  <b>{{ p.veces }}×</b>
                </span>
              </div>
            </div>

            <div v-if="detalle.compras7?.length" class="bloque">
              <h4>Últimas compras</h4>
              <div v-for="v in detalle.compras7" :key="v.id" class="item"
                :class="{ anulada: v.anulada }">
                <div class="min0">
                  <span class="mono">{{ v.folio }}</span>
                  <span class="desglose">
                    {{ fecha(v.creadoEn) }} · {{ v.lineas }} línea(s)
                    <template v-if="v.puntosGanados"> · +{{ v.puntosGanados }} pts</template>
                    <span v-if="v.anulada" class="rojo"> · anulada</span>
                  </span>
                </div>
                <b class="dato">{{ clp(v.total) }}</b>
              </div>
            </div>

            <!-- Los puntos son dinero: cada movimiento con su saldo permite
                 rastrear un saldo que no cuadra hasta donde se desvió. -->
            <div v-if="detalle.puntos7?.length" class="bloque">
              <h4>Movimientos de puntos</h4>
              <div v-for="p in detalle.puntos7" :key="p.id" class="item">
                <div class="min0">
                  <b :class="p.cantidad > 0 ? 'verde' : 'rojo'">
                    {{ p.cantidad > 0 ? '+' : '' }}{{ p.cantidad }}
                  </b>
                  <span class="desglose">
                    {{ p.motivo }} · {{ fecha(p.creadoEn) }}
                    <template v-if="p.usuario"> · {{ p.usuario }}</template>
                  </span>
                </div>
                <span class="dato suave">saldo {{ p.saldoResultante }}</span>
              </div>
            </div>

            <div v-if="detalle.notas" class="notas">{{ detalle.notas }}</div>

            <div class="acciones">
              <button class="btn btn-linea btn-mini" @click="abrirEdicion(detalle)">
                Editar ficha
              </button>
              <button v-if="esAdmin" class="btn btn-linea btn-mini" @click="abrirPuntos(detalle)">
                Ajustar puntos
              </button>
              <button v-if="esAdmin && detalle.activo" class="btn btn-linea btn-mini"
                @click="cambiarEstado(detalle, false)">Desactivar</button>
              <button v-else-if="esAdmin" class="btn btn-mini"
                @click="cambiarEstado(detalle, true)">Reactivar</button>
            </div>
          </template>
        </div>
      </article>
    </div>

    <p v-if="parcial" class="paginador mini suave">
      Mostrando {{ clientes.length }} de {{ total }}. Busca para acotar.
    </p>

    <!-- ═══════════════ MODAL: ficha ═══════════════ -->
    <div v-if="modal" class="fondo" @click.self="modal = null">
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-cab">
          <h3>{{ modal.f.id ? 'Editar cliente' : 'Nuevo cliente' }}</h3>
          <p>El RUT es la llave con que se busca la ficha en el mesón.</p>
        </div>

        <div class="modal-cuerpo">
          <div v-if="modal.f.error" class="error">{{ modal.f.error }}</div>

          <div class="grupo">
            <label for="c-rut">RUT</label>
            <input id="c-rut" class="campo mono" v-model="modal.f.rut" maxlength="20"
              :class="{ malo: rutMalo }" placeholder="12.345.678-9"
              inputmode="text" @blur="normalizarRut">
            <!-- El dígito sugerido convierte un "está malo" en un "quisiste
                 decir esto": casi siempre es un dedo, no un RUT inventado. -->
            <p v-if="rutMalo" class="ayuda-campo mala">
              El dígito verificador no calza{{ dvSugerido ? `: debería ser ${dvSugerido}` : '' }}.
            </p>
          </div>

          <div class="grupo">
            <label for="c-nombre">Nombre</label>
            <input id="c-nombre" class="campo" v-model="modal.f.nombre" maxlength="160"
              placeholder="María Fernanda Soto">
          </div>

          <div class="rejilla">
            <div class="grupo">
              <label for="c-tel">Teléfono</label>
              <input id="c-tel" class="campo mono" type="tel" v-model="modal.f.telefono"
                maxlength="40" inputmode="tel" placeholder="+56 9 1234 5678">
            </div>

            <div class="grupo">
              <label for="c-correo">Correo</label>
              <input id="c-correo" class="campo" type="email" v-model="modal.f.correo"
                maxlength="160" inputmode="email" placeholder="maria@correo.cl">
            </div>
          </div>

          <div class="grupo">
            <label for="c-dir">Dirección</label>
            <input id="c-dir" class="campo" v-model="modal.f.direccion" maxlength="240"
              placeholder="Para los despachos">
          </div>

          <div class="grupo">
            <label>Cumpleaños</label>
            <div class="cumple-campos">
              <input class="campo dato" type="number" min="1" max="31" inputmode="numeric"
                v-model.number="modal.f.cumpleDia" placeholder="Día" aria-label="Día">
              <select class="campo" v-model.number="modal.f.cumpleMes" aria-label="Mes">
                <option :value="null">Mes</option>
                <option v-for="(m, i) in MESES" :key="i" :value="i + 1">{{ m }}</option>
              </select>
            </div>
            <p class="ayuda-campo">
              Con esto aparece en la lista del mes para poder saludarla. Va
              completo o ninguno.
            </p>
          </div>

          <div class="grupo">
            <label for="c-notas">Notas</label>
            <textarea id="c-notas" class="campo" v-model="modal.f.notas" maxlength="600"
              rows="3" placeholder="Prefiere tonos claros. Compra para la oficina los viernes."></textarea>
          </div>
        </div>

        <div class="modal-pie">
          <button class="btn btn-linea" :disabled="guardando" @click="modal = null">Cancelar</button>
          <button class="btn" :disabled="guardando" @click="guardar">
            {{ guardando ? 'Guardando…' : 'Guardar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ═══════════════ MODAL: puntos ═══════════════ -->
    <div v-if="ajuste" class="fondo" @click.self="ajuste = null">
      <div class="modal angosto" role="dialog" aria-modal="true">
        <div class="modal-cab">
          <h3>Ajustar puntos</h3>
          <p>{{ ajuste.nombre }} · tiene {{ ajuste.puntos }} ({{ clp(ajuste.valor) }})</p>
        </div>

        <div class="modal-cuerpo">
          <div v-if="ajuste.error" class="error">{{ ajuste.error }}</div>

          <div class="opciones">
            <button class="opcion" :class="{ on: ajuste.signo === 1 }" @click="ajuste.signo = 1">
              <b>Regalar</b><span>Cortesía, compensación, campaña</span>
            </button>
            <button class="opcion" :class="{ on: ajuste.signo === -1 }" @click="ajuste.signo = -1">
              <b>Descontar</b><span>Corregir un error de carga</span>
            </button>
          </div>

          <div class="grupo">
            <label for="a-cant">¿Cuántos puntos?</label>
            <input id="a-cant" ref="campoPuntos" class="campo dato" type="number" min="1"
              inputmode="numeric" v-model.number="ajuste.cantidad">
            <p class="ayuda-campo">
              Equivalen a <b>{{ clp((ajuste.cantidad || 0) * valorPunto) }}</b>.
              <template v-if="ajuste.signo === -1 && ajuste.cantidad > ajuste.puntos">
                <span class="mala">Solo tiene {{ ajuste.puntos }}.</span>
              </template>
            </p>
          </div>

          <div class="grupo">
            <label for="a-motivo">¿Por qué?</label>
            <input id="a-motivo" class="campo" v-model="ajuste.motivo" maxlength="200"
              placeholder="Compensación por el pedido que llegó tarde"
              @keyup.enter="ajustarPuntos">
            <!-- Los puntos son dinero: un saldo que no cuadra tiene que
                 poder explicarse seis meses después. -->
            <p class="ayuda-campo">
              Mínimo 5 caracteres. Queda en el libro de puntos con tu nombre.
            </p>
          </div>
        </div>

        <div class="modal-pie">
          <button class="btn btn-linea" :disabled="guardando" @click="ajuste = null">Cancelar</button>
          <button class="btn" :disabled="guardando" @click="ajustarPuntos">
            {{ guardando ? 'Guardando…' : (ajuste.signo === 1 ? 'Regalar' : 'Descontar') }}
          </button>
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

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
]

export default {
  name: 'ClientesView',

  setup () {
    const store = useStore()
    const { usarAviso } = useTemporizadores()
    const { aviso, avisar } = usarAviso()

    const esAdmin = computed(() => store.getters['auth/esAdmin'])

    /* ---------------- Datos ---------------- */
    const clientes = computed(() => store.getters['clientes/clientes'])
    const total = computed(() => store.getters['clientes/total'])
    const filtro = computed(() => store.getters['clientes/filtro'])
    const cargando = computed(() => store.getters['clientes/cargando'])
    const error = computed(() => store.getters['clientes/error'])
    const parcial = computed(() => store.getters['clientes/parcial'])
    const puntosEnCirculacion = computed(() => store.getters['clientes/puntosEnCirculacion'])
    const pasivoPuntos = computed(() => store.getters['clientes/pasivoPuntos'])

    const valorPunto = computed(() => store.getters['configuracion/valorPunto'] || 0)
    const guardando = ref(false)

    const hayFiltro = computed(() => {
      const f = filtro.value
      return !!(f.buscar || f.conPuntos || f.cumpleMes || f.sinComprarDias || f.activo === null)
    })

    const busqueda = ref(filtro.value.buscar || '')
    let tmr = null
    watch(busqueda, (v) => {
      clearTimeout(tmr)
      tmr = setTimeout(() => filtrar({ buscar: v.trim() }), 350)
    })

    const filtrar = (cambios) => store.dispatch('clientes/filtrar', cambios)
    const recargar = () => store.dispatch('clientes/cargar')

    /* ---------------- Detalle ---------------- */
    const detalleId = ref(null)
    const cargandoDetalle = computed(() => store.getters['clientes/cargandoDetalle'])
    const detalle = computed(() =>
      detalleId.value ? store.getters['clientes/detalleDe'](detalleId.value) : null
    )

    /* Se pide al abrir, no al cargar la lista: son tres consultas más por
       cliente, y traerlas para cien fichas que nadie va a expandir sería
       trabajo perdido. */
    const alternarDetalle = async (id) => {
      if (detalleId.value === id) {
        detalleId.value = null
        return
      }

      detalleId.value = id
      try {
        await store.dispatch('clientes/cargarDetalle', { id })
      } catch (e) {
        avisar(e.message, true)
        detalleId.value = null
      }
    }

    /* ---------------- Ficha ---------------- */
    const modal = ref(null)

    const fichaVacia = () => ({
      id: null, rut: '', nombre: '', telefono: '', correo: '',
      direccion: '', cumpleMes: null, cumpleDia: null, notas: '', error: ''
    })

    const abrirNuevo = () => { modal.value = { f: fichaVacia() } }

    const abrirEdicion = (c) => {
      modal.value = {
        f: {
          ...fichaVacia(),
          id: c.id,
          rut: c.rut || '',
          nombre: c.nombre || '',
          telefono: c.telefono || '',
          correo: c.correo || '',
          direccion: c.direccion || '',
          cumpleMes: c.cumpleMes ?? null,
          cumpleDia: c.cumpleDia ?? null,
          notas: c.notas || ''
        }
      }
    }

    /* ---------------- RUT ----------------
     * Obligatorio acá, a diferencia del proveedor: es la llave con que el
     * vendedor busca la ficha en el mesón, y dos fichas del mismo cliente
     * parten sus puntos en dos —ninguno alcanza para canjear. */
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

    const guardar = async () => {
      const f = modal.value.f
      f.error = ''

      if (!f.rut?.trim()) return (f.error = 'El RUT es obligatorio.')
      if (rutMalo.value) return (f.error = 'El RUT no es válido.')
      if ((f.nombre || '').trim().length < 2) {
        return (f.error = 'El nombre debe tener al menos 2 caracteres.')
      }

      /* Día y mes van juntos: uno sin el otro no sirve para la campaña de
         cumpleaños, que es para lo que existe ese dato. */
      if (!!f.cumpleMes !== !!f.cumpleDia) {
        return (f.error = 'Indica el día y el mes del cumpleaños, o ninguno.')
      }

      const datos = {
        rut: f.rut.trim(),
        nombre: f.nombre.trim(),
        telefono: (f.telefono || '').trim() || null,
        correo: (f.correo || '').trim() || null,
        direccion: (f.direccion || '').trim() || null,
        cumpleMes: f.cumpleMes || null,
        cumpleDia: f.cumpleDia || null,
        notas: (f.notas || '').trim() || null
      }

      guardando.value = true
      try {
        const c = f.id
          ? await store.dispatch('clientes/actualizarCliente', { id: f.id, ...datos })
          : await store.dispatch('clientes/crearCliente', datos)

        modal.value = null
        avisar(`${c.nombre} guardado`)
      } catch (e) {
        /* El mensaje viene del RAISE: "Ese RUT ya está registrado a nombre de
           María Soto". Nombra a quién pertenece, que es lo que permite
           entender el conflicto. */
        f.error = e.message
      } finally {
        guardando.value = false
      }
    }

    const cambiarEstado = async (c, activo) => {
      try {
        await store.dispatch('clientes/cambiarEstado', { id: c.id, activo })
        avisar(`${c.nombre} ${activo ? 'reactivado' : 'desactivado'}`)
      } catch (e) {
        avisar(e.message, true)
      }
    }

    /* ---------------- Puntos ---------------- */
    const ajuste = ref(null)
    const campoPuntos = ref(null)

    const abrirPuntos = async (c) => {
      ajuste.value = {
        id: c.id,
        nombre: c.nombre,
        puntos: c.puntos,
        valor: c.valorPuntos,
        signo: 1,
        cantidad: null,
        motivo: '',
        error: ''
      }
      await nextTick()
      campoPuntos.value?.focus()
    }

    const ajustarPuntos = async () => {
      const a = ajuste.value
      a.error = ''

      if (!a.cantidad || a.cantidad < 1) return (a.error = 'Indica cuántos puntos.')

      if (a.signo === -1 && a.cantidad > a.puntos) {
        return (a.error = `${a.nombre} tiene ${a.puntos} puntos.`)
      }

      if ((a.motivo || '').trim().length < 5) {
        return (a.error = 'Explica el motivo, con al menos 5 caracteres.')
      }

      guardando.value = true
      try {
        const c = await store.dispatch('clientes/ajustarPuntos', {
          id: a.id,
          cantidad: a.cantidad * a.signo,
          motivo: a.motivo
        })

        ajuste.value = null
        avisar(`${c.nombre} queda con ${c.puntos} puntos`)

        /* El detalle abierto quedó viejo: el libro de puntos tiene una línea
           nueva. */
        if (detalleId.value === c.id) {
          await store.dispatch('clientes/cargarDetalle', { id: c.id, forzar: true })
        }
      } catch (e) {
        a.error = e.message
      } finally {
        guardando.value = false
      }
    }

    /* ---------------- Carga ---------------- */
    let control = null

    onMounted(() => {
      control = new AbortController()
      const señal = { signal: control.signal }

      store.dispatch('clientes/cargar', señal)
      store.dispatch('configuracion/cargar', señal)
    })

    onUnmounted(() => {
      control?.abort()
      clearTimeout(tmr)
    })

    /* ---------------- Utilidades ---------------- */

    /* Primera letra de las dos primeras palabras: "María Soto" → MS */
    const iniciales = (nombre) => {
      if (!nombre) return '?'
      const partes = nombre.trim().split(/\s+/).filter(Boolean)
      if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
      return (partes[0][0] + partes[1][0]).toUpperCase()
    }

    /* El color del avatar cuenta la relación de un vistazo: rosa si viene
       el cumpleaños, ámbar si se alejó, verde si tiene puntos por canjear. */
    const claseAvatar = (c) => {
      if (cumpleCerca(c)) return 'cumple'
      if (c.diasSinComprar > 90) return 'frio'
      if (c.puntos > 0) return 'puntos'
      return ''
    }

    const cumpleCerca = (c) =>
      c.diasParaCumple != null && c.diasParaCumple >= 0 && c.diasParaCumple <= 7

    const fmt = new Intl.NumberFormat('es-CL', {
      style: 'currency', currency: 'CLP', maximumFractionDigits: 0
    })
    const clp = (n) => fmt.format(Math.round(n || 0))

    const fecha = (iso) => (iso
      ? new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
      : '—')

    return {
      MESES,
      esAdmin, clientes, total, filtro, cargando, error, hayFiltro,
      parcial, puntosEnCirculacion, pasivoPuntos, valorPunto, guardando,
      busqueda, filtrar, recargar,
      detalleId, detalle, cargandoDetalle, alternarDetalle,
      modal, abrirNuevo, abrirEdicion, guardar, cambiarEstado,
      rutMalo, dvSugerido, normalizarRut,
      ajuste, campoPuntos, abrirPuntos, ajustarPuntos,
      iniciales, claseAvatar, cumpleCerca, aviso, clp, fecha
    }
  }
}
</script>

<style scoped>
.clientes {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.min0 { min-width: 0; }
.mono { font-family: var(--font-mono); font-size: .95em; }
.mini { font-size: .78rem; }
.suave { color: var(--text-muted); }
.tenue { color: var(--text-faint); }
.verde { color: var(--success); }
.rojo  { color: var(--danger); }
.mala  { color: var(--danger); }

.dato {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

.rot {
  display: block;
  font-size: .62rem;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--text-faint);
}

.desglose {
  display: block;
  font-size: .73rem;
  color: var(--text-faint);
  margin-top: 1px;
}

.ayuda {
  font-size: .82rem;
  color: var(--text-muted);
  line-height: 1.55;
  margin-top: 4px;
  max-width: 58ch;
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

/* Lo que el local debe si todos canjearan mañana. Casi nunca se mira hasta
   que alguien canja. */
.tira-pasivo {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
  padding: 12px 16px;
  background: var(--accent-soft);
  border-radius: var(--r-sm);
}

.tira-pasivo .dato {
  font-size: 1.05rem;
  color: var(--accent-text);
}

.nota-parcial {
  font-size: .72rem;
  color: var(--text-muted);
  margin-left: auto;
}

/* ─── Filtros ─── */

.buscador {
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 48px;
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

.filtros {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

/* Pastillas y no select: son tres estados excluyentes que se alternan de un
   toque, y en el teléfono un select abre una hoja entera para elegir entre
   tres cosas. */
.pastillas {
  display: flex;
  gap: 4px;
  padding: 3px;
  background: var(--surface-2);
  border-radius: var(--r-full);
}

.pastillas button {
  min-height: 38px;
  padding: 0 15px;
  border: none;
  border-radius: var(--r-full);
  background: transparent;
  color: var(--text-muted);
  font: inherit;
  font-size: .84rem;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color var(--t-fast), color var(--t-fast);
}

.pastillas button.on {
  background: var(--surface);
  color: var(--accent-text);
  box-shadow: var(--shadow-sm);
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
.campo.corto { width: auto; flex: 0 1 190px; }

textarea.campo {
  min-height: 74px;
  resize: vertical;
  line-height: 1.5;
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

/* ─── Tarjetas ─── */

.tarjetas {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 12px;
  align-items: start;
  transition: opacity .14s ease;
}

.tarjetas.atenuada { opacity: .45; }

.tarjeta {
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  overflow: hidden;
  transition: border-color var(--t-fast), box-shadow var(--t-fast);
}

.tarjeta:hover { box-shadow: var(--shadow-sm); }

/* Un cliente desactivado se atenúa pero sigue visible: las boletas
   históricas lo referencian y su ficha tiene que poder consultarse. */
.tarjeta.inactivo { opacity: .55; }

.tarjeta.abierta {
  border-color: var(--accent);
  box-shadow: var(--shadow-md);
}

/* La cabecera entera abre el detalle: buscar un botón chico con el pulgar
   es fricción sin motivo. */
.cab {
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  padding: 14px 15px 12px;
  border: none;
  background: none;
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.cab:hover { background: var(--surface-2); }

/* El color cuenta la relación de un vistazo: rosa si viene el cumpleaños,
   ámbar si se alejó, verde si tiene puntos por canjear. */
.avatar {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  border-radius: var(--r-sm);
  background: var(--surface-2);
  color: var(--text-muted);
  font-size: .92rem;
  font-weight: 700;
}

.avatar.cumple { background: var(--accent-soft); color: var(--accent-text); }
.avatar.frio   { background: var(--warn-soft);   color: var(--warn); }
.avatar.puntos { background: var(--success-soft); color: var(--success); }

.nombre-fila {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

.nombre {
  font-size: .95rem;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sub {
  font-size: .75rem;
  color: var(--text-faint);
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.derecha {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
  text-align: right;
}

/* Los puntos con su valor en pesos debajo: "340 puntos" no dice nada,
   "$3.400" sí. */
.puntos {
  font-size: 1.05rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--success);
  line-height: 1.1;
}

.puntos-valor {
  font-size: .68rem;
  color: var(--text-faint);
  font-variant-numeric: tabular-nums;
}

.flecha {
  flex-shrink: 0;
  color: var(--text-faint);
  font-size: 1.2rem;
  transition: transform var(--t-fast);
}

.flecha.girada { transform: rotate(90deg); }

.resumen-fila {
  display: flex;
  gap: 18px;
  flex-wrap: wrap;
  padding: 0 15px 13px;
}

.resumen-fila .dato { font-size: .88rem; }
.resumen-fila .dato.frio { color: var(--warn); }

.cumple,
.frio-aviso {
  padding: 8px 15px;
  font-size: .78rem;
  font-weight: 600;
}

.cumple {
  background: var(--accent-soft);
  color: var(--accent-text);
}

.frio-aviso {
  background: var(--warn-soft);
  color: var(--warn);
}

/* ─── Detalle ─── */

.detalle {
  padding: 14px 15px;
  background: var(--surface-2);
  border-top: 1px solid var(--border);
}

.bloque { margin-bottom: 16px; }
.bloque:last-of-type { margin-bottom: 0; }

.detalle h4 {
  font-size: .66rem;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--text-faint);
  margin-bottom: 7px;
}

/* Lo que siempre se lleva: es lo que permite ofrecérselo antes de que
   pregunte, y lo que separa una ficha de una agenda de teléfonos. */
.frecuentes {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.frecuente {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: var(--r-full);
  background: var(--surface);
  border: 1px solid var(--border);
  font-size: .78rem;
}

.frecuente b {
  color: var(--accent-text);
  font-variant-numeric: tabular-nums;
}

.item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 7px 0;
  border-bottom: 1px solid var(--border);
  font-size: .82rem;
}

.item:last-child { border-bottom: 0; }
.item.anulada { opacity: .5; }

.notas {
  padding: 10px 12px;
  margin-top: 14px;
  background: var(--surface);
  border-left: 3px solid var(--secondary);
  border-radius: 0 var(--r-sm) var(--r-sm) 0;
  font-size: .8rem;
  line-height: 1.55;
  color: var(--text-muted);
  font-style: italic;
}

.acciones {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}

.cargando {
  padding: 20px;
  text-align: center;
  color: var(--text-muted);
  font-size: .85rem;
}

/* ─── Modales ─── */

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

.modal {
  width: 100%;
  max-width: 480px;
  max-height: 92dvh;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.modal.angosto { max-width: 400px; }

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
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}

.grupo { margin-bottom: 16px; }
.rejilla .grupo { margin-bottom: 0; }

label {
  display: block;
  font-size: .8rem;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 6px;
}

.ayuda-campo {
  font-size: .75rem;
  color: var(--text-faint);
  line-height: 1.5;
  margin-top: 5px;
}

/* El día angosto y el mes ancho: un día son dos dígitos, un mes es una
   palabra. */
.cumple-campos {
  display: grid;
  grid-template-columns: 90px 1fr;
  gap: 10px;
}

.opciones {
  display: grid;
  gap: 8px;
  margin-bottom: 18px;
}

.opcion {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 11px 14px;
  border: 1.5px solid var(--border);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color var(--t-fast), background-color var(--t-fast);
}

.opcion:hover { border-color: var(--border-strong); }
.opcion b { font-size: .88rem; }

.opcion span {
  font-size: .76rem;
  color: var(--text-muted);
}

.opcion.on {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.opcion.on span { color: var(--accent-text); }

/* ─── Botones y bandas ─── */

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

.btn-linea {
  background: transparent;
  border: 1px solid var(--border-strong);
  color: var(--text-muted);
}

.btn-linea:hover:not(:disabled) { background: var(--surface); color: var(--text); }

.btn-mini {
  min-height: 38px;
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

.etiqueta {
  padding: 1px 7px;
  border-radius: var(--r-full);
  background: var(--surface-2);
  color: var(--text-muted);
  font-size: .6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .04em;
  flex-shrink: 0;
}

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
  padding: 44px 20px;
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

.paginador {
  text-align: center;
  margin: 0;
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

/* ═══════════════════════════════════════════════════════════
   MÓVIL
   ═══════════════════════════════════════════════════════════ */

@media (max-width: 720px) {
  .cabecera .btn { width: 100%; }

  .tarjetas { grid-template-columns: 1fr; }

  /* Las pastillas ocupan la línea entera y se reparten: con el pulgar,
     tres botones apretados se aciertan mal. */
  .pastillas { width: 100%; }
  .pastillas button { flex: 1; padding: 0 8px; }

  .campo.corto { flex: 1 1 100%; width: 100%; }

  .check { min-height: 44px; }

  .tira-pasivo { gap: 18px; }
  .nota-parcial { margin-left: 0; width: 100%; }

  /* El resumen se reparte en dos columnas en vez de estirarse: cuatro
     datos en una fila de 360px quedan ilegibles. */
  .resumen-fila {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px 18px;
  }

  .acciones .btn { flex: 1 1 calc(50% - 4px); min-height: 42px; }

  /* El modal sube desde abajo a pantalla completa: con siete campos, un
     diálogo flotante desperdicia el alto que el formulario necesita. */
  .fondo { padding: 0; align-items: flex-end; }

  .modal {
    max-width: none;
    max-height: 100dvh;
    height: 100dvh;
    border: none;
    border-radius: 0;
  }

  .modal-cab { padding: 16px 18px 12px; }
  .modal-cuerpo { padding: 18px; }

  .modal-pie {
    padding: 14px 18px calc(14px + env(safe-area-inset-bottom, 0));
  }
}
</style>
