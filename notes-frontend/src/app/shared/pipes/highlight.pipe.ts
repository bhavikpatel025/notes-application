import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'highlight',
  standalone: true
})
export class HighlightPipe implements PipeTransform {
  transform(value: string, search: string): string {
    if (!value) return '';
    if (!search || !search.trim()) return value;

    // Escape search string for safe regex
    const escapedSearch = search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const regex = new RegExp(`(${escapedSearch})`, 'gi');
    
    // Replace matching text with the highlighted span
    return value.replace(regex, `<span class="search-highlight">$1</span>`);
  }
}
