import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface MapPin {
  id: string | number;
  lat: number;
  lng: number;
  label: string;
  type: 'patient' | 'clinic' | 'highlight';
  subtitle?: string;
}

/** Bounds aproximados de Barueri (lat/lng), espelhando o backend. */
const BOUNDS = {
  minLat: -23.53,
  maxLat: -23.475,
  minLng: -46.91,
  maxLng: -46.82,
};

const MAP_W = 640;
const MAP_H = 380;
const PADDING = 24;

@Component({
  selector: 'app-map-preview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <figure
      class="map"
      role="img"
      [attr.aria-label]="'Mapa simulado de Barueri com ' + pins().length + ' marcadores'"
    >
      <header class="map-header">
        <div>
          <strong>📍 Barueri — SP</strong>
          <small class="muted">Visualização geográfica simulada (RF10)</small>
        </div>
        <div class="legend">
          <span class="dot dot-patient"></span> você
          <span class="dot dot-clinic"></span> clínicas
          <span class="dot dot-highlight"></span> selecionada
        </div>
      </header>

      <svg
        [attr.viewBox]="'0 0 ' + W + ' ' + H"
        preserveAspectRatio="xMidYMid meet"
        class="canvas"
      >
        <!-- Background -->
        <rect [attr.width]="W" [attr.height]="H" fill="#eaf3ec" rx="8" />

        <!-- "Ruas" simuladas -->
        <g stroke="#cfe1d4" stroke-width="2" stroke-linecap="round">
          <line x1="0" [attr.y1]="H * 0.3" [attr.x2]="W" [attr.y2]="H * 0.3" />
          <line x1="0" [attr.y1]="H * 0.55" [attr.x2]="W" [attr.y2]="H * 0.55" />
          <line x1="0" [attr.y1]="H * 0.78" [attr.x2]="W" [attr.y2]="H * 0.78" />
          <line [attr.x1]="W * 0.25" y1="0" [attr.x2]="W * 0.25" [attr.y2]="H" />
          <line [attr.x1]="W * 0.55" y1="0" [attr.x2]="W * 0.55" [attr.y2]="H" />
          <line [attr.x1]="W * 0.8" y1="0" [attr.x2]="W * 0.8" [attr.y2]="H" />
        </g>

        <!-- "Avenidas" diagonais -->
        <g stroke="#b9d3c0" stroke-width="3" stroke-linecap="round" opacity="0.7">
          <line x1="0" [attr.y1]="H" [attr.x2]="W * 0.7" y2="0" />
          <line [attr.x1]="W * 0.3" [attr.y1]="H" [attr.x2]="W" [attr.y2]="H * 0.4" />
        </g>

        <!-- Áreas verdes -->
        <circle [attr.cx]="W * 0.15" [attr.cy]="H * 0.85" r="40" fill="#bfe0c7" opacity="0.5" />
        <circle [attr.cx]="W * 0.85" [attr.cy]="H * 0.18" r="32" fill="#bfe0c7" opacity="0.5" />

        <!-- Linhas paciente → clínicas -->
        @if (patientPin(); as p) {
          <g>
            @for (c of clinicPins(); track c.id) {
              <line
                [attr.x1]="project(p).x"
                [attr.y1]="project(p).y"
                [attr.x2]="project(c).x"
                [attr.y2]="project(c).y"
                stroke="#0b6efd"
                stroke-width="1.5"
                stroke-dasharray="4 4"
                opacity="0.35"
              />
            }
          </g>
        }

        <!-- Pinos das clínicas -->
        @for (pin of clinicPins(); track pin.id) {
          <g
            [attr.transform]="'translate(' + project(pin).x + ',' + project(pin).y + ')'"
            class="pin clinic"
          >
            <circle r="9" [attr.fill]="pin.type === 'highlight' ? '#dc3545' : '#198754'" />
            <circle r="3" fill="#fff" />
            <title>{{ pin.label }}{{ pin.subtitle ? ' — ' + pin.subtitle : '' }}</title>
          </g>
        }

        <!-- Pino do paciente -->
        @if (patientPin(); as p) {
          <g
            [attr.transform]="'translate(' + project(p).x + ',' + project(p).y + ')'"
            class="pin patient"
          >
            <circle r="11" fill="#0b6efd" />
            <circle r="4" fill="#fff" />
            <title>{{ p.label }}</title>
          </g>
        }

        <!-- Mensagem se vazio -->
        @if (pins().length === 0) {
          <text
            [attr.x]="W / 2"
            [attr.y]="H / 2"
            text-anchor="middle"
            fill="#6b7280"
            font-size="14"
          >
            Selecione um endereço de partida ou cadastre clínicas para visualizar o mapa
          </text>
        }
      </svg>
    </figure>
  `,
  styles: [
    `
      .map {
        margin: 0;
        background: #fff;
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 12px;
        box-shadow: var(--shadow);
      }
      .map-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        margin-bottom: 8px;
        flex-wrap: wrap;
      }
      .map-header strong {
        font-size: 14px;
      }
      .map-header small {
        margin-left: 8px;
      }
      .legend {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: #4b5563;
      }
      .dot {
        display: inline-block;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        margin-left: 8px;
        margin-right: 2px;
      }
      .dot-patient { background: #0b6efd; }
      .dot-clinic { background: #198754; }
      .dot-highlight { background: #dc3545; }
      .canvas {
        width: 100%;
        height: auto;
        display: block;
      }
      .pin { cursor: help; }
      .pin.clinic:hover circle:first-child { r: 12; }
      .pin.patient circle:first-child {
        animation: pulse 1.6s infinite;
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.55; }
      }
    `,
  ],
})
export class MapPreviewComponent {
  pins = input.required<MapPin[]>();

  readonly W = MAP_W;
  readonly H = MAP_H;

  patientPin = computed(() => this.pins().find((p) => p.type === 'patient') ?? null);
  clinicPins = computed(() =>
    this.pins().filter((p) => p.type === 'clinic' || p.type === 'highlight'),
  );

  /** Converte lat/lng em coordenadas SVG, respeitando os bounds de Barueri. */
  project(pin: MapPin): { x: number; y: number } {
    const lat = clamp(pin.lat, BOUNDS.minLat, BOUNDS.maxLat);
    const lng = clamp(pin.lng, BOUNDS.minLng, BOUNDS.maxLng);
    const x =
      PADDING +
      ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * (MAP_W - 2 * PADDING);
    // Em mapas, latitude maior fica em cima → invertemos no SVG
    const y =
      PADDING +
      ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * (MAP_H - 2 * PADDING);
    return { x, y };
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Distância em km entre dois pontos (fórmula de Haversine). */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
