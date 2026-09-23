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

      <div class="filtros-linea">
        <select class="campo-select" :class="{ on: filtro.estado }" :value="filtro.estado ?? ''"
          @change="filtrar({ estado: $event.target.value || null })" aria-label="Estado">
          <option value="">Estado</option>
          <option v-for="(e, k) in ESTADOS" :key="k" :value="k">{{ e.texto }}</option>
        </select>

        <label class="check" :class="{ on: filtro.soloVencidas }">
          <input type="checkbox" :checked="filtro.soloVencidas"
            @change="filtrar({ soloVencidas: $event.target.checked })">
          <span>Saldo vencido</span>
        </label>

        <button v-if="hayFiltro" class="limpiar" @click="limpiarFiltros">Quitar filtros</button>
      </div>
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
            <!-- Aprobar compromete al local con el cliente: solo administración. -->
            <button v-if="esAdmin" class="btn" :disabled="guardando" @click="aprobar">Aprobar</button>
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
              La flor se puede ajustar ahí a lo que realmente salió: cobrar a
              ciegas lo cotizado dejaría el inventario diciendo que salió otra
              cosa. Lo hecho a medida, el traslado y el montaje van con su
              precio cotizado, y lo abonado se descuenta solo.
            </div>
          </template>
        </div>
        <div class="modal-pie">
          <button class="btn btn-linea" @click="volverAFicha">Cerrar</button>
          <button class="btn" :disabled="!preparacion || detalle.estado !== 'aprobada'" @click="irACobrar">
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
import { useRouter } from 'vue-router'
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
    /* La grilla de productos no trae `disponible`: se suma lo de bodega y
       lo del mesón, que es lo que se puede comprometer para el evento. */
    const disponibleDe = (id) => {
      const p = store.getters['productos/porId'](id)
      if (!p) return null
      return p.disponible ?? ((p.enBodega ?? 0) + (p.enVenta ?? 0))
    }

    /* ---------------- Carga ---------------- */
    let control = null

    onMounted(() => {
      control = new AbortController()
      const señal = { signal: control.signal }
      store.dispatch('cotizaciones/cargar', señal)
      store.dispatch('cotizaciones/cargarSeguimiento', señal)
      /* El catálogo completo: el POS deja el store filtrado a "solo lo del
         mesón", y un presupuesto puede llevar flor que hoy está en bodega. */
      store.dispatch('productos/filtrar', {
        buscar: '', categoriaId: null, tipo: null, activo: true,
        bajoMinimo: false, controlaLotes: null, soloEnVenta: false
      })
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
    const router = useRouter()

    /* El cobro se hace en el POS, que carga el evento desde la URL. */
    const irACobrar = () => {
      const id = detalle.value.id
      cerrarModal()
      router.push({ name: 'PuntoDeVenta', query: { cotizacion: id } })
    }

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
      irACobrar,
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
/* Todo con los tokens de src/assets/tokens.css: la pantalla sigue al tema
   claro/oscuro igual que el resto de la aplicación. Nada de hex sueltos. */

.cabecera,
.cabecera *,
.paneles *,
.barra-filtros *,
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
  0% { background: var(--success-soft); }
  100% { background: transparent; }
}

.fila.resaltada td { animation: resalta 1400ms ease-out; }

.spinner {
  display: inline-block;
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  border: 2px solid color-mix(in srgb, var(--accent-contrast) 35%, transparent);
  border-top-color: var(--accent-contrast);
  border-radius: 50%;
  animation: girar 0.8s linear infinite;
}

@keyframes girar { to { transform: rotate(360deg); } }

/* ═════════════ Encabezado ═════════════ */
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
  color: var(--text);
}

.pista {
  margin: 4px 0 0;
  font-size: 0.875rem;
  color: var(--text-muted);
  max-width: 64ch;
  line-height: 1.5;
}

.banda {
  display: flex;
  align-items: center;
  gap: 11px;
  flex-wrap: wrap;
  padding: 12px 16px;
  border-radius: var(--r-sm);
  margin-bottom: 16px;
  font-size: 0.875rem;
}

.banda-error {
  background: var(--danger-soft);
  border: 1px solid var(--danger-border);
  color: var(--danger);
}

.banda .btn { margin-left: auto; }

/* ═════════════ Paneles de seguimiento ═════════════ */
.paneles {
  display: grid;
  /* min(100%, …): en un celular angosto la tarjeta no desborda. */
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
  gap: 14px;
  margin-bottom: 18px;
}

.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  padding: 16px;
  box-shadow: var(--shadow-sm);
}

.panel.urgente {
  border-color: var(--danger-border);
  background: color-mix(in srgb, var(--danger-soft) 45%, var(--surface));
}

.panel-cab {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.panel h3 { margin: 0; font-size: 0.95rem; color: var(--text); }

/* ═════════════ Filtros ═════════════
   En pantalla ancha, una fila con el buscador estirado. En el celular, una
   card con todo en columna (ver el @media). Igual que Clientes e Inventario. */
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
  flex: 1 1 240px;
  min-width: 0;
  min-height: 44px;
  padding: 0 12px;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--r-sm);
  color: var(--text);
  transition: border-color var(--t-fast), box-shadow var(--t-fast);
}

.buscador:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.buscador input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: none;
  color: var(--text);
  font-family: inherit;
  font-size: max(0.9rem, 16px);
}

.filtros-linea {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

/* El select vestido de pastilla: se marca cuando está filtrando. */
.campo-select {
  min-height: 44px;
  max-width: 220px;
  padding: 0 34px 0 14px;
  border: 1px solid var(--border-strong);
  border-radius: var(--r-sm);
  background:
    var(--surface)
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")
    no-repeat right 13px center;
  color: var(--text-muted);
  font: inherit;
  font-size: max(0.85rem, 16px);
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

/* El checkbox como pastilla, igual que en Clientes e Inventario. `margin: 0`
   porque la regla de label de los formularios le agrega uno abajo. */
.check {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  margin: 0;
  min-height: 44px;
  padding: 0 14px 0 12px;
  border: 1px solid var(--border-strong);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--text-muted);
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
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
  border: solid var(--accent-contrast);
  border-width: 0 2px 2px 0;
  transform: rotate(45deg) scale(0);
  transition: transform .12s ease;
}

.check input:checked {
  background: var(--accent);
  border-color: var(--accent);
}

.check input:checked::after { transform: rotate(45deg) scale(1); }

.check input:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.limpiar {
  min-height: 44px;
  padding: 0 14px;
  border: 1px dashed var(--border-strong);
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--text-muted);
  font: inherit;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
}

.limpiar:hover { border-color: var(--accent); color: var(--accent-text); }

/* ═════════════ Campos de formulario ═════════════ */
.campo {
  width: 100%;
  min-height: 44px;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--text);
  font-family: inherit;
  font-size: max(0.9rem, 16px);
  outline: none;
  transition: border-color var(--t-fast), box-shadow var(--t-fast);
}

.campo:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.campo.chico {
  min-height: 40px;
  padding: 0.4rem 0.6rem;
  font-size: max(0.85rem, 16px);
}

.campo.fijo {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--surface-2);
  color: var(--text-muted);
}

textarea.campo { min-height: 72px; resize: vertical; line-height: 1.5; }

/* ═════════════ Tabla ═════════════ */
.tabla-envoltura {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  overflow-x: auto;
  box-shadow: var(--shadow-sm);
  transition: opacity 0.14s ease;
}

.tabla-envoltura.atenuada { opacity: 0.45; }

table { width: 100%; border-collapse: collapse; }

th {
  text-align: left;
  padding: 11px 14px;
  background: var(--surface-2);
  border-bottom: 1px solid var(--border);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--text-muted);
  white-space: nowrap;
}

td {
  padding: 11px 14px;
  border-bottom: 1px solid var(--border);
  font-size: 0.875rem;
  color: var(--text);
  vertical-align: middle;
}

tbody tr:last-child td { border-bottom: 0; }
tr.clic { cursor: pointer; }
tr.anulada { opacity: 0.5; }
.fila td { transition: background-color var(--t-fast); }
tr.clic:hover td { background: color-mix(in srgb, var(--accent) 4%, var(--surface)); }

/* Un saldo vencido tiene que verse en la fila, no solo en la columna. */
tr.vencida td { background: color-mix(in srgb, var(--danger-soft) 55%, var(--surface)); }
tr.vencida:hover td { background: var(--danger-soft); }

.der { text-align: right; }
.suave { color: var(--text-muted); }
.mini { font-size: 0.76rem; }
.rojo { color: var(--danger); }
.verde { color: var(--success); }

.dato { font-variant-numeric: tabular-nums; font-weight: 600; }
.dato.grande { font-size: 1.2rem; }

.corta {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.acciones-col { width: 1%; white-space: nowrap; }

.flecha { color: var(--text-faint); font-size: 1.1rem; }

.riel-mini {
  height: 4px;
  margin-top: 4px;
  background: var(--surface-2);
  border-radius: var(--r-full);
  overflow: hidden;
}

.riel-mini i {
  display: block;
  height: 100%;
  background: var(--success);
  border-radius: var(--r-full);
  transition: width 0.4s ease;
}

.etiqueta {
  display: inline-block;
  padding: 2px 8px;
  border-radius: var(--r-full);
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

/* Las clases vienen de ESTADOS, en el store. */
.et-verde { background: var(--success-soft); color: var(--success); }
.et-azul { background: var(--info-soft); color: var(--info); }
.et-rojo { background: var(--danger-soft); color: var(--danger); }
.et-gris { background: var(--surface-2); color: var(--text-muted); }

.chip {
  display: inline-block;
  padding: 2px 8px;
  border-radius: var(--r-full);
  background: var(--surface-2);
  color: var(--text-muted);
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
  border-radius: var(--r-full);
  background: var(--surface-2);
  color: var(--text-muted);
  white-space: nowrap;
}

.cuando.pronto { background: var(--warn-soft); color: var(--warn); }

.paginador {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 14px;
  margin: 14px 0 0;
}

/* ═════════════ Listas ═════════════ */
.lista { list-style: none; margin: 0; padding: 0; }

.lista li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  padding: 8px 0;
  border-bottom: 1px dotted var(--border);
  font-size: 0.85rem;
  color: var(--text);
}

.lista li:last-child { border-bottom: 0; }
.lista li.clic { cursor: pointer; border-radius: var(--r-sm); }
.lista li.clic:hover { background: var(--surface-2); }
.lista li.anulado { opacity: 0.5; }
.lista li b { color: var(--text); }
/* El monto atrasado en rojo: sin esto la regla de arriba lo deja negro. */
.lista li b.rojo { color: var(--danger); }

.min0 { min-width: 0; }

/* ═════════════ Cuotas ═════════════ */
.cuotas { list-style: none; margin: 0; padding: 0; }

.cuotas li {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 9px 11px;
  margin-bottom: 6px;
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  background: var(--surface);
}

.cuotas li.cubierta { border-color: var(--success); background: var(--success-soft); }
.cuotas li.atrasada { border-color: var(--danger-border); background: var(--danger-soft); }

.num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  border-radius: var(--r-full);
  background: var(--surface-2);
  color: var(--text-muted);
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

.cuota-fila .campo { flex: 1; min-width: 0; }

/* ═════════════ Cifras ═════════════ */
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
  background: var(--surface-2);
  border-radius: var(--r-sm);
}

.cifras span {
  font-size: 0.63rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-faint);
}

.cifras b { font-size: 1.05rem; color: var(--text); }
.cifras b.verde { color: var(--success); }
.cifras b.rojo { color: var(--danger); }
.cifras em { font-style: normal; color: var(--text-faint); }

/* ═════════════ Secciones del detalle ═════════════ */
.seccion {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
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
  color: var(--text-muted);
}

table.interna {
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  border-collapse: separate;
  border-spacing: 0;
  overflow: hidden;
}

table.interna td {
  padding: 8px 11px;
  font-size: 0.82rem;
}

.notas {
  margin: 12px 0 0;
  padding: 9px 11px;
  background: var(--surface-2);
  border-left: 3px solid var(--accent);
  border-radius: 0 var(--r-sm) var(--r-sm) 0;
  font-size: 0.8rem;
  color: var(--text-muted);
  font-style: italic;
  line-height: 1.5;
}

.faltantes { margin: 8px 0; padding-left: 18px; }

/* ═════════════ Constructor de líneas ═════════════ */
.constructor {
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  overflow: hidden;
  margin-bottom: 15px;
}

.constructor-vacio {
  padding: 22px;
  text-align: center;
  color: var(--text-faint);
  font-size: 0.85rem;
}

.linea {
  padding: 12px 13px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}

.linea:last-child { border-bottom: 0; }

.linea-cab {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin-bottom: 9px;
}

.linea-cab .crece { flex: 1; min-width: 0; font-size: 0.9rem; color: var(--text); }

.linea-campos {
  display: grid;
  grid-template-columns: 1fr 1.3fr 1fr;
  gap: 10px;
}

.linea-campos label { font-size: 0.6rem; margin-bottom: 3px; }

/* ═════════════ Modales ═════════════ */
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
  overflow: hidden;
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-lg);
}

.modal.ancho { max-width: 720px; }

.modal-cab {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--border);
}

.modal-cab h3 { margin: 0; font-size: 1.1rem; color: var(--text); }
.modal-cab p { margin: 4px 0 0; font-size: 0.82rem; color: var(--text-muted); }

.modal-cuerpo { padding: 18px 20px; overflow-y: auto; }

.modal-pie {
  display: flex;
  gap: 9px;
  justify-content: flex-end;
  flex-wrap: wrap;
  padding: 14px 20px;
  border-top: 1px solid var(--border);
}

label {
  display: block;
  margin-bottom: 5px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.grupo { margin-bottom: 15px; }

.rejilla {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 150px), 1fr));
  gap: 13px;
}

.fin { display: flex; flex-direction: column; justify-content: flex-end; }

.ayuda {
  margin: 5px 0 0;
  font-size: 0.75rem;
  color: var(--text-faint);
  line-height: 1.5;
  text-transform: none;
  letter-spacing: 0;
  font-weight: 400;
}

.error {
  padding: 10px 13px;
  margin-bottom: 14px;
  border-radius: var(--r-sm);
  border-left: 4px solid var(--danger);
  background: var(--danger-soft);
  color: var(--danger);
  font-size: 0.85rem;
}

.nota {
  padding: 11px 13px;
  margin: 14px 0 0;
  border-radius: 0 var(--r-sm) var(--r-sm) 0;
  border-left: 3px solid var(--success);
  background: var(--success-soft);
  font-size: 0.83rem;
  color: var(--text);
  line-height: 1.6;
}

.nota.alerta {
  border-color: var(--warn);
  background: var(--warn-soft);
}

.generador {
  padding: 14px;
  background: var(--surface-2);
  border: 1px dashed var(--border-strong);
  border-radius: var(--r-sm);
  margin-bottom: 16px;
}

.generador .btn { margin-top: 12px; }

.opciones-fila {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 7px;
}

.opcion-chica {
  min-height: 44px;
  padding: 0 14px;
  border: 1.5px solid var(--border);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--text-muted);
  font-family: inherit;
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color var(--t-fast), background-color var(--t-fast), color var(--t-fast);
}

.opcion-chica.on {
  border-color: var(--accent);
  background: var(--accent);
  color: var(--accent-contrast);
}

.atajos-monto {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.chip-boton {
  min-height: 36px;
  padding: 5px 12px;
  border: 1px solid var(--border);
  border-radius: var(--r-full);
  background: var(--surface);
  color: var(--text-muted);
  font-family: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
}

.chip-boton:hover { border-color: var(--accent); color: var(--accent-text); }

/* ═════════════ Botones ═════════════ */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 44px;
  padding: 0.65rem 1.15rem;
  border: none;
  border-radius: var(--r-sm);
  background: var(--accent);
  color: var(--accent-contrast);
  font-family: inherit;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color var(--t-fast), transform 0.1s;
  -webkit-tap-highlight-color: transparent;
}

.btn:hover:not(:disabled) { background: var(--accent-hover); }
.btn:active:not(:disabled) { transform: scale(0.97); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-linea {
  background: transparent;
  border: 1px solid var(--border-strong);
  color: var(--text-muted);
}

.btn-linea:hover:not(:disabled) { background: var(--surface-2); color: var(--text); }

.btn-rojo { background: var(--danger); color: var(--surface); }
.btn-rojo:hover:not(:disabled) { background: color-mix(in srgb, var(--danger) 85%, var(--text)); }

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
  flex-shrink: 0;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--text-muted);
  cursor: pointer;
  transition: border-color var(--t-fast), color var(--t-fast);
}

.btn-icono:hover { border-color: var(--danger); color: var(--danger); }
.btn-icono.chico { width: 30px; height: 30px; }

.enlace-boton {
  min-height: 32px;
  padding: 0;
  border: none;
  background: none;
  color: var(--accent-text);
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
}

.ancho { width: 100%; }

/* ═════════════ Varios ═════════════ */
.vacio {
  text-align: center;
  padding: 44px 20px;
  color: var(--text-muted);
  background: var(--surface);
  border: 1px dashed var(--border-strong);
  border-radius: var(--r-md);
}

.vacio strong {
  display: block;
  color: var(--text);
  font-size: 1.05rem;
  margin-bottom: 5px;
}

.aviso {
  position: fixed;
  bottom: max(22px, env(safe-area-inset-bottom));
  left: 50%;
  transform: translateX(-50%);
  z-index: 120;
  max-width: 90vw;
  padding: 12px 20px;
  border-radius: var(--r-sm);
  background: var(--text);
  color: var(--bg);
  font-size: 0.875rem;
  font-weight: 600;
  box-shadow: var(--shadow-lg);
  text-align: center;
}

.aviso.malo { background: var(--danger); color: var(--surface); }

/* ═════════════ Tablet / móvil ═════════════ */
@media (max-width: 900px) {
  .linea-campos { grid-template-columns: 1fr 1fr; }
  .linea-campos > div:last-child { grid-column: 1 / -1; }

  /* La grilla pasa a tarjetas: una por presupuesto. */
  .tabla-envoltura {
    border: none;
    background: transparent;
    box-shadow: none;
    overflow: visible;
  }

  table:not(.interna),
  table:not(.interna) thead,
  table:not(.interna) tbody,
  table:not(.interna) tr,
  table:not(.interna) td { display: block; width: 100%; }

  table:not(.interna) thead { display: none; }

  table:not(.interna) tbody tr {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    column-gap: 12px;
    margin-bottom: 10px;
    padding: 14px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    box-shadow: var(--shadow-sm);
  }

  table:not(.interna) td {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 5px 0;
    border: none;
    text-align: right;
    background: transparent !important;
  }

  table:not(.interna) td::before {
    content: attr(data-label);
    font-size: 0.64rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-faint);
    text-align: left;
    flex-shrink: 0;
  }

  /* Cabecera de la tarjeta: folio a la izquierda, estado a la derecha.
     Con el prefijo `table:not(.interna)`: sin él, la regla general de td
     pesa más y pisa estas. */
  table:not(.interna) td[data-label="Folio"] { grid-column: 1; grid-row: 1; display: block; text-align: left; }
  table:not(.interna) td[data-label="Estado"] { grid-column: 2; grid-row: 1; display: block; }
  table:not(.interna) td[data-label="Cliente"],
  table:not(.interna) td[data-label="Evento"] { grid-column: 1 / -1; display: block; text-align: left; }
  table:not(.interna) td[data-label="Total"],
  table:not(.interna) td[data-label="Abonado"],
  table:not(.interna) td[data-label="Cobro"] { grid-column: 1 / -1; }

  table:not(.interna) td[data-label="Folio"]::before,
  table:not(.interna) td[data-label="Estado"]::before,
  table:not(.interna) td[data-label="Cliente"]::before,
  table:not(.interna) td[data-label="Evento"]::before { content: none; }

  table:not(.interna) td[data-label="Cliente"] { padding-top: 8px; }
  table:not(.interna) td[data-label="Total"] { margin-top: 6px; padding-top: 10px; border-top: 1px solid var(--border); }
  /* Rótulo y monto en una línea, la barra de avance debajo a todo el ancho. */
  table:not(.interna) td[data-label="Abonado"] { flex-wrap: wrap; row-gap: 6px; }
  table:not(.interna) td[data-label="Abonado"] .riel-mini { flex-basis: 100%; margin-top: 0; }

  /* La flecha no hace falta: la tarjeta entera se toca. */
  table:not(.interna) td.acciones-col { display: none; }

  tr.vencida { border-color: var(--danger-border) !important; }
  .fila.resaltada { animation: resalta 1400ms ease-out; }
  .fila.resaltada td { animation: none; }

  .corta { max-width: none; }
}

@media (max-width: 720px) {
  .cabecera { flex-direction: column; align-items: stretch; }
  .cabecera .btn { width: 100%; }

  /* Filtros en una card, en columna, cada control a todo el ancho. */
  .barra-filtros {
    flex-direction: column;
    align-items: stretch;
    padding: 12px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
  }

  .buscador { flex: 0 0 auto; }

  .filtros-linea { flex-direction: column; align-items: stretch; }
  .filtros-linea > * { width: 100%; max-width: none; }
  .check { justify-content: center; }

  /* Modales a pantalla completa: en el celular un modal centrado deja
     márgenes que no sirven y achica lo que hay que escribir. */
  .fondo { align-items: stretch; padding: 0; }

  .modal,
  .modal.ancho {
    max-width: none;
    max-height: none;
    height: 100dvh;
    border: 0;
    border-radius: 0;
  }

  .modal-cab { padding: 16px 16px 12px; }
  .modal-cuerpo { padding: 16px; flex: 1; }

  .modal-pie {
    padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
  }

  /* Los botones del pie se reparten el ancho; el principal queda al final,
     bajo el pulgar. */
  .modal-pie .btn { flex: 1 1 calc(50% - 5px); }

  .cifras { grid-template-columns: 1fr 1fr; }

  .cuota-fila { flex-wrap: wrap; }
  .cuota-fila .campo { flex: 1 1 calc(50% - 30px); }

  .opciones-fila { grid-template-columns: 1fr 1fr; }

  table.interna td { padding: 8px; }
}

@media (prefers-reduced-motion: reduce) {
  .btn, .btn-icono, .campo, .buscador, .opcion-chica, .check,
  .tabla-envoltura, .riel-mini i, .fila td { transition: none; }

  .al-entrar, .fila, .fila.resaltada, .fila.resaltada td, .spinner,
  .check input::after { animation: none; transition: none; }

  .tabla-envoltura.atenuada { opacity: 1; }
}
</style>