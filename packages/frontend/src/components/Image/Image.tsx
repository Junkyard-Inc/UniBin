import React, { useState } from "react";
import { ImageOff, Maximize2 } from "lucide-react";
import Dialog from "../Dialog/Dialog";
import "./Image.css";

export interface ImageProps {
  src?: string | null;
  alt: string;
  aspectRatio?: string;
  zoomable?: boolean;
  fallbackText?: string;
  className?: string;
}

export function Image({
  src,
  alt,
  aspectRatio = "16 / 10",
  zoomable = false,
  fallbackText = "Foto non disponibile",
  className = "",
}: ImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  const isInvalid = !src || hasError;

  return (
    <>
      <div
        className={`unibin-image-wrap ${zoomable && !isInvalid ? "unibin-image-wrap--zoomable" : ""} ${className}`}
        style={{ aspectRatio }}
        onClick={() => {
          if (zoomable && !isInvalid) setIsZoomOpen(true);
        }}
        role={zoomable && !isInvalid ? "button" : undefined}
        tabIndex={zoomable && !isInvalid ? 0 : undefined}
        onKeyDown={(e) => {
          if (zoomable && !isInvalid && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            setIsZoomOpen(true);
          }
        }}
      >
        {isInvalid ? (
          <div className="unibin-image-fallback">
            <ImageOff size={26} />
            <span>{fallbackText}</span>
          </div>
        ) : (
          <>
            <img
              src={src}
              alt={alt}
              loading="lazy"
              onError={() => setHasError(true)}
              className="unibin-image-el"
            />
            {zoomable && (
              <span className="unibin-image-zoom-hint" aria-hidden="true">
                <Maximize2 size={15} />
              </span>
            )}
          </>
        )}
      </div>

      {zoomable && !isInvalid && (
        <Dialog open={isZoomOpen} onOpenChange={setIsZoomOpen} title={alt}>
          <img src={src} alt={alt} className="unibin-image-full" />
        </Dialog>
      )}
    </>
  );
}

export default Image;
