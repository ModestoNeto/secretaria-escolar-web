import { Component, input } from '@angular/core';

/** Título, subtítulo opcional e ações. Ações: `<div acoes>`; anotação à mão: `<span nota>`. */
@Component({
  selector: 'app-cabecalho-pagina',
  template: `
    <header>
      <div class="texto">
        <h1>{{ titulo() }}</h1>
        @if (subtitulo()) {
          <p>{{ subtitulo() }}</p>
        }
        <ng-content select="[nota]" />
      </div>
      <div class="acoes"><ng-content select="[acoes]" /></div>
    </header>
  `,
  styles: `
    :host { display: block; margin-bottom: 28px; }
    header {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 14px;
      background: var(--papel);
      border-bottom: 3px double var(--tinta);
    }
    .texto { display: flex; flex-direction: column; gap: 2px; }
    h1 { margin: 0; font-size: 44px; line-height: 1.05; font-weight: 600; }
    p { margin: 0; font-size: 18px; font-style: italic; color: var(--suave); }
    .acoes { display: flex; align-items: center; gap: 28px; }
  `,
})
export class CabecalhoPagina {
  readonly titulo = input.required<string>();
  readonly subtitulo = input<string>();
}
