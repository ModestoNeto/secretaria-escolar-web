import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-provisoria',
  template: `<h1>{{ titulo }}</h1>
    <p>Em construção.</p>`,
})
export class Provisoria {
  protected readonly titulo = inject(ActivatedRoute).snapshot.data['titulo'];
}
