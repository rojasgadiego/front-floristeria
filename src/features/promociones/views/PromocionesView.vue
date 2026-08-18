<template>
  
    <div class="cabecera al-entrar">
      <div>
        <h2>Promociones</h2>
        <p class="pista">
          Cuánto se regala y bajo qué condiciones. Antes de guardar una,
          puedes probarla contra las ventas reales.
        </p>
      </div>
      <button v-if="esAdmin" class="btn" @click="abrirNueva">＋ Nueva promoción</button>
    </div>

    <div v-if="error" class="banda banda-error">
      <span aria-hidden="true">⚠️</span><span>{{ error }}</span>
      <button class="btn btn-mini" @click="recargar">Reintentar</button>
    </div>

    <!--
      Activa pero no vigente es el caso que más confunde: en la lista se ve
      encendida y el punto de venta no la ofrece. El backend manda el motivo,
      así que vale la pena decirlo arriba y no dejarlo escondido en la fila.
    -->
    <div v-if="activasNoVigentes.length" class="banda banda-aviso">
      <span aria-hidden="true">💤</span>
      <span>
        {{ activasNoVigentes.length }} promoción(es) activa(s) que <b>hoy no corren</b>.
        El punto de venta no las está ofreciendo.
      </span>
    </div>

    <!-- ---------- Filtros ---------- -->
    <div class="barra-filtros al-entrar" style="--i: 2">
      <div class="buscador">
        <span aria-hidden="true">🔎</span>
        <input v-model="busqueda" placeholder="Nombre o descripción…" aria-label="Buscar promoción">
        <button v-if="busqueda" class="btn-icono chico" @click="busqueda = ''" aria-label="Limpiar">✕</button>
      </div>

      <select class="campo campo-corto" :value="filtro.alcance ?? ''"
        @change="filtrar({ alcance: $event.target.value || null })" aria-label="Alcance">
        <option value="">Todos los alcances</option>
        <option v-for="a in ALCANCES" :key="a.valor" :value="a.valor">{{ a.texto }}</option>
      </select>

      <label class="check">
        <input type="checkbox" :checked="filtro.soloVigentes"
          @change="filtrar({ soloVigentes: $event.target.checked })">
        <span>Solo las que corren hoy</span>
      </label>

      <label class="check">
        <input type="checkbox" :checked="filtro.activa === null"
          @change="filtrar({ activa: $event.target.checked ? null : true })">
        <span>Ver desactivadas</span>
      </label>
    </div>

    <!-- ---------- Listado ---------- -->
    <div v-if="cargando && !promociones.length" class="vacio">Cargando promociones…</div>

    <div v-else-if="!promociones.length" class="vacio">
      <strong>{{ hayFiltro ? 'Ninguna coincide' : 'Sin promociones' }}</strong>
      {{ hayFiltro
        ? 'Prueba con otro texto o quita los filtros.'
        : 'Crea la primera para empezar a ofrecerla en el punto de venta.' }}
    </div>

    <div v-else class="tarjetas">
      <article v-for="(p, ix) in promociones" :key="p.id" class="tarjeta al-entrar"
        :style="{ '--i': Math.min(ix, 12) }"
        :class="{ inactiva: !p.activa, vigente: p.vigenteHoy, resaltada: p.id === resalte.id }">

        <header class="tarjeta-cab">
          <div class="min0">
            <h3>{{ p.nombre }}</h3>
            <p v-if="p.descripcion" class="descripcion">{{ p.descripcion }}</p>
          </div>
          <b class="valor">{{ valorLegible(p) }}</b>
        </header>

        <div class="condiciones">
          <span class="chip">{{ textoAlcance(p.alcance) }}</span>
          <span v-if="p.categoria" class="chip">{{ p.categoria }}</span>
          <span v-if="p.producto" class="chip">{{ p.producto }}</span>
          <span v-if="p.minimo" class="chip">desde {{ clp(p.minimo) }}</span>
          <span class="chip">{{ p.diasTexto }}</span>
          <span v-if="p.desde || p.hasta" class="chip">
            {{ p.desde ? fecha(p.desde) : '…' }} → {{ p.hasta ? fecha(p.hasta) : '…' }}
          </span>
        </div>

        <div class="estado" :class="p.vigenteHoy ? 'ok' : (p.activa ? 'dormida' : 'apagada')">
          <template v-if="p.vigenteHoy">✅ Corriendo hoy</template>
          <template v-else-if="p.activa">💤 {{ p.motivoNoVigente || 'Hoy no aplica' }}</template>
          <template v-else>⭘ Desactivada</template>
        </div>

        <div class="uso">
          <div>
            <span>Usos</span>
            <b class="dato">{{ p.usos }}</b>
          </div>
          <div>
            <span>Descontado</span>
            <b class="dato">{{ clp(p.descuentoAcumulado) }}</b>
          </div>
          <div v-if="p.ultimoUso">
            <span>Último uso</span>
            <b class="dato">{{ fecha(p.ultimoUso) }}</b>
          </div>
        </div>

        <div v-if="esAdmin" class="acciones">
          <button class="btn btn-linea btn-mini" @click="abrirDetalle(p)">Ver detalle</button>
          <button class="btn btn-linea btn-mini" @click="abrirEdicion(p)">✏️ Editar</button>
          <button v-if="p.activa" class="btn btn-linea btn-mini" @click="cambiarEstado(p, false)">
            Desactivar
          </button>
          <button v-else class="btn btn-mini" @click="cambiarEstado(p, true)">Activar</button>
          <button v-if="!p.usos" class="btn-icono peligro" title="Eliminar" @click="eliminar(p)">🗑️</button>
        </div>
      </article>
    </div>

    <!-- ================= MODALES ================= -->
    <div v-if="modal" class="fondo" @click.self="cerrarModal">

      <!-- Crear / editar -->
      <div v-if="modal.tipo === 'promocion'" class="modal ancho">
        <div class="modal-cab">
          <h3>{{ modal.f.id ? 'Editar promoción' : 'Nueva promoción' }}</h3>
          <p>Editar no reescribe las boletas ya emitidas: rige de aquí en adelante.</p>
        </div>

        <div class="modal-cuerpo">
          <div v-if="modal.f.error" class="error">{{ modal.f.error }}</div>

          <div class="grupo">
            <label for="p-nombre">Nombre</label>
            <input id="p-nombre" class="campo" v-model="modal.f.nombre" maxlength="160"
              placeholder="Martes de peonías">
          </div>

          <div class="grupo">
            <label for="p-desc">Descripción</label>
            <input id="p-desc" class="campo" v-model="modal.f.descripcion" maxlength="400"
              placeholder="10% en compras sobre $20.000">
            <p class="ayuda">Es lo que lee el cliente. Escríbelo como se lo dirías en el mesón.</p>
          </div>

          <div class="rejilla grupo">
            <div>
              <label>Tipo de descuento</label>
              <div class="segmentado ancho-total">
                <button v-for="t in TIPOS" :key="t.valor" :class="{ on: modal.f.tipo === t.valor }"
                  @click="modal.f.tipo = t.valor">{{ t.texto }}</button>
              </div>
            </div>
            <div>
              <label for="p-valor">
                Valor {{ modal.f.tipo === 'porcentaje' ? '(%)' : '(pesos)' }}
              </label>
              <input id="p-valor" class="campo dato" type="number" min="1"
                :max="modal.f.tipo === 'porcentaje' ? 100 : null"
                :step="modal.f.tipo === 'porcentaje' ? 1 : 500"
                v-model.number="modal.f.valor">
            </div>
          </div>

          <div class="grupo">
            <label>¿Sobre qué aplica?</label>
            <div class="opciones">
              <button v-for="a in ALCANCES" :key="a.valor" type="button" class="opcion"
                :class="{ on: modal.f.alcance === a.valor }" @click="elegirAlcance(a.valor)">
                <b>{{ a.texto }}</b>
                <span>{{ a.ayuda }}</span>
              </button>
            </div>
          </div>

          <div v-if="modal.f.alcance === 'categoria'" class="grupo">
            <label for="p-cat">Categoría</label>
            <select id="p-cat" class="campo" v-model.number="modal.f.categoriaId">
              <option :value="null">Selecciona…</option>
              <option v-for="c in categorias" :key="c.id" :value="c.id">{{ c.nombre }}</option>
            </select>
          </div>

          <div v-if="modal.f.alcance === 'producto'" class="grupo">
            <label for="p-prod">Producto</label>
            <select id="p-prod" class="campo" v-model.number="modal.f.productoId">
              <option :value="null">Selecciona…</option>
              <option v-for="p in productos" :key="p.id" :value="p.id">
                {{ p.emoji }} {{ p.nombre }} — {{ clp(p.precio) }}
              </option>
            </select>
          </div>

          <div class="grupo">
            <label for="p-min">Compra mínima</label>
            <input id="p-min" class="campo dato" type="number" min="0" step="1000"
              v-model.number="modal.f.minimo">
            <!--
              El mínimo mira el total de la boleta aunque el descuento sea
              por categoría. Es lo que entiende el cliente cuando lee "en
              compras sobre $20.000", y conviene que la interfaz lo diga.
            -->
            <p class="ayuda">
              Se mide sobre el <b>total de la boleta</b>, aunque el descuento
              aplique solo a una categoría. Cero significa sin mínimo.
            </p>
          </div>

          <div class="grupo">
            <label>Días en que corre</label>
            <div class="dias">
              <button v-for="d in DIAS" :key="d.valor" type="button" class="dia"
                :class="{ on: modal.f.dias.includes(d.valor) }" @click="alternarDia(d.valor)">
                {{ d.texto }}
              </button>
            </div>
            <p class="ayuda">
              {{ modal.f.dias.length ? 'Solo los días marcados.' : 'Sin marcar ninguno: corre todos los días.' }}
            </p>
          </div>

          <div class="rejilla grupo">
            <div>
              <label for="p-desde">Vigente desde</label>
              <input id="p-desde" class="campo dato" type="date" v-model="modal.f.desde">
            </div>
            <div>
              <label for="p-hasta">Vigente hasta</label>
              <input id="p-hasta" class="campo dato" type="date" v-model="modal.f.hasta">
            </div>
          </div>
          <p class="ayuda separado">Sin fechas, corre indefinidamente.</p>

          <!-- ================= SIMULACIÓN ================= -->
          <div class="simulador">
            <div class="sim-cab">
              <div class="min0">
                <b>Probarla contra ventas reales</b>
                <p class="ayuda">
                  Usa exactamente la misma regla que el cobro, así que lo que
                  muestra es lo que va a pasar. No guarda nada.
                </p>
              </div>
              <button class="btn btn-linea btn-mini" :disabled="simulando" @click="simular">
                <span v-if="simulando" class="spinner oscuro" aria-hidden="true"></span>
                {{ simulando ? 'Calculando…' : 'Simular' }}
              </button>
            </div>

            <div class="rejilla">
              <label class="rango">
                <span class="mini suave">Ventas desde</span>
                <input class="campo dato" type="date" v-model="modal.f.periodoDesde">
              </label>
              <label class="rango">
                <span class="mini suave">Ventas hasta</span>
                <input class="campo dato" type="date" v-model="modal.f.periodoHasta">
              </label>
            </div>

            <div v-if="simulacion" class="sim-resultado">
              <div v-if="!simulacion.boletasQueAplican" class="nota alerta">
                En ese período no habría aplicado a ninguna boleta. Revisa el
                mínimo, los días o el alcance.
              </div>

              <template v-else>
                <div class="sim-cifras">
                  <div>
                    <span>Boletas alcanzadas</span>
                    <b class="dato">
                      {{ simulacion.boletasQueAplican }} de {{ simulacion.boletasEvaluadas }}
                    </b>
                    <em class="mini">{{ Number(simulacion.porcentajeCobertura).toFixed(0) }}% de cobertura</em>
                  </div>
                  <div>
                    <span>Habría descontado</span>
                    <b class="dato rojo">{{ clp(simulacion.descuentoTotal) }}</b>
                    <em class="mini">{{ clp(simulacion.descuentoPromedio) }} por boleta</em>
                  </div>
                  <div>
                    <span>Impacto sobre ventas</span>
                    <b class="dato" :class="{ rojo: simulacion.impactoSobreVentas > 5 }">
                      {{ Number(simulacion.impactoSobreVentas).toFixed(2) }}%
                    </b>
                    <em class="mini">del total del período</em>
                  </div>
                </div>

                <div v-if="simulacion.impactoSobreVentas > 5" class="nota alerta">
                  Se estaría yendo más del 5% de la venta en esta sola promoción.
                  Revisa que el margen de los productos alcanzados lo soporte.
                </div>

                <div v-if="simulacion.ejemplos.length" class="ejemplos">
                  <h4>Donde más habría descontado</h4>
                  <ul class="lista">
                    <li v-for="e in simulacion.ejemplos" :key="e.folio">
                      <span class="mini">{{ e.folio }} · {{ fecha(e.fecha) }}</span>
                      <span class="dato mini">
                        {{ clp(e.bruto) }} → <b>{{ clp(e.totalConPromocion) }}</b>
                        <em class="rojo">−{{ clp(e.descuentoSimulado) }}</em>
                      </span>
                    </li>
                  </ul>
                </div>
              </template>
            </div>
          </div>
        </div>

        <div class="modal-pie">
          <button class="btn btn-linea" @click="cerrarModal">Cancelar</button>
          <button class="btn" :disabled="guardando" @click="guardar">
            <span v-if="guardando" class="spinner" aria-hidden="true"></span>
            {{ guardando ? 'Guardando…' : 'Guardar' }}
          </button>
        </div>
      </div>

      <!-- Detalle -->
      <div v-else-if="modal.tipo === 'detalle'" class="modal">
        <div class="modal-cab">
          <h3>{{ modal.f.promocion.nombre }}</h3>
          <p>{{ valorLegible(modal.f.promocion) }} · {{ textoAlcance(modal.f.promocion.alcance) }}</p>
        </div>
        <div class="modal-cuerpo">
          <div v-if="!detalle" class="suave mini">Cargando detalle…</div>

          <template v-else>
            <div class="sim-cifras">
              <div>
                <span>Usos</span>
                <b class="dato">{{ detalle.usos }}</b>
              </div>
              <div>
                <span>Descontado</span>
                <b class="dato">{{ clp(detalle.descuentoAcumulado) }}</b>
                <em class="mini">{{ clp(detalle.descuentoPromedio) }} por boleta</em>
              </div>
              <div>
                <span>Venta asociada</span>
                <b class="dato">{{ clp(detalle.ventaAsociada) }}</b>
              </div>
            </div>

            <!--
              El punto de venta ofrece la más conveniente, así que si dos se
              pisan, la peor no se usa nunca. Verlo evita mantener viva una
              promoción que en la práctica no existe.
            -->
            <div v-if="detalle.conflictos.length" class="conflictos">
              <h4>Se pisa con</h4>
              <ul class="lista">
                <li v-for="c in detalle.conflictos" :key="c.promocionId">
                  <div class="min0">
                    <b>{{ c.nombre }}</b>
                    <div class="mini suave">{{ c.detalle }}</div>
                  </div>
                  <span class="chip">{{ c.tipo === 'porcentaje' ? `${c.valor}%` : clp(c.valor) }}</span>
                </li>
              </ul>
              <p class="ayuda">
                El punto de venta aplica la más conveniente para el cliente, así
                que la menos generosa no llega a usarse.
              </p>
            </div>

            <div v-else class="nota">
              No se pisa con ninguna otra promoción.
            </div>
          </template>
        </div>
        <div class="modal-pie">
          <button class="btn btn-linea" @click="cerrarModal">Cerrar</button>
          <button class="btn" @click="abrirEdicion(modal.f.promocion)">Editar</button>
        </div>
      </div>
    </div>

    <div v-if="aviso" class="aviso" :class="{ malo: aviso.malo }" role="status">{{ aviso.texto }}</div>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useStore } from 'vuex'
import { useTemporizadores } from '@/shared/composables/useTemporizadores'
import {
  TIPOS, ALCANCES, DIAS, textoAlcance, valorLegible
} from '@/features/promociones/store/promociones.module'
import { haceDias, hoy } from '@/core/utils/fechas'

export default {
  name: 'PromocionesView',
  components: {  },

  setup () {
    const store = useStore()
    const { usarResalte, usarAviso } = useTemporizadores()

    const esAdmin = computed(() => store.getters['auth/esAdmin'])

    /* ---------------- Datos ---------------- */
    const promociones = computed(() => store.getters['promociones/promociones'])
    const filtro = computed(() => store.getters['promociones/filtro'])
    const cargando = computed(() => store.getters['promociones/cargando'])
    const guardando = computed(() => store.getters['promociones/guardando'])
    const simulando = computed(() => store.getters['promociones/simulando'])
    const simulacion = computed(() => store.getters['promociones/simulacion'])
    const error = computed(() => store.getters['promociones/error'])
    const activasNoVigentes = computed(() => store.getters['promociones/activasNoVigentes'])

    const categorias = computed(() => store.getters['inventario/categorias'])
    const productos = computed(() =>
      store.getters['productos/productos'].filter(p => p.activo)
    )

    const hayFiltro = computed(() =>
      !!filtro.value.buscar || !!filtro.value.alcance ||
      filtro.value.soloVigentes || filtro.value.activa === null
    )

    /* ---------------- Carga ---------------- */
    let control = null

    onMounted(() => {
      control = new AbortController()
      const señal = { signal: control.signal }
      store.dispatch('promociones/cargar', señal)
      store.dispatch('inventario/cargarCategorias', señal)
      if (!store.getters['productos/productos'].length) {
        store.dispatch('productos/cargar', señal)
      }
    })

    onUnmounted(() => control?.abort())

    const recargar = () => store.dispatch('promociones/cargar')
    const filtrar = (cambios) => store.dispatch('promociones/filtrar', cambios)

    const busqueda = ref(filtro.value.buscar || '')
    let tmr = null
    watch(busqueda, (v) => {
      clearTimeout(tmr)
      tmr = setTimeout(() => filtrar({ buscar: v.trim() }), 350)
    })
    onUnmounted(() => clearTimeout(tmr))

    /* ---------------- Modales ---------------- */
    const modal = ref(null)
    const detalle = ref(null)
    const resalte = usarResalte()
    const { aviso, avisar } = usarAviso()

    const cerrarModal = () => {
      modal.value = null
      detalle.value = null
      store.dispatch('promociones/limpiarSimulacion')
    }

    const fichaVacia = () => ({
      id: null,
      nombre: '', descripcion: '',
      tipo: 'porcentaje', valor: 10,
      alcance: 'boleta', categoriaId: null, productoId: null,
      minimo: 0, desde: '', hasta: '', dias: [],
      /* El período de simulación no es parte de la promoción: es contra qué
         ventas pasadas se la quiere medir. */
      periodoDesde: haceDias(30), periodoHasta: hoy(),
      error: ''
    })

    const abrirNueva = () => {
      store.dispatch('promociones/limpiarSimulacion')
      modal.value = { tipo: 'promocion', f: fichaVacia() }
    }

    const abrirEdicion = (p) => {
      store.dispatch('promociones/limpiarSimulacion')
      modal.value = {
        tipo: 'promocion',
        f: {
          ...fichaVacia(),
          id: p.id,
          nombre: p.nombre || '',
          descripcion: p.descripcion || '',
          tipo: p.tipo,
          valor: p.valor,
          alcance: p.alcance,
          categoriaId: p.categoriaId ?? null,
          productoId: p.productoId ?? null,
          minimo: p.minimo || 0,
          desde: p.desde || '',
          hasta: p.hasta || '',
          dias: [...(p.dias || [])]
        }
      }
    }

    const abrirDetalle = async (p) => {
      modal.value = { tipo: 'detalle', f: { promocion: p } }
      detalle.value = await store.dispatch('promociones/cargarDetalle', { id: p.id, forzar: true })
    }

    /* ---------------- Formulario ---------------- */
    const elegirAlcance = (alcance) => {
      const f = modal.value.f
      f.alcance = alcance
      /* Cambiar de alcance deja huérfano el id anterior, y el backend
         rechazaría un categoriaId con alcance producto. */
      if (alcance !== 'categoria') f.categoriaId = null
      if (alcance !== 'producto') f.productoId = null
    }

    const alternarDia = (valor) => {
      const dias = modal.value.f.dias
      const i = dias.indexOf(valor)
      if (i === -1) dias.push(valor)
      else dias.splice(i, 1)
      dias.sort((a, b) => a - b)
    }

    /* Lo que viaja al backend, sin los campos que son solo de la vista. */
    const aPeticion = () => {
      const f = modal.value.f
      return {
        nombre: f.nombre.trim(),
        descripcion: (f.descripcion || '').trim() || null,
        tipo: f.tipo,
        valor: Math.round(f.valor || 0),
        alcance: f.alcance,
        categoriaId: f.alcance === 'categoria' ? f.categoriaId : null,
        productoId: f.alcance === 'producto' ? f.productoId : null,
        minimo: Math.round(f.minimo || 0),
        desde: f.desde || null,
        hasta: f.hasta || null,
        dias: [...f.dias]
      }
    }

    const validar = () => {
      const f = modal.value.f
      if (f.nombre.trim().length < 3) return 'El nombre debe tener al menos 3 caracteres.'
      if (!f.valor || f.valor < 1) return 'El valor debe ser mayor que cero.'
      if (f.tipo === 'porcentaje' && f.valor > 100) return 'Un porcentaje no puede pasar de 100.'
      if (f.alcance === 'categoria' && !f.categoriaId) return 'Elige la categoría.'
      if (f.alcance === 'producto' && !f.productoId) return 'Elige el producto.'
      if (f.desde && f.hasta && f.desde > f.hasta) {
        return 'La fecha de término es anterior a la de inicio.'
      }
      return ''
    }

    /* ---------------- Acciones ---------------- */
    const simular = async () => {
      const f = modal.value.f
      f.error = validar()
      if (f.error) return

      try {
        await store.dispatch('promociones/simular', {
          promocion: aPeticion(),
          periodoDesde: f.periodoDesde || null,
          periodoHasta: f.periodoHasta || null
        })
      } catch (e) {
        f.error = e.message
      }
    }

    const guardar = async () => {
      const f = modal.value.f
      f.error = validar()
      if (f.error) return

      try {
        const promo = f.id
          ? await store.dispatch('promociones/actualizar', { id: f.id, ...aPeticion() })
          : await store.dispatch('promociones/crear', aPeticion())

        cerrarModal()
        /* Si el backend detectó que se pisa con otras, avisarlo acá: en la
           lista no se ve, y una promoción que nunca se aplica es peor que
           ninguna. */
        avisar(promo.conflictos?.length
          ? `«${promo.nombre}» guardada · se pisa con ${promo.conflictos.length} más`
          : `«${promo.nombre}» guardada`)
        resalte.marcar(promo.id)
      } catch (e) {
        f.error = e.message
      }
    }

    const cambiarEstado = async (p, activa) => {
      try {
        await store.dispatch('promociones/cambiarEstado', { id: p.id, activa })
        avisar(`«${p.nombre}» ${activa ? 'activada' : 'desactivada'}`)
        resalte.marcar(p.id)
      } catch (e) {
        avisar(e.message, true)
      }
    }

    const eliminar = async (p) => {
      try {
        await store.dispatch('promociones/eliminar', p.id)
        avisar('Promoción eliminada')
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
      day: '2-digit', month: '2-digit', year: '2-digit'
    })
    const fecha = (v) => (v ? fmtFecha.format(new Date(v)) : '—')

    return {
      TIPOS, ALCANCES, DIAS, Math, Number, textoAlcance, valorLegible,
      esAdmin,
      promociones, filtro, cargando, guardando, simulando, simulacion, error,
      activasNoVigentes, categorias, productos, hayFiltro,
      recargar, filtrar, busqueda,
      modal, detalle, cerrarModal, abrirNueva, abrirEdicion, abrirDetalle,
      elegirAlcance, alternarDia, simular, guardar, cambiarEstado, eliminar,
      resalte, aviso, clp, fecha
    }
  }
}
</script>

<style scoped>
.cabecera,
.cabecera *,
.tarjetas *,
.fondo * {
  box-sizing: border-box;
}

@keyframes entra {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: none; }
}

.al-entrar {
  animation: entra 380ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
  animation-delay: calc(var(--i, 0) * 45ms);
}

@keyframes resalta {
  0% { border-color: #059669; box-shadow: 0 0 0 3px #d1fae5; }
  100% { border-color: #e2e8f0; box-shadow: none; }
}

.tarjeta.resaltada { animation: resalta 1400ms ease-out; }

.spinner {
  display: inline-block;
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: girar 0.8s linear infinite;
}

.spinner.oscuro {
  border-color: rgba(71, 85, 105, 0.25);
  border-top-color: #475569;
}

@keyframes girar { to { transform: rotate(360deg); } }

/* ---------- Encabezado ---------- */
.cabecera {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}

.cabecera h2 {
  margin: 0;
  font-size: clamp(1.25rem, 4.5vw, 1.5rem);
  color: #0f172a;
}

.pista {
  margin: 4px 0 0;
  font-size: 0.875rem;
  color: #64748b;
  max-width: 62ch;
  line-height: 1.5;
}

.banda {
  display: flex;
  align-items: center;
  gap: 11px;
  flex-wrap: wrap;
  padding: 12px 16px;
  border-radius: 10px;
  margin-bottom: 16px;
  font-size: 0.875rem;
}

.banda-aviso {
  background: #fef3c7;
  border: 1px solid #fcd34d;
  color: #78350f;
}

.banda-error {
  background: #fee2e2;
  border: 1px solid #fca5a5;
  color: #991b1b;
}

.banda .btn { margin-left: auto; }

/* ---------- Filtros ---------- */
.barra-filtros {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.buscador {
  display: flex;
  align-items: center;
  gap: 9px;
  flex: 1 1 230px;
  min-width: 0;
  min-height: 44px;
  padding: 0 12px;
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 9px;
  transition: border-color 0.18s, box-shadow 0.18s;
}

.buscador:focus-within {
  border-color: transparent;
  box-shadow: 0 0 0 2px #10b981;
}

.buscador input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: none;
  font-family: inherit;
  font-size: max(0.9rem, 16px);
}

.campo {
  width: 100%;
  min-height: 44px;
  padding: 0.6rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  background: #fff;
  font-family: inherit;
  font-size: max(0.9rem, 16px);
  color: #0f172a;
  outline: none;
  transition: border-color 0.18s, box-shadow 0.18s;
}

.campo:focus {
  border-color: transparent;
  box-shadow: 0 0 0 2px #10b981;
}

.campo-corto { width: auto; flex: 0 1 200px; }

.check {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 0.85rem;
  color: #475569;
  cursor: pointer;
}

.check input {
  width: 17px;
  height: 17px;
  accent-color: #059669;
  cursor: pointer;
}

/* ---------- Tarjetas ---------- */
.tarjetas {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 14px;
}

.tarjeta {
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  transition: border-color 0.18s, box-shadow 0.18s;
}

.tarjeta:hover {
  border-color: #cbd5e1;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
}

.tarjeta.inactiva { opacity: 0.6; }
.tarjeta.vigente { border-color: #86efac; }

.tarjeta-cab {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 11px;
}

.tarjeta h3 {
  margin: 0;
  font-size: 1rem;
  color: #0f172a;
}

.descripcion {
  margin: 3px 0 0;
  font-size: 0.8rem;
  color: #64748b;
  line-height: 1.45;
}

.valor {
  font-size: 1.25rem;
  font-weight: 700;
  color: #059669;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.min0 { min-width: 0; }

.condiciones {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 11px;
}

.chip {
  padding: 3px 9px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #475569;
  font-size: 0.7rem;
  font-weight: 600;
  white-space: nowrap;
}

.estado {
  padding: 8px 11px;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  line-height: 1.4;
}

.estado.ok { background: #f0fdf4; color: #166534; }
.estado.dormida { background: #fffbeb; color: #78350f; }
.estado.apagada { background: #f1f5f9; color: #64748b; }

.uso {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: auto;
  padding-top: 12px;
}

.uso > div { display: flex; flex-direction: column; gap: 1px; }

.uso span {
  font-size: 0.63rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #94a3b8;
}

.uso b { font-size: 0.9rem; color: #0f172a; }

.acciones {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
  align-items: center;
  margin-top: 13px;
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
}

/* ---------- Botones ---------- */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 44px;
  padding: 0.65rem 1.15rem;
  border: none;
  border-radius: 0.5rem;
  background: #059669;
  color: #fff;
  font-family: inherit;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
  -webkit-tap-highlight-color: transparent;
}

.btn:hover:not(:disabled) { background: #047857; }
.btn:active:not(:disabled) { transform: scale(0.97); }
.btn:disabled { background: #a7c9bb; cursor: not-allowed; }

.btn-linea {
  background: transparent;
  border: 1px solid #cbd5e1;
  color: #475569;
}

.btn-linea:hover:not(:disabled) { background: #f8fafc; border-color: #94a3b8; }
.btn-linea:disabled { background: transparent; color: #94a3b8; }

.btn-mini {
  min-height: 34px;
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
}

.btn-icono {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid #e2e8f0;
  border-radius: 7px;
  background: #fff;
  color: #64748b;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}

.btn-icono:hover { border-color: #059669; color: #059669; }
.btn-icono.peligro:hover { border-color: #dc2626; color: #dc2626; }
.btn-icono.chico { width: 28px; height: 28px; }

/* ---------- Modales ---------- */
.fondo {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(15, 23, 42, 0.55);
}

.modal {
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  max-height: 90dvh;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
}

.modal.ancho { max-width: 680px; }

.modal-cab {
  padding: 18px 20px 14px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-cab h3 { margin: 0; font-size: 1.15rem; color: #0f172a; }
.modal-cab p { margin: 4px 0 0; font-size: 0.82rem; color: #64748b; }

.modal-cuerpo { padding: 18px 20px; overflow-y: auto; }

.modal-pie {
  display: flex;
  gap: 9px;
  justify-content: flex-end;
  flex-wrap: wrap;
  padding: 14px 20px;
  border-top: 1px solid #e2e8f0;
}

label {
  display: block;
  margin-bottom: 5px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #475569;
}

.grupo { margin-bottom: 15px; }

.rejilla {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 13px;
}

.rango { display: flex; flex-direction: column; gap: 3px; }

.ayuda {
  margin: 5px 0 0;
  font-size: 0.75rem;
  color: #94a3b8;
  line-height: 1.5;
  text-transform: none;
  letter-spacing: 0;
  font-weight: 400;
}

.ayuda.separado { margin-bottom: 16px; }

.error {
  padding: 10px 13px;
  margin-bottom: 14px;
  border-radius: 8px;
  border-left: 4px solid #dc2626;
  background: #fee2e2;
  color: #991b1b;
  font-size: 0.85rem;
}

.nota {
  padding: 11px 13px;
  margin: 12px 0 0;
  border-radius: 0 8px 8px 0;
  border-left: 3px solid #10b981;
  background: #f0fdf4;
  font-size: 0.83rem;
  color: #475569;
  line-height: 1.6;
}

.nota.alerta {
  border-color: #f59e0b;
  background: #fffbeb;
  color: #78350f;
}

.segmentado {
  display: inline-flex;
  background: #f1f5f9;
  border-radius: 9px;
  padding: 3px;
  gap: 3px;
}

.segmentado.ancho-total { display: flex; width: 100%; }

.segmentado button {
  flex: 1;
  min-height: 38px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: #475569;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.18s, color 0.18s, box-shadow 0.18s;
}

.segmentado button.on {
  background: #fff;
  color: #047857;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.opciones { display: flex; flex-direction: column; gap: 8px; }

.opcion {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 11px 13px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.15s, background-color 0.15s;
}

.opcion b { font-size: 0.88rem; color: #0f172a; }
.opcion span { font-size: 0.75rem; color: #64748b; line-height: 1.45; }
.opcion.on { border-color: #059669; background: #f0fdf4; }

/* ---------- Días ---------- */
.dias {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.dia {
  min-width: 46px;
  min-height: 40px;
  padding: 0 10px;
  border: 1.5px solid #e2e8f0;
  border-radius: 9px;
  background: #fff;
  color: #475569;
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s, color 0.15s;
}

.dia:hover { border-color: #94a3b8; }

.dia.on {
  border-color: #059669;
  background: #059669;
  color: #fff;
}

/* ---------- Simulador ---------- */
.simulador {
  margin-top: 20px;
  padding: 15px;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
  background: #f8fafc;
}

.sim-cab {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 13px;
}

.sim-cab b { color: #0f172a; font-size: 0.92rem; }
.sim-cab .ayuda { margin-top: 3px; }

.sim-resultado { margin-top: 15px; }

.sim-cifras {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.sim-cifras > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 11px 12px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 9px;
}

.sim-cifras span {
  font-size: 0.63rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #94a3b8;
}

.sim-cifras b { font-size: 1.1rem; color: #0f172a; }
.sim-cifras em { font-style: normal; color: #94a3b8; }

.ejemplos { margin-top: 14px; }

.ejemplos h4,
.conflictos h4 {
  margin: 0 0 8px;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #64748b;
}

.conflictos { margin-top: 18px; }

.lista {
  list-style: none;
  margin: 0;
  padding: 0;
}

.lista li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 7px 0;
  border-bottom: 1px dotted #e2e8f0;
  font-size: 0.82rem;
}

.lista li:last-child { border-bottom: 0; }
.lista li b { color: #0f172a; }
.lista li em { font-style: normal; margin-left: 6px; }

/* ---------- Varios ---------- */
.dato { font-variant-numeric: tabular-nums; font-weight: 600; }
.mini { font-size: 0.76rem; }
.suave { color: #64748b; }
.rojo { color: #dc2626; }

.vacio {
  text-align: center;
  padding: 44px 20px;
  color: #64748b;
  background: #fff;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
}

.vacio strong {
  display: block;
  color: #0f172a;
  font-size: 1.05rem;
  margin-bottom: 5px;
}

.aviso {
  position: fixed;
  bottom: 22px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 80;
  max-width: 90vw;
  padding: 12px 20px;
  border-radius: 10px;
  background: #064e3b;
  color: #fff;
  font-size: 0.875rem;
  font-weight: 600;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.28);
  text-align: center;
}

.aviso.malo { background: #b91c1c; }

@media (max-width: 640px) {
  .tarjetas { grid-template-columns: 1fr; }
  .sim-cab { flex-direction: column; }
  .campo-corto { flex: 1 1 100%; width: 100%; }
}

@media (prefers-reduced-motion: reduce) {
  .btn, .btn-icono, .campo, .buscador, .tarjeta,
  .opcion, .dia, .segmentado button { transition: none; }

  .al-entrar, .tarjeta.resaltada, .spinner { animation: none; }
}
</style>