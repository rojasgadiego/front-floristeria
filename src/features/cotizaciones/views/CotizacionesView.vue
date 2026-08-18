<template>
  
    <div class="cabecera al-entrar">
      <div>
        <h2>Cotizaciones y eventos</h2>
        <p class="pista">
          Presupuestos, abonos y plan de pago. Aprobar pone el evento en la
          agenda, pero no aparta la flor: eso se compra cuando toca.
        </p>
      </div>
      <button v-if="puedeEditar" class="btn" @click="abrirNueva">＋ Nuevo presupuesto</button>
    </div>

    <div v-if="error" class="banda banda-error">
      <span aria-hidden="true">⚠️</span><span>{{ error }}</span>
      <button class="btn btn-mini" @click="recargar">Reintentar</button>
    </div>

    <!-- ================= SEGUIMIENTO ================= -->
    <div class="paneles">
      <section class="panel al-entrar" style="--i: 1" :class="{ urgente: porCobrar.length }">
        <header class="panel-cab">
          <h3>A quiénes llamar</h3>
          <b v-if="porCobrar.length" class="dato rojo">{{ clp(totalVencido) }}</b>
        </header>

        <p v-if="!porCobrar.length" class="suave mini">
          Nadie está atrasado con sus pagos.
        </p>

        <ul v-else class="lista">
          <li v-for="c in porCobrar.slice(0, 6)" :key="c.id" class="clic" @click="abrirDetalle(c)">
            <div class="min0">
              <b>{{ c.clienteNombre }}</b>
              <div class="mini suave">{{ c.folio }} · {{ c.estadoPago }}</div>
            </div>
            <b class="dato rojo">{{ clp(c.vencido) }}</b>
          </li>
        </ul>
        <button v-if="porCobrar.length > 6" class="enlace-boton"
          @click="filtrar({ soloVencidas: true, estado: null })">
          Ver los {{ porCobrar.length }}
        </button>
      </section>

      <section class="panel al-entrar" style="--i: 2">
        <header class="panel-cab">
          <h3>Lo que viene</h3>
          <b v-if="agenda.length" class="dato">{{ clp(comprometido) }} por cobrar</b>
        </header>

        <p v-if="!agenda.length" class="suave mini">
          Sin eventos agendados en los próximos 30 días.
        </p>

        <ul v-else class="lista">
          <li v-for="c in agenda.slice(0, 6)" :key="c.id" class="clic" @click="abrirDetalle(c)">
            <div class="min0">
              <b>{{ c.clienteNombre }}</b>
              <div class="mini suave">{{ c.tipoEvento }} · {{ fecha(c.fechaEvento) }}</div>
            </div>
            <span class="cuando" :class="{ pronto: c.diasParaEvento <= 3 }">
              {{ textoDias(c.diasParaEvento) }}
            </span>
          </li>
        </ul>
      </section>
    </div>

    <!-- ================= FILTROS ================= -->
    <div class="barra-filtros al-entrar" style="--i: 3">
      <div class="buscador">
        <span aria-hidden="true">🔎</span>
        <input v-model="busqueda" placeholder="Folio, cliente o contacto…" aria-label="Buscar presupuesto">
        <button v-if="busqueda" class="btn-icono chico" @click="busqueda = ''" aria-label="Limpiar">✕</button>
      </div>

      <select class="campo campo-corto" :value="filtro.estado ?? ''"
        @change="filtrar({ estado: $event.target.value || null })" aria-label="Estado">
        <option value="">Todos los estados</option>
        <option v-for="(e, k) in ESTADOS" :key="k" :value="k">{{ e.texto }}</option>
      </select>

      <label class="check">
        <input type="checkbox" :checked="filtro.soloVencidas"
          @change="filtrar({ soloVencidas: $event.target.checked })">
        <span>Solo con saldo vencido</span>
      </label>

      <button v-if="hayFiltro" class="enlace-boton" @click="limpiarFiltros">Quitar filtros</button>
    </div>

    <!-- ================= LISTADO ================= -->
    <div v-if="cargando && !cotizaciones.length" class="vacio">Cargando presupuestos…</div>

    <div v-else-if="!cotizaciones.length" class="vacio">
      <strong>{{ hayFiltro ? 'Ninguno coincide' : 'Sin presupuestos' }}</strong>
      {{ hayFiltro ? 'Prueba con otro texto o quita los filtros.' : 'Crea el primero para agendar un evento.' }}
    </div>

    <div v-else class="tabla-envoltura" :class="{ atenuada: cargando }">
      <table>
        <thead>
          <tr>
            <th>Folio</th>
            <th>Cliente</th>
            <th>Evento</th>
            <th>Estado</th>
            <th class="der">Total</th>
            <th class="der">Abonado</th>
            <th>Cobro</th>
            <th class="acciones-col"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(c, ix) in cotizaciones" :key="c.id" class="fila clic"
            :style="{ '--i': Math.min(ix, 12) }"
            :class="{ anulada: c.estado === 'anulada', vencida: c.vencido > 0, resaltada: c.id === resalte.id }"
            @click="abrirDetalle(c)">
            <td data-label="Folio">
              <b class="dato">{{ c.folio }}</b>
              <div class="mini suave">{{ c.lineas }} línea(s)</div>
            </td>
            <td data-label="Cliente">
              <b>{{ c.clienteNombre }}</b>
              <div v-if="c.contacto" class="mini suave corta">{{ c.contacto }}</div>
            </td>
            <td data-label="Evento">
              {{ c.tipoEvento }}
              <div v-if="c.fechaEvento" class="mini suave">
                {{ fecha(c.fechaEvento) }}
                <span v-if="c.diasParaEvento != null"> · {{ textoDias(c.diasParaEvento) }}</span>
              </div>
            </td>
            <td data-label="Estado">
              <span class="etiqueta" :class="claseEstado(c.estado)">{{ textoEstado(c.estado) }}</span>
            </td>
            <td data-label="Total" class="der dato">{{ clp(c.total) }}</td>
            <td data-label="Abonado" class="der">
              <div class="dato">{{ clp(c.abono) }}</div>
              <div class="riel-mini">
                <i :style="{ width: Math.min(100, c.porcentajePagado) + '%' }"></i>
              </div>
            </td>

            <!--
              `estadoPago` viene redactado del servidor: "al día" o "debe
              $100.000 desde el 15-08". Es lo que se lee de un vistazo para
              decidir a quién llamar, así que se muestra tal cual.
            -->
            <td data-label="Cobro" class="mini" :class="c.vencido > 0 ? 'rojo' : 'suave'">
              {{ c.estadoPago }}
            </td>

            <td class="der acciones-col">
              <span class="flecha" aria-hidden="true">›</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-if="totalPaginas > 1" class="paginador">
      <button class="btn btn-linea btn-mini" :disabled="!hayAnterior"
        @click="filtrar({ pagina: filtro.pagina - 1 })">Anterior</button>
      <span class="mini suave">Página {{ filtro.pagina }} de {{ totalPaginas }} · {{ total }}</span>
      <button class="btn btn-linea btn-mini" :disabled="!haySiguiente"
        @click="filtrar({ pagina: filtro.pagina + 1 })">Siguiente</button>
    </p>

    <!-- ================= MODALES ================= -->
    <div v-if="modal" class="fondo" @click.self="cerrarModal">

      <!-- ---------- Ficha ---------- -->
      <div v-if="modal.tipo === 'detalle'" class="modal ancho">
        <div class="modal-cab">
          <div class="min0">
            <h3>{{ modal.f.cot.folio }} · {{ modal.f.cot.clienteNombre }}</h3>
            <p>
              {{ modal.f.cot.tipoEvento }}
              <span v-if="modal.f.cot.fechaEvento"> · {{ fecha(modal.f.cot.fechaEvento) }}</span>
              <span v-if="modal.f.cot.contacto"> · {{ modal.f.cot.contacto }}</span>
            </p>
          </div>
          <span class="etiqueta" :class="claseEstado(modal.f.cot.estado)">
            {{ textoEstado(modal.f.cot.estado) }}
          </span>
        </div>

        <div class="modal-cuerpo">
          <div v-if="modal.f.error" class="error">{{ modal.f.error }}</div>
          <div v-if="!detalle" class="suave mini">Cargando ficha…</div>

          <template v-else>
            <!-- Plata -->
            <div class="cifras">
              <div>
                <span>Total</span>
                <b class="dato">{{ clp(detalle.total) }}</b>
              </div>
              <div>
                <span>Abonado</span>
                <b class="dato verde">{{ clp(detalle.abono) }}</b>
                <em class="mini">{{ Number(detalle.porcentajePagado).toFixed(0) }}%</em>
              </div>
              <div>
                <span>Saldo</span>
                <b class="dato">{{ clp(detalle.saldo) }}</b>
              </div>
              <div v-if="detalle.vencido > 0">
                <span>Vencido</span>
                <b class="dato rojo">{{ clp(detalle.vencido) }}</b>
                <em class="mini">{{ detalle.estadoPago }}</em>
              </div>
            </div>

            <!-- Faltantes de stock -->
            <div v-if="detalle.faltantes.length" class="nota alerta">
              <b>Flor comprometida que hoy no hay:</b>
              <ul class="faltantes">
                <li v-for="f in detalle.faltantes" :key="f.productoId">
                  {{ f.emoji }} {{ f.producto }}: comprometidas {{ f.comprometido }},
                  hay {{ f.disponible }} · <b>faltan {{ f.faltante }}</b>
                </li>
              </ul>
              <span class="mini">
                Aprobar no aparta inventario. Si el evento es pronto, esto es lo
                que hay que comprar.
              </span>
            </div>

            <!-- Líneas -->
            <h4>Presupuesto</h4>
            <table class="interna">
              <tbody>
                <tr v-for="l in detalle.items" :key="l.id">
                  <td>
                    {{ l.emoji || '•' }} {{ l.nombre }}
                    <span v-if="l.aMedida" class="chip">a medida</span>
                    <div v-if="!l.aMedida && l.disponible != null && l.disponible < l.cantidad"
                      class="mini rojo">
                      solo hay {{ l.disponible }}
                    </div>
                  </td>
                  <td class="der dato">{{ l.cantidad }} × {{ clp(l.precio) }}</td>
                  <td class="der dato">{{ clp(l.subtotal) }}</td>
                </tr>
                <tr v-if="detalle.traslado">
                  <td>Traslado</td><td></td>
                  <td class="der dato">{{ clp(detalle.traslado) }}</td>
                </tr>
                <tr v-if="detalle.montaje">
                  <td>Montaje</td><td></td>
                  <td class="der dato">{{ clp(detalle.montaje) }}</td>
                </tr>
              </tbody>
            </table>

            <p v-if="detalle.notas" class="notas">“{{ detalle.notas }}”</p>

            <!-- Plan de cuotas -->
            <div class="seccion">
              <div class="seccion-cab">
                <h4>Plan de pago</h4>
                <button v-if="puedeEditar && detalle.saldo > 0" class="enlace-boton"
                  @click="abrirCuotas">
                  {{ detalle.planCuotas.length ? 'Cambiar plan' : 'Definir plan' }}
                </button>
              </div>

              <p v-if="!detalle.planCuotas.length" class="suave mini">
                Sin plan: el saldo completo vence el día del evento.
              </p>

              <!--
                Las cuotas no se marcan pagadas una por una: `cubierta` se
                calcula acumulando lo abonado. En un acuerdo de palabra nadie
                paga montos exactos.
              -->
              <ul v-else class="cuotas">
                <li v-for="q in detalle.planCuotas" :key="q.id"
                  :class="{ cubierta: q.cubierta, atrasada: !q.cubierta && q.diasParaVencer < 0 }">
                  <span class="num">{{ q.numero }}</span>
                  <div class="min0">
                    <b class="dato">{{ clp(q.monto) }}</b>
                    <div class="mini suave">
                      vence {{ fecha(q.vence) }}
                      <span v-if="q.diasParaVencer < 0 && !q.cubierta">
                        · atrasada {{ -q.diasParaVencer }} día(s)
                      </span>
                    </div>
                  </div>
                  <span class="marca">{{ q.cubierta ? '✅' : '○' }}</span>
                </li>
              </ul>
            </div>

            <!-- Pagos -->
            <div class="seccion">
              <div class="seccion-cab">
                <h4>Abonos recibidos</h4>
                <button v-if="puedeEditar && puedeAbonar" class="enlace-boton" @click="abrirPago">
                  ＋ Registrar abono
                </button>
              </div>

              <p v-if="!detalle.historialPagos.length" class="suave mini">
                Todavía no hay abonos.
              </p>

              <ul v-else class="lista">
                <li v-for="p in detalle.historialPagos" :key="p.id" :class="{ anulado: p.anulado }">
                  <div class="min0">
                    <b class="dato">{{ clp(p.monto) }}</b>
                    <span class="chip">{{ p.medioPago }}</span>
                    <div class="mini suave">
                      {{ fechaHora(p.fecha) }}
                      <span v-if="p.ventaFolio"> · boleta {{ p.ventaFolio }}</span>
                      <span v-if="p.usuario"> · {{ p.usuario }}</span>
                    </div>
                    <div v-if="p.anulado" class="mini rojo">
                      Anulado: {{ p.motivoAnulacion }}
                    </div>
                  </div>
                  <button v-if="esAdmin && !p.anulado" class="btn btn-linea btn-mini"
                    @click.stop="abrirAnularPago(p)">Anular</button>
                </li>
              </ul>
            </div>

            <!-- Resultado del evento -->
            <div v-if="detalle.resultado" class="seccion">
              <h4>Cómo resultó</h4>
              <div class="cifras">
                <div>
                  <span>Cobrado</span>
                  <b class="dato">{{ clp(detalle.resultado.cobrado) }}</b>
                  <em class="mini">en {{ detalle.resultado.boletas }} boleta(s)</em>
                </div>
                <div>
                  <span>Costo de la flor</span>
                  <b class="dato">{{ clp(detalle.resultado.costoFlor) }}</b>
                </div>
                <div>
                  <span>Margen</span>
                  <b class="dato" :class="{ rojo: detalle.resultado.margen < 0 }">
                    {{ clp(detalle.resultado.margen) }}
                  </b>
                  <em class="mini">{{ Number(detalle.resultado.margenPorcentaje).toFixed(1) }}%</em>
                </div>
              </div>
            </div>
          </template>
        </div>

        <div class="modal-pie" v-if="detalle">
          <button class="btn btn-linea" @click="cerrarModal">Cerrar</button>

          <template v-if="detalle.estado === 'borrador'">
            <button v-if="puedeEditar" class="btn btn-linea" @click="abrirEdicion(detalle)">✏️ Editar</button>
            <button v-if="puedeEditar" class="btn" :disabled="guardando" @click="aprobar">Aprobar</button>
          </template>

          <template v-else-if="detalle.estado === 'aprobada'">
            <button v-if="esAdmin" class="btn btn-linea" @click="abrirAnular">Anular</button>
            <button v-if="puedeEditar" class="btn" @click="abrirCobro">💰 Cobrar evento</button>
          </template>
        </div>
      </div>

      <!-- ---------- Crear / editar ---------- -->
      <div v-else-if="modal.tipo === 'presupuesto'" class="modal ancho">
        <div class="modal-cab">
          <h3>{{ modal.f.id ? `Editar ${modal.f.folio}` : 'Nuevo presupuesto' }}</h3>
          <p>Queda en borrador hasta que se apruebe.</p>
        </div>

        <div class="modal-cuerpo">
          <div v-if="modal.f.error" class="error">{{ modal.f.error }}</div>

          <div class="rejilla grupo">
            <div>
              <label for="c-cliente">A nombre de</label>
              <input id="c-cliente" class="campo" v-model="modal.f.clienteNombre" maxlength="160"
                list="clientes-lista" placeholder="Camila Rojas" @change="vincularCliente">
              <datalist id="clientes-lista">
                <option v-for="c in clientes" :key="c.id" :value="c.nombre"></option>
              </datalist>
              <p class="ayuda">
                {{ modal.f.clienteId
                  ? 'Vinculado a su ficha del club.'
                  : 'Puede ser alguien que no está en el club.' }}
              </p>
            </div>
            <div>
              <label for="c-tipo">Tipo de evento</label>
              <input id="c-tipo" class="campo" v-model="modal.f.tipoEvento" maxlength="80"
                list="tipos-lista" placeholder="Matrimonio">
              <datalist id="tipos-lista">
                <option v-for="t in TIPOS_EVENTO" :key="t" :value="t"></option>
              </datalist>
            </div>
          </div>

          <div class="rejilla grupo">
            <div>
              <label for="c-fecha">Fecha del evento</label>
              <input id="c-fecha" class="campo dato" type="date" v-model="modal.f.fechaEvento">
            </div>
            <div>
              <label for="c-contacto">Contacto</label>
              <input id="c-contacto" class="campo" v-model="modal.f.contacto" maxlength="160"
                placeholder="+56 9 1234 5678">
            </div>
          </div>

          <!-- Líneas -->
          <label>Líneas del presupuesto</label>
          <div class="constructor">
            <div v-if="!modal.f.items.length" class="constructor-vacio">
              Sin líneas. Agrega productos del catálogo o una línea a medida.
            </div>

            <div v-for="(l, i) in modal.f.items" :key="l.uid" class="linea">
              <div class="linea-cab">
                <span class="crece">
                  <template v-if="l.aMedida">
                    <input class="campo chico" v-model="l.nombre" maxlength="160"
                      placeholder="Arco floral de entrada">
                  </template>
                  <template v-else>
                    <b>{{ nombreProducto(l.productoId) }}</b>
                    <div v-if="disponibleDe(l.productoId) != null" class="mini suave">
                      hay {{ disponibleDe(l.productoId) }} disponibles
                    </div>
                  </template>
                </span>
                <button class="btn-icono chico" @click="modal.f.items.splice(i, 1)"
                  aria-label="Quitar línea">✕</button>
              </div>

              <div class="linea-campos">
                <div>
                  <label>Cantidad</label>
                  <input class="campo chico dato" type="number" min="1" v-model.number="l.cantidad">
                </div>
                <div>
                  <label>Precio unitario</label>
                  <!--
                    El precio de catálogo lo pone el servidor: un presupuesto
                    con precios inventados es una promesa que después no se
                    puede cumplir. Solo las líneas a medida lo llevan propio.
                  -->
                  <input v-if="l.aMedida" class="campo chico dato" type="number" min="0" step="500"
                    v-model.number="l.precio">
                  <div v-else class="campo chico fijo dato">
                    {{ clp(precioDe(l.productoId)) }}
                    <span class="mini suave">del catálogo</span>
                  </div>
                </div>
                <div>
                  <label>Subtotal</label>
                  <div class="campo chico fijo dato">{{ clp(subtotalDe(l)) }}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="rejilla grupo">
            <div>
              <label for="c-add">Agregar del catálogo</label>
              <select id="c-add" class="campo"
                @change="agregarProducto($event.target.value); $event.target.value = ''">
                <option value="">Selecciona un producto…</option>
                <option v-for="p in productos" :key="p.id" :value="p.id">
                  {{ p.emoji }} {{ p.nombre }} — {{ clp(p.precio) }}
                </option>
              </select>
            </div>
            <div class="fin">
              <button class="btn btn-linea ancho" @click="agregarAMedida">
                ＋ Línea a medida
              </button>
              <p class="ayuda">Un arco, un montaje especial. No toca inventario.</p>
            </div>
          </div>

          <div class="rejilla grupo">
            <div>
              <label for="c-tras">Traslado</label>
              <input id="c-tras" class="campo dato" type="number" min="0" step="1000"
                v-model.number="modal.f.traslado">
            </div>
            <div>
              <label for="c-mont">Montaje</label>
              <input id="c-mont" class="campo dato" type="number" min="0" step="1000"
                v-model.number="modal.f.montaje">
            </div>
          </div>

          <div class="grupo">
            <label for="c-notas">Notas</label>
            <textarea id="c-notas" class="campo" v-model="modal.f.notas" maxlength="2000"
              placeholder="Paleta en tonos pastel. Entregar en la iglesia a las 10:00."></textarea>
          </div>

          <div class="cifras">
            <div>
              <span>Productos</span>
              <b class="dato">{{ clp(subtotalItems) }}</b>
            </div>
            <div>
              <span>Servicios</span>
              <b class="dato">{{ clp(servicios) }}</b>
            </div>
            <div>
              <span>Total</span>
              <b class="dato grande">{{ clp(totalPresupuesto) }}</b>
            </div>
          </div>
        </div>

        <div class="modal-pie">
          <button class="btn btn-linea" @click="cerrarModal">Cancelar</button>
          <button class="btn" :disabled="guardando" @click="guardar">
            <span v-if="guardando" class="spinner" aria-hidden="true"></span>
            {{ guardando ? 'Guardando…' : 'Guardar borrador' }}
          </button>
        </div>
      </div>

      <!-- ---------- Registrar abono ---------- -->
      <div v-else-if="modal.tipo === 'pago'" class="modal">
        <div class="modal-cab">
          <h3>Registrar abono</h3>
          <p>{{ detalle.folio }} · saldo {{ clp(detalle.saldo) }}</p>
        </div>
        <div class="modal-cuerpo">
          <div v-if="modal.f.error" class="error">{{ modal.f.error }}</div>

          <div class="grupo">
            <label for="a-monto">Monto</label>
            <input id="a-monto" class="campo dato" type="number" min="1" :max="detalle.saldo"
              step="1000" v-model.number="modal.f.monto">
            <div class="atajos-monto">
              <button v-for="a in atajosMonto" :key="a.texto" class="chip-boton"
                @click="modal.f.monto = a.valor">{{ a.texto }}</button>
            </div>
          </div>

          <div class="grupo">
            <label>Medio de pago</label>
            <div class="opciones-fila">
              <button v-for="m in MEDIOS_PAGO" :key="m.valor" type="button" class="opcion-chica"
                :class="{ on: modal.f.medioPago === m.valor }" @click="modal.f.medioPago = m.valor">
                {{ m.texto }}
              </button>
            </div>
          </div>

          <div v-if="modal.f.medioPago === 'efectivo'" class="grupo">
            <label for="a-recibido">Con cuánto paga</label>
            <input id="a-recibido" class="campo dato" type="number" min="0" step="1000"
              v-model.number="modal.f.recibido">
            <p v-if="vuelto > 0" class="ayuda">Vuelto: <b class="dato">{{ clp(vuelto) }}</b></p>
          </div>

          <div class="grupo">
            <label for="a-notas">Notas</label>
            <input id="a-notas" class="campo" v-model="modal.f.notas" maxlength="400">
          </div>

          <!--
            El abono genera una venta real con folio y medio de pago, que
            entra a la caja abierta. Así el arqueo del día nunca muestra plata
            que el sistema no explique.
          -->
          <div class="nota">
            Se emite una boleta que entra a la caja abierta. Si no hay caja
            abierta, el cobro no se puede registrar.
          </div>
        </div>
        <div class="modal-pie">
          <button class="btn btn-linea" @click="volverAFicha">Cancelar</button>
          <button class="btn" :disabled="guardando" @click="registrarPago">
            <span v-if="guardando" class="spinner" aria-hidden="true"></span>
            {{ guardando ? 'Registrando…' : `Cobrar ${clp(modal.f.monto || 0)}` }}
          </button>
        </div>
      </div>

      <!-- ---------- Plan de cuotas ---------- -->
      <div v-else-if="modal.tipo === 'cuotas'" class="modal">
        <div class="modal-cab">
          <h3>Plan de pago</h3>
          <p>Saldo pendiente: {{ clp(detalle.saldo) }}</p>
        </div>
        <div class="modal-cuerpo">
          <div v-if="modal.f.error" class="error">{{ modal.f.error }}</div>

          <div class="generador">
            <div class="rejilla">
              <div>
                <label for="g-cant">Cuotas</label>
                <input id="g-cant" class="campo dato" type="number" min="1" max="60"
                  v-model.number="modal.f.cantidad">
              </div>
              <div>
                <label for="g-primera">Primera vence</label>
                <input id="g-primera" class="campo dato" type="date" v-model="modal.f.primerVencimiento">
              </div>
              <div>
                <label for="g-cada">Cada (días)</label>
                <input id="g-cada" class="campo dato" type="number" min="1" max="365"
                  v-model.number="modal.f.cadaDias">
              </div>
            </div>
            <button class="btn btn-linea ancho" :disabled="guardando" @click="generarCuotas">
              Repartir en cuotas iguales
            </button>
            <p class="ayuda">
              La diferencia por redondeo va en la primera: es mejor cobrar el
              peso de más al principio que descubrirlo al final.
            </p>
          </div>

          <div v-if="modal.f.cuotas.length" class="seccion">
            <h4>Plan actual</h4>
            <div v-for="(q, i) in modal.f.cuotas" :key="i" class="cuota-fila">
              <span class="num">{{ i + 1 }}</span>
              <input class="campo chico dato" type="number" min="1" v-model.number="q.monto"
                aria-label="Monto">
              <input class="campo chico dato" type="date" v-model="q.vence" aria-label="Vence">
              <button class="btn-icono chico" @click="modal.f.cuotas.splice(i, 1)"
                aria-label="Quitar cuota">✕</button>
            </div>

            <button class="enlace-boton" @click="agregarCuota">＋ Agregar cuota</button>

            <!--
              Las cuotas deben sumar exactamente el saldo: un plan incompleto
              significa que el último pago va a ser una sorpresa.
            -->
            <div class="nota" :class="{ alerta: diferenciaCuotas !== 0 }">
              Suman <b class="dato">{{ clp(sumaCuotas) }}</b> de
              {{ clp(detalle.saldo) }}
              <span v-if="diferenciaCuotas > 0"><br>Faltan {{ clp(diferenciaCuotas) }}.</span>
              <span v-else-if="diferenciaCuotas < 0"><br>Sobran {{ clp(-diferenciaCuotas) }}.</span>
              <span v-else><br>El plan cubre el saldo completo.</span>
            </div>
          </div>
        </div>
        <div class="modal-pie">
          <button class="btn btn-linea" @click="volverAFicha">Cancelar</button>
          <button v-if="modal.f.cuotas.length" class="btn btn-linea" :disabled="guardando"
            @click="borrarPlan">Borrar plan</button>
          <button class="btn" :disabled="guardando || diferenciaCuotas !== 0" @click="guardarCuotas">
            <span v-if="guardando" class="spinner" aria-hidden="true"></span>
            Guardar plan
          </button>
        </div>
      </div>

      <!-- ---------- Cobro del evento ---------- -->
      <div v-else-if="modal.tipo === 'cobro'" class="modal ancho">
        <div class="modal-cab">
          <h3>Cobrar {{ detalle.folio }}</h3>
          <p>{{ detalle.clienteNombre }}</p>
        </div>
        <div class="modal-cuerpo">
          <div v-if="modal.f.error" class="error">{{ modal.f.error }}</div>
          <div v-if="!preparacion" class="suave mini">Preparando el cobro…</div>

          <template v-else>
            <div v-if="preparacion.advertencias.length" class="nota alerta">
              <b>Puntos a revisar antes de cobrar:</b>
              <ul class="faltantes">
                <li v-for="(a, i) in preparacion.advertencias" :key="i">{{ a }}</li>
              </ul>
            </div>

            <h4>Líneas sugeridas</h4>
            <table class="interna">
              <tbody>
                <tr v-for="(l, i) in preparacion.lineas" :key="i">
                  <td>
                    {{ l.nombre }}
                    <span v-if="l.esServicio" class="chip">servicio</span>
                    <div v-if="!l.esServicio && l.disponible != null && l.disponible < l.cantidad"
                      class="mini rojo">solo hay {{ l.disponible }}</div>
                  </td>
                  <td class="der dato">{{ l.cantidad }} × {{ clp(l.precio) }}</td>
                  <td class="der dato">{{ clp(l.cantidad * l.precio) }}</td>
                </tr>
              </tbody>
            </table>

            <div class="cifras">
              <div>
                <span>Total cotizado</span>
                <b class="dato">{{ clp(preparacion.totalCotizado) }}</b>
              </div>
              <div>
                <span>Abono previo</span>
                <b class="dato verde">−{{ clp(preparacion.abonoPrevio) }}</b>
              </div>
              <div>
                <span>A cobrar ahora</span>
                <b class="dato grande">{{ clp(preparacion.saldoACobrar) }}</b>
              </div>
            </div>

            <!--
              La sugerencia es editable a propósito: si el arco quedó chico y
              se usaron 72 rosas en vez de 60, hay que cobrar y descontar lo
              que realmente salió. El ajuste ocurre en el punto de venta.
            -->
            <div class="nota alerta">
              <b>El cobro se completa en el punto de venta.</b>
              Estas líneas son una sugerencia: si la flor que realmente salió
              fue otra, se ajusta ahí antes de cobrar. Cobrar a ciegas lo
              cotizado dejaría el inventario diciendo que salió otra cosa.
              <br><br>
              <span class="mini">
                Esa pantalla todavía no está migrada. Por ahora esto sirve para
                revisar el cobro antes de hacerlo.
              </span>
            </div>
          </template>
        </div>
        <div class="modal-pie">
          <button class="btn btn-linea" @click="volverAFicha">Cerrar</button>
          <button class="btn" disabled title="Requiere el punto de venta">
            Ir a cobrar
          </button>
        </div>
      </div>

      <!-- ---------- Anular (cotización o pago) ---------- -->
      <div v-else-if="modal.tipo === 'anular'" class="modal">
        <div class="modal-cab">
          <h3>{{ modal.f.pago ? 'Anular abono' : 'Anular presupuesto' }}</h3>
          <p v-if="modal.f.pago">{{ clp(modal.f.pago.monto) }} · boleta {{ modal.f.pago.ventaFolio }}</p>
          <p v-else>{{ detalle.folio }} · {{ detalle.clienteNombre }}</p>
        </div>
        <div class="modal-cuerpo">
          <div v-if="modal.f.error" class="error">{{ modal.f.error }}</div>

          <div class="grupo">
            <label for="an-motivo">¿Por qué se anula?</label>
            <input id="an-motivo" class="campo" v-model="modal.f.motivo" maxlength="300"
              placeholder="El cliente canceló el evento" @keyup.enter="confirmarAnulacion">
            <p class="ayuda">Mínimo 5 caracteres. Queda registrado con tu nombre.</p>
          </div>

          <div v-if="modal.f.pago" class="nota alerta">
            Se anula el abono <b>y su boleta</b>. Si la plata se devuelve, la
            venta deja de existir y el arqueo de ese día cambia.
          </div>

          <div v-else class="nota alerta">
            Los abonos ya recibidos <b>no se tocan</b>: esa plata entró en
            turnos que ya se cerraron. Queda como saldo a favor del cliente.
          </div>
        </div>
        <div class="modal-pie">
          <button class="btn btn-linea" @click="volverAFicha">Cancelar</button>
          <button class="btn btn-rojo" :disabled="guardando" @click="confirmarAnulacion">
            <span v-if="guardando" class="spinner" aria-hidden="true"></span>
            Anular
          </button>
        </div>
      </div>
    </div>

    <div v-if="aviso" class="aviso" :class="{ malo: aviso.malo }" role="status">{{ aviso.texto }}</div>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useStore } from 'vuex'
import { useTemporizadores } from '@/shared/composables/useTemporizadores'
import {ESTADOS, MEDIOS_PAGO, TIPOS_EVENTO, textoEstado, claseEstado} from '@/features/cotizaciones/store/cotizaciones.modules'
import { aDateOnly } from '@/core/utils/fechas'

export default {
  name: 'CotizacionesView',
  components: { },

  setup () {
    const store = useStore()
    const { usarResalte, usarAviso } = useTemporizadores()

    const esAdmin = computed(() => store.getters['auth/esAdmin'])
    const puedeEditar = computed(() => store.getters['auth/tieneRol']('admin', 'vendedor'))

    /* ---------------- Datos ---------------- */
    const cotizaciones = computed(() => store.getters['cotizaciones/cotizaciones'])
    const total = computed(() => store.getters['cotizaciones/total'])
    const totalPaginas = computed(() => store.getters['cotizaciones/totalPaginas'])
    const hayAnterior = computed(() => store.getters['cotizaciones/hayAnterior'])
    const haySiguiente = computed(() => store.getters['cotizaciones/haySiguiente'])
    const filtro = computed(() => store.getters['cotizaciones/filtro'])
    const cargando = computed(() => store.getters['cotizaciones/cargando'])
    const guardando = computed(() => store.getters['cotizaciones/guardando'])
    const error = computed(() => store.getters['cotizaciones/error'])
    const hayFiltro = computed(() => store.getters['cotizaciones/hayFiltro'])
    const porCobrar = computed(() => store.getters['cotizaciones/porCobrar'])
    const agenda = computed(() => store.getters['cotizaciones/agenda'])
    const totalVencido = computed(() => store.getters['cotizaciones/totalVencido'])
    const comprometido = computed(() => store.getters['cotizaciones/comprometido'])
    const preparacion = computed(() => store.getters['cotizaciones/preparacion'])

    const productos = computed(() =>
      store.getters['productos/productos'].filter(p => p.activo)
    )
    const clientes = computed(() => store.getters['clientes/clientes'])

    const nombreProducto = (id) => store.getters['productos/porId'](id)?.nombre || `#${id}`
    const precioDe = (id) => store.getters['productos/porId'](id)?.precio || 0
    const disponibleDe = (id) => store.getters['productos/porId'](id)?.disponible ?? null

    /* ---------------- Carga ---------------- */
    let control = null

    onMounted(() => {
      control = new AbortController()
      const señal = { signal: control.signal }
      store.dispatch('cotizaciones/cargar', señal)
      store.dispatch('cotizaciones/cargarSeguimiento', señal)
      if (!store.getters['productos/productos'].length) {
        store.dispatch('productos/cargar', señal)
      }
      if (!store.getters['clientes/clientes'].length) {
        store.dispatch('clientes/cargar', señal)
      }
    })

    onUnmounted(() => control?.abort())

    const recargar = () => store.dispatch('cotizaciones/cargar')
    const filtrar = (cambios) => store.dispatch('cotizaciones/filtrar', cambios)
    const limpiarFiltros = () => {
      busqueda.value = ''
      store.commit('cotizaciones/RESET_FILTRO')
      recargar()
    }

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
      store.dispatch('cotizaciones/limpiarPreparacion')
    }

    const volverAFicha = () => {
      modal.value = { tipo: 'detalle', f: { cot: detalle.value, error: '' } }
      store.dispatch('cotizaciones/limpiarPreparacion')
    }

    const refrescarDetalle = async (id) => {
      detalle.value = await store.dispatch('cotizaciones/cargarDetalle', { id, forzar: true })
    }

    const abrirDetalle = async (c) => {
      modal.value = { tipo: 'detalle', f: { cot: c, error: '' } }
      detalle.value = await store.dispatch('cotizaciones/cargarDetalle', { id: c.id, forzar: true })
    }

    const puedeAbonar = computed(() =>
      detalle.value && ['borrador', 'aprobada'].includes(detalle.value.estado) &&
      detalle.value.saldo > 0
    )

    /* ---------------- Presupuesto ---------------- */
    let contador = 0

    const fichaVacia = () => ({
      id: null, folio: '', clienteId: null, clienteNombre: '',
      tipoEvento: '', fechaEvento: '', contacto: '',
      traslado: 0, montaje: 0, notas: '', items: [], error: ''
    })

    const abrirNueva = () => { modal.value = { tipo: 'presupuesto', f: fichaVacia() } }

    const abrirEdicion = (d) => {
      modal.value = {
        tipo: 'presupuesto',
        f: {
          ...fichaVacia(),
          id: d.id, folio: d.folio,
          clienteId: d.clienteId ?? null,
          clienteNombre: d.clienteNombre || '',
          tipoEvento: d.tipoEvento || '',
          fechaEvento: d.fechaEvento ? aDateOnly(d.fechaEvento) : '',
          contacto: d.contacto || '',
          traslado: d.traslado || 0,
          montaje: d.montaje || 0,
          notas: d.notas || '',
          items: d.items.map(l => ({
            uid: ++contador,
            productoId: l.productoId ?? null,
            nombre: l.nombre,
            precio: l.precio,
            cantidad: l.cantidad,
            aMedida: l.aMedida
          }))
        }
      }
    }

    /* Escribir el nombre exacto de un cliente del club lo vincula. Sin eso,
       el evento queda a nombre suelto y no suma a su historial. */
    const vincularCliente = () => {
      const nombre = (modal.value.f.clienteNombre || '').trim().toLowerCase()
      const cliente = clientes.value.find(c => c.nombre.toLowerCase() === nombre)
      modal.value.f.clienteId = cliente?.id ?? null
    }

    const agregarProducto = (valor) => {
      if (!valor) return
      const productoId = Number(valor)
      const f = modal.value.f
      const existe = f.items.find(l => l.productoId === productoId && !l.aMedida)
      if (existe) existe.cantidad++
      else {
        f.items.push({
          uid: ++contador, productoId,
          nombre: nombreProducto(productoId),
          precio: precioDe(productoId),
          cantidad: 1, aMedida: false
        })
      }
    }

    const agregarAMedida = () => {
      modal.value.f.items.push({
        uid: ++contador, productoId: null, nombre: '', precio: 0,
        cantidad: 1, aMedida: true
      })
    }

    const subtotalDe = (l) =>
      (l.aMedida ? (l.precio || 0) : precioDe(l.productoId)) * (l.cantidad || 0)

    const subtotalItems = computed(() =>
      (modal.value?.f?.items || []).reduce((t, l) => t + subtotalDe(l), 0)
    )

    const servicios = computed(() =>
      (modal.value?.f?.traslado || 0) + (modal.value?.f?.montaje || 0)
    )

    const totalPresupuesto = computed(() => subtotalItems.value + servicios.value)

    const guardar = async () => {
      const f = modal.value.f
      f.error = ''

      if ((f.clienteNombre || '').trim().length < 2) {
        return (f.error = 'Indica a nombre de quién va el evento.')
      }
      if (!(f.tipoEvento || '').trim()) return (f.error = 'Indica el tipo de evento.')
      if (!f.items.length) return (f.error = 'El presupuesto necesita al menos una línea.')
      if (f.items.some(l => l.aMedida && !(l.nombre || '').trim())) {
        return (f.error = 'Las líneas a medida necesitan un nombre.')
      }
      if (f.items.some(l => !l.cantidad || l.cantidad < 1)) {
        return (f.error = 'Todas las cantidades deben ser al menos 1.')
      }

      const peticion = {
        clienteId: f.clienteId,
        clienteNombre: f.clienteNombre.trim(),
        tipoEvento: f.tipoEvento.trim(),
        fechaEvento: f.fechaEvento || null,
        contacto: (f.contacto || '').trim() || null,
        traslado: Math.round(f.traslado || 0),
        montaje: Math.round(f.montaje || 0),
        notas: (f.notas || '').trim() || null,
        items: f.items.map(l => ({
          productoId: l.aMedida ? null : l.productoId,
          nombre: l.aMedida ? l.nombre.trim() : null,
          precio: l.aMedida ? Math.round(l.precio || 0) : null,
          cantidad: Math.round(l.cantidad),
          aMedida: l.aMedida
        }))
      }

      try {
        const cot = f.id
          ? await store.dispatch('cotizaciones/actualizar', { id: f.id, ...peticion })
          : await store.dispatch('cotizaciones/crear', peticion)
        cerrarModal()
        avisar(`${cot.folio} guardada · ${clp(cot.total)}`)
        resalte.marcar(cot.id)
      } catch (e) {
        f.error = e.message
      }
    }

    /* ---------------- Aprobar / anular ---------------- */
    const aprobar = async () => {
      try {
        await store.dispatch('cotizaciones/aprobar', detalle.value.id)
        await refrescarDetalle(detalle.value.id)
        avisar('Presupuesto aprobado · ya está en la agenda')
      } catch (e) {
        modal.value.f.error = e.message
      }
    }

    const abrirAnular = () => {
      modal.value = { tipo: 'anular', f: { pago: null, motivo: '', error: '' } }
    }

    const abrirAnularPago = (pago) => {
      modal.value = { tipo: 'anular', f: { pago, motivo: '', error: '' } }
    }

    const confirmarAnulacion = async () => {
      const f = modal.value.f
      f.error = ''
      try {
        if (f.pago) {
          await store.dispatch('cotizaciones/anularPago', {
            id: detalle.value.id, pagoId: f.pago.id, motivo: f.motivo
          })
          avisar('Abono y boleta anulados')
        } else {
          await store.dispatch('cotizaciones/anular', {
            id: detalle.value.id, motivo: f.motivo
          })
          avisar('Presupuesto anulado')
        }
        await refrescarDetalle(detalle.value.id)
        volverAFicha()
      } catch (e) {
        f.error = e.message
      }
    }

    /* ---------------- Abonos ---------------- */
    const abrirPago = () => {
      modal.value = {
        tipo: 'pago',
        f: {
          monto: Math.min(detalle.value.saldo, detalle.value.exigibleHoy || detalle.value.saldo),
          medioPago: 'efectivo', recibido: null, notas: '', error: ''
        }
      }
    }

    /* Atajos que cubren los casos reales: lo que ya venció, la mitad, y el
       saldo completo. */
    const atajosMonto = computed(() => {
      const d = detalle.value
      if (!d) return []
      const opciones = []
      if (d.vencido > 0) opciones.push({ texto: `Lo vencido ${clp(d.vencido)}`, valor: d.vencido })
      opciones.push({ texto: `Mitad ${clp(Math.round(d.saldo / 2))}`, valor: Math.round(d.saldo / 2) })
      opciones.push({ texto: `Todo ${clp(d.saldo)}`, valor: d.saldo })
      return opciones
    })

    const vuelto = computed(() => {
      const f = modal.value?.f
      if (!f || f.medioPago !== 'efectivo') return 0
      return Math.max(0, (f.recibido || 0) - (f.monto || 0))
    })

    const registrarPago = async () => {
      const f = modal.value.f
      f.error = ''

      if (!f.monto || f.monto < 1) return (f.error = 'El monto debe ser mayor que cero.')
      if (f.monto > detalle.value.saldo) return (f.error = 'El monto supera el saldo pendiente.')
      if (f.medioPago === 'efectivo' && f.recibido && f.recibido < f.monto) {
        return (f.error = 'Lo recibido es menor que el monto.')
      }

      try {
        const pago = await store.dispatch('cotizaciones/registrarPago', {
          id: detalle.value.id,
          monto: Math.round(f.monto),
          medioPago: f.medioPago,
          recibido: f.medioPago === 'efectivo' ? (f.recibido || null) : null,
          notas: (f.notas || '').trim() || null
        })
        await refrescarDetalle(detalle.value.id)
        volverAFicha()
        avisar(`Abono de ${clp(pago.monto)} · boleta ${pago.ventaFolio}`)
      } catch (e) {
        f.error = e.message
      }
    }

    /* ---------------- Cuotas ---------------- */
    const abrirCuotas = () => {
      modal.value = {
        tipo: 'cuotas',
        f: {
          cantidad: 3, primerVencimiento: '', cadaDias: 30,
          cuotas: (detalle.value.planCuotas || []).map(q => ({
            monto: q.monto, vence: aDateOnly(q.vence), notas: q.notas || ''
          })),
          error: ''
        }
      }
    }

    const sumaCuotas = computed(() =>
      (modal.value?.f?.cuotas || []).reduce((t, q) => t + (q.monto || 0), 0)
    )

    const diferenciaCuotas = computed(() =>
      (detalle.value?.saldo || 0) - sumaCuotas.value
    )

    const agregarCuota = () => {
      const f = modal.value.f
      const ultima = f.cuotas[f.cuotas.length - 1]
      const base = ultima ? new Date(ultima.vence) : new Date()
      base.setDate(base.getDate() + (f.cadaDias || 30))
      f.cuotas.push({
        monto: Math.max(0, diferenciaCuotas.value),
        vence: aDateOnly(base),
        notas: ''
      })
    }

    const generarCuotas = async () => {
      const f = modal.value.f
      f.error = ''
      try {
        const plan = await store.dispatch('cotizaciones/generarCuotas', {
          id: detalle.value.id,
          cantidad: f.cantidad,
          primerVencimiento: f.primerVencimiento || null,
          cadaDias: f.cadaDias
        })
        f.cuotas = plan.map(q => ({
          monto: q.monto, vence: aDateOnly(q.vence), notas: q.notas || ''
        }))
        await refrescarDetalle(detalle.value.id)
        avisar(`${plan.length} cuota(s) generada(s)`)
      } catch (e) {
        f.error = e.message
      }
    }

    const guardarCuotas = async () => {
      const f = modal.value.f
      f.error = ''
      try {
        await store.dispatch('cotizaciones/guardarCuotas', {
          id: detalle.value.id, cuotas: f.cuotas
        })
        await refrescarDetalle(detalle.value.id)
        volverAFicha()
        avisar('Plan de pago guardado')
      } catch (e) {
        f.error = e.message
      }
    }

    const borrarPlan = async () => {
      const f = modal.value.f
      f.error = ''
      try {
        await store.dispatch('cotizaciones/guardarCuotas', {
          id: detalle.value.id, cuotas: []
        })
        await refrescarDetalle(detalle.value.id)
        volverAFicha()
        avisar('Plan borrado · el saldo vence el día del evento')
      } catch (e) {
        f.error = e.message
      }
    }

    /* ---------------- Cobro ---------------- */
    const abrirCobro = async () => {
      modal.value = { tipo: 'cobro', f: { error: '' } }
      try {
        await store.dispatch('cotizaciones/prepararCobro', { id: detalle.value.id })
      } catch (e) {
        modal.value.f.error = e.message
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

    const fmtHora = new Intl.DateTimeFormat('es-CL', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    })
    const fechaHora = (v) => (v ? fmtHora.format(new Date(v)) : '—')

    const textoDias = (d) => {
      if (d == null) return ''
      if (d < 0) return `hace ${-d} día(s)`
      if (d === 0) return 'Hoy'
      if (d === 1) return 'Mañana'
      return `En ${d} días`
    }

    return {
      ESTADOS, MEDIOS_PAGO, TIPOS_EVENTO, Math, Number, textoEstado, claseEstado,
      esAdmin, puedeEditar,
      cotizaciones, total, totalPaginas, hayAnterior, haySiguiente, filtro,
      cargando, guardando, error, hayFiltro,
      porCobrar, agenda, totalVencido, comprometido, preparacion,
      productos, clientes, nombreProducto, precioDe, disponibleDe,
      recargar, filtrar, limpiarFiltros, busqueda,
      modal, detalle, cerrarModal, volverAFicha, abrirDetalle, puedeAbonar,
      abrirNueva, abrirEdicion, vincularCliente, agregarProducto, agregarAMedida,
      subtotalDe, subtotalItems, servicios, totalPresupuesto, guardar,
      aprobar, abrirAnular, abrirAnularPago, confirmarAnulacion,
      abrirPago, atajosMonto, vuelto, registrarPago,
      abrirCuotas, sumaCuotas, diferenciaCuotas, agregarCuota,
      generarCuotas, guardarCuotas, borrarPlan,
      abrirCobro,
      resalte, aviso, clp, fecha, fechaHora, textoDias
    }
  }
}
</script>

<style scoped>
.cabecera,
.cabecera *,
.paneles *,
.tabla-envoltura *,
.fondo * {
  box-sizing: border-box;
}

@keyframes entra {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: none; }
}

.al-entrar {
  animation: entra 380ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
  animation-delay: calc(var(--i, 0) * 50ms);
}

@keyframes aparece {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: none; }
}

.fila {
  animation: aparece 220ms ease-out backwards;
  animation-delay: calc(var(--i, 0) * 25ms);
}

@keyframes resalta {
  0% { background: #d1fae5; }
  70% { background: #ecfdf5; }
  100% { background: transparent; }
}

.fila.resaltada td { animation: resalta 1400ms ease-out; }

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
  max-width: 64ch;
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

.banda-error {
  background: #fee2e2;
  border: 1px solid #fca5a5;
  color: #991b1b;
}

.banda .btn { margin-left: auto; }

/* ---------- Paneles de seguimiento ---------- */
.paneles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 14px;
  margin-bottom: 18px;
}

.panel {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
}

.panel.urgente { border-color: #fca5a5; }

.panel-cab {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.panel h3 { margin: 0; font-size: 0.95rem; color: #0f172a; }

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

.campo.chico {
  min-height: 38px;
  padding: 0.4rem 0.6rem;
  font-size: max(0.85rem, 16px);
}

.campo.fijo {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #f8fafc;
  color: #475569;
}

.campo-corto { width: auto; flex: 0 1 190px; }

textarea.campo { min-height: 72px; resize: vertical; }

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

/* ---------- Tabla ---------- */
.tabla-envoltura {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  overflow-x: auto;
  transition: opacity 0.14s ease;
}

.tabla-envoltura.atenuada { opacity: 0.45; }

table { width: 100%; border-collapse: collapse; }

th {
  text-align: left;
  padding: 11px 14px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #64748b;
  white-space: nowrap;
}

td {
  padding: 11px 14px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 0.875rem;
  vertical-align: middle;
}

tbody tr:last-child td { border-bottom: 0; }
tr.clic { cursor: pointer; }
tr.anulada { opacity: 0.5; }
.fila td { transition: background-color 0.16s ease; }
tr.clic:hover td { background: #f8fafc; }

/* Un saldo vencido tiene que verse en la fila, no solo en la columna */
tr.vencida td { background: #fef2f2; }
tr.vencida:hover td { background: #fee2e2; }

.der { text-align: right; }
.suave { color: #64748b; }
.mini { font-size: 0.76rem; }
.rojo { color: #dc2626; }
.verde { color: #047857; }

.dato { font-variant-numeric: tabular-nums; font-weight: 600; }
.dato.grande { font-size: 1.2rem; }

.corta {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.acciones-col { width: 1%; white-space: nowrap; }

.flecha { color: #cbd5e1; font-size: 1.1rem; }

.riel-mini {
  height: 4px;
  margin-top: 4px;
  background: #f1f5f9;
  border-radius: 99px;
  overflow: hidden;
}

.riel-mini i {
  display: block;
  height: 100%;
  background: #059669;
  border-radius: 99px;
  transition: width 0.4s ease;
}

.etiqueta {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.et-verde { background: #d1fae5; color: #047857; }
.et-azul { background: #dbeafe; color: #1d4ed8; }
.et-rojo { background: #fee2e2; color: #991b1b; }
.et-gris { background: #f1f5f9; color: #64748b; }

.chip {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #475569;
  font-size: 0.68rem;
  font-weight: 600;
  margin-left: 6px;
}

.cuando {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 2px 8px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #64748b;
  white-space: nowrap;
}

.cuando.pronto { background: #fef3c7; color: #92400e; }

.paginador {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin: 14px 0 0;
}

/* ---------- Listas ---------- */
.lista { list-style: none; margin: 0; padding: 0; }

.lista li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px dotted #e2e8f0;
  font-size: 0.85rem;
}

.lista li:last-child { border-bottom: 0; }
.lista li.clic { cursor: pointer; }
.lista li.clic:hover { background: #f8fafc; }
.lista li.anulado { opacity: 0.5; }
.lista li b { color: #0f172a; }

.min0 { min-width: 0; }

/* ---------- Cuotas ---------- */
.cuotas { list-style: none; margin: 0; padding: 0; }

.cuotas li {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 9px 11px;
  margin-bottom: 6px;
  border: 1px solid #e2e8f0;
  border-radius: 9px;
  background: #fff;
}

.cuotas li.cubierta { border-color: #86efac; background: #f0fdf4; }
.cuotas li.atrasada { border-color: #fca5a5; background: #fef2f2; }

.num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  border-radius: 999px;
  background: #f1f5f9;
  color: #64748b;
  font-size: 0.72rem;
  font-weight: 700;
}

.marca { flex-shrink: 0; }

.cuota-fila {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 7px;
}

.cuota-fila .campo { flex: 1; }

/* ---------- Cifras ---------- */
.cifras {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 11px;
  margin: 14px 0;
}

.cifras > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 11px 12px;
  background: #f8fafc;
  border-radius: 9px;
}

.cifras span {
  font-size: 0.63rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #94a3b8;
}

.cifras b { font-size: 1.05rem; color: #0f172a; }
.cifras em { font-style: normal; color: #94a3b8; }

/* ---------- Secciones del detalle ---------- */
.seccion {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #f1f5f9;
}

.seccion-cab {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

h4 {
  margin: 0 0 9px;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #64748b;
}

table.interna {
  border: 1px solid #e2e8f0;
  border-radius: 9px;
  overflow: hidden;
}

table.interna td {
  padding: 8px 11px;
  font-size: 0.82rem;
}

.notas {
  margin: 12px 0 0;
  padding: 9px 11px;
  background: #f8fafc;
  border-left: 3px solid #6ee7b7;
  border-radius: 0 7px 7px 0;
  font-size: 0.8rem;
  color: #475569;
  font-style: italic;
  line-height: 1.5;
}

.faltantes { margin: 8px 0; padding-left: 18px; }

/* ---------- Constructor de líneas ---------- */
.constructor {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 15px;
}

.constructor-vacio {
  padding: 22px;
  text-align: center;
  color: #94a3b8;
  font-size: 0.85rem;
}

.linea {
  padding: 12px 13px;
  border-bottom: 1px solid #f1f5f9;
  background: #fff;
}

.linea:last-child { border-bottom: 0; }

.linea-cab {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin-bottom: 9px;
}

.linea-cab .crece { flex: 1; min-width: 0; font-size: 0.9rem; color: #0f172a; }

.linea-campos {
  display: grid;
  grid-template-columns: 1fr 1.3fr 1fr;
  gap: 10px;
}

.linea-campos label { font-size: 0.6rem; margin-bottom: 3px; }

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

.modal.ancho { max-width: 720px; }

.modal-cab {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px 14px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-cab h3 { margin: 0; font-size: 1.1rem; color: #0f172a; }
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

.fin { display: flex; flex-direction: column; justify-content: flex-end; }

.ayuda {
  margin: 5px 0 0;
  font-size: 0.75rem;
  color: #94a3b8;
  line-height: 1.5;
  text-transform: none;
  letter-spacing: 0;
  font-weight: 400;
}

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
  margin: 14px 0 0;
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

.generador {
  padding: 14px;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 10px;
  margin-bottom: 16px;
}

.generador .btn { margin-top: 12px; }

.opciones-fila {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
}

.opcion-chica {
  flex: 1 1 auto;
  min-height: 40px;
  padding: 0 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 9px;
  background: #fff;
  color: #475569;
  font-family: inherit;
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s, color 0.15s;
}

.opcion-chica.on {
  border-color: #059669;
  background: #059669;
  color: #fff;
}

.atajos-monto {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.chip-boton {
  padding: 5px 11px;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  background: #fff;
  color: #475569;
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
}

.chip-boton:hover { border-color: #059669; color: #047857; }

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
.btn-linea:disabled { background: transparent; color: #cbd5e1; }

.btn-rojo { background: #dc2626; }
.btn-rojo:hover:not(:disabled) { background: #b91c1c; }

.btn-mini {
  min-height: 34px;
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
}

.btn-icono {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #fff;
  color: #64748b;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}

.btn-icono:hover { border-color: #dc2626; color: #dc2626; }
.btn-icono.chico { width: 28px; height: 28px; }

.enlace-boton {
  padding: 0;
  border: none;
  background: none;
  color: #059669;
  font-family: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
}

.ancho { width: 100%; }

/* ---------- Varios ---------- */
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

/* ---------- Móvil ---------- */
@media (max-width: 900px) {
  .linea-campos { grid-template-columns: 1fr; }

  .tabla-envoltura {
    border: none;
    background: transparent;
    overflow: visible;
  }

  table:not(.interna),
  table:not(.interna) thead,
  table:not(.interna) tbody,
  table:not(.interna) tr,
  table:not(.interna) td { display: block; width: 100%; }

  table:not(.interna) thead { display: none; }

  table:not(.interna) tbody tr {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    margin-bottom: 11px;
    padding: 12px;
  }

  table:not(.interna) td {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 6px 0;
    border: none;
    text-align: right;
  }

  table:not(.interna) td::before {
    content: attr(data-label);
    font-size: 0.64rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #94a3b8;
    text-align: left;
    flex-shrink: 0;
  }

  td[data-label="Folio"], td[data-label="Cliente"], td[data-label="Evento"] {
    display: block;
    text-align: left;
  }

  td[data-label="Folio"]::before,
  td[data-label="Cliente"]::before,
  td[data-label="Evento"]::before { content: none; }

  tr.clic:hover td { background: transparent; }
  tr.vencida td { background: transparent; }
  tr.vencida { border-color: #fca5a5; }
  .fila.resaltada { animation: resalta 1400ms ease-out; }
  .fila.resaltada td { animation: none; }

  .campo-corto { flex: 1 1 100%; width: 100%; }
  .corta { max-width: none; }
}

@media (prefers-reduced-motion: reduce) {
  .btn, .btn-icono, .campo, .buscador, .opcion-chica,
  .tabla-envoltura, .riel-mini i, .fila td { transition: none; }

  .al-entrar, .fila, .fila.resaltada, .fila.resaltada td, .spinner { animation: none; }

  .tabla-envoltura.atenuada { opacity: 1; }
}
</style>