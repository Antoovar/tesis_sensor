import GaugeComponent from "react-gauge-component";

function GaugeNivel({ porcentaje = 0 }) {
  return (
    <div style={{ width: "100%", maxWidth: "400px", margin: "0 auto" }}>
      <GaugeComponent
        type="semicircle"
        value={porcentaje}
        minValue={0}
        maxValue={100}
        arc={{
          colorArray: ["#e5e7eb", "#e5e7eb", "#38bdf8"], // rojo → amarillo → verde
          subArcs: [
            { limit: 30 },
            { limit: 70 },
            { limit: 100 },
          ],
        }}
        pointer={{
          elastic: true,
          animationDelay: 0,
        }}
        labels={{
          valueLabel: {
            formatTextValue: (value) => `${value}%`,
            style: { fontSize: "28px" },
          },
        }}
      />
    </div>
  );
}

export default GaugeNivel;