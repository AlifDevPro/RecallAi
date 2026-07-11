"use client";

import { useEffect, useState } from "react";
import { FileText, Image as ImageIcon } from "lucide-react";
import { isPdfMediaUrl } from "@/lib/papers/scan-media";

type ScanPreviewProps = {
  src: string | null | undefined;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  /** Thumbnail strip vs full viewer */
  variant?: "cover" | "inline" | "thumb";
  unavailableLabel?: string;
};

function Unavailable({
  label,
  className,
  style,
}: {
  label: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 bg-surface-raised text-muted-foreground ${className ?? ""}`}
      style={style}
    >
      <ImageIcon className="size-8 opacity-50" />
      <span className="text-xs text-center px-2">{label}</span>
    </div>
  );
}

export function ScanPreview({
  src,
  alt,
  className,
  style,
  variant = "inline",
  unavailableLabel = "Scan preview unavailable",
}: ScanPreviewProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [src]);

  if (!src?.trim() || failed) {
    return <Unavailable label={unavailableLabel} className={className} style={style} />;
  }

  if (isPdfMediaUrl(src)) {
    const pdfSrc = src.includes("#") ? src : `${src}#toolbar=0&navpanes=0`;
    return (
      <div className={`relative overflow-hidden bg-surface-raised ${className ?? ""}`} style={style}>
        {!loaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <FileText className="size-8 opacity-50 animate-pulse" />
            <span className="text-xs">Loading PDF…</span>
          </div>
        )}
        <iframe
          src={pdfSrc}
          title={alt}
          className="w-full h-full min-h-[inherit] border-0 bg-white"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
        {variant === "cover" && loaded && (
          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-background/90 border border-border/40">
            PDF
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${className ?? ""}`} style={style}>
      {!loaded && variant !== "thumb" && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground animate-pulse">
          <ImageIcon className="size-8 opacity-30" />
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-contain"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
