import React from "react";

interface LogoProps {
  className?: string;
  size?: number;
  variant?: "full" | "icon" | "text";
}

export default function Logo({ className = "", size = 48, variant = "full" }: LogoProps) {
  const renderSVG = () => {
    return (
      <img
        src={`${import.meta.env.BASE_URL}conch.svg`}
        alt="Conch Predictor Logo" 
        width={size} 
        height={size} 
        className="select-none object-contain drop-shadow-md"
      />
    );
  };

  if (variant === "text") {
    return (
      <div id="logo-with-text" className={`flex items-center gap-3 ${className}`}>
        {renderSVG()}
        <span className="font-extrabold tracking-tight text-white font-display">
          Conch Predictor Series
        </span>
      </div>
    );
  }

  return <div id="logo-wrapper" className={`${className}`}>{renderSVG()}</div>;
}
