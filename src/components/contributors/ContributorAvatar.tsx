"use client";

import { useState } from "react";
import { initialsOf } from "@/lib/data/contributors";

type ContributorAvatarProps = {
  src: string;
  name: string;
  size: number;
  className?: string;
  imgClassName?: string;
};

export function ContributorAvatar({
  src,
  name,
  size,
  className = "",
  imgClassName = "",
}: ContributorAvatarProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const initials = initialsOf(name);

  return (
    <div
      className={`relative rounded-full overflow-hidden bg-surface-raised shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <div
        className="absolute inset-0 flex items-center justify-center text-muted-foreground font-semibold select-none"
        style={{ fontSize: Math.max(11, Math.round(size * 0.28)) }}
        aria-hidden={loaded && !failed}
      >
        {initials}
      </div>
      {!failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`absolute inset-0 size-full object-cover transition-opacity duration-300 ${
            loaded ? "opacity-100" : "opacity-0"
          } ${imgClassName}`}
        />
      )}
    </div>
  );
}
