import type { CSSProperties } from "react";
import { ArrowLeft, LockKeyhole, Radar, ShieldAlert, Sparkles } from "lucide-react";
import { Brand } from "../components/Brand";

export function NotFoundPage() {
  return (
    <main className="notFoundShell">
      <div className="notFoundGrid" aria-hidden="true">
        {Array.from({ length: 36 }).map((_, index) => (
          <span key={index} style={{ "--delay": `${index * 0.05}s` } as CSSProperties} />
        ))}
      </div>

      <nav className="topNav notFoundNav">
        <Brand />
        <a className="softButton" href="/">
          <ArrowLeft size={18} />
          Back to Coinvera
        </a>
      </nav>

      <section className="notFoundStage">
        <div className="glitchBadge">
          <ShieldAlert size={18} />
          ERROR 404
        </div>

        <div className="notFoundCode" aria-label="404">
          <span>4</span>
          <span className="zeroCore">
            <Radar size={84} />
            <i />
          </span>
          <span>4</span>
        </div>

        <h1>Not Found</h1>
        <p>
          This route does not exist on Coinvera. The secure desk has moved away
          from obvious paths.
        </p>

        <div className="notFoundActions">
          <a className="primaryButton" href="/">
            <Sparkles size={18} />
            Open customer page
          </a>
          <span>
            <LockKeyhole size={16} />
            Protected routes stay private
          </span>
        </div>
      </section>
    </main>
  );
}
