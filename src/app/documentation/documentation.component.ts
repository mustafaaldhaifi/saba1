import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DOCUMENTATION_SECTIONS } from './documentation-content';

@Component({
  selector: 'app-documentation', standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './documentation.component.html',
  styleUrls: ['./documentation.component.css']
})
export class DocumentationComponent {
  query = '';
  readonly sections = DOCUMENTATION_SECTIONS;
  get filteredSections() {
    const query = this.query.trim().toLocaleLowerCase();
    return query ? this.sections.filter(section =>
      [section.title, ...section.paragraphs, ...section.items, section.code ?? '']
        .some(text => text.toLocaleLowerCase().includes(query))) : this.sections;
  }
}
