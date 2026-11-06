import { Injectable } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';

@Injectable()
export class PaginadorPtBr extends MatPaginatorIntl {
  override itemsPerPageLabel = 'Itens por página';
  override nextPageLabel = 'Próxima página';
  override previousPageLabel = 'Página anterior';
  override firstPageLabel = 'Primeira página';
  override lastPageLabel = 'Última página';

  override getRangeLabel = (page: number, size: number, total: number): string => {
    if (total === 0) return '0 de 0';
    const inicio = page * size + 1;
    return `${inicio} – ${Math.min(inicio + size - 1, total)} de ${total}`;
  };
}
