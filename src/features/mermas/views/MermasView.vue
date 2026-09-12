<template>
  <div class="mermas">
    <header class="cabecera">
      <div class="min0">
        <h1>Mermas</h1>
        <!-- <p class="ayuda">
          La flor que sale sin venderse. Registrarla mantiene el inventario
          honesto: sin esto quedan varas fantasma y el valorizado deja de
          servir para decidir cuánto comprar.
        </p> -->
      </div>
      <button v-if="puedeEditar" class="btn" @click="registrando = true">
        <span aria-hidden="true">＋</span> Registrar merma
      </button>
    </header>

    <nav v-if="esAdmin" class="pestanas">
      <button :class="{ on: pestana === 'registro' }" @click="pestana = 'registro'">
        Registro
      </button>
      <button :class="{ on: pestana === 'control' }" @click="irAControl">
        Control
        <span v-if="alertasControl" class="punto" aria-hidden="true"></span>
      </button>
    </nav>

    <div v-if="error" class="banda banda-error">
      <span aria-hidden="true">⚠️</span><span>{{ error }}</span>
      <button class="btn btn-mini" @click="recargar">Reintentar</button>
    </div>

    <!-- ═══════════════ REGISTRO ═══════════════ -->
    <template v-if="pestana === 'registro'">

      <!-- El resumen separa lo botado de lo desvalorizado: un ramo
           desarmado con todas sus varas útiles no es una pérdida entera. -->
      <section v-if="resumen" class="resumen">
        <div class="kpi principal" :class="{ alerta: mermaAlta }">
          <span class="rot">Se perdió</span>
          <b class="val">{{ clp(costoPerdido) }}</b>
          <span class="pie">
            {{ Number(porcentajeSobreVentas).toFixed(1) }}% de lo vendido
            <template v-if="mermaAlta"> · alto</template>
          </span>
        </div>

        <div class="kpi">
          <span class="rot">Se botó</span>
          <b class="val">{{ clp(costoBotado) }}</b>
          <span class="pie">{{ unidadesPerdidas }} unidad(es)</span>
        </div>

        <div class="kpi">
          <span class="rot">Bajó de precio</span>
          <b class="val">{{ clp(costoDesvalorizado) }}</b>
          <span class="pie">{{ unidadesRecuperadas }} recuperada(s)</span>
        </div>

        <div class="kpi bueno">
          <span class="rot">Sigue valiendo</span>
          <b class="val">{{ clp(costoRecuperado) }}</b>
          <span class="pie">volvió al inventario</span>
        </div>
      </section>

      <div v-if="motivoPrincipal && motivoPrincipal.costoPerdido > 0" class="banda banda-aviso">
        <span aria-hidden="true">💡</span>
        <span>
          Lo que más cuesta es <b>{{ motivoPrincipal.motivo.toLowerCase() }}</b>:
          {{ clp(motivoPrincipal.costoPerdido) }} en
          {{ motivoPrincipal.unidades }} unidad(es).
        </span>
      </div>

      <!-- Cuatro controles apilados ocupaban media pantalla en móvil. Queda
           el buscador y un botón; el resto vive en la hoja. -->
      <div class="barra">
        <div class="buscador">
          <span aria-hidden="true">🔎</span>
          <input v-model="busqueda" placeholder="Producto, motivo o código…" aria-label="Buscar merma">
          <button v-if="busqueda" class="btn-icono chico" @click="busqueda = ''" aria-label="Limpiar">✕</button>
        </div>

        <button class="btn btn-linea filtros-btn" :class="{ activo: nFiltros > 0 }" @click="filtrosAbiertos = true"
          :aria-label="`Filtros${nFiltros ? `, ${nFiltros} activos` : ''}`">
          Filtros
          <span v-if="nFiltros" class="globo">{{ nFiltros }}</span>
        </button>
      </div>

      <div v-if="chips.length" class="chips-filtro">
        <button v-for="c in chips" :key="c.clave" class="chip-filtro" @click="quitarChip(c)">
          {{ c.texto }} <span aria-hidden="true">✕</span>
        </button>
        <button class="chip-limpiar" @click="limpiarFiltros">Limpiar todo</button>
      </div>

      <div v-if="cargando && !mermas.length" class="vacio">Cargando…</div>

      <div v-else-if="!mermas.length" class="vacio">
        <strong>{{ hayFiltro ? 'Ninguna merma coincide' : 'Sin mermas en el período' }}</strong>
        {{ hayFiltro
          ? 'Prueba con otro filtro.'
          : 'Buena señal: nada salió del inventario sin venderse.' }}
      </div>

      <!-- ═══ Escritorio ═══ -->
      <!-- Antes la tabla y las tarjetas se montaban las dos y se alternaban
           con display:none: cada merma se renderizaba dos veces. -->
      <div v-else-if="!esMovil" class="tabla-envoltura" :class="{ atenuada: cargando }">
        <table>
          <thead>
            <tr>
              <th class="izq">Producto</th>
              <th class="izq">Motivo</th>
              <th class="izq">Destino</th>
              <th>Salió</th>
              <th>Volvió</th>
              <th>Costo perdido</th>
              <th class="izq">Registro</th>
              <th class="acciones-col"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in mermas" :key="m.id" class="fila" :class="{ revertida: m.revertida }">
              <td class="izq">
                <div class="prod">
                  <span class="emoji" aria-hidden="true">{{ m.emoji }}</span>
                  <span class="nombre">{{ m.producto }}</span>
                </div>
                <div class="desglose">
                  <span v-if="m.origenCodigo" class="mono">{{ m.origenCodigo }}</span>
                  <span v-else class="tenue">sin lote</span>
                  · {{ m.origen }}
                </div>
              </td>

              <td class="izq">
                <div>{{ m.motivo }}</div>
                <div v-if="m.detalle" class="desglose corta">{{ m.detalle }}</div>
              </td>

              <td class="izq">
                <span class="chip" :class="'dst-' + m.destino">{{ textoDestino(m.destino) }}</span>
              </td>

              <td class="der dato">{{ m.cantidad }}</td>

              <td class="der">
                <template v-if="m.cantidadRecuperada">
                  <div class="dato verde">{{ m.cantidadRecuperada }}</div>
                  <div class="desglose">{{ textoCalidad(m.calidadReingreso) }}</div>
                </template>
                <span v-else class="tenue">—</span>
              </td>

              <!-- Una devolución al proveedor cuesta cero: sale del stock
                   pero se abona. Mostrar el total ahí sería contarlo como
                   pérdida. -->
              <td class="der">
                <span v-if="m.costoPerdido" class="dato">{{ clp(m.costoPerdido) }}</span>
                <span v-else class="tenue">sin costo</span>
              </td>

              <td class="izq suave">
                <div>{{ fecha(m.creadoEn) }} · {{ hora(m.creadoEn) }}</div>
                <div class="desglose">
                  {{ m.usuario || '—' }}
                  <!-- Quien registra con el balde en la mano escanea; quien
                       inventa la merma, tipea. La marca lo deja a la vista. -->
                  <span v-if="!m.escaneado" class="marca" title="Registrada sin escanear">
                    ✎ a mano
                  </span>
                  <span v-if="m.autorizadoPor" class="marca ok" :title="`Autorizada por ${m.autorizadoPor}`">🔐</span>
                </div>
              </td>

              <td class="acciones-col der">
                <span v-if="m.revertida" class="etiqueta">revertida</span>
                <button v-else-if="esAdmin" class="btn-icono" title="Revertir"
                  @click="abrirReversa(m)">↩</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ═══ Móvil ═══ -->
      <div v-else class="tarjetas" :class="{ atenuada: cargando }">
        <article v-for="m in mermas" :key="m.id" class="tarjeta" :class="{ revertida: m.revertida }">
          <div class="t-fila-1">
            <div class="prod min0">
              <span class="emoji" aria-hidden="true">{{ m.emoji }}</span>
              <span class="nombre">{{ m.producto }}</span>
            </div>
            <b class="dato">{{ m.costoPerdido ? clp(m.costoPerdido) : 'sin costo' }}</b>
          </div>

          <div class="t-fila-2">
            <span class="chip chico" :class="'dst-' + m.destino">{{ textoDestino(m.destino) }}</span>
            <span class="suave">{{ m.cantidad }} salieron</span>
            <span v-if="m.cantidadRecuperada" class="verde">
              · {{ m.cantidadRecuperada }} volvieron
            </span>
          </div>

          <div class="t-fila-3 desglose">
            {{ m.motivo }}
            <template v-if="m.origenCodigo"> · <span class="mono">{{ m.origenCodigo }}</span></template>
            · {{ fecha(m.creadoEn) }}
            <template v-if="m.usuario"> · {{ m.usuario }}</template>
            <span v-if="!m.escaneado" class="marca">✎ a mano</span>
          </div>

          <div v-if="m.revertida" class="t-revertida">Revertida</div>
          <button v-else-if="esAdmin" class="btn btn-linea btn-mini" @click="abrirReversa(m)">
            Revertir
          </button>
        </article>
      </div>

      <p v-if="totalPaginas > 1" class="paginador">
        <button class="btn btn-linea btn-mini" :disabled="filtro.pagina <= 1"
          @click="filtrar({ pagina: filtro.pagina - 1 })">Anterior</button>
        <span class="mini suave">{{ filtro.pagina }} / {{ totalPaginas }} · {{ total }} registros</span>
        <button class="btn btn-linea btn-mini" :disabled="filtro.pagina >= totalPaginas"
          @click="filtrar({ pagina: filtro.pagina + 1 })">Siguiente</button>
      </p>
    </template>

    <!-- ═══════════════ CONTROL ═══════════════ -->
    <template v-else>
      <div v-if="cargandoPatrones && !patrones" class="vacio">Calculando…</div>

      <template v-else-if="patrones">
        <!-- Esto NO acusa a nadie: una florería con una sola persona en
             bodega va a mostrar 100% para ella y eso no significa nada. Pone
             los números donde alguien pueda mirarlos. -->
        <div class="banda banda-info">
          <span aria-hidden="true">ℹ️</span>
          <span>
            Estos números no acusan a nadie: si una sola persona maneja la
            bodega, va a aparecer en todo. Sirven para notar cambios, no para
            sacar conclusiones solos.
          </span>
        </div>

        <section class="panel">
          <h2>Quién registra las mermas</h2>
          <p class="ayuda">
            La columna que importa es <b>sin escanear</b>: quien registra con
            el balde en la mano escanea; quien no lo tiene, tipea.
          </p>

          <div class="tabla-envoltura">
            <table class="compacta">
              <thead>
                <tr>
                  <th class="izq">Persona</th>
                  <th>Registros</th>
                  <th>Costo</th>
                  <th>Sin escanear</th>
                  <th class="izq">Lo que más merma</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="u in patrones.porUsuario" :key="u.usuarioId ?? 0">
                  <td class="izq">
                    <b>{{ u.usuario || 'sin usuario' }}</b>
                    <div class="desglose">{{ u.rol }}</div>
                  </td>
                  <td class="der dato">{{ u.registros }}</td>
                  <td class="der dato">{{ clp(u.costoPerdido) }}</td>
                  <td class="der">
                    <span class="chip" :class="claseEscaneo(u.porcentajeSinEscanear)">
                      {{ Number(u.porcentajeSinEscanear).toFixed(0) }}%
                    </span>
                  </td>
                  <td class="izq suave">
                    {{ u.productoTop || '—' }}
                    <div v-if="u.motivoTop" class="desglose">{{ u.motivoTop }}</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="panel">
          <h2>A qué hora se merma</h2>
          <p class="ayuda">
            Lo normal es que se concentre cuando se revisa la cámara: temprano
            o al cerrar. Un bloque a media tarde vale una pregunta.
          </p>

          <!-- Un gráfico de barras con divs: son 24 valores y una librería
               entera para esto sería peso sin motivo. El role y la etiqueta
               son para quien no puede ver las barras. -->
          <div class="horas" role="img" :aria-label="resumenHoras">
            <div v-for="h in horasCompletas" :key="h.hora" class="hora">
              <div class="barra-caja">
                <div class="barra-hora" :style="{ height: alturaBarra(h) }" :class="{ vacia: !h.registros }"
                  :title="`${h.hora}:00 · ${h.registros} registro(s) · ${clp(h.costoPerdido)}`"></div>
              </div>
              <span class="hora-num">{{ h.hora }}</span>
            </div>
          </div>
        </section>

        <section v-if="patrones.sinEscanear.length" class="panel">
          <h2>Registradas a mano</h2>
          <p class="ayuda">
            No todas son sospechosas: una etiqueta rota obliga a tipear. La
            lista permite revisar de a una en vez de sospechar en general.
          </p>

          <div class="lista-manual">
            <div v-for="m in patrones.sinEscanear" :key="m.id" class="item-manual">
              <span class="emoji" aria-hidden="true">{{ m.emoji }}</span>
              <div class="min0">
                <b>{{ m.cantidad }} × {{ m.producto }}</b>
                <div class="desglose">
                  {{ m.motivo }}
                  <template v-if="m.loteCodigo"> · <span class="mono">{{ m.loteCodigo }}</span></template>
                  · {{ m.usuario || '—' }} · {{ fecha(m.creadoEn) }} {{ hora(m.creadoEn) }}
                </div>
              </div>
              <b class="dato">{{ clp(m.costoPerdido) }}</b>
            </div>
          </div>
        </section>

        <p class="nota-pie">
          Nada de esto detecta el robo de flor que nunca entró al sistema, ni
          el de alguien que además registra la merma correctamente. Para eso
          hace falta contar la cámara y comparar.
        </p>
      </template>
    </template>

    <!-- ═══ Hoja de filtros ═══ -->
    <div v-if="filtrosAbiertos" class="fondo" @click.self="filtrosAbiertos = false">
      <div class="modal hoja" role="dialog" aria-modal="true" aria-labelledby="titulo-filtros">
        <div class="modal-cab hoja-cab">
          <span class="agarre" aria-hidden="true"></span>
          <h3 id="titulo-filtros">Filtros</h3>
          <button class="btn-icono" @click="filtrosAbiertos = false" aria-label="Cerrar">✕</button>
        </div>

        <div class="modal-cuerpo">
          <div class="grupo">
            <label>Destino</label>
            <div class="pastillas">
              <button class="pastilla" :class="{ on: !filtro.destino }"
                @click="filtrar({ destino: null, pagina: 1 })">Todos</button>
              <button v-for="d in DESTINOS" :key="d.valor" class="pastilla"
                :class="{ on: filtro.destino === d.valor }"
                @click="filtrar({ destino: d.valor, pagina: 1 })">{{ d.texto }}</button>
            </div>
          </div>

          <div class="grupo">
            <label for="f-motivo">Motivo</label>
            <select id="f-motivo" class="campo" :value="filtro.motivo ?? ''"
              @change="filtrar({ motivo: $event.target.value || null, pagina: 1 })">
              <option value="">Todos los motivos</option>
              <option v-for="m in nombresMotivo" :key="m" :value="m">{{ m }}</option>
            </select>
          </div>

          <div class="grupo">
            <label>Periodo</label>
            <div class="pastillas">
              <button v-for="p in PRESETS" :key="p.clave" class="pastilla"
                :class="{ on: presetActivo === p.clave }" @click="aplicarPreset(p.clave)">{{ p.texto }}</button>
            </div>
          </div>

          <div v-if="presetActivo === 'personalizado'" class="grupo par">
            <label class="campo-fecha">
              <span>Desde</span>
              <input type="date" :value="filtro.desde ?? ''"
                @change="filtrar({ desde: $event.target.value || null, pagina: 1 })">
            </label>
            <label class="campo-fecha">
              <span>Hasta</span>
              <input type="date" :value="filtro.hasta ?? ''"
                @change="filtrar({ hasta: $event.target.value || null, pagina: 1 })">
            </label>
          </div>

          <label class="check">
            <input type="checkbox" :checked="filtro.revertida === null"
              @change="filtrar({ revertida: $event.target.checked ? null : false, pagina: 1 })">
            <span>Ver mermas revertidas</span>
          </label>
        </div>

        <div class="modal-pie">
          <button class="btn btn-linea" @click="limpiarFiltros">Limpiar</button>
          <button class="btn" @click="filtrosAbiertos = false">Ver {{ total }} registro(s)</button>
        </div>
      </div>
    </div>

    <!-- ═══ Modales ═══ -->
    <ModalMerma v-if="registrando" @cerrar="registrando = false" @registrada="alRegistrar" />

    <div v-if="rev" class="fondo" @click.self="intentarCerrarReversa">
      <div class="modal angosto" role="dialog" aria-modal="true" aria-labelledby="titulo-reversa">
        <div class="modal-cab">
          <h3 id="titulo-reversa">Revertir merma</h3>
          <p>{{ rev.cantidad }} × {{ rev.producto }} · {{ fecha(rev.creadoEn) }}</p>
        </div>

        <div class="modal-cuerpo">
          <div v-if="rev.error" class="error">{{ rev.error }}</div>

          <div class="nota">
            Las varas vuelven
            <template v-if="rev.origenCodigo">
              a <b class="mono">{{ rev.origenCodigo }}</b>
            </template>
            <template v-else>al stock</template>
            con su costo y su vencimiento originales.
            <template v-if="rev.loteRecuperacion">
              <br><br>El lote recuperado <b class="mono">{{ rev.loteRecuperacion }}</b> se anula.
              Si ya se vendió algo de ahí, la reversa no se puede hacer.
            </template>
          </div>

          <div class="grupo">
            <label for="r-motivo">¿Por qué se revierte?</label>
            <input id="r-motivo" ref="campoMotivo" class="campo" v-model="rev.motivo" maxlength="200"
              placeholder="Se registró el producto equivocado" @keyup.enter="revertir">
            <p class="ayuda-campo">
              Mínimo 5 caracteres. Dentro de seis meses alguien va a querer
              saber por qué.
            </p>
          </div>
        </div>

        <div class="modal-pie">
          <button class="btn btn-linea" :disabled="guardando" @click="intentarCerrarReversa">Cancelar</button>
          <button class="btn peligro" :disabled="guardando" @click="revertir">
            {{ guardando ? 'Revirtiendo…' : 'Revertir' }}
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
import { DESTINOS, textoDestino, textoCalidad } from '@/features/mermas/store/mermas.module'
import ModalMerma from '@/features/mermas/components/ModalMerma.vue'
import { useTemporizadores } from '@/shared/composables/useTemporizadores'

/* El mismo valor que el @media de abajo. Si se cambia uno hay que cambiar el
   otro: no hay forma de leer un breakpoint de CSS desde JS. */
const MOVIL = '(max-width: 860px)'

const PRESETS = [
  { clave: 'todo', texto: 'Todo' },
  { clave: 'hoy', texto: 'Hoy' },
  { clave: '7d', texto: '7 días' },
  { clave: 'mes', texto: 'Este mes' },
  { clave: 'personalizado', texto: 'Otro rango' }
]

/* YYYY-MM-DD en hora local. toISOString() da UTC y en Chile adelanta el día
   durante la tarde. */
const isoLocal = (d) => {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const sumarDias = (d, n) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export default {
  name: 'MermasView',
  components: { ModalMerma },

  setup () {
    const store = useStore()
    const { usarAviso } = useTemporizadores()
    const { aviso, avisar } = usarAviso()

    const esAdmin = computed(() => store.getters['auth/esAdmin'])
    const puedeEditar = computed(() => store.getters['auth/tieneRol']('admin', 'bodega'))

    const pestana = ref('registro')

    /* ---------------- Registro ---------------- */
    const mermas = computed(() => store.getters['mermas/mermas'])
    const total = computed(() => store.getters['mermas/total'])
    const totalPaginas = computed(() => store.getters['mermas/totalPaginas'])
    const filtro = computed(() => store.getters['mermas/filtro'])
    const cargando = computed(() => store.getters['mermas/cargando'])
    const guardando = computed(() => store.getters['mermas/guardando'])
    const error = computed(() => store.getters['mermas/error'])

    const resumen = computed(() => store.getters['mermas/resumen'])
    const costoPerdido = computed(() => store.getters['mermas/costoPerdido'])
    const costoBotado = computed(() => store.getters['mermas/costoBotado'])
    const costoDesvalorizado = computed(() => store.getters['mermas/costoDesvalorizado'])
    const costoRecuperado = computed(() => store.getters['mermas/costoRecuperado'])
    const unidadesPerdidas = computed(() => store.getters['mermas/unidadesPerdidas'])
    const unidadesRecuperadas = computed(() => store.getters['mermas/unidadesRecuperadas'])
    const porcentajeSobreVentas = computed(() => store.getters['mermas/porcentajeSobreVentas'])
    const motivoPrincipal = computed(() => store.getters['mermas/motivoPrincipal'])
    const mermaAlta = computed(() => store.getters['mermas/mermaAlta'])
    const nombresMotivo = computed(() => store.getters['mermas/nombresMotivo'])

    const filtrar = (cambios) => store.dispatch('mermas/filtrar', cambios)
    const recargar = () => store.dispatch('mermas/cargar')

    const busqueda = ref(filtro.value.buscar || '')
    let tmr = null

    /* Escribir en el campo desde el código no debe despachar un filtro: pasa
       al limpiar y al sincronizar con el store, y sin esto cada limpieza
       mandaba una petición de más 350ms después. */
    let silencio = false
    const ponerBusqueda = (v) => {
      if (busqueda.value === v) return
      silencio = true
      busqueda.value = v
    }

    watch(busqueda, (v) => {
      clearTimeout(tmr)
      if (silencio) {
        silencio = false
        return
      }
      tmr = setTimeout(() => filtrar({ buscar: v.trim(), pagina: 1 }), 350)
    })

    /* Si el filtro se resetea desde otro lado, el campo se quedaba con el
       texto viejo mostrando resultados que no correspondían. */
    watch(() => filtro.value.buscar, (v) => ponerBusqueda(v || ''))

    /* ---------------- Ancho ---------------- */
    const esMovil = ref(false)
    let mql = null
    const alCambiarAncho = (e) => { esMovil.value = e.matches }

    /* ---------------- Filtros ---------------- */
    const filtrosAbiertos = ref(false)
    const rangoManual = ref(false)

    const rangoPreset = (clave) => {
      const h = new Date()
      switch (clave) {
        case 'hoy': return { desde: isoLocal(h), hasta: isoLocal(h) }
        case '7d': return { desde: isoLocal(sumarDias(h, -6)), hasta: isoLocal(h) }
        case 'mes': return { desde: isoLocal(new Date(h.getFullYear(), h.getMonth(), 1)), hasta: isoLocal(h) }
        default: return { desde: null, hasta: null }
      }
    }

    /* El preset se deduce del rango puesto, pero la elección explícita manda:
       si se deduce solo del rango, tocar "Otro rango" viniendo de "Hoy" deja
       el rango calzando con hoy y los campos de fecha no aparecen nunca. */
    const presetActivo = computed(() => {
      if (rangoManual.value) return 'personalizado'

      const { desde, hasta } = filtro.value
      if (!desde && !hasta) return 'todo'

      for (const p of ['hoy', '7d', 'mes']) {
        const r = rangoPreset(p)
        if (r.desde === desde && r.hasta === hasta) return p
      }
      return 'personalizado'
    })

    const aplicarPreset = (clave) => {
      rangoManual.value = clave === 'personalizado'
      if (clave === 'personalizado') return
      filtrar({ ...rangoPreset(clave), pagina: 1 })
    }

    const chips = computed(() => {
      const f = filtro.value
      const out = []
      if (f.destino) {
        out.push({ clave: 'destino', texto: textoDestino(f.destino), cambio: { destino: null } })
      }
      if (f.motivo) {
        out.push({ clave: 'motivo', texto: f.motivo, cambio: { motivo: null } })
      }
      if (f.desde || f.hasta) {
        const texto = presetActivo.value === 'personalizado'
          ? `${f.desde || '…'} a ${f.hasta || '…'}`
          : PRESETS.find(p => p.clave === presetActivo.value)?.texto
        out.push({ clave: 'fechas', texto, cambio: { desde: null, hasta: null } })
      }
      if (f.revertida === null) {
        out.push({ clave: 'revertidas', texto: 'Con revertidas', cambio: { revertida: false } })
      }
      return out
    })

    const nFiltros = computed(() => chips.value.length)
    const hayFiltro = computed(() => nFiltros.value > 0 || !!filtro.value.buscar)

    const quitarChip = (c) => {
      if (c.clave === 'fechas') rangoManual.value = false
      filtrar({ ...c.cambio, pagina: 1 })
    }

    const limpiarFiltros = () => {
      rangoManual.value = false
      clearTimeout(tmr)
      ponerBusqueda('')
      filtrar({
        buscar: '', destino: null, motivo: null,
        desde: null, hasta: null, revertida: false, pagina: 1
      })
    }

    /* ---------------- Registrar ---------------- */
    const registrando = ref(false)

    const alRegistrar = (m) => {
      registrando.value = false
      avisar(m.cantidadRecuperada
        ? `${m.cantidadRecuperada} varas recuperadas en ${m.loteRecuperacion}`
        : `${m.cantidad} de ${m.producto} · ${clp(m.costoPerdido)} de pérdida`)
      store.dispatch('productos/cargar')
    }

    /* ---------------- Control ---------------- */
    const patrones = computed(() => store.getters['mermas/patrones'])
    const cargandoPatrones = computed(() => store.getters['mermas/cargandoPatrones'])

    const irAControl = () => {
      pestana.value = 'control'
      store.dispatch('mermas/cargarPatrones')
    }

    /* Un punto en la pestaña cuando hay algo que mirar. No dice qué: eso lo
       decide quien entra, no un semáforo. */
    const alertasControl = computed(() => {
      const p = patrones.value
      if (!p?.porUsuario?.length) return false
      return p.porUsuario.some(u => u.registros >= 3 && u.porcentajeSinEscanear > 50)
    })

    const claseEscaneo = (pct) =>
      pct >= 70 ? 'malo' : pct >= 30 ? 'medio' : 'bueno'

    /* Las 24 horas siempre, aunque no tengan registros: el hueco de la
       madrugada es tan informativo como el pico de la mañana. */
    const horasCompletas = computed(() => {
      const datos = patrones.value?.porHora ?? []
      return Array.from({ length: 24 }, (_, h) =>
        datos.find(d => d.hora === h) ?? { hora: h, registros: 0, costoPerdido: 0, sinEscanear: 0 }
      )
    })

    const maxHora = computed(() =>
      Math.max(1, ...horasCompletas.value.map(h => h.registros))
    )

    const alturaBarra = (h) =>
      h.registros ? `${Math.max(8, (h.registros / maxHora.value) * 100)}%` : '3px'

    /* Un gráfico de barras es invisible para un lector de pantalla. La
       etiqueta dice lo que se viene a buscar: dónde está el pico. */
    const resumenHoras = computed(() => {
      const conDatos = horasCompletas.value.filter(h => h.registros)
      if (!conDatos.length) return 'Sin registros de mermas por hora.'
      const pico = conDatos.reduce((a, b) => (b.registros > a.registros ? b : a))
      return `Mermas por hora del día. El máximo es a las ${pico.hora}:00, con ${pico.registros} registro(s).`
    })

    /* ---------------- Revertir ---------------- */
    const rev = ref(null)
    const campoMotivo = ref(null)

    const abrirReversa = async (m) => {
      rev.value = {
        id: m.id,
        producto: m.producto,
        cantidad: m.cantidad,
        creadoEn: m.creadoEn,
        origenCodigo: m.origenCodigo,
        loteRecuperacion: m.loteRecuperacion,
        motivo: '',
        error: ''
      }
      await nextTick()
      campoMotivo.value?.focus()
    }

    /* Un clic al fondo borraba el motivo escrito sin preguntar */
    const intentarCerrarReversa = () => {
      if (guardando.value) return
      if (rev.value?.motivo.trim()) {
        rev.value.error = 'Toca Cancelar de nuevo para descartar, o completa el motivo.'
        rev.value.motivo = ''
        return
      }
      rev.value = null
    }

    const revertir = async () => {
      const r = rev.value
      r.error = ''

      /* La ayuda decía "mínimo 5 caracteres" y nada lo comprobaba: la
         validación quedaba entera en el SP. */
      if (r.motivo.trim().length < 5) {
        return (r.error = 'Explica el motivo, con al menos 5 caracteres.')
      }

      try {
        await store.dispatch('mermas/revertir', { id: r.id, motivo: r.motivo.trim() })
        rev.value = null
        avisar(`${r.cantidad} de ${r.producto} volvieron al inventario`)
        store.dispatch('productos/cargar')
      } catch (e) {
        r.error = e.message
      }
    }

    /* ---------------- Teclado ---------------- */
    const alTeclado = (e) => {
      if (e.key !== 'Escape') return
      if (rev.value) intentarCerrarReversa()
      else if (filtrosAbiertos.value) filtrosAbiertos.value = false
    }

    /* ---------------- Carga ---------------- */
    let control = null

    onMounted(() => {
      control = new AbortController()
      const señal = { signal: control.signal }

      store.dispatch('mermas/cargar', señal)
      store.dispatch('mermas/cargarResumen', señal)
      store.dispatch('mermas/cargarMotivos', señal)
      store.dispatch('mermas/cargarUmbral', señal)
      store.dispatch('productos/cargar', señal)

      mql = window.matchMedia(MOVIL)
      esMovil.value = mql.matches
      mql.addEventListener('change', alCambiarAncho)
      document.addEventListener('keydown', alTeclado)
    })

    onUnmounted(() => {
      control?.abort()
      clearTimeout(tmr)
      mql?.removeEventListener('change', alCambiarAncho)
      document.removeEventListener('keydown', alTeclado)
    })

    /* ---------------- Utilidades ---------------- */
    const fmt = new Intl.NumberFormat('es-CL', {
      style: 'currency', currency: 'CLP', maximumFractionDigits: 0
    })
    const clp = (n) => fmt.format(Math.round(n || 0))

    const fecha = (v) => (v
      ? new Date(v).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
      : '—')

    const hora = (v) => (v
      ? new Date(v).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
      : '')

    return {
      Number, DESTINOS, PRESETS, textoDestino, textoCalidad,
      esAdmin, puedeEditar, esMovil, pestana, irAControl,
      mermas, total, totalPaginas, filtro, cargando, guardando, error, hayFiltro,
      resumen, costoPerdido, costoBotado, costoDesvalorizado, costoRecuperado,
      unidadesPerdidas, unidadesRecuperadas, porcentajeSobreVentas,
      motivoPrincipal, mermaAlta, nombresMotivo,
      busqueda, filtrar, recargar,
      filtrosAbiertos, presetActivo, aplicarPreset, chips, nFiltros, quitarChip, limpiarFiltros,
      registrando, alRegistrar,
      patrones, cargandoPatrones, alertasControl, claseEscaneo,
      horasCompletas, alturaBarra, resumenHoras,
      rev, campoMotivo, abrirReversa, intentarCerrarReversa, revertir,
      aviso, clp, fecha, hora
    }
  }
}
</script>

<style scoped>
.mermas {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.min0 { min-width: 0; }
.izq { text-align: left; }
.der { text-align: right; }
.suave { color: var(--text-muted); }
.tenue { color: var(--text-faint); }
.mini { font-size: .78rem; }
.verde { color: var(--success); }
.mono { font-family: var(--font-mono); font-size: .95em; }

.dato {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.rot {
  font-size: .64rem;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--text-faint);
}

.desglose {
  font-size: .73rem;
  color: var(--text-faint);
  margin-top: 1px;
}

.corta {
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 26ch;
}

.ayuda {
  font-size: .82rem;
  color: var(--text-muted);
  line-height: 1.55;
  margin-top: 4px;
  max-width: 62ch;
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

.pestanas {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--border);
}

.pestanas button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 18px;
  border: none;
  border-bottom: 2px solid transparent;
  background: none;
  color: var(--text-muted);
  font: inherit;
  font-size: .9rem;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: -1px;
  transition: color var(--t-fast), border-color var(--t-fast);
}

.pestanas button:hover { color: var(--text); }

.pestanas button.on {
  color: var(--accent-text);
  border-bottom-color: var(--accent);
}

.pestanas button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: var(--r-sm);
}

/* Un punto cuando hay algo que mirar. No dice qué: eso lo decide quien
   entra, no un semáforo. */
.punto {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--warn);
}

/* ─── Resumen ─── */

.resumen {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.kpi {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 15px 17px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
}

.kpi .val {
  font-size: clamp(1.15rem, 4vw, 1.4rem);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: -.02em;
}

.kpi .pie {
  font-size: .74rem;
  color: var(--text-muted);
}

.kpi.principal {
  background: var(--surface-2);
  border-color: var(--border-strong);
}

/* Rojo sobre el 5% de lo vendido: en una florería es la señal de que se
   compra más de lo que se alcanza a vender. */
.kpi.principal.alerta {
  background: var(--danger-soft);
  border-color: var(--danger-border);
  color: var(--danger);
}

.kpi.principal.alerta .rot,
.kpi.principal.alerta .pie {
  color: inherit;
  opacity: .85;
}

.kpi.bueno .val { color: var(--success); }

/* ─── Barra de filtros ─── */

.barra {
  display: flex;
  gap: 10px;
  align-items: stretch;
}

.buscador {
  display: flex;
  align-items: center;
  gap: 9px;
  flex: 1 1 auto;
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

.filtros-btn {
  flex: 0 0 auto;
  gap: 8px;
}

.filtros-btn.activo {
  border-color: var(--accent);
  color: var(--accent-text);
}

.globo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 19px;
  height: 19px;
  padding: 0 5px;
  border-radius: var(--r-full);
  background: var(--accent);
  color: var(--accent-contrast);
  font-size: .7rem;
  font-weight: 700;
}

.chips-filtro {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip-filtro,
.chip-limpiar {
  border: 1px solid var(--accent-soft);
  border-radius: var(--r-full);
  background: var(--accent-soft);
  color: var(--accent-text);
  font: inherit;
  font-size: .76rem;
  font-weight: 600;
  padding: 4px 11px;
  cursor: pointer;
}

.chip-limpiar {
  background: transparent;
  border-color: var(--border-strong);
  color: var(--text-muted);
}

.pastillas {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pastilla {
  padding: 8px 13px;
  border: 1px solid var(--border-strong);
  border-radius: var(--r-full);
  background: var(--surface);
  color: var(--text-muted);
  font: inherit;
  font-size: .82rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color var(--t-fast), color var(--t-fast), background-color var(--t-fast);
}

.pastilla.on {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent-text);
}

.pastilla:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
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

.campo:focus {
  outline: 0;
  border-color: var(--accent);
}

.campo-fecha {
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex: 1;
}

.campo-fecha > span {
  font-size: .74rem;
  font-weight: 600;
  color: var(--text-faint);
  text-transform: none;
  letter-spacing: 0;
  margin: 0;
}

.campo-fecha input {
  height: 44px;
  width: 100%;
  padding: 0 .6rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: max(.85rem, 16px);
}

.check {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  min-height: 44px;
  font-size: .88rem;
  color: var(--text-muted);
  cursor: pointer;
}

.check input {
  width: 18px;
  height: 18px;
  accent-color: var(--accent);
  cursor: pointer;
}

/* ─── Tabla ─── */

.tabla-envoltura {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  overflow: auto;
  transition: opacity .14s ease;
}

.tabla-envoltura.atenuada,
.tarjetas.atenuada { opacity: .45; }

table {
  width: 100%;
  min-width: 940px;
  border-collapse: separate;
  border-spacing: 0;
}

table.compacta { min-width: 620px; }

th {
  position: sticky;
  top: 0;
  z-index: 2;
  text-align: right;
  padding: 10px 12px;
  background: var(--surface-2);
  border-bottom: 1px solid var(--border);
  font-size: .66rem;
  font-weight: 700;
  letter-spacing: .07em;
  text-transform: uppercase;
  color: var(--text-muted);
  white-space: nowrap;
}

th.izq { text-align: left; }

td {
  padding: 11px 12px;
  border-bottom: 1px solid var(--border);
  font-size: .86rem;
  vertical-align: middle;
  white-space: nowrap;
}

tbody tr:last-child td { border-bottom: 0; }

/* Una merma revertida se atenúa pero no se esconde: dejó de ser pérdida,
   pero el registro de que ocurrió tiene que poder consultarse. */
.fila.revertida { opacity: .5; }

.prod {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.prod .emoji {
  font-size: 1.05rem;
  flex-shrink: 0;
}

.nombre {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
}

.acciones-col { width: 1%; }

/* La marca de "a mano" no es una acusación: es un dato. Va en el color de
   aviso, no en el de error. */
.marca {
  display: inline-block;
  margin-left: 6px;
  padding: 0 6px;
  border-radius: var(--r-full);
  background: var(--warn-soft);
  color: var(--warn);
  font-size: .66rem;
  font-weight: 700;
  cursor: help;
}

.marca.ok {
  background: var(--success-soft);
  color: var(--success);
}

/* ─── Tarjetas ─── */

.tarjetas {
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: opacity .14s ease;
}

.tarjeta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 13px 15px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
}

.tarjeta.revertida { opacity: .55; }

.t-fila-1 {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.t-fila-2 {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: .78rem;
}

.t-revertida {
  font-size: .74rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .05em;
  color: var(--text-faint);
}

/* ─── Control ─── */

.panel {
  padding: 18px 20px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
}

.panel h2 {
  font-size: 1rem;
  font-weight: 700;
}

.panel .tabla-envoltura {
  margin-top: 14px;
  border-radius: var(--r-sm);
}

/* Un gráfico con divs: son 24 valores y una librería entera para esto
   sería peso sin motivo. */
.horas {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 120px;
  margin-top: 16px;
}

.hora {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  height: 100%;
}

.barra-caja {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
}

/* barra-hora, no barra: `.barra` ya es el contenedor de la barra de filtros
   de la otra pestaña, y al declararse después ganaba, pintando de acento el
   fondo de los filtros y atenuándolos al pasar el mouse. */
.barra-hora {
  width: 100%;
  min-height: 3px;
  background: var(--accent);
  border-radius: 2px 2px 0 0;
  transition: opacity var(--t-fast);
}

.barra-hora:hover { opacity: .75; }

/* Las horas sin registros dejan una marca tenue en vez de nada: el hueco
   de la madrugada es tan informativo como el pico de la mañana. */
.barra-hora.vacia { background: var(--border); }

.hora-num {
  font-size: .6rem;
  color: var(--text-faint);
  font-variant-numeric: tabular-nums;
}

.lista-manual {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 14px;
}

.item-manual {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 0;
  border-bottom: 1px solid var(--border);
  font-size: .85rem;
}

.item-manual:last-child { border-bottom: 0; }

.item-manual .emoji {
  font-size: 1.1rem;
  flex-shrink: 0;
}

.item-manual .min0 { flex: 1; }

.nota-pie {
  padding: 14px 16px;
  background: var(--surface-2);
  border-radius: var(--r-sm);
  font-size: .8rem;
  line-height: 1.6;
  color: var(--text-muted);
}

/* ─── Chips ─── */

.chip {
  display: inline-block;
  padding: 3px 10px;
  border-radius: var(--r-full);
  font-size: .74rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.chip.chico {
  padding: 2px 8px;
  font-size: .7rem;
}

/* Cada destino con su color: la devolución no es pérdida y no debería
   verse como tal. */
.dst-perdida {
  background: var(--danger-soft);
  color: var(--danger);
}

.dst-reingreso {
  background: var(--warn-soft);
  color: var(--warn);
}

.dst-devolucion_proveedor {
  background: var(--info-soft);
  color: var(--info);
}

.chip.bueno {
  background: var(--success-soft);
  color: var(--success);
}

.chip.medio {
  background: var(--warn-soft);
  color: var(--warn);
}

.chip.malo {
  background: var(--danger-soft);
  color: var(--danger);
}

.etiqueta {
  display: inline-block;
  padding: 1px 8px;
  border-radius: var(--r-full);
  background: var(--surface-2);
  color: var(--text-muted);
  font-size: .62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .04em;
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

.modal {
  width: 100%;
  max-width: 500px;
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

.hoja-cab {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
}

.hoja-cab h3 { flex: 1; }

.agarre { display: none; }

.modal-cab h3 {
  font-size: 1.1rem;
  font-weight: 700;
}

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

.grupo { margin-bottom: 16px; }
.grupo:last-child { margin-bottom: 0; }
.grupo.par { display: flex; gap: 12px; }

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

.nota {
  padding: 12px 14px;
  margin-bottom: 16px;
  background: var(--info-soft);
  border-left: 3px solid var(--info);
  border-radius: 0 var(--r-sm) var(--r-sm) 0;
  font-size: .8rem;
  line-height: 1.55;
}

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

.btn:disabled {
  opacity: .55;
  cursor: not-allowed;
}

/* Revertir deshace un registro de pérdida y mueve el resultado del mes. */
.btn.peligro { background: var(--danger); }
.btn.peligro:hover:not(:disabled) { filter: brightness(.92); }

.btn-linea {
  background: transparent;
  border: 1px solid var(--border-strong);
  color: var(--text-muted);
}

.btn-linea:hover:not(:disabled) {
  background: var(--surface-2);
  color: var(--text);
}

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
  transition: border-color var(--t-fast), color var(--t-fast);
}

.btn-icono:hover {
  border-color: var(--accent);
  color: var(--accent-text);
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
  line-height: 1.55;
}

.banda-error {
  background: var(--danger-soft);
  border: 1px solid var(--danger-border);
  color: var(--danger);
}

.banda-aviso {
  background: var(--warn-soft);
  border: 1px solid var(--warn-border);
  color: var(--warn);
}

.banda-info {
  background: var(--info-soft);
  border: 1px solid var(--info-border);
  color: var(--info);
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
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin: 0;
  color: var(--text-muted);
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

/* ─── Móvil ─── */

@media (max-width: 860px) {
  .cabecera .btn { width: 100%; }

  .resumen { grid-template-columns: repeat(2, 1fr); }

  .panel { padding: 15px; }

  /* Una de cada tres horas en el eje: 24 números de 10px no se leen en un
     teléfono. El selector decía even, que escondía una de cada dos. */
  .hora-num {
    font-size: .55rem;
    visibility: hidden;
  }

  .hora:nth-child(3n + 1) .hora-num { visibility: visible; }

  /* Las hojas suben desde abajo */
  .fondo {
    padding: 0;
    align-items: flex-end;
  }

  .modal {
    max-width: none;
    max-height: 92dvh;
    border-radius: var(--r-lg) var(--r-lg) 0 0;
    border-bottom: 0;
  }

  .modal.angosto { max-width: none; }

  .hoja-cab { padding-top: 24px; }

  .agarre {
    display: block;
    position: absolute;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    width: 34px;
    height: 4px;
    border-radius: var(--r-full);
    background: var(--border-strong);
  }

  .modal-pie {
    flex-direction: column-reverse;
    padding-bottom: calc(16px + env(safe-area-inset-bottom, 0));
  }

  .tarjeta .btn {
    width: 100%;
    margin-top: 4px;
  }

  .paginador .btn { flex: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .btn, .btn-icono, .pastilla, .campo, .buscador,
  .barra-hora, .tabla-envoltura, .tarjetas { transition: none; }
}
</style>