import { useEffect, useMemo, useState, useRef } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase/config";

import "../App.css";
import SensorCard from "../components/SensorCard";
import GaugeNivel from "../components/GaugeNivel";

import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend
);

function Dashboard() {
  const hoy = new Date();
  const ayer = new Date();
  ayer.setDate(hoy.getDate() - 1);

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [latest, setLatest] = useState(null);
  const [historyChart, setHistoryChart] = useState([]);
  const [intervaloGrafico, setIntervaloGrafico] = useState(60);
  const [fechaDesde, setFechaDesde] = useState(formatDate(ayer));
  const [fechaHasta, setFechaHasta] = useState(formatDate(hoy));
  const [horaDesde, setHoraDesde] = useState("00:00");
  const [horaHasta, setHoraHasta] = useState("23:59");

  const fechaDesdeRef = useRef(null);
  const fechaHastaRef = useRef(null);

  const alturaMax = 500;
  const MAX_PUNTOS_GRAFICO = 90000;

  const opcionesHora = [
    "00:00",
    "01:00",
    "02:00",
    "03:00",
    "04:00",
    "05:00",
    "06:00",
    "07:00",
    "08:00",
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00",
    "19:00",
    "20:00",
    "21:00",
    "22:00",
    "23:00",
    "23:59",
  ];

  function parseTimestamp(ts) {
    if (!ts) return null;

    const [fecha, hora] = ts.split(",");
    if (!fecha || !hora) return null;

    const [dia, mes, anio] = fecha.split("/").map(Number);
    const [h, m, s] = hora.split(":").map(Number);

    return new Date(anio, mes - 1, dia, h, m, s);
  }

  function parseInputDateTime(fecha, hora, esFin = false) {
    if (!fecha) return null;

    const [anio, mes, dia] = fecha.split("-").map(Number);

    if (!hora) {
      return esFin
        ? new Date(anio, mes - 1, dia, 23, 59, 59, 999)
        : new Date(anio, mes - 1, dia, 0, 0, 0, 0);
    }

    const [h, m] = hora.split(":").map(Number);

    if (esFin) {
      return new Date(anio, mes - 1, dia, h, m, 59, 999);
    }

    return new Date(anio, mes - 1, dia, h, m, 0, 0);
  }

  function normalizarAltura(valor) {
    const num = Number(valor);

    if (!Number.isFinite(num)) return null;
    if (num < 0 || num > alturaMax) return null;

    return num;
  }

  function formatNumber(value, decimals = 2) {
    const num = Number(value);

    if (!Number.isFinite(num)) return "0";

    return num.toFixed(decimals);
  }

  function formatTimestampFromDate(fecha) {
    const dd = String(fecha.getDate()).padStart(2, "0");
    const mm = String(fecha.getMonth() + 1).padStart(2, "0");
    const yyyy = fecha.getFullYear();

    const hh = String(fecha.getHours()).padStart(2, "0");
    const min = String(fecha.getMinutes()).padStart(2, "0");
    const ss = String(fecha.getSeconds()).padStart(2, "0");

    return `${dd}/${mm}/${yyyy},${hh}:${min}:${ss}`;
  }

  function formatLabelFromDate(fecha) {
    const dd = String(fecha.getDate()).padStart(2, "0");
    const mm = String(fecha.getMonth() + 1).padStart(2, "0");
    const hh = String(fecha.getHours()).padStart(2, "0");
    const min = String(fecha.getMinutes()).padStart(2, "0");
    const ss = String(fecha.getSeconds()).padStart(2, "0");

    const mismoDia = fechaDesde === fechaHasta;

    if (intervaloGrafico >= 3600) {
      return mismoDia ? `${hh}:00` : `${dd}/${mm} ${hh}:00`;
    }

    if (intervaloGrafico >= 60) {
      return mismoDia ? `${hh}:${min}` : `${dd}/${mm} ${hh}:${min}`;
    }

    return mismoDia ? `${hh}:${min}:${ss}` : `${dd}/${mm} ${hh}:${min}:${ss}`;
  }

  useEffect(() => {
    const latestRef = ref(db, "devices/esp32_01/latest");
    const historyChartRef = ref(db, "devices/esp32_01/history_chart");

    const unsubscribeLatest = onValue(latestRef, (snapshot) => {
      const data = snapshot.val();
      setLatest(data || null);
    });

    const unsubscribeHistory = onValue(historyChartRef, (snapshot) => {
      const data = snapshot.val();

      if (data) {
        const arrayData = Object.values(data);

        arrayData.sort((a, b) => {
          const fechaA = parseTimestamp(a.timestamp);
          const fechaB = parseTimestamp(b.timestamp);

          if (!fechaA || !fechaB) return 0;
          return fechaA - fechaB;
        });

        setHistoryChart(arrayData);
      } else {
        setHistoryChart([]);
      }
    });

    return () => {
      unsubscribeLatest();
      unsubscribeHistory();
    };
  }, []);

  const alturaActualRaw = Number(latest?.altura);
  const alturaActual = Number.isFinite(alturaActualRaw) ? alturaActualRaw : 0;
  const alturaActualMostrada = Math.max(0, Math.min(alturaActual, alturaMax));
  const porcentaje = (alturaActualMostrada / alturaMax) * 100;

  const rangoSeleccionado = useMemo(() => {
    const desdeDate = parseInputDateTime(fechaDesde, horaDesde, false);
    const hastaDate = parseInputDateTime(fechaHasta, horaHasta, true);

    if (!desdeDate || !hastaDate || desdeDate > hastaDate) {
      return { desdeDate: null, hastaDate: null };
    }

    return { desdeDate, hastaDate };
  }, [fechaDesde, fechaHasta, horaDesde, horaHasta]);

  const demasiadosPuntos = useMemo(() => {
    const { desdeDate, hastaDate } = rangoSeleccionado;
    if (!desdeDate || !hastaDate) return false;

    const intervaloMs = intervaloGrafico * 1000;

    const inicioMs =
      Math.floor(desdeDate.getTime() / intervaloMs) * intervaloMs;

    const finMs =
      Math.floor(hastaDate.getTime() / intervaloMs) * intervaloMs;

    const cantidadPuntos =
      Math.floor((finMs - inicioMs) / intervaloMs) + 1;

    return cantidadPuntos > MAX_PUNTOS_GRAFICO;
  }, [rangoSeleccionado, intervaloGrafico]);

  const historyChartFiltrado = useMemo(() => {
    const { desdeDate, hastaDate } = rangoSeleccionado;

    if (!desdeDate || !hastaDate) return [];
    if (demasiadosPuntos) return [];

    const intervaloMs = intervaloGrafico * 1000;

    const filtradosPorRango = historyChart.filter((item) => {
      const fecha = parseTimestamp(item.timestamp);
      if (!fecha) return false;

      const altura = normalizarAltura(item.altura);
      if (altura === null) return false;

      return fecha >= desdeDate && fecha <= hastaDate;
    });

    const buckets = new Map();

    for (const item of filtradosPorRango) {
      const fecha = parseTimestamp(item.timestamp);
      if (!fecha) continue;

      const altura = normalizarAltura(item.altura);
      if (altura === null) continue;

      const bucketMs =
        Math.floor(fecha.getTime() / intervaloMs) * intervaloMs;

      buckets.set(bucketMs, {
        timestamp: formatTimestampFromDate(new Date(bucketMs)),
        alturaNormalizada: Number(altura),
      });
    }

    const inicioMs =
      Math.floor(desdeDate.getTime() / intervaloMs) * intervaloMs;

    const finMs =
      Math.floor(hastaDate.getTime() / intervaloMs) * intervaloMs;

    const resultado = [];

    for (let t = inicioMs; t <= finMs; t += intervaloMs) {
      if (buckets.has(t)) {
        resultado.push(buckets.get(t));
      } else {
        resultado.push({
          timestamp: formatTimestampFromDate(new Date(t)),
          alturaNormalizada: null,
        });
      }
    }

    return resultado;
  }, [historyChart, rangoSeleccionado, intervaloGrafico, demasiadosPuntos]);

  const chartLabels = historyChartFiltrado.map((item) => {
    const fecha = parseTimestamp(item.timestamp);
    if (!fecha) return "";
    return formatLabelFromDate(fecha);
  });

  const cantidadPuntosValidos = historyChartFiltrado.filter(
    (p) => p.alturaNormalizada !== null
  ).length;

  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        label: "Altura del agua (mm)",
        data: historyChartFiltrado.map((item) => item.alturaNormalizada),
        borderColor: "#38bdf8",
        backgroundColor: "rgba(56, 189, 248, 0.15)",
        borderWidth: 3,
        tension: 0.25,
        fill: false,
        spanGaps: intervaloGrafico === 1 ? true : false,
        pointRadius:
          intervaloGrafico === 1
            ? 2
            : cantidadPuntosValidos <= 3
              ? 5
              : 2,
        pointHoverRadius: intervaloGrafico === 1 ? 4 : 5,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        callbacks: {
          title: (tooltipItems) => {
            const index = tooltipItems[0].dataIndex;
            return historyChartFiltrado[index]?.timestamp || "";
          },
          label: (tooltipItem) => {
            if (tooltipItem.raw === null) return "Sin medición";
            return `Altura: ${tooltipItem.raw} mm`;
          },
        },
      },
    },
    scales: {
      y: {
        min: 0,
        max: alturaMax,
        title: {
          display: true,
          text: "Altura (mm)",
        },
        grid: {
          color: "#e2e8f0",
        },
      },
      x: {
        title: {
          display: true,
          text: "Tiempo",
        },
        ticks: {
          autoSkip: true,
          maxTicksLimit: 8,
          maxRotation: 0,
          minRotation: 0,
        },
        grid: {
          display: false,
        },
      },
    },
  };

  const metricasPeriodo = useMemo(() => {
    const valores = historyChartFiltrado
      .map((p) => p.alturaNormalizada)
      .filter((v) => v !== null);

    if (!valores.length) {
      return { max: null, min: null, promedio: null };
    }

    return {
      max: Math.max(...valores),
      min: Math.min(...valores),
      promedio: Math.round(
        valores.reduce((acc, val) => acc + val, 0) / valores.length
      ),
    };
  }, [historyChartFiltrado]);

  return (
    <>
      <header>
        <h1>Dashboard</h1>
      </header>

      <section className="dashboard-cards">
        <div className="dashboard-card-wrap">
          <SensorCard
            titulo="Altura actual"
            valor={Math.round(alturaActualMostrada)}
            unidad="mm"
          />
        </div>

        <div className="dashboard-card-wrap">
          <SensorCard
            titulo="Altura restante"
            valor={Math.round(alturaMax - alturaActualMostrada)}
            unidad="mm"
          />
        </div>

        {metricasPeriodo.max !== null && (
          <div className="dashboard-card-wrap">
            <SensorCard
              titulo="Máx. del período"
              valor={formatNumber(metricasPeriodo.max, 1)}
              unidad="mm"
            />
          </div>
        )}

        {metricasPeriodo.min !== null && (
          <div className="dashboard-card-wrap">
            <SensorCard
              titulo="Mín. del período"
              valor={formatNumber(metricasPeriodo.min, 1)}
              unidad="mm"
            />
          </div>
        )}
      </section>

      <section className="dashboard-gauge-section">
        <div className="dashboard-gauge-card">
          <h3>Altura actual del depósito</h3>
          <GaugeNivel porcentaje={porcentaje} />
        </div>
      </section>

      <section className="grafico">
        <div className="grafico-header">
          <h3>Histórico de altura del depósito</h3>

          <div className="grafico-filtros">
            <div className="grafico-filtro">
              <label htmlFor="fechaDesde">Desde</label>
              <input
                ref={fechaDesdeRef}
                id="fechaDesde"
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                onClick={() => fechaDesdeRef.current?.showPicker?.()}
              />
            </div>

            <div className="grafico-filtro">
              <label htmlFor="horaDesde">Hora desde</label>
              <select
                id="horaDesde"
                value={horaDesde}
                onChange={(e) => setHoraDesde(e.target.value)}
              >
                {opcionesHora.map((hora) => (
                  <option key={hora} value={hora}>
                    {hora}
                  </option>
                ))}
              </select>
            </div>

            <div className="grafico-filtro">
              <label htmlFor="fechaHasta">Hasta</label>
              <input
                ref={fechaHastaRef}
                id="fechaHasta"
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                onClick={() => fechaHastaRef.current?.showPicker?.()}
              />
            </div>

            <div className="grafico-filtro">
              <label htmlFor="horaHasta">Hora hasta</label>
              <select
                id="horaHasta"
                value={horaHasta}
                onChange={(e) => setHoraHasta(e.target.value)}
              >
                {opcionesHora.map((hora) => (
                  <option key={hora} value={hora}>
                    {hora}
                  </option>
                ))}
              </select>
            </div>

            <div className="grafico-filtro">
              <label htmlFor="intervaloGrafico">Mostrar cada</label>
              <select
                id="intervaloGrafico"
                value={intervaloGrafico}
                onChange={(e) => setIntervaloGrafico(Number(e.target.value))}
              >
                <option value={5}>5 s</option>
                <option value={30}>30 s</option>
                <option value={60}>1 min</option>
                <option value={900}>15 min</option>
                <option value={1800}>30 min</option>
                <option value={2700}>45 min</option>
                <option value={3600}>1 hora</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{ height: "320px", marginTop: "20px" }}>
          {demasiadosPuntos ? (
            <div
              style={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                padding: "20px",
                color: "#64748b",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                backgroundColor: "#f8fafc",
              }}
            >
              El rango seleccionado genera demasiados puntos para mostrar.
              Elegí un intervalo mayor o un rango de fechas/horas más corto.
            </div>
          ) : historyChartFiltrado.length === 0 ? (
            <div
              style={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                padding: "20px",
                color: "#64748b",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                backgroundColor: "#f8fafc",
              }}
            >
              No hay mediciones para el rango seleccionado.
            </div>
          ) : (
            <Line data={chartData} options={chartOptions} />
          )}
        </div>
      </section>
    </>
  );
}

export default Dashboard;