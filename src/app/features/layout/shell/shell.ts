import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { itensPara } from '../../../core/menu';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatToolbarModule, MatButtonModule],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  protected readonly auth = inject(AuthService);
  protected readonly itens = computed(() => itensPara(this.auth.role()));
}
