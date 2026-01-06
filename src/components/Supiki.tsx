import { MascotState, Direction } from "../hooks/useMascotState";
import supikiImage from "../supiki/supiki.webp";

interface SupikiProps {
  state: MascotState;
  direction: Direction;
  onClick?: (e: React.MouseEvent) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

function Supiki({ state, direction, onClick, onMouseDown, onDoubleClick, onContextMenu }: SupikiProps) {
  const getAnimationClass = () => {
    switch (state) {
      case "walking":
        return "supiki-walking";
      case "jumping":
        return "supiki-jumping";
      case "falling":
        return "supiki-falling";
      case "talking":
        return "supiki-talking";
      default:
        return "supiki-idle";
    }
  };

  return (
    <div
      className={`supiki ${getAnimationClass()}`}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      style={{
        transform: direction === "left" ? "scaleX(-1)" : "scaleX(1)",
        cursor: "pointer",
      }}
    >
      <img
        src={supikiImage}
        alt="Supiki"
        style={{
          maxWidth: "140px",
          maxHeight: "120px",
          width: "auto",
          height: "auto",
          pointerEvents: "none",
        }}
        draggable={false}
      />
    </div>
  );
}

export default Supiki;
