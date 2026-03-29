import React from "react";
import "./Probeta.css";

function Probeta({ nivel = 0 }) {
  const nivelSeguro = Math.max(0, Math.min(100, Number(nivel) || 0));

  return (
    <div className="probeta-wrapper">
      <div className="probeta-shell">
        <div className="probeta-top" />

        <div className="probeta-body">
          <div className="agua-mask">
            <div
              className="agua"
              style={{ height: `${nivelSeguro}%` }}
            />
          </div>

          <div className="escala">
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} className="marca" />
            ))}
          </div>
        </div>

        <div className="probeta-base-ring" />
        <div className="probeta-base-foot" />
      </div>

      
    </div>
  );
}

export default Probeta;