<template>
  
    <div class="cabecera al-entrar">
      <div class="titulo">
        <h2>Clientes y club de puntos</h2>
        <p class="pista">
          1 punto por cada {{ clp(puntosPorPeso) }} de compra.
          Cada punto vale {{ clp(valorPunto) }} al canjear, desde {{ canjeMinimo }} puntos.
        </p>
      </div>
      <button v-if="puedeEditar" class="btn btn-crear" @click="abrirNuevo">
        <svg class="ico" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Registrar cliente
      </button>
    </div>

    <!-- ================= ESQUELETO ================= -->
    <div v-if="esqueleto.visible" aria-hidden="true">
      <div class="kpis">
        <div v-for="n in 4" :key="'k' + n" class="kpi">
          <EsqueletoBloque alto="10px" ancho="58%" />
          <EsqueletoBloque alto="26px" ancho="70%" class="sep-9" />
          <EsqueletoBloque alto="10px" ancho="64%" class="sep-8" />
        </div>
      </div>

      <div class="barra-filtros">
        <EsqueletoBloque alto="46px" ancho="100%" radio="10px" />
      </div>

      <div class="esq-tabla">
        <div v-for="n in 5" :key="'r' + n" class="esq-fila">
          <EsqueletoBloque alto="44px" ancho="44px" radio="999px" />
          <div class="esq-col">
            <EsqueletoBloque alto="14px" ancho="160px" />
            <EsqueletoBloque alto="10px" ancho="86px" class="sep-6" />
          </div>
          <EsqueletoBloque alto="22px" ancho="70px" radio="999px" />
        </div>
      </div>
    </div>

    <template v-else>

      <!-- ---------- Indicadores ---------- -->
      <div class="kpis">
        <div class="kpi destacado al-entrar" style="--i: 1">
          <div class="rot">Clientes en el club</div>
          <div class="val" :class="{ destella: dTotal.activo }">{{ total }}</div>
          <div class="pie">{{ conCompras }} han comprado alguna vez</div>
        </div>
        <div class="kpi al-entrar" style="--i: 2">
          <div class="rot">Puntos en circulación</div>
          <div class="val" :class="{ destella: dPuntos.activo }">
            <span v-if="parcial" class="aprox">≥</span>{{ puntosEnCirculacion.toLocaleString('es-CL') }}
          </div>
          <div class="pie">Equivalen a {{ clp(pasivoPuntos) }}</div>
        </div>
        <div class="kpi al-entrar" style="--i: 3" :class="{ resaltado: alejados.length }">
          <div class="rot">Sin comprar 60+ días</div>
          <div class="val">{{ alejados.length }}</div>
          <div class="pie">{{ alejados.length ? 'A estos vale la pena llamar' : 'Nadie se ha alejado' }}</div>
        </div>
        <div class="kpi al-entrar" style="--i: 4" :class="{ resaltado: cumpleanos.length }">
          <div class="rot">Cumpleaños del mes</div>
          <div class="val">{{ cumpleanos.length }}</div>
          <div class="pie">{{ cumpleanos.length ? 'Oportunidad de campaña' : 'Ninguno este mes' }}</div>
        </div>
      </div>

      <Transition name="desliza">
        <div v-if="proximosCumples.length" class="banda banda-ok">
          <span class="torta" aria-hidden="true">🎂</span>
          <span>
            Cumplen pronto:
            <b>{{ proximosCumples.map(c => `${c.nombre} (${c.dia}/${c.mes})`).join(', ') }}</b>
          </span>
        </div>
      </Transition>

      <!-- ---------- Filtros ---------- -->
      <div class="barra-filtros al-entrar" style="--i: 5">
        <div class="buscador">
          <svg class="ico lupa" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input v-model="busqueda" placeholder="Nombre, RUT, teléfono o correo…" aria-label="Buscar cliente">
          <Transition name="brote">
            <button v-if="busqueda" class="btn-limpiar" @click="busqueda = ''" aria-label="Limpiar búsqueda">
              <svg class="ico" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </Transition>
        </div>

        <select v-model="orden" class="campo campo-corto" aria-label="Ordenar">
          <option value="nombre">Por nombre</option>
          <option value="puntos">Por puntos</option>
          <option value="gasto">Por total gastado</option>
          <option value="alejados">Por tiempo sin comprar</option>
        </select>

        <div class="checks">
          <label class="check">
            <input type="checkbox" :checked="filtro.activo === null" @change="alternarInactivos">
            <span>Ver desactivados</span>
          </label>

          <label class="check">
            <input type="checkbox" :checked="filtro.conPuntos"
              @change="filtrar({ conPuntos: $event.target.checked })">
            <span>Solo con puntos</span>
          </label>
        </div>
      </div>

      <!-- ---------- Tabla ---------- -->
      <Transition name="cambio" mode="out-in">
        <div v-if="errorCarga" key="error" class="error suelto">
          {{ errorCarga }}
          <button class="btn btn-linea btn-mini" @click="recargar">Reintentar</button>
        </div>

        <div v-else-if="!lista.length" key="vacio" class="vacio">
          <strong>{{ hayFiltro ? 'Ningún cliente coincide' : 'Sin clientes en el club' }}</strong>
          {{ hayFiltro
            ? 'Prueba con otro texto o quita los filtros.'
            : 'Registra a quien compra seguido para que acumule puntos.' }}
        </div>

        <div v-else key="tabla" class="panel" :class="{ atenuada: cargando }">
          <div class="tabla-envoltura">
            <table>
              <!-- El reparto se declara: con `auto` toda la holgura cae en la
                   primera columna y abre un hueco entre el nombre y el resto. -->
              <colgroup>
                <col class="c-cliente">
                <col class="c-contacto">
                <col class="c-compras">
                <col class="c-gastado">
                <col class="c-puntos">
                <col class="c-situacion">
                <col class="c-ficha">
              </colgroup>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Contacto</th>
                  <th>Compras</th>
                  <th>Gastado</th>
                  <th>Puntos</th>
                  <th>Situación</th>
                  <th>Ficha</th>
                </tr>
              </thead>

              <!--
                El :key ligado al orden remonta el cuerpo y vuelve a correr la
                entrada escalonada. Es la forma honesta de mostrar un reordenamiento
                en una tabla: el FLIP de TransitionGroup necesita position:absolute,
                y eso rompe el reparto de columnas.
              -->
              <tbody :key="orden" :class="{ escalonada: escalonar }">
                <template v-for="(c, idx) in lista" :key="c.id">
                  <tr class="clic fila" :style="{ '--i': Math.min(idx, 12), ...tono(c) }"
                    :class="{ inactiva: !c.activo, abierta: detalle === c.id, resaltada: c.id === resalte.id }"
                    @click="alternarDetalle(c.id)">

                    <td data-label="Cliente" class="celda-cliente">
                      <div class="persona">
                        <span class="avatar" aria-hidden="true">{{ iniciales(c.nombre) }}</span>
                        <span class="identidad">
                          <b>{{ c.nombre }}</b>
                          <span class="rut">{{ c.rut }}</span>
                        </span>
                      </div>
                    </td>

                    <td data-label="Teléfono">
                      <svg class="ico ico-dato" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M6 3h3l2 5-2.4 1.4a12 12 0 0 0 6 6L16 13l5 2v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4 5.2 2 2 0 0 1 6 3z" />
                      </svg>
                      <span class="valor">{{ c.telefono || '' }}</span>
                    </td>

                    <td data-label="Compras">
                      <svg class="ico ico-dato" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
                        <path d="M9.5 8.5h5M9.5 12.5h5" />
                      </svg>
                      <span class="valor dato">{{ c.compras }}</span>
                    </td>

                    <td data-label="Gastado">
                      <svg class="ico ico-dato" viewBox="0 0 24 24" aria-hidden="true">
                        <rect x="3" y="6" width="18" height="12" rx="2" />
                        <circle cx="12" cy="12" r="2.6" />
                      </svg>
                      <span class="valor dato">{{ clp(c.totalComprado) }}</span>
                    </td>

                    <td data-label="Puntos">
                      <svg class="ico ico-dato" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 4l2.3 4.9 5.2.7-3.8 3.7 1 5.3-4.7-2.6-4.7 2.6 1-5.3L4.5 9.6l5.2-.7z" />
                      </svg>
                      <span class="puntos">
                        <svg class="ico" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M12 4l2.3 4.9 5.2.7-3.8 3.7 1 5.3-4.7-2.6-4.7 2.6 1-5.3L4.5 9.6l5.2-.7z" />
                        </svg>{{ c.puntos }}
                      </span>
                    </td>

                    <td data-label="Situación">
                      <span class="situacion" :title="detalleSituacion(c)">
                        <svg v-if="situacion(c) === 'cumple'" class="ico" viewBox="0 0 24 24" aria-hidden="true">
                          <rect x="4" y="10" width="16" height="10" rx="2" />
                          <path d="M12 10V7M9.5 7a2.5 2.5 0 1 1 5 0" />
                        </svg>
                        <svg v-else-if="situacion(c) === 'alejado'" class="ico" viewBox="0 0 24 24"
                          aria-hidden="true">
                          <circle cx="12" cy="12" r="9" />
                          <path d="M12 7.2v5l3 1.8" />
                        </svg>
                        <svg v-else-if="situacion(c) === 'desactivado'" class="ico" viewBox="0 0 24 24"
                          aria-hidden="true">
                          <circle cx="12" cy="12" r="9" />
                          <path d="M6 6l12 12" />
                        </svg>
                        <svg v-else class="ico" viewBox="0 0 24 24" aria-hidden="true">
                          <circle cx="12" cy="12" r="9" />
                          <path d="M8.4 12.4l2.4 2.4 4.8-5.2" />
                        </svg>
                        {{ textoSituacion(c) }}
                      </span>
                    </td>

                    <td class="celda-ficha">
                      <span class="btn-ficha" :aria-expanded="detalle === c.id ? 'true' : 'false'">
                        <span class="texto-accion">{{ detalle === c.id ? 'Ocultar ficha' : 'Ver ficha' }}</span>
                        <svg class="ico flecha" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M6 9.5l6 6 6-6" />
                        </svg>
                      </span>
                    </td>
                  </tr>

                  <!-- Ficha: acordeón con grid 0fr → 1fr -->
                  <Transition name="acordeon">
                    <tr v-if="detalle === c.id" class="fila-detalle" :style="tono(c)">
                      <td colspan="7">
                        <div class="acordeon-caja">
                          <div class="acordeon-interior">
                            <div class="detalle">

                              <div v-if="cargandoDetalle === c.id" class="suave cargando-ficha">
                                Cargando ficha…
                              </div>

                              <template v-else>
                                <div class="detalle-cols">
                                  <div class="escalon" style="--i: 0">
                                    <h4>Ficha</h4>
                                    <dl class="ficha">
                                      <div>
                                        <dt>Teléfono</dt>
                                        <dd>{{ c.telefono || '—' }}</dd>
                                      </div>
                                      <div>
                                        <dt>Correo</dt>
                                        <dd>{{ c.correo || '—' }}</dd>
                                      </div>
                                      <div>
                                        <dt>Dirección</dt>
                                        <dd>{{ c.direccion || '—' }}</dd>
                                      </div>
                                      <div>
                                        <dt>Cumpleaños</dt>
                                        <dd>{{ c.cumpleanos || '—' }}</dd>
                                      </div>
                                      <div>
                                        <dt>Cliente desde</dt>
                                        <dd>{{ fechaCorta(c.creadoEn) }}</dd>
                                      </div>
                                      <div>
                                        <dt>Última compra</dt>
                                        <dd>{{ detalleSituacion(c) }}</dd>
                                      </div>
                                      <div>
                                        <dt>Puntos</dt>
                                        <dd>{{ c.puntos }} · vale {{ clp(c.valorPuntos) }}</dd>
                                      </div>
                                      <div v-if="ficha(c.id)">
                                        <dt>Ticket típico</dt>
                                        <dd>{{ clp(ficha(c.id).ticketPromedio) }}</dd>
                                      </div>
                                    </dl>
                                    <p v-if="c.notas" class="notas">“{{ c.notas }}”</p>
                                  </div>

                                  <div class="escalon" style="--i: 1">
                                    <h4>Últimas compras</h4>
                                    <div v-if="!compras(c.id).length" class="suave">
                                      Todavía no tiene compras registradas.
                                    </div>
                                    <ul v-else class="lineas">
                                      <li v-for="v in compras(c.id).slice(0, 8)" :key="v.ventaId"
                                        :class="{ anulada: v.anulada }">
                                        <span>{{ v.folio }} · {{ fechaCorta(v.fecha) }}</span>
                                        <b class="dato">{{ clp(v.total) }}</b>
                                      </li>
                                    </ul>
                                  </div>

                                  <div v-if="frecuentes(c.id).length" class="escalon" style="--i: 2">
                                    <h4>Lo que más compra</h4>
                                    <ul class="lineas">
                                      <li v-for="p in frecuentes(c.id)" :key="p.productoId">
                                        <span>{{ p.emoji }} {{ p.producto }}</span>
                                        <b class="dato">{{ p.veces }}×</b>
                                      </li>
                                    </ul>
                                  </div>

                                  <div v-if="movimientos(c.id).length" class="escalon" style="--i: 3">
                                    <h4>Libro de puntos</h4>
                                    <ul class="lineas">
                                      <li v-for="m in movimientos(c.id).slice(0, 8)" :key="m.id">
                                        <span class="corta">{{ m.motivo }}</span>
                                        <b class="dato" :class="m.cantidad >= 0 ? 'suma' : 'resta'">
                                          {{ m.cantidad > 0 ? '+' : '' }}{{ m.cantidad }}
                                        </b>
                                      </li>
                                    </ul>
                                  </div>
                                </div>

                                <div class="acciones-detalle escalon" style="--i: 4">
                                  <button v-if="puedeEditar" class="btn btn-linea" @click.stop="abrirEdicion(c)">
                                    <svg class="ico" viewBox="0 0 24 24" aria-hidden="true">
                                      <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3z" />
                                    </svg>
                                    Editar ficha
                                  </button>
                                  <button v-if="esAdmin" class="btn btn-linea" @click.stop="abrirPuntos(c)">
                                    <svg class="ico" viewBox="0 0 24 24" aria-hidden="true">
                                      <path
                                        d="M12 4l2.3 4.9 5.2.7-3.8 3.7 1 5.3-4.7-2.6-4.7 2.6 1-5.3L4.5 9.6l5.2-.7z" />
                                    </svg>
                                    Ajustar puntos
                                  </button>
                                  <button v-if="esAdmin && c.activo" class="btn btn-linea btn-baja"
                                    @click.stop="cambiarEstado(c, false)">
                                    <svg class="ico" viewBox="0 0 24 24" aria-hidden="true">
                                      <circle cx="12" cy="12" r="9" />
                                      <path d="M6 6l12 12" />
                                    </svg>
                                    Desactivar
                                  </button>
                                  <button v-if="esAdmin && !c.activo" class="btn btn-linea btn-alta"
                                    @click.stop="cambiarEstado(c, true)">
                                    <svg class="ico" viewBox="0 0 24 24" aria-hidden="true">
                                      <circle cx="12" cy="12" r="9" />
                                      <path d="M8.4 12.4l2.4 2.4 4.8-5.2" />
                                    </svg>
                                    Reactivar
                                  </button>
                                </div>
                              </template>

                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </Transition>
                </template>
              </tbody>
            </table>
          </div>
        </div>
      </Transition>

      <p v-if="parcial" class="suave pie-tabla">
        Mostrando {{ lista.length }} de {{ total }}. Afiná la búsqueda para ver el resto.
      </p>
    </template>

    <!-- ================= MODALES ================= -->
    <Transition name="modal">
      <div v-if="modal" class="fondo" @click.self="cerrarModal">
        <Transition name="cambio" mode="out-in">

          <!-- Ficha de cliente -->
          <div v-if="modal.tipo === 'cliente'" key="cliente" class="modal">
            <div class="modal-cab">
              <span class="agarre" aria-hidden="true"></span>
              <h3>{{ modal.f.id ? 'Editar cliente' : 'Registrar cliente' }}</h3>
              <p>Los puntos se acumulan solos con cada compra.</p>
            </div>

            <div class="modal-cuerpo">
              <Transition name="desliza">
                <div v-if="modal.f.error" class="error">{{ modal.f.error }}</div>
              </Transition>

              <div class="rejilla grupo">
                <div>
                  <label for="m-nombre">Nombre completo</label>
                  <input id="m-nombre" class="campo" v-model="modal.f.nombre" placeholder="Camila Rojas"
                    maxlength="160" autocomplete="name">
                </div>
                <div>
                  <label for="m-rut">RUT</label>
                  <input id="m-rut" class="campo dato" v-model="modal.f.rut" placeholder="12.345.678-9"
                    maxlength="20" inputmode="text" :class="{ 'campo-malo': mostrarErrorRut }" @blur="alSalirRut">
                  <Transition name="desliza">
                    <p v-if="mostrarErrorRut" class="ayuda mala">
                      Dígito verificador incorrecto{{ dvSugerido ? `: debería ser ${dvSugerido}` : '' }}.
                    </p>
                  </Transition>
                </div>
              </div>

              <div class="rejilla grupo">
                <div>
                  <label for="m-tel">Teléfono</label>
                  <input id="m-tel" class="campo dato" v-model="modal.f.telefono" placeholder="+56 9 1234 5678"
                    maxlength="40" inputmode="tel" autocomplete="tel">
                </div>
                <div>
                  <label for="m-correo">Correo</label>
                  <input id="m-correo" class="campo" type="email" v-model="modal.f.correo" maxlength="160"
                    inputmode="email" autocapitalize="off" autocorrect="off" autocomplete="email">
                </div>
              </div>

              <div class="grupo">
                <label for="m-dir">Dirección de despacho</label>
                <input id="m-dir" class="campo" v-model="modal.f.direccion" placeholder="Calle 123, comuna"
                  maxlength="240">
              </div>

              <div class="grupo">
                <label>Cumpleaños</label>
                <div class="rejilla-2">
                  <select class="campo" v-model.number="modal.f.cumpleMes" aria-label="Mes">
                    <option :value="null">Mes</option>
                    <option v-for="(m, i) in MESES" :key="m" :value="i + 1">{{ m }}</option>
                  </select>
                  <select class="campo" v-model.number="modal.f.cumpleDia" :disabled="!modal.f.cumpleMes"
                    aria-label="Día">
                    <option :value="null">Día</option>
                    <option v-for="d in diasDelMes" :key="d" :value="d">{{ d }}</option>
                  </select>
                </div>
                <p class="ayuda">En una florería es el dato que más ventas genera.</p>
              </div>

              <div class="grupo">
                <label for="m-notas">Notas</label>
                <textarea id="m-notas" class="campo" v-model="modal.f.notas" maxlength="1000"
                  placeholder="Prefiere tonos pastel, compra para su madre cada mes…"></textarea>
              </div>
            </div>

            <div class="modal-pie">
              <button class="btn btn-linea" @click="cerrarModal">Cancelar</button>
              <button class="btn" :class="{ 'btn-ocupado': guardando }" :disabled="guardando"
                @click="guardarCliente">
                <span v-if="guardando" class="spinner" aria-hidden="true"></span>
                {{ guardando ? 'Guardando…' : 'Guardar' }}
              </button>
            </div>
          </div>

          <!-- Ajuste de puntos -->
          <div v-else-if="modal.tipo === 'puntos'" key="puntos" class="modal">
            <div class="modal-cab">
              <span class="agarre" aria-hidden="true"></span>
              <h3>Ajustar puntos</h3>
              <p>{{ modal.f.cliente.nombre }} tiene {{ modal.f.cliente.puntos }} puntos.</p>
            </div>
            <div class="modal-cuerpo">
              <Transition name="desliza">
                <div v-if="modal.f.error" class="error">{{ modal.f.error }}</div>
              </Transition>

              <label>Movimiento</label>
              <div class="segmentado">
                <button :class="{ on: modal.f.signo === 1 }" @click="modal.f.signo = 1">Sumar (+)</button>
                <button :class="{ on: modal.f.signo === -1 }" @click="modal.f.signo = -1">Restar (−)</button>
              </div>

              <div class="rejilla grupo separado">
                <div>
                  <label for="m-cant">Cantidad</label>
                  <input id="m-cant" class="campo dato" type="number" min="1" inputmode="numeric"
                    v-model.number="modal.f.cantidad">
                </div>
                <div>
                  <label for="m-motivo">Motivo</label>
                  <input id="m-motivo" class="campo" v-model="modal.f.motivo" maxlength="200"
                    placeholder="Compensación, error de carga…">
                </div>
              </div>

              <div class="nota" :class="{ alerta: puntosResultantes < 0 }">
                Quedará con
                <b class="dato" :class="{ destella: dResultado.activo }">{{ puntosResultantes }}</b> puntos
                ({{ clp(puntosResultantes * valorPunto) }}).
                <span v-if="puntosResultantes < 0"><br>No puede quedar con puntos negativos.</span>
              </div>
              <div class="nota alerta">
                Los puntos se mueven solos con las ventas. Esto es para corregir, y
                queda registrado con su motivo: un saldo que no cuadra tiene que
                poder explicarse seis meses después.
              </div>
            </div>
            <div class="modal-pie">
              <button class="btn btn-linea" @click="cerrarModal">Cancelar</button>
              <button class="btn" :class="{ 'btn-ocupado': guardando }" :disabled="guardando"
                @click="confirmarAjustePuntos">
                <span v-if="guardando" class="spinner" aria-hidden="true"></span>
                {{ guardando ? 'Aplicando…' : 'Aplicar ajuste' }}
              </button>
            </div>
          </div>

        </Transition>
      </div>
    </Transition>

    <Transition name="aviso">
      <div v-if="aviso" class="aviso" :class="{ malo: aviso.malo }" role="status">{{ aviso.texto }}</div>
    </Transition>
</template>

<script>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { useStore } from 'vuex'
import EsqueletoBloque from '@/shared/components/EsqueletoBloque.vue'
import { useTemporizadores } from '@/shared/composables/useTemporizadores'
import { rutValido, formatearRut, limpiarRut, digitoVerificador } from '@/core/utils/rut'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const DIAS_ALEJADO = 60

/*
 * Paleta por situación del cliente. Es el equivalente al color por rol de
 * Equipo y accesos: da color a la pantalla y además significa algo.
 * Si otra vista muestra la situación de un cliente, tiene que pintarla
 * igual — el lugar natural de esto es un módulo compartido.
 */
const TONOS = {
  activo: { linea: '#1D9E75', fondo: '#E1F5EE', texto: '#0F6E56', oscuro: '#04342C' },
  cumple: { linea: '#D4537E', fondo: '#FBEAF0', texto: '#993556', oscuro: '#4B1528' },
  alejado: { linea: '#BA7517', fondo: '#FAEEDA', texto: '#854F0B', oscuro: '#412402' },
  desactivado: { linea: '#888780', fondo: '#F1EFE8', texto: '#5F5E5A', oscuro: '#2C2C2A' }
}

export default {
  name: 'ClientesView',
  components: { EsqueletoBloque },

  setup() {
    const store = useStore()
    const { espera, usarDestello, usarResalte, usarAviso, usarEsqueleto } = useTemporizadores()

    /* ---------------- Permisos ----------------
     * Ver y editar fichas: política Caja (admin y vendedor), porque quien
     * atiende necesita registrar al cliente en el mesón.
     * Ajustar puntos y desactivar: solo admin. */
    const esAdmin = computed(() => store.getters['auth/esAdmin'])
    const puedeEditar = computed(() => store.getters['auth/tieneRol']('admin', 'vendedor'))

    /* ---------------- Reglas del club ----------------
     * Vienen de la configuración del servidor, no de constantes locales:
     * si no, cambiar el valor del punto en Configuración no se reflejaba acá. */
    const cfgClub = computed(() => store.getters['configuracion/club'] || {})
    const valorPunto = computed(() => cfgClub.value.valorPunto || 0)
    const puntosPorPeso = computed(() => cfgClub.value.puntosPorPeso || 0)
    const canjeMinimo = computed(() => cfgClub.value.canjeMinimo || 0)

    /* ---------------- Datos ---------------- */
    const lista = computed(() => store.getters['clientes/clientes'])
    const total = computed(() => store.getters['clientes/total'])
    const filtro = computed(() => store.getters['clientes/filtro'])
    const cargando = computed(() => store.getters['clientes/cargando'])
    const errorCarga = computed(() => store.getters['clientes/error'])
    const cumpleanos = computed(() => store.getters['clientes/cumpleanos'])
    const parcial = computed(() => store.getters['clientes/parcial'])
    const puntosEnCirculacion = computed(() => store.getters['clientes/puntosEnCirculacion'])
    const pasivoPuntos = computed(() => store.getters['clientes/pasivoPuntos'])
    const cargandoDetalle = computed(() => store.getters['clientes/cargandoDetalle'])

    const ficha = (id) => store.getters['clientes/detalleDe'](id)
    const compras = (id) => ficha(id)?.ultimasCompras || []
    const movimientos = (id) => ficha(id)?.movimientosPuntos || []
    const frecuentes = (id) => ficha(id)?.productosFrecuentes || []

    const conCompras = computed(() => lista.value.filter(c => c.compras > 0).length)
    const alejados = computed(() => lista.value.filter(c => c.diasSinComprar > DIAS_ALEJADO))

    /* diasFaltantes viene negativo si la fecha ya pasó: así se distingue a
       quién ya se saludó de a quién falta. */
    const proximosCumples = computed(() => cumpleanos.value.filter(c => c.diasFaltantes >= 0))

    /* ---------------- Carga ---------------- */
    const esqueleto = usarEsqueleto()
    const escalonar = ref(true)
    let control = null

    onMounted(async () => {
      control = new AbortController()
      const señal = { signal: control.signal }

      /* La configuración puede venir cacheada de otra pantalla; el módulo
         no repite la petición si ya está. */
      store.dispatch('configuracion/cargar', señal)
      store.dispatch('clientes/cargarCumpleanos', señal)

      await esqueleto.envolver(
        () => store.dispatch('clientes/cargar', señal),
        !lista.value.length
      )
      await espera(900)
      escalonar.value = false
    })

    onUnmounted(() => control?.abort())

    const recargar = () => store.dispatch('clientes/cargar')
    const filtrar = (cambios) => store.dispatch('clientes/filtrar', cambios)

    /* ---------------- Filtros ---------------- */
    /*
     * La búsqueda viaja al servidor: recorre nombre, RUT, teléfono y correo,
     * y normaliza el RUT (da lo mismo con puntos o sin ellos), cosa que un
     * filtro local no haría. Por eso lleva retraso: una petición por tecla
     * sería una petición de más por cada letra del apellido.
     */
    const busqueda = ref(filtro.value.buscar || '')
    let tmrBusqueda = null
    watch(busqueda, (v) => {
      clearTimeout(tmrBusqueda)
      tmrBusqueda = setTimeout(() => filtrar({ buscar: v.trim() }), 350)
    })
    onUnmounted(() => clearTimeout(tmrBusqueda))

    const alternarInactivos = (e) => filtrar({ activo: e.target.checked ? null : true })

    const hayFiltro = computed(() =>
      !!filtro.value.buscar || filtro.value.conPuntos || filtro.value.activo === null
    )

    /* El orden es local: ClienteFiltro no tiene parámetro de orden, y con
       porPagina en 100 la lista completa está en memoria. */
    const orden = ref('nombre')
    const detalle = ref(null)

    const ordenada = computed(() => {
      const copia = [...lista.value]
      if (orden.value === 'puntos') return copia.sort((a, b) => b.puntos - a.puntos)
      if (orden.value === 'gasto') return copia.sort((a, b) => b.totalComprado - a.totalComprado)
      if (orden.value === 'alejados') {
        return copia.sort((a, b) => (b.diasSinComprar ?? -1) - (a.diasSinComprar ?? -1))
      }
      return copia.sort((a, b) => a.nombre.localeCompare(b.nombre))
    })

    /* Cambiar el orden remonta el <tbody> (por el :key) y reproduce la
     * entrada escalonada. La ficha abierta se cierra: si no, quedaría
     * pegada a un cliente que ya se movió de lugar. */
    watch(orden, async () => {
      detalle.value = null
      escalonar.value = true
      await espera(900)
      escalonar.value = false
    })

    /* Si el cliente abierto sale del filtro, el acordeón queda huérfano */
    watch(ordenada, (nueva) => {
      if (detalle.value && !nueva.some(c => c.id === detalle.value)) detalle.value = null
    })

    const alternarDetalle = (id) => {
      if (detalle.value === id) {
        detalle.value = null
        return
      }
      detalle.value = id
      /* Cacheado por id: abrir y cerrar tres veces no pide lo mismo tres veces */
      store.dispatch('clientes/cargarDetalle', { id })
    }

    /* ---------------- Fechas ---------------- */
    const fmtFecha = new Intl.DateTimeFormat('es-CL', {
      weekday: 'short', day: 'numeric', month: 'short'
    })
    /* Se limpian puntos y comas: el formato de una sola pasada varía entre
       navegadores ("sáb., 1 de ago." vs "sáb, 1 ago"). */
    const fechaCorta = (valor) => (
      valor ? fmtFecha.format(new Date(valor)).replace(/\./g, '').replace(/,/g, '') : '—'
    )

    const cumpleHoy = (c) => {
      if (!c.cumpleMes || !c.cumpleDia) return false
      const hoy = new Date()
      return c.cumpleMes === hoy.getMonth() + 1 && c.cumpleDia === hoy.getDate()
    }

    /* ---------------- Situación y color ----------------
     * Un cliente está en una sola situación a la vez, y ese orden importa:
     * una cuenta desactivada no "cumple años" para efectos del mesón. */
    const situacion = (c) => {
      if (!c.activo) return 'desactivado'
      if (cumpleHoy(c)) return 'cumple'
      if (c.diasSinComprar > DIAS_ALEJADO) return 'alejado'
      return 'activo'
    }

    const textoSituacion = (c) => ({
      desactivado: 'Desactivado',
      cumple: 'Cumple hoy',
      alejado: 'Alejado',
      activo: 'Al día'
    })[situacion(c)]

    /* Frase larga para el title y para la ficha: en la tabla no cabe */
    const detalleSituacion = (c) => {
      if (c.diasSinComprar === null || c.diasSinComprar === undefined) return 'Sin compras todavía'
      if (c.diasSinComprar === 0) return 'Compró hoy'
      return `Hace ${c.diasSinComprar} días`
    }

    const tono = (c) => {
      const t = TONOS[situacion(c)]
      return {
        '--tono-linea': t.linea, '--tono-fondo': t.fondo,
        '--tono-texto': t.texto, '--tono-oscuro': t.oscuro
      }
    }

    const iniciales = (nombre) => String(nombre || '?')
      .trim().split(/\s+/).slice(0, 2)
      .map(p => p[0]).join('').toUpperCase()

    /* ---------------- Feedback ---------------- */
    const dTotal = usarDestello()
    const dPuntos = usarDestello()
    const dResultado = usarDestello()
    const resalte = usarResalte()
    const { aviso, avisar } = usarAviso()

    watch(total, dTotal.alCambiar)
    watch(puntosEnCirculacion, dPuntos.alCambiar)

    /* ---------------- Modales ---------------- */
    const modal = ref(null)
    const guardando = ref(false)

    /* Con el modal abierto, el fondo no debe scrollear detrás: en iOS el
       gesto se escapa al body y la hoja parece trabada. */
    watch(modal, (abierto) => {
      document.body.style.overflow = abierto ? 'hidden' : ''
    })
    onUnmounted(() => { document.body.style.overflow = '' })

    const fichaVacia = () => ({
      id: null, nombre: '', rut: '', telefono: '', correo: '', direccion: '',
      cumpleMes: null, cumpleDia: null, notas: '', rutTocado: false, error: ''
    })

    const abrirNuevo = () => { modal.value = { tipo: 'cliente', f: reactive(fichaVacia()) } }

    const abrirEdicion = (c) => {
      modal.value = {
        tipo: 'cliente',
        f: reactive({
          ...fichaVacia(),
          id: c.id,
          nombre: c.nombre || '',
          rut: c.rut || '',
          telefono: c.telefono || '',
          correo: c.correo || '',
          direccion: c.direccion || '',
          cumpleMes: c.cumpleMes ?? null,
          cumpleDia: c.cumpleDia ?? null,
          notas: c.notas || '',
          rutTocado: true
        })
      }
    }

    const abrirPuntos = (c) => {
      modal.value = {
        tipo: 'puntos',
        f: reactive({ cliente: c, signo: 1, cantidad: 10, motivo: '', error: '' })
      }
    }

    const cerrarModal = () => { modal.value = null }

    const rutOk = computed(() =>
      modal.value?.f?.rut ? rutValido(modal.value.f.rut) : true
    )

    /* El error del RUT aparece recién al salir del campo. Validando en cada
     * tecla, un RUT a medio escribir siempre está "malo" y el aviso
     * parpadea mientras el usuario todavía escribe. */
    const mostrarErrorRut = computed(() =>
      !!modal.value?.f?.rut && modal.value.f.rutTocado && !rutOk.value
    )

    /* Casi siempre el error es el dígito, no el número: decir cuál debería
       ser ahorra que la persona revise ocho dígitos que están bien. */
    const dvSugerido = computed(() => {
      const limpio = limpiarRut(modal.value?.f?.rut || '')
      const cuerpo = limpio.slice(0, -1)
      return cuerpo.length >= 7 && /^\d+$/.test(cuerpo) ? digitoVerificador(cuerpo) : ''
    })

    const alSalirRut = () => {
      const f = modal.value.f
      f.rutTocado = true
      if (f.rut && rutValido(f.rut)) f.rut = formatearRut(f.rut)
    }

    const diasDelMes = computed(() => {
      const mes = Number(modal.value?.f?.cumpleMes || 0)
      if (!mes) return []
      // Año bisiesto para no perder el 29 de febrero
      const dias = new Date(2024, mes, 0).getDate()
      return Array.from({ length: dias }, (_, i) => i + 1)
    })

    /* Extraída del template para poder observarla y destellarla */
    const puntosResultantes = computed(() => {
      if (modal.value?.tipo !== 'puntos') return 0
      const f = modal.value.f
      return f.cliente.puntos + f.signo * (f.cantidad || 0)
    })

    watch(puntosResultantes, dResultado.alCambiar)

    /* ---------------- Acciones ---------------- */
    const guardarCliente = async () => {
      const f = modal.value.f
      f.error = ''
      f.rutTocado = true

      if (!f.nombre.trim()) return (f.error = 'El nombre es obligatorio.')
      if (!f.rut.trim()) return (f.error = 'El RUT es obligatorio.')
      if (!rutOk.value) return (f.error = 'El RUT no es válido.')
      if (f.cumpleMes && !f.cumpleDia) return (f.error = 'Falta el día del cumpleaños.')

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
        if (f.id) {
          await store.dispatch('clientes/actualizarCliente', { id: f.id, ...datos })
          resalte.marcar(f.id)
        } else {
          await store.dispatch('clientes/crearCliente', datos)
        }
        cerrarModal()
        avisar(`${datos.nombre} guardado`)
      } catch (e) {
        f.error = e.message
      } finally {
        guardando.value = false
      }
    }

    const confirmarAjustePuntos = async () => {
      const f = modal.value.f
      f.error = ''

      if (!f.cantidad || f.cantidad < 1) return (f.error = 'La cantidad debe ser al menos 1.')
      if (puntosResultantes.value < 0) {
        return (f.error = 'El cliente no puede quedar con puntos negativos.')
      }

      guardando.value = true
      try {
        const id = f.cliente.id
        await store.dispatch('clientes/ajustarPuntos', {
          id,
          cantidad: f.signo * Math.round(f.cantidad),
          motivo: f.motivo
        })
        cerrarModal()
        avisar('Puntos ajustados')
        resalte.marcar(id)
      } catch (e) {
        f.error = e.message
      } finally {
        guardando.value = false
      }
    }

    const cambiarEstado = async (c, activo) => {
      try {
        await store.dispatch('clientes/cambiarEstado', { id: c.id, activo })
        avisar(activo ? `${c.nombre} reactivado` : `${c.nombre} desactivado`)
        if (activo || filtro.value.activo === null) resalte.marcar(c.id)
      } catch (e) {
        avisar(e.message, true)
      }
    }

    /* ---------------- Varios ---------------- */
    const fmt = new Intl.NumberFormat('es-CL', {
      style: 'currency', currency: 'CLP', maximumFractionDigits: 0
    })
    const clp = (n) => fmt.format(Math.round(n || 0))

    return {
      MESES, Math,
      esAdmin, puedeEditar,
      valorPunto, puntosPorPeso, canjeMinimo,
      lista: ordenada, total, filtro, cargando, errorCarga, recargar, filtrar,
      cumpleanos, proximosCumples, parcial, puntosEnCirculacion, pasivoPuntos,
      conCompras, alejados,
      ficha, compras, movimientos, frecuentes, cargandoDetalle,
      busqueda, orden, detalle, alternarDetalle, alternarInactivos, hayFiltro,
      esqueleto, escalonar,
      dTotal, dPuntos, dResultado, resalte, aviso,
      fechaCorta, cumpleHoy,
      situacion, textoSituacion, detalleSituacion, tono, iniciales,
      modal, guardando, abrirNuevo, abrirEdicion, abrirPuntos, cerrarModal,
      mostrarErrorRut, dvSugerido, alSalirRut, diasDelMes, puntosResultantes,
      guardarCliente, confirmarAjustePuntos, cambiarEstado,
      clp
    }
  }
}
</script>

<style scoped>
/* ==========================================================================
   MOBILE FIRST
   La base es el teléfono. El único max-width es el que desarma la tabla en
   tarjetas: pasar de `table` a `block` y volver rompe las cajas anónimas de
   tabla y desalinea el thead. Puntos de quiebre: 600 · 960.
   ========================================================================== */

/* Altura única para todo control tocable: buscador, selects, casillas y
   botones. Con tres números sueltos, una fila de filtros queda escalonada. */
.barra-filtros,
.panel,
.modal {
  --alto-control: 48px;
}

/* Universal y no una lista de contenedores: la lista se olvida de alguno
   —la barra de filtros, por ejemplo— y ahí `min-height` deja de medir la
   caja completa y el padding se suma encima. Al estar el estilo scoped,
   el `*` alcanza solo a los elementos de este componente. */
*,
*::before,
*::after {
  box-sizing: border-box;
}

.btn,
.btn-limpiar,
.check,
.segmentado button {
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.ico {
  width: 1.1em;
  height: 1.1em;
  flex-shrink: 0;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* ================================================================
 * ANIMACIONES
 * ================================================================ */

@keyframes entra {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: none; }
}

.al-entrar {
  animation: entra 380ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
  animation-delay: calc(var(--i, 0) * 55ms);
}

@keyframes aparece {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: none; }
}

.fila {
  animation: aparece 200ms ease-out backwards;
}

tbody.escalonada .fila {
  animation-duration: 300ms;
  animation-delay: calc(var(--i, 0) * 35ms);
}

/* Resalte tras un cambio: acá los cambios son altas y correcciones, va verde */
@keyframes resalta {
  0% { background: #d1fae5; }
  70% { background: #ecfdf5; }
  100% { background: transparent; }
}

.fila.resaltada,
.fila.resaltada td {
  animation: resalta 1400ms ease-out;
}

@keyframes destello {
  0% { transform: scale(1.07); color: #059669; }
  60% { color: #059669; }
  100% { transform: scale(1); }
}

.destella {
  display: inline-block;
  animation: destello 460ms cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes destello-claro {
  0% { transform: scale(1.07); color: #6ee7b7; }
  60% { color: #6ee7b7; }
  100% { transform: scale(1); }
}

.kpi.destacado .val.destella {
  animation-name: destello-claro;
}

/* Acordeón: la altura de un <tr> no es animable, así que la transición
 * corre sobre un grid interno de 0fr a 1fr. El nivel de overflow:hidden
 * intermedio evita que el padding se asome al colapsar. */
.acordeon-caja {
  display: grid;
  grid-template-rows: 1fr;
  transition: grid-template-rows 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.acordeon-interior {
  overflow: hidden;
  min-height: 0;
}

.acordeon-enter-from .acordeon-caja,
.acordeon-leave-to .acordeon-caja {
  grid-template-rows: 0fr;
}

.acordeon-enter-active .detalle,
.acordeon-leave-active .detalle {
  transition: opacity 0.24s ease;
}

.acordeon-enter-from .detalle,
.acordeon-leave-to .detalle {
  opacity: 0;
}

.acordeon-enter-active .escalon {
  animation: entra 260ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
  animation-delay: calc(130ms + var(--i, 0) * 40ms);
}

.flecha {
  transition: transform 0.26s cubic-bezier(0.22, 1, 0.36, 1);
}

.fila.abierta .flecha {
  transform: rotate(180deg);
}

/* Único gesto ambiental de la vista: el cumpleaños del día respira */
@keyframes late {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.07); }
}

.banda-ok .torta {
  display: inline-block;
  animation: late 2.4s ease-in-out infinite;
}

.desliza-enter-active {
  transition: opacity 0.22s ease, transform 0.26s cubic-bezier(0.22, 1, 0.36, 1);
}

.desliza-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.desliza-enter-from,
.desliza-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.cambio-enter-active {
  transition: opacity 0.16s ease, transform 0.18s cubic-bezier(0.22, 1, 0.36, 1);
}

.cambio-leave-active {
  transition: opacity 0.1s ease;
}

.cambio-enter-from {
  opacity: 0;
  transform: scale(0.98);
}

.cambio-leave-to {
  opacity: 0;
}

.brote-enter-active {
  transition: opacity 0.2s ease, transform 0.24s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.brote-leave-active {
  transition: opacity 0.14s ease, transform 0.14s ease;
}

.brote-enter-from,
.brote-leave-to {
  opacity: 0;
  transform: scale(0.7);
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.18s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal {
  transition: transform 0.24s cubic-bezier(0.22, 1, 0.36, 1);
}

.modal-leave-active .modal {
  transition: transform 0.16s ease;
}

.modal-enter-from .modal {
  transform: translateY(18px) scale(0.97);
}

.modal-leave-to .modal {
  transform: translateY(8px) scale(0.98);
}

.aviso-enter-active {
  transition: opacity 0.2s ease, transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.aviso-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.aviso-enter-from,
.aviso-leave-to {
  opacity: 0;
  transform: translateY(16px);
}

@keyframes girar {
  to { transform: rotate(360deg); }
}

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

.btn-ocupado:disabled {
  background: #0f6e56;
  opacity: 0.78;
  cursor: wait;
}

.atenuada {
  opacity: 0.45;
}

/* ---------- Encabezado ---------- */
.cabecera {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 14px;
  margin-bottom: 18px;
}

.cabecera h2 {
  margin: 0;
  font-size: 1.3rem;
  line-height: 1.25;
  letter-spacing: -0.01em;
  color: #0f172a;
}

.pista {
  margin: 5px 0 0;
  font-size: 0.9rem;
  color: #64748b;
  max-width: 62ch;
  line-height: 1.5;
}

/* ---------- KPIs ---------- */
.kpis {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 16px;
}

.kpi {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 14px;
  transition: border-color 0.18s, box-shadow 0.18s;
}

.kpi .rot {
  font-size: 0.8rem;
  color: #64748b;
  line-height: 1.3;
}

.kpi .val {
  font-size: 1.6rem;
  font-weight: 700;
  margin-top: 5px;
  font-variant-numeric: tabular-nums;
}

.kpi .pie {
  font-size: 0.78rem;
  color: #64748b;
  margin-top: 3px;
  line-height: 1.35;
}

.kpi.destacado {
  background: #04342C;
  border-color: #04342C;
  color: #fff;
}

.kpi.destacado .rot {
  color: #9FE1CB;
}

.kpi.destacado .pie {
  color: #9FE1CB;
}

.kpi.resaltado {
  border-color: #EF9F27;
  background: #FAEEDA;
}

/* Marca de "al menos": el número es un piso, no el total del sistema */
.aprox {
  font-size: 0.7em;
  opacity: 0.7;
  margin-right: 2px;
}

/* ---------- Bandas ---------- */
.banda {
  display: flex;
  align-items: center;
  gap: 11px;
  flex-wrap: wrap;
  padding: 13px 16px;
  border-radius: 10px;
  margin-bottom: 16px;
  font-size: 0.95rem;
  line-height: 1.45;
}

.banda-ok {
  background: #FAEEDA;
  border: 1px solid #EF9F27;
  color: #633806;
}

/* ---------- Filtros ---------- */
.barra-filtros {
  display: flex;
  flex-direction: column;
  gap: 9px;
  margin-bottom: 16px;
}

.buscador {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  min-height: var(--alto-control, 48px);
  padding: 0 12px;
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  transition: border-color 0.18s, box-shadow 0.18s;
}

.buscador:focus-within {
  border-color: transparent;
  box-shadow: 0 0 0 2px #10b981;
}

.lupa {
  width: 19px;
  height: 19px;
  color: #94a3b8;
}

.buscador input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: none;
  font-family: inherit;
  /* 16px mínimos: por debajo iOS hace zoom al enfocar */
  font-size: max(0.95rem, 16px);
}

.btn-limpiar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: #f1f5f9;
  color: #64748b;
  cursor: pointer;
}

.campo {
  width: 100%;
  min-height: var(--alto-control, 48px);
  padding: 0.6rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: #fff;
  font-family: inherit;
  font-size: max(0.95rem, 16px);
  color: #0f172a;
  outline: none;
  transition: border-color 0.18s, box-shadow 0.18s;
}

.campo:focus {
  border-color: transparent;
  box-shadow: 0 0 0 2px #10b981;
}

.campo-malo {
  border-color: #dc2626;
}

.campo-malo:focus {
  border-color: transparent;
  box-shadow: 0 0 0 2px #dc2626;
}

textarea.campo {
  min-height: 80px;
  resize: vertical;
}

.checks {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* Las casillas son objetivos táctiles, no adornos: caja completa tocable */
.check {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  flex: 1 1 auto;
  min-height: var(--alto-control, 48px);
  padding: 0 14px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
  font-size: 0.95rem;
  color: #475569;
  cursor: pointer;
}

.check input {
  width: 21px;
  height: 21px;
  accent-color: #0f6e56;
  cursor: pointer;
}

/* ---------- Lista de clientes ---------- */
table {
  width: 100%;
  border-collapse: collapse;
}

/* Todo lo que desarma la tabla vive acá dentro. La tabla nativa no se toca. */
@media (max-width: 959.98px) {
  colgroup {
    display: none;
  }

  table,
  thead,
  tbody,
  tr,
  td {
    display: block;
    width: 100%;
  }

  thead {
    display: none;
  }

  /* Cada cliente es una tarjeta */
  tbody tr.fila {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    overflow: hidden;
    margin-bottom: 14px;
    padding: 0;
  }

  /* Con la ficha abierta, tarjeta y ficha son un solo bloque */
  tbody tr.fila.abierta {
    border-radius: 14px 14px 0 0;
    margin-bottom: 0;
  }

  tbody tr.fila-detalle {
    border: 1px solid #e2e8f0;
    border-top: 0;
    border-radius: 0 0 14px 14px;
    overflow: hidden;
    margin-bottom: 14px;
    background: #f8fafc;
  }

  /* Los rótulos se leen: minúscula, tamaño normal, sin espaciado de letras */
  td {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 11px 16px;
    border: none;
    text-align: left;
    min-width: 0;
  }

  td::before {
    content: attr(data-label);
    order: 2;
    flex: 1;
    font-size: 0.95rem;
    color: #64748b;
  }

  .ico-dato {
    order: 1;
    width: 21px;
    height: 21px;
    color: #94a3b8;
  }

  .valor,
  .puntos {
    order: 3;
    font-size: 1rem;
    color: #0f172a;
  }

  /* Cabecera con el color de la situación */
  .celda-cliente {
    grid-column: 1 / -1;
    gap: 13px;
    padding: 15px 16px;
    background: var(--tono-fondo);
  }

  .celda-cliente .avatar {
    width: 52px;
    height: 52px;
    background: #fff;
    color: var(--tono-texto);
    font-size: 1.05rem;
  }

  .celda-cliente .identidad b {
    font-size: 1.18rem;
    color: var(--tono-oscuro);
  }

  .celda-cliente .rut {
    color: var(--tono-texto);
  }

  .celda-cliente::before,
  .celda-ficha::before,
  td[data-label="Situación"]::before,
  td[data-label="Puntos"]::before {
    content: none;
  }

  /* Franja situación + puntos */
  td[data-label="Situación"],
  td[data-label="Puntos"] {
    padding: 13px 16px;
    border-bottom: 1px solid #f1f5f9;
  }

  td[data-label="Puntos"] {
    justify-content: flex-end;
  }

  td[data-label="Puntos"] .ico-dato {
    display: none;
  }

  /* Filas de datos, una por línea */
  td[data-label="Teléfono"],
  td[data-label="Compras"] {
    grid-column: 1 / -1;
    border-bottom: 1px solid #f8fafc;
  }

  td[data-label="Gastado"] {
    grid-column: 1 / -1;
  }

  .celda-ficha {
    grid-column: 1 / -1;
    padding: 14px 16px 16px;
  }

  .fila-detalle td {
    display: block;
    padding: 0;
    border: none;
  }
}

/* Persona */
.persona {
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  min-width: 0;
}

.avatar {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--tono-fondo);
  color: var(--tono-texto);
  font-size: 0.8rem;
  font-weight: 700;
}

.identidad {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.identidad b {
  font-weight: 600;
  font-size: 0.95rem;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rut {
  font-size: 0.78rem;
  color: #94a3b8;
  font-variant-numeric: tabular-nums;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

tr.inactiva .persona,
tr.inactiva .valor {
  opacity: 0.65;
}

.suave {
  color: #64748b;
}

.dato {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.corta {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Puntos y situación: ancho declarado para que no bailen entre filas */
.puntos {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 34px;
  padding: 0 13px;
  border-radius: 999px;
  background: #FAEEDA;
  color: #854F0B;
  font-size: 0.85rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.puntos .ico {
  width: 15px;
  height: 15px;
}

.situacion {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  height: 34px;
  padding: 0 13px;
  border-radius: 999px;
  background: var(--tono-fondo);
  color: var(--tono-texto);
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
}

.situacion .ico {
  width: 16px;
  height: 16px;
}

/* Botón de ficha */
.btn-ficha {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: var(--alto-control, 48px);
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: #fff;
  color: #334155;
  font-size: 1rem;
  font-weight: 600;
}

.btn-ficha .ico {
  width: 19px;
  height: 19px;
}

/* ---------- Detalle ---------- */
.detalle {
  padding: 16px;
}

.cargando-ficha {
  padding: 6px 0;
}

.detalle-cols {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}

.detalle-cols h4 {
  margin: 0 0 9px;
  font-size: 0.95rem;
  font-weight: 700;
  color: #334155;
}

.ficha {
  margin: 0;
  font-size: 0.9rem;
}

.ficha > div {
  display: flex;
  gap: 10px;
  padding: 5px 0;
}

.ficha dt {
  min-width: 104px;
  color: #94a3b8;
}

.ficha dd {
  margin: 0;
  color: #334155;
  min-width: 0;
  overflow-wrap: break-word;
}

.notas {
  margin: 10px 0 0;
  padding: 10px 12px;
  background: #fff;
  border-left: 3px solid var(--tono-linea);
  border-radius: 0;
  font-size: 0.9rem;
  color: #475569;
  font-style: italic;
  line-height: 1.5;
}

.lineas {
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 0.9rem;
}

.lineas li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 0;
  border-bottom: 1px solid #e2e8f0;
}

/* Una compra anulada sigue en el historial, pero no cuenta */
.lineas li.anulada {
  opacity: 0.5;
  text-decoration: line-through;
}

.suma {
  color: #0F6E56;
}

.resta {
  color: #A32D2D;
}

.pie-tabla {
  margin: 10px 2px 0;
  font-size: 0.85rem;
}

.acciones-detalle {
  display: grid;
  grid-template-columns: 1fr;
  gap: 9px;
  margin-top: 16px;
}

/* ---------- Botones ---------- */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: var(--alto-control, 48px);
  padding: 0.65rem 1.15rem;
  border: none;
  border-radius: 10px;
  background: #0f6e56;
  color: #fff;
  font-family: inherit;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
}

.btn:hover:not(:disabled) {
  background: #085041;
}

.btn:active:not(:disabled) {
  transform: scale(0.985);
}

.btn:disabled {
  background: #a7c9bb;
  cursor: not-allowed;
}

.btn-linea {
  background: transparent;
  border: 1px solid #cbd5e1;
  color: #475569;
}

.btn-linea:hover:not(:disabled) {
  background: #f8fafc;
  border-color: #94a3b8;
}

/* Dar de baja y reactivar no son la misma acción: cada una con su color */
.btn-baja {
  border-color: #F7C1C1;
  color: #A32D2D;
}

.btn-baja:hover:not(:disabled) {
  background: #FCEBEB;
  border-color: #E24B4A;
}

.btn-alta {
  border-color: #9FE1CB;
  background: #E1F5EE;
  color: #0F6E56;
}

.btn-alta:hover:not(:disabled) {
  background: #d3efe5;
  border-color: #1D9E75;
}

.btn-mini {
  min-height: 44px;
  padding: 0.35rem 0.85rem;
  font-size: 0.9rem;
}

/* ---------- Modales: hoja inferior en móvil ---------- */
.fondo {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(15, 23, 42, 0.55);
}

.modal {
  width: 100%;
  /* dvh evita el salto cuando la barra del navegador se esconde */
  max-height: 92dvh;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -8px 40px rgba(0, 0, 0, 0.3);
}

.agarre {
  display: block;
  width: 38px;
  height: 4px;
  margin: 0 auto 12px;
  border-radius: 999px;
  background: #e2e8f0;
}

.modal-cab {
  padding: 10px 18px 14px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-cab h3 {
  margin: 0;
  font-size: 1.15rem;
  color: #0f172a;
}

.modal-cab p {
  margin: 5px 0 0;
  font-size: 0.9rem;
  line-height: 1.45;
  color: #64748b;
}

.modal-cuerpo {
  padding: 18px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}

.modal-pie {
  display: flex;
  gap: 9px;
  padding: 14px 18px;
  /* Deja libre la barra de gestos del iPhone */
  padding-bottom: calc(14px + env(safe-area-inset-bottom));
  border-top: 1px solid #e2e8f0;
}

.modal-pie .btn {
  flex: 1 1 0;
}

label {
  display: block;
  margin-bottom: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  color: #475569;
}

.grupo {
  margin-bottom: 16px;
}

.grupo.separado {
  margin-top: 14px;
}

.rejilla {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
}

.rejilla-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.ayuda {
  margin: 6px 0 0;
  font-size: 0.85rem;
  color: #94a3b8;
  line-height: 1.45;
}

.ayuda.mala {
  color: #dc2626;
}

.error {
  padding: 11px 14px;
  margin-bottom: 14px;
  border-radius: 0 8px 8px 0;
  border-left: 4px solid #dc2626;
  background: #fee2e2;
  color: #991b1b;
  font-size: 0.9rem;
  line-height: 1.45;
}

/* El error de carga vive fuera de un modal, así que necesita su propio aire */
.error.suelto {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 0;
  padding: 14px 16px;
}

.nota {
  padding: 11px 14px;
  margin-top: 14px;
  border-radius: 0 8px 8px 0;
  border-left: 3px solid #10b981;
  background: #f0fdf4;
  font-size: 0.9rem;
  color: #475569;
  line-height: 1.55;
  transition: border-color 0.2s, background-color 0.2s, color 0.2s;
}

.nota.alerta {
  border-color: #EF9F27;
  background: #FAEEDA;
  color: #633806;
}

.segmentado {
  display: flex;
  background: #f1f5f9;
  border-radius: 10px;
  padding: 3px;
  gap: 3px;
}

.segmentado button {
  flex: 1;
  min-height: 44px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #475569;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.18s, color 0.18s, box-shadow 0.18s;
}

.segmentado button.on {
  background: #fff;
  color: #0F6E56;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* ---------- Esqueleto ---------- */
.esq-fila {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  margin-bottom: 14px;
}

.esq-col {
  flex: 1;
  min-width: 0;
}

.sep-6 { margin-top: 6px; }
.sep-8 { margin-top: 8px; }
.sep-9 { margin-top: 9px; }

/* ---------- Varios ---------- */
.vacio {
  text-align: center;
  padding: 44px 20px;
  color: #64748b;
  background: #fff;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
  line-height: 1.5;
}

.vacio strong {
  display: block;
  color: #0f172a;
  font-size: 1.1rem;
  margin-bottom: 6px;
}

.aviso {
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: calc(16px + env(safe-area-inset-bottom));
  z-index: 80;
  padding: 13px 18px;
  border-radius: 10px;
  background: #04342c;
  color: #fff;
  font-size: 0.95rem;
  font-weight: 600;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.28);
  text-align: center;
}

.aviso.malo {
  background: #b91c1c;
}

/* ==========================================================================
   ≥ 600px — teléfono grande y tablet
   ========================================================================== */
@media (min-width: 600px) {
  .cabecera {
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-end;
    gap: 16px;
  }

  .cabecera h2 {
    font-size: 1.5rem;
  }

  .btn-crear {
    flex-shrink: 0;
  }

  .kpis {
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 12px;
  }

  .barra-filtros {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
  }

  .buscador {
    flex: 1 1 240px;
  }

  .campo-corto {
    width: auto;
    flex: 0 1 200px;
  }

  .checks {
    flex: 1 1 100%;
  }

  .check {
    flex: 0 1 auto;
  }

  .detalle-cols {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 22px;
  }

  .acciones-detalle {
    display: flex;
    flex-wrap: wrap;
  }

  .fondo {
    align-items: center;
    padding: 20px;
  }

  .modal {
    max-width: 520px;
    max-height: 88dvh;
    border-radius: 14px;
  }

  .agarre {
    display: none;
  }

  .modal-cab {
    padding-top: 18px;
  }

  .modal-pie {
    justify-content: flex-end;
    padding-bottom: 14px;
  }

  .modal-pie .btn {
    flex: 0 0 auto;
  }

  .rejilla {
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  }

  .aviso {
    left: 50%;
    right: auto;
    transform: translateX(-50%);
    max-width: 90vw;
  }

  .aviso-enter-from,
  .aviso-leave-to {
    transform: translate(-50%, 16px);
  }
}

/* ==========================================================================
   ≥ 960px — recién acá la tabla vuelve a ser tabla
   ========================================================================== */
@media (min-width: 960px) {
  .panel {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    overflow: hidden;
    transition: opacity 0.14s ease;
  }

  /* Todo el filtrado en una sola línea: buscador elástico, orden y
     casillas a su ancho natural contra el borde derecho. */
  .barra-filtros {
    flex-wrap: nowrap;
  }

  .checks {
    flex: 0 0 auto;
    margin-left: auto;
    flex-wrap: nowrap;
  }

  .check {
    white-space: nowrap;
  }

  .tabla-envoltura {
    overflow-x: auto;
  }

  /* `fixed` respeta los anchos del colgroup y reparte el 100% del ancho */
  table {
    table-layout: fixed;
    min-width: 1000px;
  }

  .c-cliente { width: 24%; }
  .c-contacto { width: 15%; }
  .c-compras { width: 9%; }
  .c-gastado { width: 13%; }
  .c-puntos { width: 11%; }
  .c-situacion { width: 14%; }
  .c-ficha { width: 14%; }

  tbody tr.fila {
    /* Altura fija: todas las filas comparten eje tengan o no datos */
    height: 66px;
    border-bottom: 1px solid #f1f5f9;
  }

  tbody tr.fila:last-child {
    border-bottom: 0;
  }

  th,
  td {
    text-align: center;
    width: auto;
  }

  th {
    padding: 11px 12px;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    font-size: 0.66rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #94a3b8;
  }

  td {
    padding: 8px 12px;
    vertical-align: middle;
    /* Con `fixed` nada estira una columna: lo que no entra se corta */
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.875rem;
  }

  .fila td {
    transition: background-color 0.16s ease;
  }

  tr.clic {
    cursor: pointer;
  }

  tr.clic:hover td,
  tr.clic.abierta td {
    background: #fcfcfd;
  }

  /* El bloque tiene ancho propio y se centra como bloque; adentro el
     contenido va a la izquierda. Si se centrara por su contenido, un
     nombre corto correría el avatar y los círculos no harían línea. */
  .persona {
    width: 100%;
    max-width: 240px;
    margin: 0 auto;
  }

  .avatar {
    width: 36px;
    height: 36px;
  }

  /* En la tabla el rótulo lo pone el encabezado de la columna */
  .ico-dato,
  .texto-accion {
    display: none;
  }

  .puntos,
  .situacion {
    height: 34px;
    margin: 0 auto;
  }

  .situacion {
    width: 100%;
    max-width: 132px;
  }

  .btn-ficha {
    width: 36px;
    min-height: 36px;
    margin: 0 auto;
    border-radius: 8px;
  }

  .fila.abierta .btn-ficha {
    border-color: var(--tono-linea);
    color: var(--tono-texto);
  }

  /* La ficha desplegada se alinea con la fila que la abrió */
  .fila-detalle td {
    padding: 0;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    white-space: normal;
  }

  .detalle {
    padding: 18px;
    border-left: 3px solid var(--tono-linea);
  }

  .acciones-detalle .btn {
    min-height: 40px;
    font-size: 0.9rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .btn,
  .btn-limpiar,
  .campo,
  .buscador,
  .kpi,
  .nota,
  .flecha,
  .segmentado button,
  .panel,
  .fila td {
    transition: none;
  }

  .al-entrar,
  .fila,
  .fila.resaltada,
  .fila.resaltada td,
  .destella,
  .spinner,
  .banda-ok .torta,
  .acordeon-enter-active .escalon {
    animation: none;
  }

  .acordeon-caja,
  .acordeon-enter-active .detalle,
  .acordeon-leave-active .detalle,
  .desliza-enter-active,
  .desliza-leave-active,
  .cambio-enter-active,
  .cambio-leave-active,
  .brote-enter-active,
  .brote-leave-active,
  .modal-enter-active,
  .modal-leave-active,
  .modal-enter-active .modal,
  .modal-leave-active .modal,
  .aviso-enter-active,
  .aviso-leave-active {
    transition: none;
  }

  .atenuada {
    opacity: 1;
  }
}
</style>