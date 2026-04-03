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
  const [intervaloGrafico, setIntervaloGrafico] = useState(1);
  const [fechaDesde, setFechaDesde] = useState(formatDate(ayer));
  const [fechaHasta, setFechaHasta] = useState(formatDate(hoy));

  const fechaDesdeRef = useRef(null);
  const fechaHastaRef = useRef(null);

  const alturaMax = 500;

  function parseTimestamp(ts) {
    if (!ts) return null;

    const [fecha, hora] = ts.split(",");
    if (!fecha || !hora) return null;

    const [dia, mes, anio] = fecha.split("/");
    const [h, m, s] = hora.split(":");

    return new Date(anio, mes - 1, dia, h, m, s);
  }

  function parseInputDate(value, esFinDelDia = false) {
    if (!value) return null;

    const [anio, mes, dia] = value.split("-").map(Number);

    if (esFinDelDia) {
      return new Date(anio, mes - 1, dia, 23, 59, 59, 999);
    }

    return new Date(anio, mes - 1, dia, 0, 0, 0, 0);
  }

  function normalizarAltura(valor) {
    const num = Number(valor);

    if (!Number.isFinite(num)) return null;
    if (num < 0 || num > alturaMax) return null;

    return num;
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

  const alturaActual = normalizarAltura(latest?.altura) ?? 0;
  const porcentaje = (alturaActual / alturaMax) * 100;

  const historyChartFiltrado = useMemo(() => {
    if (!historyChart.length) return [];

    const desdeDate = parseInputDate(fechaDesde, false);
    const hastaDate = parseInputDate(fechaHasta, true);

    const filtradosPorFecha = historyChart.filter((item) => {
      const fecha = parseTimestamp(item.timestamp);
      if (!fecha) return false;

      const altura = normalizarAltura(item.altura);
      if (altura === null) return false;

      if (desdeDate && fecha < desdeDate) return false;
      if (hastaDate && fecha > hastaDate) return false;

      return true;
    });

    const filtradosFinales = [];
    let ultimoTimestamp = null;

    for (const item of filtradosPorFecha) {
      const fecha = parseTimestamp(item.timestamp);
      if (!fecha) continue;

      const altura = normalizarAltura(item.altura);
      if (altura === null) continue;

      const timestampMs = fecha.getTime();

      if (
        ultimoTimestamp === null ||
        timestampMs - ultimoTimestamp >= intervaloGrafico * 1000
      ) {
        filtradosFinales.push({
          ...item,
          alturaNormalizada: altura,
        });
        ultimoTimestamp = timestampMs;
      }
    }

    return filtradosFinales;
  }, [historyChart, intervaloGrafico, fechaDesde, fechaHasta]);

  const chartLabels = historyChartFiltrado.map((item) => {
    return item.timestamp?.split(",")[1] || "";
  });

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
        fill: true,
        pointRadius: intervaloGrafico === 1 ? 0 : 2,
        pointHoverRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
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
          label: (tooltipItem) => `Altura: ${tooltipItem.raw} mm`,
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
          text: "Hora",
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

  return (
    <>
      <header>
        <h1>Dashboard</h1>
      </header>

      <section className="dashboard-cards">
        <div className="dashboard-card-wrap">
          <SensorCard titulo="Altura actual" valor={alturaActual} unidad="mm" />
        </div>

        <div className="dashboard-card-wrap">
          <SensorCard
            titulo="Altura restante"
            valor={alturaMax - alturaActual}
            unidad="mm"
          />
        </div>
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
              <label htmlFor="intervaloGrafico">Mostrar cada</label>
              <select
                id="intervaloGrafico"
                value={intervaloGrafico}
                onChange={(e) => setIntervaloGrafico(Number(e.target.value))}
              >
                <option value={1}>1 s</option>
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
          <Line data={chartData} options={chartOptions} />
        </div>
      </section>
    </>
  );
}

export default Dashboard;