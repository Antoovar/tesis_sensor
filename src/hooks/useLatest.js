import { useEffect, useState } from "react";
import { ref, onValue, off } from "firebase/database";
import { db } from "../firebase/config";

export function useLatest(deviceId = "esp32_01") {
  const [latest, setLatest] = useState(null);
  const [lastUpdateMs, setLastUpdateMs] = useState(null);

  useEffect(() => {
    const r = ref(db, `devices/${deviceId}/latest`);

    const unsubscribe = onValue(
      r,
      (snapshot) => {
        const data = snapshot.val();
        console.log("FIREBASE latest:", data);

        setLatest(data);
        setLastUpdateMs(Date.now());
      },
      (error) => {
        console.error("Firebase latest error:", error);
      }
    );

    return () => {
      off(r);
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [deviceId]);

  return { latest, lastUpdateMs };
}