import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CabecalhoPagina } from '../../shared/cabecalho-pagina';

@Component({
  selector: 'app-provisoria',
  imports: [CabecalhoPagina],
  template: `<app-cabecalho-pagina [titulo]="titulo" subtitulo="Em construção." />`,
})
export class Provisoria {
  protected readonly titulo = inject(ActivatedRoute).snapshot.data['titulo'];
}
