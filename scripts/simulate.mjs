// scripts/simulate.mjs
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, push } from "firebase/database";


const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.VITE_FIREBASE_DATABASE_URL,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
  };
  

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const deviceId = "esp32_01";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

let levelPct = 60;
let tempC = 24.5;

console.log("Simulador iniciado. Escribiendo en Firebase...");

setInterval(async () => {
  // Simulación “realista”
  levelPct = clamp(levelPct + (Math.random() * 6 - 3), 0, 100);
  tempC = clamp(tempC + (Math.random() * 0.6 - 0.3), 10, 45);

  const ts = Math.floor(Date.now() / 1000);
  const waterLevelCm = +(levelPct * 0.3).toFixed(1); // ej: 0–30 cm si 100% = 30cm

  const latest = {
    ts,
    waterLevelPct: Math.round(levelPct),
    waterLevelCm,
    tempC: +tempC.toFixed(1),
    batteryPct: 80,
    charging: false,
  };

  // 1) Actualiza “latest” (lo que ve tu Home)
  await set(ref(db, `devices/${deviceId}/latest`), latest);

  // 2) Guarda histórico (para gráfico después)
  await push(ref(db, `devices/${deviceId}/history`), {
    ts,
    waterLevelCm,
    tempC: latest.tempC,
    waterLevelPct: latest.waterLevelPct,
  });

  console.log("Enviado:", latest);
}, 2000);
