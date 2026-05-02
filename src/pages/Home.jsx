import React, { useEffect, useState } from "react";
import "../App.css";
import { AlertTriangle } from "lucide-react";
import { useLatest } from "../hooks/useLatest";
import Probeta from "../components/Probeta";

function parseTimestamp(ts) {
  if (!ts) return null;

  const [fecha, hora] = ts.split(",");
  if (!fecha || !hora) return null;

  const [dia, mes, anio] = fecha.split("/");
  const [h, m, s] = hora.split(":");

  return new Date(anio, mes - 1, dia, h, m, s);
}

function BatteryLevel({ value }) {
  const level = Number(value) || 0;

  const bars = [25, 50, 75, 100];

  return (
    <div className="battery-drawing">
      <div className="battery-tip" />

      <div className="battery-body">
        {bars.map((bar) => (
          <div
            key={bar}
            className={`battery-bar ${
              level >= bar ? "battery-bar-active" : "battery-bar-empty"
            }`}
          />
        ))}
      </div>

      <p className="battery-percent">{level}%</p>
    </div>
  );
}

function Home() {
  const { latest, lastUpdateMs } = useLatest("esp32_01");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const alturaActual = latest?.altura ?? 0;
  const alturaMax = 500;
  const levelPct = Math.min((alturaActual / alturaMax) * 100, 100);

  const batteryPct = latest?.batteryPct ?? 0;
  const errorCode = latest?.error ?? 0;
  const timestampStr = latest?.timestamp;
  const fechaMedicion = parseTimestamp(timestampStr);

  const online = lastUpdateMs ? now - lastUpdateMs < 5000 : false;

  const fechaStr = fechaMedicion
    ? fechaMedicion.toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Sin dato";

  const horaStr = fechaMedicion
    ? fechaMedicion.toLocaleTimeString("es-AR")
    : "";

  let haceStr = "";

  const errores = {
    0: "Estado normal",
    1: "WiFi error",
    2: "SD error",
    3: "SD y WiFi error",
    4: "RTC error",
    5: "RTC y WiFi error",
    6: "RTC y SD error",
    7: "RTC, WiFi y SD error",
  };

  const errorTexto =
    errorCode === 0
      ? errores[0]
      : `E${errorCode} - ${errores[errorCode] || "Error desconocido"}`;

  if (fechaMedicion) {
    const diff = Math.floor((now - fechaMedicion.getTime()) / 1000);

    if (diff < 60) haceStr = `Hace ${diff} s`;
    else if (diff < 3600) haceStr = `Hace ${Math.floor(diff / 60)} min`;
    else haceStr = `Hace ${Math.floor(diff / 3600)} h`;
  }

  const estadoNivel =
    levelPct < 20 ? "Nivel bajo" : levelPct < 80 ? "Nivel normal" : "Nivel alto";

  return (
    <div className="home-container">
      <div className="status-bar">
        <div className={`status-item ${online ? "online" : "offline"}`}>
          <span>{online ? "🟢 Dispositivo conectado" : "🔴 Sin conexión"}</span>
        </div>
      </div>

      <header className="home-header">
        <h1>Sistema de Monitoreo</h1>
        <p>Altura del agua en tiempo real</p>
      </header>

      <div className="dashboard-grid">
        <div className="panel-principal">
          <Probeta nivel={levelPct} />

          <div className="nivel-info">
            <h2>{alturaActual.toFixed(0)} mm</h2>
            <h3>{levelPct.toFixed(0)}%</h3>
            <p>{estadoNivel}</p>
          </div>
        </div>

        <div className="panel-datos">
          <div className="data-card">
            <div className="card-title">🕒 Última actualización</div>
            <div className="card-value">{fechaStr}</div>
            <div className="card-subvalue">{horaStr}</div>
            <div className="card-timeago">{haceStr}</div>
          </div>

          <div className="data-card battery-card">
            <div className="card-title">
              <span>Batería</span>
            </div>

            <BatteryLevel value={batteryPct} />
          </div>

          <div className={`data-card ${errorCode !== 0 ? "error-card" : ""}`}>
            <div className="card-title">
              <AlertTriangle size={18} />
              <span>Estado</span>
            </div>
            <p className="card-value">{errorTexto}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;