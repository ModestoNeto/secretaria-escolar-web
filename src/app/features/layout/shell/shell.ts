import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { itensPara } from '../../../core/menu';
import { Folha } from '../../../shared/folha';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatButtonModule, Folha],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  protected readonly auth = inject(AuthService);
  protected readonly itens = computed(() => itensPara(this.auth.role()));
  // no celular as abas viram uma gaveta; em tela larga o botão some e as abas sempre aparecem
  protected readonly menuAberto = signal(false);
}
