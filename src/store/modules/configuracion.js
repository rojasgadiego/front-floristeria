/**
 * Módulo de configuración — Floristería Colibrí
 * =========================================================================
 * Los datos que hoy están escritos a mano en el código: dirección y RUT del
 * ticket, el IVA, y las reglas del club de puntos.
 *
 * PERSISTENCIA: este módulo SÍ guarda en localStorage, a diferencia del
 * resto de la aplicación. Son ajustes del local, no datos transaccionales:
 * cambiar la dirección una vez y que se pierda al recargar no tiene sentido.
 * Las ventas, el inventario y los clientes siguen en memoria hasta que
 * exista el backend.
 *
 * Los módulos que consumen estos valores lo hacen con respaldo: si la
 * configuración no está registrada, usan sus constantes originales.
 * =========================================================================
 */

const CLAVE = 'colibri_configuracion'

export const CONFIG_POR_DEFECTO = {
    local: {
        nombre: 'Floristería Colibrí',
        giro: 'Venta al por menor de flores y plantas',
        rut: '76.543.210-K',
        direccion: 'Providencia 1842, Local 4',
        comuna: 'Providencia',
        ciudad: 'Santiago',
        telefono: '+56 9 1234 5678',
        correo: 'contacto@colibri.cl',
        instagram: '@floristeriacolibri'
    },
    ticket: {
        mensaje: '¡Gracias por preferirnos!',
        leyenda: 'Documento no tributario · conserve su ticket',
        mostrarPuntos: true
    },
    venta: {
        iva: 19
    },
    club: {
        activo: true,
        puntosPorPeso: 1000,  // $1.000 de compra = 1 punto
        valorPunto: 50,       // cada punto vale $50 al canjear
        canjeMinimo: 50
    }
}

/** Combina el guardado con los valores por defecto, sección por sección */
function leerGuardado() {
    try {
        const crudo = localStorage.getItem(CLAVE)
        if (!crudo) return JSON.parse(JSON.stringify(CONFIG_POR_DEFECTO))

        const guardado = JSON.parse(crudo)
        const resultado = JSON.parse(JSON.stringify(CONFIG_POR_DEFECTO))

        Object.keys(resultado).forEach(seccion => {
            if (guardado[seccion]) {
                resultado[seccion] = { ...resultado[seccion], ...guardado[seccion] }
            }
        })
        return resultado
    } catch (e) {
        console.error('Configuración guardada ilegible, se usan los valores por defecto:', e)
        return JSON.parse(JSON.stringify(CONFIG_POR_DEFECTO))
    }
}

const state = () => ({
    config: leerGuardado(),
    guardando: false
})

const getters = {
    config: (s) => s.config,
    local: (s) => s.config.local,
    ticket: (s) => s.config.ticket,
    guardando: (s) => s.guardando,

    /** Como fracción, listo para usar: 0.19 */
    iva: (s) => (s.config.venta.iva || 0) / 100,
    ivaPorcentaje: (s) => s.config.venta.iva || 0,

    club: (s) => s.config.club,
    clubActivo: (s) => s.config.club.activo,
    puntosPorPeso: (s) => s.config.club.puntosPorPeso,
    valorPunto: (s) => s.config.club.valorPunto,
    canjeMinimo: (s) => s.config.club.canjeMinimo,

    /** Dirección de una línea, para el ticket */
    direccionCompleta: (s) => {
        const l = s.config.local
        return [l.direccion, l.comuna, l.ciudad].filter(Boolean).join(' · ')
    }
}

const mutations = {
    SET_GUARDANDO(s, v) { s.guardando = v },
    SET_SECCION(s, { seccion, datos }) {
        s.config = { ...s.config, [seccion]: { ...s.config[seccion], ...datos } }
    },
    RESTAURAR(s) { s.config = JSON.parse(JSON.stringify(CONFIG_POR_DEFECTO)) }
}

const actions = {
    async guardarSeccion({ commit, state }, { seccion, datos }) {
        if (!CONFIG_POR_DEFECTO[seccion]) throw new Error('Sección de configuración desconocida.')

        if (seccion === 'venta') {
            const iva = Number(datos.iva)
            if (isNaN(iva) || iva < 0 || iva > 100) throw new Error('El IVA debe estar entre 0 y 100.')
        }

        if (seccion === 'club') {
            if (datos.puntosPorPeso < 1) throw new Error('El monto por punto debe ser mayor que cero.')
            if (datos.valorPunto < 1) throw new Error('El valor del punto debe ser mayor que cero.')
            if (datos.canjeMinimo < 1) throw new Error('El canje mínimo debe ser al menos 1 punto.')
        }

        if (seccion === 'local' && !datos.nombre?.trim()) {
            throw new Error('El nombre del local es obligatorio.')
        }

        commit('SET_GUARDANDO', true)
        try {
            // API real:  await api.put('/configuracion', { seccion, datos })
            await new Promise(r => setTimeout(r, 220))
            commit('SET_SECCION', { seccion, datos })
            localStorage.setItem(CLAVE, JSON.stringify(state.config))
        } finally {
            commit('SET_GUARDANDO', false)
        }
    },

    restaurarPorDefecto({ commit, state }) {
        commit('RESTAURAR')
        localStorage.setItem(CLAVE, JSON.stringify(state.config))
    }
}

export default { namespaced: true, state, getters, mutations, actions }