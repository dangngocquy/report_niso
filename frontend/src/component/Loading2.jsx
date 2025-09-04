import * as React from "react";
const Loading2 = (props) => (
  <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column'}}>
    <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 100 100"
    preserveAspectRatio="xMidYMid"
    width={window.innerWidth < 768 ? 70 : 100}
    height={window.innerWidth < 768 ? 70 : 100}
    style={{
      shapeRendering: "auto",
      display: "block",
      background: "transparent",
    }}
    xmlnsXlink="http://www.w3.org/1999/xlink"
    {...props}
  >
    <g>
      <path
        style={{
          transform: "scale(0.61)",
          transformOrigin: "50px 50px",
        }}
        strokeLinecap="round"
        d="M24.3 30C11.4 30 5 43.3 5 50s6.4 20 19.3 20c19.3 0 32.1-40 51.4-40 C88.6 30 95 43.3 95 50s-6.4 20-19.3 20C56.4 70 43.6 30 24.3 30z"
        strokeDasharray="42.76482137044271 42.76482137044271"
        strokeWidth={8}
        stroke="#ae8f3d"
        fill="none"
      >
        <animate
          values="0;256.58892822265625"
          keyTimes="0;1"
          dur="0.6493506493506493s"
          repeatCount="indefinite"
          attributeName="stroke-dashoffset"
        />
      </path>
      <g />
    </g>
  </svg>
  </div>
);
export default Loading2;
