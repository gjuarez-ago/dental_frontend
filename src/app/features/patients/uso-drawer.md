# Documentación: Patient Registration Drawer

Este componente proporciona una interfaz elegante y de baja fricción para el registro de nuevos pacientes en el sistema **MEYISOFT POS**.

## 🚀 Uso Rápido

El drawer se controla mediante un `signal` booleano en el componente padre (`PatientsComponent`).

### 1. Control de Visibilidad
En el componente padre (`patients.ts`), define la señal y el método de guardado:

```typescript
// patients.ts
isDrawerOpen = signal(false);

onPatientSaved(data: any) {
  this.isDrawerOpen.set(false);
  // Lógica para enviar al backend...
}
```

### 2. Integración en el Template
Añade el componente al final de tu `patients.html`:

```html
<app-patient-drawer 
  [isOpen]="isDrawerOpen()" 
  (close)="isDrawerOpen.set(false)"
  (saved)="onPatientSaved($event)">
</app-patient-drawer>
```

---

## 🎨 Características de Diseño

### Responsividad Premium
El drawer detecta automáticamente el tamaño de la pantalla mediante `Media Queries` en SCSS:
- **Web (>640px)**: Se desliza desde la derecha con un ancho fijo de `480px`. Útil para mantener la referencia de la lista de fondo.
- **Móvil (<=640px)**: Se desliza desde abajo ocupando el `100%` del ancho, optimizado para el teclado táctil.
- **Backdrop**: Aplica un filtro de desenfoque (`blur(8px)`) al contenido de fondo para centrar la atención en el formulario.

### Formulario Reactivo
Utiliza `ReactiveFormsModule` de Angular para validación en tiempo real:
- **Validaciones**:
    - `name`: Requerido (mín. 3 caracteres).
    - `phone`: Requerido (patrón numérico).
    - `birthDate`: Requerido.
    - `email`: Formato de email válido.
- **Feedback Visual**: Los campos cambian a rojo y muestran mensajes de error detallados solo cuando el usuario ha interactuado con ellos o ha intentado guardar.

---

## 📝 Campos del Formulario

| Campo | Tipo | Validación | Razón de ser |
|-------|------|------------|--------------|
| Nombre | Input | `Required` | Identificación legal del paciente. |
| WhatsApp | Tel | `Required` | Canal principal de confirmación de citas. |
| Email | Email | `Email` | Envío de presupuestos y facturas. |
| F. Nacimiento| Date | `Required` | Cálculo de edad y dosis clínica. |
| Motivo | Select| `Required` | Preparación previa para la Dra. Sarai. |
| Notas | Area | `Optional` | Contexto adicional para la consulta. |
