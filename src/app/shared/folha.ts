import { Component } from '@angular/core';

/** Folha de papel com as camadas decorativas do tema (tudo aria-hidden); o conteúdo vai por projeção. */
@Component({
  selector: 'app-folha',
  template: `
    <div class="pilha">
      <div class="atras a" aria-hidden="true"></div>
      <div class="atras b" aria-hidden="true"></div>
      <div class="folha">
        <svg class="grao" aria-hidden="true">
          <filter id="grao-papel">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="4" />
            <feColorMatrix values="0 0 0 0 0.5  0 0 0 0 0.42  0 0 0 0 0.28  0 0 0 0.35 0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#grao-papel)" />
        </svg>
        <i class="margem" aria-hidden="true"></i>
        <div class="furos" aria-hidden="true"><i></i><i></i><i></i></div>
        <i class="fita" aria-hidden="true"></i>
        <div class="conteudo"><ng-content /></div>
      </div>
    </div>
  `,
  styles: `
    :host { display: block; }
    .pilha { position: relative; }
    .atras { position: absolute; inset: 0; border: 2px solid var(--tinta); }
    .a { transform: rotate(-0.7deg) translate(-7px, 6px); background: #f1e8d0; }
    .b { transform: rotate(0.5deg) translate(5px, 3px); background: #f6eedb; }
    .folha {
      position: relative;
      z-index: 1;
      padding: 40px 44px 48px 92px;
      background-color: var(--papel);
      background-image: repeating-linear-gradient(to bottom, transparent 0 35px, #dce3ee 35px 36px);
      border: 2px solid var(--tinta);
      box-shadow: 6px 6px 0 var(--tinta);
    }
    .grao { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; mix-blend-mode: multiply; opacity: 0.35; }
    .margem { position: absolute; left: 64px; top: 0; bottom: 0; width: 2px; background: var(--margem); opacity: 0.7; }
    .furos { position: absolute; left: 16px; top: 0; bottom: 0; display: flex; flex-direction: column; justify-content: space-around; padding: 48px 0; }
    .furos i { width: 22px; height: 22px; border-radius: 50%; background: var(--mesa); border: 2px solid var(--tinta); box-shadow: inset 2px 2px 0 rgba(0, 0, 0, 0.25); }
    .fita { position: absolute; right: 56px; top: -14px; width: 120px; height: 30px; transform: rotate(3deg); background: rgba(232, 190, 70, 0.75); border-left: 3px dotted rgba(27, 34, 48, 0.35); border-right: 3px dotted rgba(27, 34, 48, 0.35); }
    .conteudo { position: relative; z-index: 1; }
    @media (max-width: 600px) {
      .folha { padding: 28px 16px 28px 44px; }
      .margem { left: 28px; }
      .furos, .fita { display: none; }
    }
  `,
})
export class Folha {}
