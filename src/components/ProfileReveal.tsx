import { useState } from "react";

export function ProfileReveal({
  name,
  metadata,
  avatarUrl,
}: {
  name: string;
  metadata: string;
  avatarUrl?: string;
}) {
  const [revealed, setRevealed] = useState(false);
  return (
    <button
      type="button"
      className={`profile-reveal ${revealed ? "revealed" : ""}`}
      onClick={() => setRevealed(true)}
      aria-label={
        revealed ? `${name}, ${metadata}` : "Reveal contestant profile"
      }
      aria-expanded={revealed}
    >
      <span className="profile-skeleton" aria-hidden="true">
        <span className="skeleton skeleton-avatar" />
        <span className="skeleton-lines">
          <span className="skeleton skeleton-name" />
          <span className="skeleton skeleton-meta" />
        </span>
      </span>
      <span className="profile-content" aria-hidden={!revealed}>
        <span className="profile-avatar">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" />
          ) : (
            name
              .split(" ")
              .map((word) => word[0])
              .slice(0, 2)
              .join("")
          )}
        </span>
        <span>
          <strong>{name}</strong>
          <small>{metadata}</small>
        </span>
      </span>
      {!revealed && (
        <span className="reveal-hint">Click to reveal contestant</span>
      )}
    </button>
  );
}
