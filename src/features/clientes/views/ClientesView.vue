<template>
  <div class="clientes">
    <!-- ═════════════ CABECERA ═════════════ -->
    <header class="hero">
      <div class="hero-titulo">
        <h2>Clientes</h2>
        <p>
          Fichas, compras, cumpleaños y puntos de fidelización
        </p>
      </div>
      <button class="btn btn-principal" @click="abrirNuevo">
        <span aria-hidden="true">＋</span>
        Nuevo cliente
      </button>
    </header>

    <div v-if="error" class="banda banda-error">
      <span aria-hidden="true">⚠️</span>
      <span>{{ error }}</span>
      <button class="btn btn-mini btn-linea" @click="recargar">Reintentar</button>
    </div>

    <!-- ═════════════ RESUMEN ═════════════ -->
    <section class="resumen-dashboard" aria-label="Resumen de clientes">
      <article class="kpi">
        <span class="kpi-label">Clientes cargados</span>
        <strong>{{ clientes.length }}</strong>
        <small v-if="parcial">de {{ total }}</small>
        <small v-else>total visible</small>
      </article>

      <article class="kpi">
        <span class="kpi-label">Activos</span>
        <strong>{{ metricas.activos }}</strong>
        <small>{{ metricas.inactivos }} desactivado(s)</small>
      </article>

      <article class="kpi kpi-puntos">
        <span class="kpi-label">Puntos en circulación</span>
        <strong>{{ puntosEnCirculacion }}</strong>
        <small>{{ clp(pasivoPuntos) }} de pasivo</small>
      </article>

      <article class="kpi">
        <span class="kpi-label">Valor punto</span>
        <strong>{{ clp(valorPunto) }}</strong>
        <small>por punto</small>
      </article>
    </section>

    <!-- ═════════════ BUSCADOR + FILTROS ═════════════ -->
    <section class="panel-filtros">
      <div class="buscador">
        <span aria-hidden="true">🔎</span>
        <input
          v-model="busqueda"
          placeholder="Nombre, RUT o teléfono…"
          aria-label="Buscar cliente"
        >
        <button
          v-if="busqueda"
          class="btn-icono chico"
          @click="busqueda = ''"
          aria-label="Limpiar búsqueda"
        >
          ✕
        </button>
      </div>

      <div class="filtros-linea">
        <div class="pastillas" role="group" aria-label="Filtro rápido">
          <button
            :class="{ on: !filtro.conPuntos && !filtro.sinComprarDias }"
            @click="filtrar({ conPuntos: false, sinComprarDias: null })"
          >
            Todos
          </button>

          <button
            :class="{ on: filtro.conPuntos }"
            @click="filtrar({ conPuntos: true, sinComprarDias: null })"
          >
            Con puntos
            <span v-if="metricas.conPuntos" class="pill-count">{{ metricas.conPuntos }}</span>
          </button>

          <button
            :class="{ on: !!filtro.sinComprarDias }"
            @click="filtrar({ conPuntos: false, sinComprarDias: 90 })"
          >
            Se alejaron
            <span v-if="metricas.frios" class="pill-count">{{ metricas.frios }}</span>
          </button>
        </div>

        <select
          class="campo-select"
          :class="{ on: filtro.cumpleMes }"
          :value="filtro.cumpleMes ?? ''"
          @change="filtrar({ cumpleMes: $event.target.value ? Number($event.target.value) : null })"
          aria-label="Cumpleaños"
        >
          <option value="">🎂 Cumpleaños</option>
          <option v-for="(m, i) in MESES" :key="i" :value="i + 1">
            Cumple en {{ m }}
          </option>
        </select>

        <label class="check" :class="{ on: filtro.activo === null }">
          <input
            type="checkbox"
            :checked="filtro.activo === null"
            @change="filtrar({ activo: $event.target.checked ? null : true })"
          >
          <span>Desactivados</span>
        </label>

        <button
          v-if="filtrosActivos > 0"
          class="limpiar"
          :aria-label="`Limpiar ${filtrosActivos} filtro(s)`"
          @click="limpiarFiltros"
        >
          Limpiar
          <span class="contador">{{ filtrosActivos }}</span>
        </button>
      </div>
    </section>

    <!-- ═════════════ ESTADOS ═════════════ -->
    <div v-if="cargando && !clientes.length" class="vacio">
      <span class="loader"></span>
      <strong>Cargando clientes…</strong>
      Preparando fichas y puntos.
    </div>

    <div v-else-if="!clientes.length" class="vacio">
      <strong>{{ hayFiltro ? 'Ningún cliente coincide' : 'Sin clientes' }}</strong>
      {{ hayFiltro
        ? 'Prueba con otro texto o limpia los filtros.'
        : 'Registra el primer cliente para empezar a acumular puntos.' }}

      <button v-if="hayFiltro" class="btn btn-mini btn-linea" @click="limpiarFiltros">
        Limpiar filtros
      </button>
    </div>

    <!-- ═════════════ TARJETAS ═════════════ -->
    <div v-else class="tarjetas" :class="{ atenuada: cargando }">
      <article
        v-for="c in clientesOrdenados"
        :key="c.id"
        class="tarjeta"
        :class="{
          inactivo: !c.activo,
          abierta: detalleId === c.id,
          frio: c.diasSinComprar > 90,
          cumple: cumpleCerca(c),
          conPuntos: c.puntos > 0
        }"
      >
        <button class="cab" @click="alternarDetalle(c.id)">
          <div class="avatar" :class="claseAvatar(c)" aria-hidden="true">
            {{ iniciales(c.nombre) }}
          </div>

          <div class="identidad min0">
            <div class="nombre-fila">
              <b class="nombre">{{ c.nombre }}</b>

              <span v-if="!c.activo" class="badge estado off">Inactivo</span>
              <span v-else-if="cumpleCerca(c)" class="badge estado cumple">
                🎂 cumple
              </span>
              <span v-else-if="c.diasSinComprar > 90" class="badge estado frio">
                frío
              </span>
            </div>

            <div class="sub">
              <span class="mono">{{ c.rut || 'sin RUT' }}</span>
              <template v-if="contactoLinea(c)"> · {{ contactoLinea(c) }}</template>
            </div>
          </div>

          <div class="wallet" :class="{ vacia: !(c.puntos > 0) }">
            <span class="wallet-label">Puntos</span>
            <strong>{{ c.puntos || 0 }}</strong>
            <small>{{ clp(valorCliente(c)) }}</small>
          </div>

          <span class="flecha" :class="{ girada: detalleId === c.id }" aria-hidden="true">
            ›
          </span>
        </button>

        <div class="metricas-card">
          <div>
            <span class="rot">Compras</span>
            <b class="dato">{{ c.compras || 0 }}</b>
          </div>

          <div>
            <span class="rot">Gastado</span>
            <b class="dato">{{ clp(c.totalGastado) }}</b>
          </div>

          <div>
            <span class="rot">Promedio</span>
            <b class="dato">{{ c.ticketPromedio ? clp(c.ticketPromedio) : '—' }}</b>
          </div>

          <div>
            <span class="rot">Última</span>
            <b class="dato" :class="{ warn: c.diasSinComprar > 90 }">
              {{ c.ultimaCompra ? fecha(c.ultimaCompra) : 'nunca' }}
            </b>
          </div>
        </div>

        <div v-if="cumpleCerca(c)" class="alerta-card cumple">
          <span aria-hidden="true">🎂</span>
          <span>
            Cumple {{ c.diasParaCumple === 0 ? 'hoy' : `en ${c.diasParaCumple} día(s)` }}.
          </span>
        </div>

        <div v-else-if="c.diasSinComprar > 90" class="alerta-card frio">
          <span aria-hidden="true">🕒</span>
          <span>Sin comprar hace {{ c.diasSinComprar }} días.</span>
        </div>

        <!-- ═════════════ DETALLE ═════════════ -->
        <div v-if="detalleId === c.id" class="detalle">
          <div v-if="cargandoDetalle === c.id" class="cargando">
            <span class="loader"></span>
            Cargando detalle…
          </div>

          <template v-else-if="detalle">
            <div class="detalle-grid">
              <section v-if="detalle.frecuentes?.length" class="bloque bloque-full">
                <h4>Lo que suele comprar</h4>

                <div class="frecuentes">
                  <span
                    v-for="p in detalle.frecuentes"
                    :key="p.productoId"
                    class="frecuente"
                  >
                    <span>{{ p.emoji }}</span>
                    <span>{{ p.producto }}</span>
                    <b>{{ p.veces }}×</b>
                  </span>
                </div>
              </section>

              <section v-if="detalle.compras7?.length" class="bloque">
                <h4>Últimas compras</h4>

                <div
                  v-for="v in detalle.compras7"
                  :key="v.id"
                  class="item"
                  :class="{ anulada: v.anulada }"
                >
                  <div class="min0">
                    <span class="mono item-titulo">{{ v.folio }}</span>
                    <span class="desglose">
                      {{ fecha(v.creadoEn) }} · {{ v.lineas }} línea(s)
                      <template v-if="v.puntosGanados"> · +{{ v.puntosGanados }} pts</template>
                      <span v-if="v.anulada" class="rojo"> · anulada</span>
                    </span>
                  </div>

                  <b class="dato">{{ clp(v.total) }}</b>
                </div>
              </section>

              <section v-if="detalle.puntos7?.length" class="bloque">
                <h4>Libro de puntos</h4>

                <div
                  v-for="p in detalle.puntos7"
                  :key="p.id"
                  class="item"
                >
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
              </section>
            </div>

            <div v-if="detalle.notas" class="notas">
              <span aria-hidden="true">📝</span>
              <p>{{ detalle.notas }}</p>
            </div>

            <div class="acciones">
              <button class="btn btn-linea btn-mini" @click="abrirEdicion(detalle)">
                Editar ficha
              </button>

              <button
                v-if="esAdmin"
                class="btn btn-linea btn-mini"
                @click="abrirPuntos(detalle)"
              >
                Ajustar puntos
              </button>

              <button
                v-if="esAdmin && detalle.activo"
                class="btn btn-linea btn-mini peligro"
                @click="cambiarEstado(detalle, false)"
              >
                Desactivar
              </button>

              <button
                v-else-if="esAdmin"
                class="btn btn-mini"
                @click="cambiarEstado(detalle, true)"
              >
                Reactivar
              </button>
            </div>
          </template>

          <div v-else class="sin-detalle">
            No hay detalle disponible para este cliente.
          </div>
        </div>
      </article>
    </div>

    <p v-if="parcial" class="paginador mini suave">
      Mostrando {{ clientes.length }} de {{ total }}. Usa la búsqueda para acotar.
    </p>

    <!-- ═════════════ MODAL FICHA ═════════════ -->
    <div v-if="modal" class="fondo" @click.self="modal = null">
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-cab">
          <div>
            <span class="eyebrow">Ficha cliente</span>
            <h3>{{ modal.f.id ? 'Editar cliente' : 'Nuevo cliente' }}</h3>
            <p>El RUT permite encontrar rápido la ficha en el mesón.</p>
          </div>

          <button class="cerrar" @click="modal = null" aria-label="Cerrar">✕</button>
        </div>

        <div class="modal-cuerpo">
          <div v-if="modal.f.error" class="error">{{ modal.f.error }}</div>

          <div class="grupo">
            <label for="c-rut">RUT</label>
            <input
              id="c-rut"
              class="campo mono"
              v-model="modal.f.rut"
              maxlength="20"
              :class="{ malo: rutMalo }"
              placeholder="12.345.678-9"
              inputmode="text"
              @blur="normalizarRut"
            >

            <p v-if="rutMalo" class="ayuda-campo mala">
              El dígito verificador no calza{{ dvSugerido ? `: debería ser ${dvSugerido}` : '' }}.
            </p>
          </div>

          <div class="grupo">
            <label for="c-nombre">Nombre</label>
            <input
              id="c-nombre"
              class="campo"
              v-model="modal.f.nombre"
              maxlength="160"
              placeholder="María Fernanda Soto"
            >
          </div>

          <div class="rejilla">
            <div class="grupo">
              <label for="c-tel">Teléfono</label>
              <input
                id="c-tel"
                class="campo mono"
                type="tel"
                v-model="modal.f.telefono"
                maxlength="40"
                inputmode="tel"
                placeholder="+56 9 1234 5678"
              >
            </div>

            <div class="grupo">
              <label for="c-correo">Correo</label>
              <input
                id="c-correo"
                class="campo"
                type="email"
                v-model="modal.f.correo"
                maxlength="160"
                inputmode="email"
                placeholder="maria@correo.cl"
              >
            </div>
          </div>

          <div class="grupo">
            <label for="c-dir">Dirección</label>
            <input
              id="c-dir"
              class="campo"
              v-model="modal.f.direccion"
              maxlength="240"
              placeholder="Para despachos"
            >
          </div>

          <div class="grupo">
            <label>Cumpleaños</label>

            <div class="cumple-campos">
              <input
                class="campo dato"
                type="number"
                min="1"
                max="31"
                inputmode="numeric"
                v-model.number="modal.f.cumpleDia"
                placeholder="Día"
                aria-label="Día"
              >

              <select class="campo" v-model.number="modal.f.cumpleMes" aria-label="Mes">
                <option :value="null">Mes</option>
                <option v-for="(m, i) in MESES" :key="i" :value="i + 1">
                  {{ m }}
                </option>
              </select>
            </div>

            <p class="ayuda-campo">
              El cumpleaños va completo o vacío. Sirve para campañas y saludos.
            </p>
          </div>

          <div class="grupo">
            <label for="c-notas">Notas</label>
            <textarea
              id="c-notas"
              class="campo"
              v-model="modal.f.notas"
              maxlength="600"
              rows="3"
              placeholder="Prefiere flores amarillas. Compra para la oficina los viernes."
            ></textarea>
          </div>
        </div>

        <div class="modal-pie">
          <button class="btn btn-linea" :disabled="guardando" @click="modal = null">
            Cancelar
          </button>

          <button class="btn" :disabled="guardando" @click="guardar">
            {{ guardando ? 'Guardando…' : 'Guardar cliente' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ═════════════ MODAL PUNTOS ═════════════ -->
    <div v-if="ajuste" class="fondo" @click.self="ajuste = null">
      <div class="modal angosto" role="dialog" aria-modal="true">
        <div class="modal-cab">
          <div>
            <span class="eyebrow">Fidelización</span>
            <h3>Ajustar puntos</h3>
            <p>
              {{ ajuste.nombre }} tiene {{ ajuste.puntos }} punto(s),
              equivalentes a {{ clp(ajuste.valor) }}.
            </p>
          </div>

          <button class="cerrar" @click="ajuste = null" aria-label="Cerrar">✕</button>
        </div>

        <div class="modal-cuerpo">
          <div v-if="ajuste.error" class="error">{{ ajuste.error }}</div>

          <div class="saldo-puntos">
            <span>Saldo actual</span>
            <strong>{{ ajuste.puntos }}</strong>
            <small>{{ clp(ajuste.valor) }}</small>
          </div>

          <div class="opciones">
            <button
              class="opcion"
              :class="{ on: ajuste.signo === 1 }"
              @click="ajuste.signo = 1"
            >
              <b>Regalar puntos</b>
              <span>Cortesía, compensación o campaña.</span>
            </button>

            <button
              class="opcion"
              :class="{ on: ajuste.signo === -1 }"
              @click="ajuste.signo = -1"
            >
              <b>Descontar puntos</b>
              <span>Corrección de carga o ajuste administrativo.</span>
            </button>
          </div>

          <div class="grupo">
            <label for="a-cant">Cantidad</label>
            <input
              id="a-cant"
              ref="campoPuntos"
              class="campo dato"
              type="number"
              min="1"
              inputmode="numeric"
              v-model.number="ajuste.cantidad"
            >

            <p class="ayuda-campo">
              Equivale a <b>{{ clp((ajuste.cantidad || 0) * valorPunto) }}</b>.
              <template v-if="ajuste.signo === -1 && ajuste.cantidad > ajuste.puntos">
                <span class="mala"> Solo tiene {{ ajuste.puntos }}.</span>
              </template>
            </p>
          </div>

          <div class="grupo">
            <label for="a-motivo">Motivo</label>
            <input
              id="a-motivo"
              class="campo"
              v-model="ajuste.motivo"
              maxlength="200"
              placeholder="Compensación por pedido atrasado"
              @keyup.enter="ajustarPuntos"
            >

            <p class="ayuda-campo">
              Mínimo 5 caracteres. Queda registrado en el libro de puntos.
            </p>
          </div>
        </div>

        <div class="modal-pie">
          <button class="btn btn-linea" :disabled="guardando" @click="ajuste = null">
            Cancelar
          </button>

          <button class="btn" :disabled="guardando" @click="ajustarPuntos">
            {{ guardando ? 'Guardando…' : (ajuste.signo === 1 ? 'Regalar puntos' : 'Descontar puntos') }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="aviso"
      class="aviso"
      :class="{ malo: aviso.malo }"
      role="status"
    >
      {{ aviso.texto }}
    </div>
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

    const metricas = computed(() => {
      const lista = clientes.value || []

      return {
        activos: lista.filter(c => c.activo).length,
        inactivos: lista.filter(c => !c.activo).length,
        conPuntos: lista.filter(c => (c.puntos || 0) > 0).length,
        frios: lista.filter(c => (c.diasSinComprar || 0) > 90).length,
        cumpleSemana: lista.filter(c => cumpleCerca(c)).length
      }
    })

    const filtrosActivos = computed(() => {
      const f = filtro.value || {}
      let n = 0

      if (f.buscar) n++
      if (f.conPuntos) n++
      if (f.sinComprarDias) n++
      if (f.cumpleMes) n++
      if (f.activo === null) n++

      return n
    })

    const hayFiltro = computed(() => filtrosActivos.value > 0)

    const clientesOrdenados = computed(() => {
      return [...(clientes.value || [])].sort((a, b) => {
        const pa = prioridadCliente(a)
        const pb = prioridadCliente(b)

        if (pa !== pb) return pb - pa

        return String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es')
      })
    })

    const prioridadCliente = (c) => {
      let p = 0

      if (cumpleCerca(c)) p += 50
      if ((c.puntos || 0) > 0) p += 20
      if ((c.diasSinComprar || 0) > 90) p += 10
      if (!c.activo) p -= 100

      return p
    }

    const busqueda = ref(filtro.value.buscar || '')
    let tmr = null

    watch(busqueda, (v) => {
      clearTimeout(tmr)
      tmr = setTimeout(() => filtrar({ buscar: v.trim() }), 350)
    })

    const filtrar = (cambios) => store.dispatch('clientes/filtrar', cambios)

    const limpiarFiltros = () => {
      busqueda.value = ''

      return store.dispatch('clientes/filtrar', {
        buscar: '',
        conPuntos: false,
        sinComprarDias: null,
        cumpleMes: null,
        activo: true
      })
    }

    const recargar = () => store.dispatch('clientes/cargar')

    /* ---------------- Detalle ---------------- */
    const detalleId = ref(null)
    const cargandoDetalle = computed(() => store.getters['clientes/cargandoDetalle'])
    const detalle = computed(() =>
      detalleId.value ? store.getters['clientes/detalleDe'](detalleId.value) : null
    )

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
      id: null,
      rut: '',
      nombre: '',
      telefono: '',
      correo: '',
      direccion: '',
      cumpleMes: null,
      cumpleDia: null,
      notas: '',
      error: ''
    })

    const abrirNuevo = () => {
      modal.value = { f: fichaVacia() }
    }

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

    const rutMalo = computed(() =>
      !!modal.value?.f?.rut && !rutValido(modal.value.f.rut)
    )

    const dvSugerido = computed(() => {
      const limpio = limpiarRut(modal.value?.f?.rut || '')
      const cuerpo = limpio.slice(0, -1)

      return cuerpo.length >= 7 && /^\d+$/.test(cuerpo)
        ? digitoVerificador(cuerpo)
        : ''
    })

    const normalizarRut = () => {
      const f = modal.value?.f
      if (!f) return

      if (f.rut && rutValido(f.rut)) {
        f.rut = formatearRut(f.rut)
      }
    }

    const guardar = async () => {
      const f = modal.value.f
      f.error = ''

      if (!f.rut?.trim()) return (f.error = 'El RUT es obligatorio.')
      if (rutMalo.value) return (f.error = 'El RUT no es válido.')

      if ((f.nombre || '').trim().length < 2) {
        return (f.error = 'El nombre debe tener al menos 2 caracteres.')
      }

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
        puntos: c.puntos || 0,
        valor: valorCliente(c),
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

      if (!a.cantidad || a.cantidad < 1) {
        return (a.error = 'Indica cuántos puntos.')
      }

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
          motivo: a.motivo.trim()
        })

        ajuste.value = null
        avisar(`${c.nombre} queda con ${c.puntos} puntos`)

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
    const iniciales = (nombre) => {
      if (!nombre) return '?'

      const partes = nombre.trim().split(/\s+/).filter(Boolean)

      if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()

      return (partes[0][0] + partes[1][0]).toUpperCase()
    }

    const claseAvatar = (c) => {
      if (!c.activo) return 'off'
      if (cumpleCerca(c)) return 'cumple'
      if ((c.diasSinComprar || 0) > 90) return 'frio'
      if ((c.puntos || 0) > 0) return 'puntos'

      return ''
    }

    const cumpleCerca = (c) =>
      c.diasParaCumple != null && c.diasParaCumple >= 0 && c.diasParaCumple <= 7

    const contactoLinea = (c) => c.telefono || c.correo || ''

    const valorCliente = (c) => {
      if (c.valorPuntos != null) return c.valorPuntos

      return (c.puntos || 0) * valorPunto.value
    }

    const fmt = new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    })

    const clp = (n) => fmt.format(Math.round(n || 0))

    const fecha = (iso) => iso
      ? new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
      : '—'

    return {
      MESES,
      esAdmin,
      clientes,
      clientesOrdenados,
      total,
      filtro,
      cargando,
      error,
      hayFiltro,
      filtrosActivos,
      parcial,
      puntosEnCirculacion,
      pasivoPuntos,
      valorPunto,
      guardando,
      metricas,
      busqueda,
      filtrar,
      limpiarFiltros,
      recargar,
      detalleId,
      detalle,
      cargandoDetalle,
      alternarDetalle,
      modal,
      abrirNuevo,
      abrirEdicion,
      guardar,
      cambiarEstado,
      rutMalo,
      dvSugerido,
      normalizarRut,
      ajuste,
      campoPuntos,
      abrirPuntos,
      ajustarPuntos,
      iniciales,
      claseAvatar,
      cumpleCerca,
      contactoLinea,
      valorCliente,
      aviso,
      clp,
      fecha
    }
  }
}
</script>

<style scoped>
.clientes {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.min0 {
  min-width: 0;
}

.mono {
  font-family: var(--font-mono);
  font-size: .94em;
}

.mini {
  font-size: .78rem;
}

.suave {
  color: var(--text-muted);
}

.verde {
  color: var(--success);
}

.rojo,
.mala {
  color: var(--danger);
}

.dato {
  font-variant-numeric: tabular-nums;
  font-weight: 750;
}

.rot {
  display: block;
  margin-bottom: 3px;
  font-size: .62rem;
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--text-faint);
}

.desglose {
  display: block;
  margin-top: 2px;
  font-size: .73rem;
  color: var(--text-faint);
  line-height: 1.35;
}

/* ═════════════ CABECERA ═════════════ */

.hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding: 2px 0 4px;
}

.hero-titulo {
  min-width: 0;
}

.eyebrow {
  display: inline-block;
  margin-bottom: 4px;
  font-size: .65rem;
  font-weight: 800;
  letter-spacing: .13em;
  text-transform: uppercase;
  color: var(--accent-text);
}

h1 {
  font-size: clamp(1.35rem, 4vw, 1.8rem);
  font-weight: 800;
  letter-spacing: -.04em;
  line-height: 1.05;
}

.hero p {
  max-width: 62ch;
  margin-top: 6px;
  color: var(--text-muted);
  font-size: .88rem;
  line-height: 1.5;
}

/* ═════════════ RESUMEN ═════════════ */

.resumen-dashboard {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.kpi {
  position: relative;
  overflow: hidden;
  padding: 15px 16px;
  background:
    linear-gradient(180deg, rgba(255,255,255,.04), transparent),
    var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  box-shadow: var(--shadow-sm);
}

.kpi::after {
  content: "";
  position: absolute;
  right: -30px;
  bottom: -30px;
  width: 88px;
  height: 88px;
  border-radius: 999px;
  background: var(--surface-2);
  opacity: .75;
}

.kpi-label {
  display: block;
  color: var(--text-faint);
  font-size: .68rem;
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.kpi strong {
  position: relative;
  z-index: 1;
  display: block;
  margin-top: 8px;
  color: var(--text);
  font-size: clamp(1.15rem, 3vw, 1.45rem);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.kpi small {
  position: relative;
  z-index: 1;
  display: block;
  margin-top: 5px;
  color: var(--text-muted);
  font-size: .75rem;
}

.kpi-puntos {
  border-color: color-mix(in srgb, var(--success) 30%, var(--border));
}

.kpi-puntos strong {
  color: var(--success);
}

/* ═════════════ FILTROS ═════════════ */

/* En pantalla ancha, buscador y filtros en una fila: el buscador se
   estira y los filtros quedan pegados a la derecha. En el celular la card
   apila todo en columna (ver el @media de abajo). */
.panel-filtros {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  box-shadow: var(--shadow-sm);
}

.buscador {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1 1 240px;
  min-width: 0;
  min-height: 44px;
  padding: 0 14px;
  background: var(--surface-2);
  border: 1px solid transparent;
  border-radius: var(--r-sm);
  transition: border-color var(--t-fast), background-color var(--t-fast);
}

.buscador:focus-within {
  background: var(--surface);
  border-color: var(--accent);
}

.buscador input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: none;
  color: var(--text);
  font: inherit;
  font-size: max(.92rem, 16px);
}

.filtros-linea {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.pastillas {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--r-full);
}

.pastillas button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 14px;
  border: 0;
  border-radius: var(--r-full);
  background: transparent;
  color: var(--text-muted);
  font: inherit;
  font-size: .84rem;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background-color var(--t-fast),
    color var(--t-fast),
    box-shadow var(--t-fast);
}

.pastillas button.on {
  background: var(--surface);
  color: var(--accent-text);
  box-shadow: var(--shadow-sm);
}

.pill-count {
  display: inline-grid;
  place-items: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: var(--r-full);
  background: var(--accent-soft);
  color: var(--accent-text);
  font-size: .68rem;
  font-weight: 800;
}

.campo {
  width: 100%;
  min-height: 44px;
  padding: .62rem .78rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: max(.9rem, 16px);
  transition: border-color var(--t-fast), box-shadow var(--t-fast);
}

.campo:focus {
  outline: 0;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.campo.malo {
  border-color: var(--danger);
}

/* El select se viste de pastilla: mismo alto y borde que el resto de la
   fila, y se marca cuando está filtrando. */
.campo-select {
  min-height: 44px;
  padding: 0 34px 0 14px;
  border: 1px solid var(--border-strong);
  border-radius: var(--r-full);
  background:
    var(--surface)
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")
    no-repeat right 13px center;
  color: var(--text-muted);
  font: inherit;
  font-size: max(.85rem, 16px);
  font-weight: 600;
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
}

.campo-select:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.campo-select.on {
  border-color: var(--accent);
  background-color: var(--accent-soft);
  color: var(--accent-text);
}

textarea.campo {
  min-height: 84px;
  resize: vertical;
  line-height: 1.5;
}

/* El checkbox como pastilla, igual que en Inventario Bodega. */
/* margin: 0 porque es un <label>, y la regla de label de los formularios
   le agrega un margen inferior que lo deja más arriba que el select. */
.check {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  margin: 0;
  min-height: 44px;
  padding: 0 14px 0 12px;
  border: 1px solid var(--border-strong);
  border-radius: var(--r-full);
  background: var(--surface);
  color: var(--text-muted);
  font-size: .85rem;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  transition: background-color var(--t-fast), border-color var(--t-fast), color var(--t-fast);
}

.check.on {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent-text);
}

.check input {
  appearance: none;
  -webkit-appearance: none;
  display: grid;
  place-content: center;
  width: 18px;
  height: 18px;
  margin: 0;
  border: 1.5px solid var(--border-strong);
  border-radius: 5px;
  background: var(--surface);
  cursor: pointer;
}

.check input::after {
  content: '';
  width: 5px;
  height: 9px;
  margin-top: -2px;
  border: solid var(--accent-contrast, #fff);
  border-width: 0 2px 2px 0;
  transform: rotate(45deg) scale(0);
  transition: transform .12s ease;
}

.check input:checked {
  background: var(--accent);
  border-color: var(--accent);
}

.check input:checked::after {
  transform: rotate(45deg) scale(1);
}

.check input:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.limpiar {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 44px;
  padding: 0 12px 0 14px;
  border: 1px dashed var(--border-strong);
  border-radius: var(--r-full);
  background: transparent;
  color: var(--text-muted);
  font: inherit;
  font-size: .85rem;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
}

.limpiar:hover {
  border-color: var(--accent);
  color: var(--accent-text);
}

.contador {
  display: inline-grid;
  place-items: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--accent);
  color: var(--accent-contrast);
  font-size: .7rem;
}

/* ═════════════ TARJETAS ═════════════ */

.tarjetas {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(365px, 1fr));
  gap: 14px;
  align-items: start;
  transition: opacity .14s ease;
}

.tarjetas.atenuada {
  opacity: .55;
}

.tarjeta {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  box-shadow: var(--shadow-sm);
  transition:
    border-color var(--t-fast),
    box-shadow var(--t-fast),
    transform var(--t-fast);
}

.tarjeta::before {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  background: transparent;
}

.tarjeta:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.tarjeta.abierta {
  border-color: var(--accent);
  box-shadow: var(--shadow-md);
}

.tarjeta.abierta::before {
  background: var(--accent);
}

.tarjeta.conPuntos::before {
  background: var(--success);
}

.tarjeta.frio::before {
  background: var(--warn);
}

.tarjeta.cumple::before {
  background: var(--accent);
}

.tarjeta.inactivo {
  opacity: .62;
}

.tarjeta.inactivo::before {
  background: var(--text-faint);
}

.cab {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto 18px;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 15px 16px 13px 18px;
  border: 0;
  background: none;
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.cab:hover {
  background: var(--surface-2);
}

.avatar {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: var(--surface-2);
  color: var(--text-muted);
  font-size: .92rem;
  font-weight: 850;
  letter-spacing: -.02em;
}

.avatar.cumple {
  background: var(--accent-soft);
  color: var(--accent-text);
}

.avatar.frio {
  background: var(--warn-soft);
  color: var(--warn);
}

.avatar.puntos {
  background: var(--success-soft);
  color: var(--success);
}

.avatar.off {
  background: var(--surface-2);
  color: var(--text-faint);
}

.identidad {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.nombre-fila {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

.nombre {
  min-width: 0;
  overflow: hidden;
  color: var(--text);
  font-size: .96rem;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sub {
  overflow: hidden;
  color: var(--text-faint);
  font-size: .75rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  padding: 2px 7px;
  border-radius: var(--r-full);
  font-size: .62rem;
  font-weight: 850;
  letter-spacing: .03em;
  text-transform: uppercase;
}

.badge.off {
  background: var(--surface-2);
  color: var(--text-muted);
}

.badge.cumple {
  background: var(--accent-soft);
  color: var(--accent-text);
}

.badge.frio {
  background: var(--warn-soft);
  color: var(--warn);
}

.wallet {
  min-width: 86px;
  padding: 8px 10px;
  border-radius: var(--r-sm);
  background: var(--success-soft);
  color: var(--success);
  text-align: right;
}

.wallet.vacia {
  background: var(--surface-2);
  color: var(--text-faint);
}

.wallet-label {
  display: block;
  margin-bottom: 2px;
  font-size: .58rem;
  font-weight: 850;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.wallet strong {
  display: block;
  font-size: 1.08rem;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.wallet small {
  display: block;
  margin-top: 3px;
  font-size: .68rem;
  font-variant-numeric: tabular-nums;
}

.flecha {
  color: var(--text-faint);
  font-size: 1.35rem;
  transition: transform var(--t-fast);
}

.flecha.girada {
  transform: rotate(90deg);
}

.metricas-card {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  padding: 0 16px 15px 18px;
}

.metricas-card .dato {
  font-size: .86rem;
}

.metricas-card .dato.warn {
  color: var(--warn);
}

.alerta-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 16px 9px 18px;
  font-size: .8rem;
  font-weight: 750;
}

.alerta-card.cumple {
  background: var(--accent-soft);
  color: var(--accent-text);
}

.alerta-card.frio {
  background: var(--warn-soft);
  color: var(--warn);
}

/* ═════════════ DETALLE ═════════════ */

.detalle {
  padding: 15px 16px 16px 18px;
  background: var(--surface-2);
  border-top: 1px solid var(--border);
}

.detalle-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
}

.bloque {
  min-width: 0;
}

.bloque h4 {
  margin-bottom: 8px;
  color: var(--text-faint);
  font-size: .66rem;
  font-weight: 850;
  letter-spacing: .09em;
  text-transform: uppercase;
}

.frecuentes {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.frecuente {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: var(--r-full);
  background: var(--surface);
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
  padding: 9px 0;
  border-bottom: 1px solid var(--border);
  font-size: .82rem;
}

.item:last-child {
  border-bottom: 0;
}

.item.anulada {
  opacity: .52;
}

.item-titulo {
  font-weight: 750;
}

.notas {
  display: flex;
  gap: 9px;
  margin-top: 14px;
  padding: 11px 12px;
  border: 1px solid var(--border);
  border-left: 4px solid var(--secondary);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--text-muted);
  font-size: .82rem;
  line-height: 1.55;
}

.notas p {
  margin: 0;
}

.acciones {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 15px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}

.cargando,
.sin-detalle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 70px;
  color: var(--text-muted);
  font-size: .85rem;
}

/* ═════════════ MODALES ═════════════ */

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
  max-width: 520px;
  max-height: 92dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-lg);
}

.modal.angosto {
  max-width: 430px;
}

.modal-cab {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 20px 22px 15px;
  border-bottom: 1px solid var(--border);
}

.modal-cab h3 {
  font-size: 1.13rem;
  font-weight: 850;
}

.modal-cab p {
  margin-top: 4px;
  color: var(--text-muted);
  font-size: .82rem;
  line-height: 1.45;
}

.cerrar {
  display: inline-grid;
  place-items: center;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  background: var(--surface-2);
  color: var(--text-muted);
  cursor: pointer;
}

.cerrar:hover {
  color: var(--text);
  border-color: var(--border-strong);
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

.modal-pie .btn {
  flex: 1;
}

.rejilla {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}

.grupo {
  margin-bottom: 16px;
}

.rejilla .grupo {
  margin-bottom: 0;
}

label {
  display: block;
  margin-bottom: 6px;
  color: var(--text-muted);
  font-size: .8rem;
  font-weight: 750;
}

.ayuda-campo {
  margin-top: 5px;
  color: var(--text-faint);
  font-size: .75rem;
  line-height: 1.5;
}

.cumple-campos {
  display: grid;
  grid-template-columns: 92px 1fr;
  gap: 10px;
}

.saldo-puntos {
  margin-bottom: 16px;
  padding: 14px;
  border: 1px solid color-mix(in srgb, var(--success) 28%, var(--border));
  border-radius: var(--r-md);
  background: var(--success-soft);
  color: var(--success);
  text-align: center;
}

.saldo-puntos span {
  display: block;
  font-size: .68rem;
  font-weight: 850;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.saldo-puntos strong {
  display: block;
  margin-top: 5px;
  font-size: 2rem;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.saldo-puntos small {
  display: block;
  margin-top: 4px;
  font-size: .78rem;
}

.opciones {
  display: grid;
  gap: 8px;
  margin-bottom: 18px;
}

.opcion {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 12px 14px;
  border: 1.5px solid var(--border);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color var(--t-fast),
    background-color var(--t-fast),
    transform var(--t-fast);
}

.opcion:hover {
  border-color: var(--border-strong);
  transform: translateY(-1px);
}

.opcion b {
  font-size: .9rem;
}

.opcion span {
  color: var(--text-muted);
  font-size: .76rem;
  line-height: 1.35;
}

.opcion.on {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.opcion.on span {
  color: var(--accent-text);
}

/* ═════════════ BOTONES / BANDAS ═════════════ */

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 44px;
  padding: .65rem 1.15rem;
  border: 0;
  border-radius: var(--r-sm);
  background: var(--accent);
  color: var(--accent-contrast);
  font: inherit;
  font-size: .92rem;
  font-weight: 750;
  cursor: pointer;
  white-space: nowrap;
  transition:
    background-color var(--t-fast),
    border-color var(--t-fast),
    color var(--t-fast),
    transform var(--t-fast);
}

.btn:hover:not(:disabled) {
  background: var(--accent-hover);
  transform: translateY(-1px);
}

.btn:disabled {
  opacity: .55;
  cursor: not-allowed;
}

.btn-principal {
  box-shadow: var(--shadow-sm);
}

.btn-linea {
  background: transparent;
  border: 1px solid var(--border-strong);
  color: var(--text-muted);
}

.btn-linea:hover:not(:disabled) {
  background: var(--surface);
  color: var(--text);
}

.btn-linea.peligro:hover:not(:disabled) {
  border-color: var(--danger);
  color: var(--danger);
}

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

.btn-icono.chico {
  width: 26px;
  height: 26px;
  font-size: .78rem;
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

.banda .btn {
  margin-left: auto;
}

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
  display: grid;
  place-items: center;
  gap: 8px;
  min-height: 260px;
  padding: 44px 20px;
  color: var(--text-muted);
  font-size: .88rem;
  text-align: center;
  background: var(--surface);
  border: 1px dashed var(--border-strong);
  border-radius: var(--r-md);
}

.vacio strong {
  color: var(--text);
  font-size: 1.03rem;
}

.loader {
  width: 18px;
  height: 18px;
  border: 2px solid var(--border-strong);
  border-top-color: var(--accent);
  border-radius: 999px;
  animation: girar .7s linear infinite;
}

@keyframes girar {
  to {
    transform: rotate(360deg);
  }
}

.paginador {
  margin: 0;
  text-align: center;
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
  font-weight: 750;
  text-align: center;
  box-shadow: var(--shadow-lg);
}

.aviso.malo {
  background: var(--danger);
}

/* ═════════════ RESPONSIVE ═════════════ */

@media (max-width: 980px) {
  .resumen-dashboard {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .tarjetas {
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  }
}

@media (max-width: 720px) {
  .hero {
    flex-direction: column;
  }

  .hero .btn {
    width: 100%;
  }

  .resumen-dashboard {
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .kpi {
    padding: 13px;
  }

  /* Celular: la card apila buscador y filtros en columna, cada control a
     todo el ancho para tocarlo sin apuntar. */
  .panel-filtros,
  .filtros-linea {
    flex-direction: column;
    align-items: stretch;
  }

  .buscador {
    flex: 0 0 auto;
  }

  .filtros-linea > * {
    width: 100%;
  }

  .pastillas button {
    flex: 1;
    justify-content: center;
    padding: 0 8px;
  }

  .check,
  .limpiar {
    justify-content: center;
  }

  .tarjetas {
    grid-template-columns: 1fr;
  }

  .cab {
    grid-template-columns: 42px minmax(0, 1fr) 18px;
  }

  .wallet {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: 1fr auto auto;
    align-items: center;
    gap: 8px;
    text-align: left;
  }

  .wallet-label {
    margin: 0;
  }

  .wallet small {
    margin: 0;
  }

  .flecha {
    grid-column: 3;
    grid-row: 1;
  }

  .metricas-card {
    grid-template-columns: 1fr 1fr;
    gap: 10px 16px;
  }

  .acciones .btn {
    flex: 1 1 calc(50% - 4px);
    min-height: 42px;
  }

  .fondo {
    align-items: flex-end;
    padding: 0;
  }

  .modal {
    max-width: none;
    max-height: 100dvh;
    height: 100dvh;
    border: 0;
    border-radius: 0;
  }

  .modal-cab {
    padding: 16px 18px 12px;
  }

  .modal-cuerpo {
    padding: 18px;
  }

  .modal-pie {
    padding: 14px 18px calc(14px + env(safe-area-inset-bottom, 0));
  }
}

@media (prefers-reduced-motion: reduce) {
  .check input::after {
    transition: none;
  }
}

@media (max-width: 420px) {
  .resumen-dashboard {
    grid-template-columns: 1fr;
  }

  .cab {
    padding-right: 13px;
  }

  .metricas-card {
    grid-template-columns: 1fr 1fr;
  }

  .acciones .btn {
    flex-basis: 100%;
  }
}
</style>
