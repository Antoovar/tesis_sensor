import React, { useEffect, useMemo, useRef, useState } from "react";
import "../App.css";
import { History, Download, Filter, Search, Eraser } from "lucide-react";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase/config";

const DEVICE_ID = "esp32_01";
const HISTORY_PATH = `devices/${DEVICE_ID}/history_full`;

function parseCustomTimestamp(timestamp) {
    if (!timestamp || typeof timestamp !== "string") return null;

    const [fecha, hora] = timestamp.split(",");
    if (!fecha || !hora) return null;

    const [dia, mes, anio] = fecha.split("/");
    const [hh, mm, ss] = hora.split(":");

    return new Date(
        Number(anio),
        Number(mes) - 1,
        Number(dia),
        Number(hh),
        Number(mm),
        Number(ss)
    );
}

function formatFecha(timestamp) {
    const date = parseCustomTimestamp(timestamp);
    if (!date) return "--";

    return date.toLocaleDateString("es-AR");
}

function formatHora(timestamp) {
    const date = parseCustomTimestamp(timestamp);
    if (!date) return "--";

    return date.toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}

function descargarCSV(registros) {
    if (!registros.length) return;

    const encabezados = ["Fecha", "Hora", "Altura_mm"];

    const filas = registros.map((item) => [
        formatFecha(item.timestamp),
        formatHora(item.timestamp),
        item.altura ?? "",
    ]);

    const contenido = [encabezados, ...filas]
        .map((fila) => fila.join(","))
        .join("\n");

    const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "historial_mediciones.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function buildDateTime(fecha, hora, isEnd = false) {
    if (!fecha) return null;

    const horaFinal = hora || (isEnd ? "23:59:59" : "00:00:00");
    return new Date(`${fecha}T${horaFinal}`);
}

function Historial() {
    const fechaDesdeRef = useRef(null);
    const fechaHastaRef = useRef(null);

    const [fechaDesde, setFechaDesde] = useState("");
    const [horaDesde, setHoraDesde] = useState("");
    const [fechaHasta, setFechaHasta] = useState("");
    const [horaHasta, setHoraHasta] = useState("");

    const [todosLosRegistros, setTodosLosRegistros] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const historyRef = ref(db, HISTORY_PATH);

        const unsubscribe = onValue(
            historyRef,
            (snapshot) => {
                const data = snapshot.val();

                if (!data) {
                    setTodosLosRegistros([]);
                    setLoading(false);
                    return;
                }

                const lista = Object.entries(data)
                    .map(([id, value]) => {
                        const fecha = parseCustomTimestamp(value.timestamp);

                        return {
                            id,
                            timestamp: value.timestamp ?? "",
                            timestampMs: fecha ? fecha.getTime() : 0,
                            altura: value.altura ?? 0,
                            batteryPct: value.batteryPct ?? null,
                            error: value.error ?? null,
                        };
                    })
                    .filter((item) => item.timestampMs > 0)
                    .sort((a, b) => b.timestampMs - a.timestampMs);

                setTodosLosRegistros(lista);
                setError("");
                setLoading(false);
            },
            (err) => {
                console.error("Error al leer history_full:", err);
                setError("No se pudo cargar el historial desde Firebase.");
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    const registrosFiltrados = useMemo(() => {
        const desde = buildDateTime(fechaDesde, horaDesde, false);
        const hasta = buildDateTime(fechaHasta, horaHasta, true);

        return todosLosRegistros.filter((item) => {
            const fechaItem = new Date(item.timestampMs);

            if (desde && fechaItem < desde) return false;
            if (hasta && fechaItem > hasta) return false;

            return true;
        });
    }, [todosLosRegistros, fechaDesde, horaDesde, fechaHasta, horaHasta]);

    const abrirCalendario = (inputRef) => {
        if (!inputRef.current) return;

        if (typeof inputRef.current.showPicker === "function") {
            inputRef.current.showPicker();
        } else {
            inputRef.current.focus();
            inputRef.current.click();
        }
    };

    const limpiarFiltros = () => {
        setFechaDesde("");
        setHoraDesde("");
        setFechaHasta("");
        setHoraHasta("");
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">
                    <History size={28} />
                    Historial
                </h1>
                <p className="page-subtitle">
                    Consultá las mediciones registradas de altura y descargalas en CSV.
                </p>
            </div>

            <div className="history-card">
                <div className="history-toolbar">
                    <div className="history-filters">
                        <div className="filter-group">
                            <label htmlFor="fecha-desde">Fecha desde</label>
                            <div className="date-input-wrapper">
                                <input
                                    ref={fechaDesdeRef}
                                    id="fecha-desde"
                                    type="date"
                                    value={fechaDesde}
                                    onChange={(e) => setFechaDesde(e.target.value)}
                                />
                                <button
                                    type="button"
                                    className="calendar-btn"
                                    onClick={() => abrirCalendario(fechaDesdeRef)}
                                    aria-label="Abrir calendario"
                                >
                                    📅
                                </button>
                            </div>
                        </div>

                        <div className="filter-group">
                            <label htmlFor="hora-desde">Hora desde</label>
                            <input
                                id="hora-desde"
                                type="time"
                                value={horaDesde}
                                onChange={(e) => setHoraDesde(e.target.value)}
                            />
                        </div>

                        <div className="filter-group">
                            <label htmlFor="fecha-hasta">Fecha hasta</label>
                            <div className="date-input-wrapper">
                                <input
                                    ref={fechaHastaRef}
                                    id="fecha-hasta"
                                    type="date"
                                    value={fechaHasta}
                                    onChange={(e) => setFechaHasta(e.target.value)}
                                />
                                <button
                                    type="button"
                                    className="calendar-btn"
                                    onClick={() => abrirCalendario(fechaHastaRef)}
                                    aria-label="Abrir calendario"
                                >
                                    📅
                                </button>
                            </div>
                        </div>

                        <div className="filter-group">
                            <label htmlFor="hora-hasta">Hora hasta</label>
                            <input
                                id="hora-hasta"
                                type="time"
                                value={horaHasta}
                                onChange={(e) => setHoraHasta(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="history-actions">
                        <button className="secondary-btn" disabled>
                            <Search size={16} />
                            Buscar
                        </button>

                        <button className="secondary-btn" onClick={limpiarFiltros}>
                            <Eraser size={16} />
                            Limpiar
                        </button>

                        <button
                            className="download-btn"
                            onClick={() => descargarCSV(registrosFiltrados)}
                            disabled={!registrosFiltrados.length}
                        >
                            <Download size={18} />
                            Descargar CSV
                        </button>
                    </div>
                </div>

                <div className="history-results">
                    <p>
                        <Filter size={16} />
                        Registros encontrados: <strong>{registrosFiltrados.length}</strong>
                    </p>
                </div>

                {loading && <p className="history-message">Cargando historial...</p>}
                {error && <p className="history-message error">{error}</p>}

                {!loading && !error && (
                    <div className="table-wrapper">
                        <table className="history-table">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Hora</th>
                                    <th>Altura</th>
                                </tr>
                            </thead>

                            <tbody>
                                {registrosFiltrados.length > 0 ? (
                                    registrosFiltrados.map((item) => (
                                        <tr key={item.id}>
                                            <td>{formatFecha(item.timestamp)}</td>
                                            <td>{formatHora(item.timestamp)}</td>
                                            <td>{item.altura} mm</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="3" className="empty-row">
                                            No hay registros para ese rango de fecha y hora.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Historial;