import React from "react";

export interface GridResizeHandleProps {
  isHovered: boolean;
  onMouseDown: React.MouseEventHandler<HTMLDivElement>;
}

export function GridResizeHandle({ isHovered, onMouseDown }: GridResizeHandleProps): React.ReactElement {
  return (
    <>
      <div
        role="presentation"
        aria-hidden="true"
        className={[
          "absolute",
          "top-1",
          "bottom-1",
          "right-0",
          "w-0.5",
          "rounded-full",
          isHovered ? "bg-[#228be6]" : "bg-transparent",
          "transition-colors",
          "pointer-events-none",
          "z-40",
        ].join(" ")}
      />

      <div
        role="presentation"
        aria-hidden="true"
        data-column-resize-handle="true"
        onMouseDown={onMouseDown}
        onClick={(event) => event.stopPropagation()}
        className="absolute top-0 -right-0.5 w-2 h-full cursor-col-resize z-60"
      />
    </>
  );
}