import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  it('deve criar o app', () => {
    TestBed.configureTestingModule({ imports: [App], providers: [provideRouter([])] });
    expect(TestBed.createComponent(App).componentInstance).toBeTruthy();
  });
});
