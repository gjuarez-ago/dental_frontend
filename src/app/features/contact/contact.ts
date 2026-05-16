import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './contact.html',
  styleUrl: './contact.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContactComponent {
  protected readonly showToast = signal(false);

  protected handleSubmit(event: Event): void {
    event.preventDefault();
    this.showToast.set(true);
    
    // Ocultar el toast después de 3.5 segundos
    setTimeout(() => this.showToast.set(false), 3500);
    
    // Resetear el formulario
    const form = event.target as HTMLFormElement;
    form.reset();
  }
}
