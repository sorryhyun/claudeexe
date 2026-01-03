import { MascotState, Direction } from "./useMascotState";

interface ClawdProps {
  state: MascotState;
  direction: Direction;
  onClick?: (e: React.MouseEvent) => void;
}

function Clawd({ state, direction, onClick }: ClawdProps) {
  const getAnimationClass = () => {
    switch (state) {
      case "walking":
        return "clawd-walking";
      case "jumping":
        return "clawd-jumping";
      case "falling":
        return "clawd-falling";
      case "talking":
        return "clawd-talking";
      default:
        return "clawd-idle";
    }
  };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 22 16"
      width="110"
      height="80"
      shapeRendering="crispEdges"
      className={`clawd ${getAnimationClass()}`}
      onClick={onClick}
      style={{
        transform: direction === "left" ? "scaleX(-1)" : "scaleX(1)",
      }}
    >
      <g className="clawd-body">
        {/* Body top */}
        <rect x="2" y="0" width="18" height="4" fill="#BD825D" />

        {/* Body middle with eye gaps */}
        <rect x="0" y="4" width="4" height="2" fill="#BD825D" />
        <rect x="6" y="4" width="10" height="2" fill="#BD825D" />
        <rect x="18" y="4" width="4" height="2" fill="#BD825D" />

        {/* Eyes */}
        <rect className="clawd-eye clawd-eye-left" x="4" y="4" width="2" height="2" fill="#000000" />
        <rect className="clawd-eye clawd-eye-right" x="16" y="4" width="2" height="2" fill="#000000" />

        {/* Body bottom */}
        <rect x="0" y="6" width="22" height="2" fill="#BD825D" />
        <rect x="2" y="8" width="18" height="4" fill="#BD825D" />

        {/* Legs */}
        <g className="clawd-legs">
          <rect className="clawd-leg clawd-leg-1" x="2" y="12" width="2" height="4" fill="#BD825D" />
          <rect className="clawd-leg clawd-leg-2" x="6" y="12" width="2" height="4" fill="#BD825D" />
          <rect className="clawd-leg clawd-leg-3" x="14" y="12" width="2" height="4" fill="#BD825D" />
          <rect className="clawd-leg clawd-leg-4" x="18" y="12" width="2" height="4" fill="#BD825D" />
        </g>
      </g>

      {/* Speech bubble for talking state */}
      {state === "talking" && (
        <g className="speech-indicator">
          <ellipse cx="20" cy="2" rx="2" ry="1.5" fill="white" stroke="#333" strokeWidth="0.3" />
        </g>
      )}
    </svg>
  );
}

export default Clawd;
