import React from "react";

export type IconName = "search" | "arrow-up" | "arrow-down" | "arrow-up-down";

interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number | string;
  color?: string;
}

export const Icon: React.FC<IconProps> = ({ name, size = 20, color = "currentColor", ...props }) => {
  switch (name) {
    case "search":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 640 640"
          width={size}
          height={size}
          fill={color}
          aria-hidden="true"
          {...props}
        >
          <path d="M480 272C480 317.9 465.1 360.3 440 394.7L566.6 521.4C579.1 533.9 579.1 554.2 566.6 566.7C554.1 579.2 533.8 579.2 521.3 566.7L394.7 440C360.3 465.1 317.9 480 272 480C157.1 480 64 386.9 64 272C64 157.1 157.1 64 272 64C386.9 64 480 157.1 480 272zM272 416C351.5 416 416 351.5 416 272C416 192.5 351.5 128 272 128C192.5 128 128 192.5 128 272C128 351.5 192.5 416 272 416z"/>
        </svg>
      );
    case "arrow-up":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 640 640"
          width={size}
          height={size}
          fill={color}
          aria-hidden="true"
          {...props}
        >
          <path d="M160 288C147.1 288 135.4 280.2 130.4 268.2C125.4 256.2 128.2 242.5 137.4 233.4L297.4 73.4C309.9 60.9 330.2 60.9 342.7 73.4L502.7 233.4C511.9 242.6 514.6 256.3 509.6 268.3C504.6 280.3 492.9 288 480 288L160 288z"/>
        </svg>
      );
    case "arrow-down":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 640 640"
          width={size}
          height={size}
          fill={color}
          aria-hidden="true"
          {...props}
        >
          <path d="M160 352C147.1 352 135.4 359.8 130.4 371.8C125.4 383.8 128.2 397.5 137.4 406.6L297.4 566.6C309.9 579.1 330.2 579.1 342.7 566.6L502.7 406.6C511.9 397.4 514.6 383.7 509.6 371.7C504.6 359.7 492.9 352 480 352L160 352z"/>
        </svg>
      );
    case "arrow-up-down":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 640 640"
          width={size}
          height={size}
          fill={color}
          aria-hidden="true"
          {...props}
        >
          <path d="M130.4 268.2C135.4 280.2 147 288 160 288L480 288C492.9 288 504.6 280.2 509.6 268.2C514.6 256.2 511.8 242.5 502.7 233.3L342.7 73.3C330.2 60.8 309.9 60.8 297.4 73.3L137.4 233.3C128.2 242.5 125.5 256.2 130.5 268.2zM130.4 371.7C125.4 383.7 128.2 397.4 137.3 406.6L297.3 566.6C309.8 579.1 330.1 579.1 342.6 566.6L502.6 406.6C511.8 397.4 514.5 383.7 509.5 371.7C504.5 359.7 492.9 352 480 352L160 352C147.1 352 135.4 359.8 130.4 371.8z"/>
        </svg>
      );
    default:
      return null;
  }
};
