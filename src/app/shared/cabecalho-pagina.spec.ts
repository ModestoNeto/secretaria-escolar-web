import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CabecalhoPagina } from './cabecalho-pagina';

@Component({
  imports: [CabecalhoPagina],
  template: `
    <app-cabecalho-pagina [titulo]="titulo" [subtitulo]="subtitulo()">
      <span nota>anotação</span>
      <button acoes type="button">Novo</button>
    </app-cabecalho-pagina>
  `,
})
class Host {
  titulo = 'Alunos';
  subtitulo = signal<string | undefined>('Cadastro de alunos');
}

describe('CabecalhoPagina', () => {
  const montar = () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return { fixture, html: fixture.nativeElement as HTMLElement };
  };

  it('mostra o título e o subtítulo', () => {
    const { html } = montar();

    expect(html.querySelector('h1')!.textContent).toBe('Alunos');
    expect(html.querySelector('p')!.textContent).toBe('Cadastro de alunos');
  });

  it('projeta a nota e as ações nos seus lugares', () => {
    const { html } = montar();

    expect(html.querySelector('.texto [nota]')!.textContent).toBe('anotação');
    expect(html.querySelector('.acoes [acoes]')!.textContent).toBe('Novo');
  });

  it('sem subtítulo não cria o parágrafo', () => {
    const { fixture, html } = montar();

    fixture.componentInstance.subtitulo.set(undefined);
    fixture.detectChanges();

    expect(html.querySelector('p')).toBeNull();
  });
});
