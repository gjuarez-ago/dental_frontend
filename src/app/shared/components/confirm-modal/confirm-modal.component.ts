import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" *ngIf="show" (click)="onCancel()">
      <div class="modal-container" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div class="header-title-content">
            <div class="icon-wrapper" [class]="type">
              <i [class]="icon"></i>
            </div>
            <h2>{{ title }}</h2>
          </div>
          <button class="btn-close" (click)="onCancel()">
            <i class="ph ph-x"></i>
          </button>
        </div>
        
        <div class="modal-body">
          <p [innerHTML]="message"></p>
          
          <div class="prompt-container" *ngIf="isPrompt">
            <input 
              type="text" 
              class="prompt-input" 
              [placeholder]="inputPlaceholder"
              [(ngModel)]="inputValue"
              (keyup.enter)="onConfirm()"
              autofocus
            >
          </div>
        </div>

        <div class="modal-footer" [class.single-button]="!showCancel">
          <button class="btn-secondary" *ngIf="showCancel" (click)="onCancel()">Cancelar</button>
          <button 
            class="btn-primary" 
            [class]="type" 
            (click)="onConfirm()"
            [disabled]="isPrompt && isInputRequired && !inputValue.trim()"
          >
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      animation: fadeIn 0.2s ease-out;
    }

    .modal-container {
      background: white;
      width: 100%;
      max-width: 440px;
      border-radius: 20px;
      padding: 24px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      transform: scale(1);
      animation: zoomIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .header-title-content {
      display: flex;
      align-items: center;
      gap: 16px;

      h2 {
        font-size: 1.25rem;
        font-weight: 700;
        color: #0f172a;
        margin: 0;
      }
    }

    .icon-wrapper {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      flex-shrink: 0;
      
      &.danger { background: #fef2f2; color: #ef4444; }
      &.warning { background: #fffbeb; color: #f59e0b; }
      &.info { background: #eff6ff; color: #3b82f6; }
      &.success { background: #f0fdf4; color: #10b981; }
    }

    .btn-close {
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 20px;
      cursor: pointer;
      padding: 4px;
      border-radius: 8px;
      transition: all 0.2s;
      &:hover { background: #f1f5f9; color: #64748b; }
    }

    .modal-body {
      text-align: left;
      margin-bottom: 24px;
      
      p {
        font-size: 0.95rem;
        color: #64748b;
        margin: 0;
        line-height: 1.5;
      }
    }

    .prompt-container {
      margin-top: 16px;
      
      .prompt-input {
        width: 100%;
        padding: 12px 16px;
        background: #f8fafc;
        border: 2px solid #e2e8f0;
        border-radius: 12px;
        font-size: 0.95rem;
        color: #0f172a;
        transition: all 0.2s;
        
        &:focus {
          outline: none;
          border-color: #3b82f6;
          background: white;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
        }
      }
    }

    .modal-footer {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      
      &.single-button {
        grid-template-columns: 1fr;
      }
      
      button {
        padding: 12px;
        border-radius: 12px;
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }

      .btn-secondary {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        color: #64748b;
        &:hover { background: #f1f5f9; border-color: #cbd5e1; }
      }

      .btn-primary {
        border: none;
        color: white;
        
        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        &.danger { background: #ef4444; &:hover { background: #dc2626; } }
        &.warning { background: #f59e0b; &:hover { background: #d97706; } }
        &.info { background: #3b82f6; &:hover { background: #2563eb; } }
        &.success { background: #10b981; &:hover { background: #059669; } }
      }
    }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes zoomIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  `]
})
export class ConfirmModalComponent {
  @Input() show = false;
  @Input() type: 'danger' | 'warning' | 'info' | 'success' = 'info';
  @Input() icon = 'ph ph-info';
  @Input() title = 'Confirmar acción';
  @Input() message = '¿Estás seguro de realizar esta acción?';
  @Input() confirmText = 'Confirmar';

  // Nuevas capacidades
  @Input() showCancel = true;
  @Input() isPrompt = false;
  @Input() inputPlaceholder = 'Escribe aquí...';
  @Input() inputValue = '';
  @Input() isInputRequired = false;

  @Output() confirm = new EventEmitter<void>();
  @Output() confirmWithInput = new EventEmitter<string>();
  @Output() cancel = new EventEmitter<void>();

  onConfirm() {
    if (this.isPrompt) {
      if (this.isInputRequired && !this.inputValue.trim()) {
        return;
      }
      this.confirmWithInput.emit(this.inputValue);
    } else {
      this.confirm.emit();
    }
    this.close();
  }

  onCancel() {
    this.cancel.emit();
    this.close();
  }

  private close() {
    this.show = false;
    this.inputValue = ''; // Resetear para el próximo uso
  }
}
