function SensorCard({ titulo, valor, unidad, tipo }) {
    // Esta función decide el color según el nivel de gas (o volumen)
    const obtenerClaseEstado = (v) => {
      if (v === null || v === undefined) return "";
      if (v < 300) return "normal";
      if (v < 500) return "alerta";
      return "peligro";
    };
  
    return (
      <div className="card">
        <h3>{titulo}</h3>
        {tipo === "estado" ? (
          <p className={`estado ${obtenerClaseEstado(valor)}`}>
            {valor === null ? "--" : valor < 300 ? "NORMAL" : valor < 500 ? "ALERTA" : "PELIGRO"}
          </p>
        ) : (
          <p className="big">
            <span>{valor ?? "--"}</span> {unidad}
          </p>
        )}
      </div>
    );
  }
  export default SensorCard;