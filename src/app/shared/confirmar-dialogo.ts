import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

export interface ConfirmarDados {
  titulo: string;
  mensagem: string;
}

@Component({
  selector: 'app-confirmar-dialogo',
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ dados.titulo }}</h2>
    <mat-dialog-content>{{ dados.mensagem }}</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false">Cancelar</button>
      <button mat-flat-button [mat-dialog-close]="true">Confirmar</button>
    </mat-dialog-actions>
  `,
})
export class ConfirmarDialogo {
  protected readonly dados = inject<ConfirmarDados>(MAT_DIALOG_DATA);
}
