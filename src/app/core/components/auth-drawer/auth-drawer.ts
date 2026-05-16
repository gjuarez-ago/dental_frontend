import {
  Component, Input, Output, EventEmitter, inject, signal,
  ChangeDetectionStrategy, OnChanges, OnInit, SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CatalogService, Estado } from '../../services/catalog.service';

type AuthStep = 'PHONE' | 'LOGIN' | 'REGISTER' | 'ACTIVATE';
export type AuthRole = 'STAFF' | 'PACIENTE';

@Component({
  selector: 'app-auth-drawer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './auth-drawer.html',
  styleUrl: './auth-drawer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuthDrawerComponent implements OnChanges, OnInit {
  @Input() isOpen = false;
  @Input() title: string | null = null;
  @Input() subtitle: string | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() authenticated = new EventEmitter<AuthRole>();

  private readonly fb          = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly catalogSvc  = inject(CatalogService);

  readonly step      = signal<AuthStep>('PHONE');
  readonly loginMode = signal<AuthRole>('PACIENTE');
  readonly phone     = signal('');
  readonly loading   = signal(false);
  readonly error     = signal<string | null>(null);
  readonly estados   = signal<Estado[]>([]);

  readonly phoneForm = this.fb.nonNullable.group({
    telefono: ['', Validators.required],
  });

  readonly nipForm = this.fb.nonNullable.group({
    nip: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
  });

  readonly registerForm = this.fb.nonNullable.group({
    nombreCompleto:   ['', [Validators.required, Validators.minLength(2)]],
    email:            ['', [Validators.required, Validators.email]],
    nip:              ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    genero:           ['', Validators.required],
    fechaNacimiento:  ['', Validators.required],
    estadoId:         [''],
  });

  readonly activateForm = this.fb.nonNullable.group({
    email:  ['', [Validators.required, Validators.email]],
    nip:    ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    genero: ['', Validators.required],
  });

  ngOnInit(): void {
    this.catalogSvc.getStates().subscribe(list => this.estados.set(list));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && !this.isOpen) {
      setTimeout(() => this.reset(), 250);
    }
  }

  close(): void { this.closed.emit(); }

  private reset(): void {
    this.step.set('PHONE');
    this.phone.set('');
    this.error.set(null);
    this.loginMode.set('PACIENTE');
    this.phoneForm.reset();
    this.nipForm.reset();
    this.registerForm.reset();
    this.activateForm.reset();
  }

  goBack(): void {
    this.step.set('PHONE');
    this.phone.set('');
    this.error.set(null);
  }

  onCheckPhone(): void {
    if (this.phoneForm.invalid || this.loading()) return;
    const telefono = this.phoneForm.getRawValue().telefono.trim();
    this.loading.set(true);
    this.error.set(null);

    this.authService.checkPatientPhone(telefono).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.phone.set(telefono);
        switch (res.status) {
          case 'STAFF_FOUND':      this.loginMode.set('STAFF');    this.step.set('LOGIN');    break;
          case 'EXISTS_VERIFIED':  this.loginMode.set('PACIENTE'); this.step.set('LOGIN');    break;
          case 'EXISTS_UNVERIFIED':                                this.step.set('ACTIVATE'); break;
          case 'NOT_FOUND':                                        this.step.set('REGISTER'); break;
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.userMessage ?? err?.message ?? 'Error al verificar.');
      }
    });
  }

  onLogin(): void {
    if (this.nipForm.invalid || this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    const nip = this.nipForm.getRawValue().nip;

    if (this.loginMode() === 'STAFF') {
      this.authService.login({ user: this.phone(), nip }).subscribe({
        next: () => this.emitSuccess('STAFF'),
        error: (err) => this.emitError(err, 'NIP incorrecto.')
      });
    } else {
      this.authService.patientLogin(this.phone(), nip).subscribe({
        next: () => this.emitSuccess('PACIENTE'),
        error: (err) => this.emitError(err, 'NIP incorrecto.')
      });
    }
  }

  onRegister(): void {
    if (this.registerForm.invalid || this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    const { nombreCompleto, email, nip, genero, fechaNacimiento, estadoId } = this.registerForm.getRawValue();
    this.authService.registerPatient({
      nombreCompleto,
      telefono: this.phone(),
      email,
      nip,
      genero,
      fechaNacimiento: fechaNacimiento || undefined,
      estadoId:        estadoId || undefined,
    }).subscribe({
      next: () => this.emitSuccess('PACIENTE'),
      error: (err) => this.emitError(err, 'No fue posible crear tu cuenta.')
    });
  }

  onActivate(): void {
    if (this.activateForm.invalid || this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    const { email, nip, genero } = this.activateForm.getRawValue();
    this.authService.completePatientProfile({ telefono: this.phone(), email, nip, genero }).subscribe({
      next: () => this.emitSuccess('PACIENTE'),
      error: (err) => this.emitError(err, 'No fue posible activar tu cuenta.')
    });
  }

  private emitSuccess(role: AuthRole): void {
    this.loading.set(false);
    this.authenticated.emit(role);
    this.close();
  }

  private emitError(err: any, fallback: string): void {
    this.loading.set(false);
    this.error.set(err?.error?.userMessage ?? err?.message ?? fallback);
  }
}
