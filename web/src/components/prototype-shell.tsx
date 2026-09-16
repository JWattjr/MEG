import type { ReactNode } from "react";
import { MomentHeader, MomentNav } from "./moment-chrome";

export function PrototypeShell({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <main className="meg-app">
      <section className="desk-frame prototype-frame">
        <MomentHeader />
        <MomentNav />
        <div className="prototype-body">
          <header className="prototype-heading">
            <div className="section-code">MEG / FIELD NOTES</div>
            <h1>{title}</h1>
            <p>{intro}</p>
          </header>
          {children}
        </div>
        <footer className="prototype-footer"><span>MEG · Moment Esports Grid</span><span>Independent product · testnet software</span></footer>
      </section>
    </main>
  );
}
