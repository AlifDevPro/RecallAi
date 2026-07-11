/** Renders exam question / answer text with readable line breaks and spacing. */
export function QuestionBody({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/\\n/g, "\n")
    .trim();

  return (
    <div className={`whitespace-pre-wrap leading-relaxed text-[15px] sm:text-base ${className}`}>
      {normalized.split("\n").map((line, i) => {
        const numbered = line.match(/^(\d+[\).:])\s+(.*)$/);
        const bullet = line.match(/^[-•*]\s+(.*)$/);
        if (numbered) {
          return (
            <p key={i} className="mb-2 pl-1">
              <span className="font-mono text-xs text-muted-foreground mr-2">{numbered[1]}</span>
              {numbered[2]}
            </p>
          );
        }
        if (bullet) {
          return (
            <p key={i} className="mb-2 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-primary">
              {bullet[1]}
            </p>
          );
        }
        if (!line.trim()) return <div key={i} className="h-2" />;
        return (
          <p key={i} className="mb-2 last:mb-0">
            {line}
          </p>
        );
      })}
    </div>
  );
}
