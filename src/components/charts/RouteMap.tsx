import { useMemo, useRef, useState } from 'react';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import { chartColor } from './chartTheme';

export type RoutePoint = {
  lat: number | null;
  lon: number | null;
  value?: number | null;
  distance?: number | null;
};

export function RouteMap({
  points,
  colorBy = 'pace',
  hoverIndex,
  unit = 'km',
}: {
  points: RoutePoint[];
  colorBy?: 'pace' | 'hr' | 'elevation';
  hoverIndex?: number | null;
  unit?: 'km' | 'mi';
}) {
  const valid = useMemo(
    () =>
      points
        .map((point, index) => ({ ...point, index }))
        .filter(
          (point): point is RoutePoint & { lat: number; lon: number; index: number } =>
            point.lat !== null &&
            point.lon !== null &&
            Number.isFinite(point.lat) &&
            Number.isFinite(point.lon),
        ),
    [points],
  );
  const geometry = useMemo(() => {
    if (valid.length < 2) return null;
    const minLat = Math.min(...valid.map((point) => point.lat));
    const maxLat = Math.max(...valid.map((point) => point.lat));
    const minLon = Math.min(...valid.map((point) => point.lon));
    const maxLon = Math.max(...valid.map((point) => point.lon));
    const midLat = (minLat + maxLat) / 2;
    const factor = Math.max(0.1, Math.cos((midLat * Math.PI) / 180));
    const width = Math.max((maxLon - minLon) * factor, 0.00001);
    const height = Math.max(maxLat - minLat, 0.00001);
    const scale = 160 / Math.max(width, height);
    const cx = (minLon + maxLon) / 2;
    const cy = (minLat + maxLat) / 2;
    return valid.map((point) => ({
      ...point,
      x: 100 + (point.lon - cx) * factor * scale,
      y: 100 - (point.lat - cy) * scale,
    }));
  }, [valid]);
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });
  const drag = useRef<{ x: number; y: number; originX: number; originY: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);
  if (!geometry)
    return (
      <div className="flex h-56 items-center justify-center rounded-tile bg-surface-2 text-sm text-text-2">
        Route unavailable
      </div>
    );
  const valued = geometry
    .map((point) => point.value)
    .filter((v): v is number => v !== null && v !== undefined && Number.isFinite(v));
  const min = valued.length ? Math.min(...valued) : 0;
  const span = valued.length ? Math.max(1, Math.max(...valued) - min) : 1;
  const colors =
    colorBy === 'hr'
      ? ['z1', 'z2', 'z3', 'z4', 'z5']
      : ['accent', 'bb-level', 'success', 'warning', 'danger'];
  const segmentColor = (value?: number | null) =>
    value === null || value === undefined
      ? chartColor('accent')
      : chartColor(colors[Math.min(4, Math.floor(((value - min) / span) * 5))]);
  const path = geometry
    .map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ');
  const hovered = geometry.find((point) => point.index === hoverIndex);
  const viewWidth = 200 / view.zoom;
  const viewBox = `${view.x + (200 - viewWidth) / 2} ${view.y + (200 - viewWidth) / 2} ${viewWidth} ${viewWidth}`;
  const zoom = (factor: number) =>
    setView((old) => ({ ...old, zoom: Math.max(1, Math.min(8, old.zoom * factor)) }));
  const markers = geometry.filter(
    (point, index) =>
      index > 0 &&
      point.distance != null &&
      Math.floor(point.distance / (unit === 'km' ? 1000 : 1609.344)) >
        Math.floor((geometry[index - 1].distance ?? 0) / (unit === 'km' ? 1000 : 1609.344)),
  );
  return (
    <figure className="relative overflow-hidden rounded-tile bg-surface-2">
      <svg
        viewBox={viewBox}
        className="aspect-[4/3] w-full touch-none cursor-grab"
        role="img"
        aria-label="Activity route"
        onWheel={(event) => {
          event.preventDefault();
          zoom(event.deltaY < 0 ? 1.2 : 1 / 1.2);
        }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture?.(event.pointerId);
          pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
          if (pointers.current.size === 1) {
            drag.current = { x: event.clientX, y: event.clientY, originX: view.x, originY: view.y };
          } else if (pointers.current.size === 2) {
            const [a, b] = [...pointers.current.values()];
            pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom: view.zoom };
            drag.current = null;
          }
        }}
        onPointerMove={(event) => {
          if (!pointers.current.has(event.pointerId)) return;
          pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
          if (pointers.current.size === 2 && pinch.current) {
            const [a, b] = [...pointers.current.values()];
            const distance = Math.hypot(a.x - b.x, a.y - b.y);
            setView((old) => ({
              ...old,
              zoom: Math.max(
                1,
                Math.min(
                  8,
                  (pinch.current!.zoom * distance) / Math.max(1, pinch.current!.distance),
                ),
              ),
            }));
            return;
          }
          if (!drag.current) return;
          const rect = event.currentTarget.getBoundingClientRect();
          if (!rect.width || !rect.height) return;
          setView((old) => ({
            ...old,
            x:
              drag.current!.originX -
              (((event.clientX - drag.current!.x) / rect.width) * 200) / old.zoom,
            y:
              drag.current!.originY -
              (((event.clientY - drag.current!.y) / rect.height) * 200) / old.zoom,
          }));
        }}
        onPointerUp={(event) => {
          pointers.current.delete(event.pointerId);
          pinch.current = null;
          const remaining = [...pointers.current.values()][0];
          drag.current = remaining
            ? { x: remaining.x, y: remaining.y, originX: view.x, originY: view.y }
            : null;
        }}
        onPointerCancel={(event) => {
          pointers.current.delete(event.pointerId);
          pinch.current = null;
          drag.current = null;
        }}
      >
        <defs>
          <pattern id="route-dots" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.7" fill={chartColor('border-strong')} />
          </pattern>
        </defs>
        <rect x="-1000" y="-1000" width="2200" height="2200" fill="url(#route-dots)" />
        <path
          d={path}
          fill="none"
          stroke="white"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {geometry.slice(1).map((point, index) => (
          <path
            key={index}
            d={`M${geometry[index].x} ${geometry[index].y} L${point.x} ${point.y}`}
            fill="none"
            stroke={segmentColor(point.value)}
            strokeWidth="3"
            strokeLinecap="round"
          />
        ))}
        <circle
          cx={geometry[0].x}
          cy={geometry[0].y}
          r="5"
          fill={chartColor('success')}
          stroke="white"
          strokeWidth="2"
        />
        <circle
          cx={geometry.at(-1)!.x}
          cy={geometry.at(-1)!.y}
          r="5"
          fill={chartColor('accent')}
          stroke="white"
          strokeWidth="2"
        />
        {markers.map((point) => (
          <g key={point.index}>
            <circle
              cx={point.x}
              cy={point.y}
              r="6"
              fill={chartColor('surface')}
              stroke={chartColor('accent')}
            />
            <text
              x={point.x}
              y={point.y + 2}
              textAnchor="middle"
              fontSize="5"
              fill={chartColor('text')}
            >
              {Math.floor((point.distance ?? 0) / (unit === 'km' ? 1000 : 1609.344))}
            </text>
          </g>
        ))}
        {hovered && (
          <circle
            cx={hovered.x}
            cy={hovered.y}
            r="6"
            fill={chartColor('celebrate')}
            stroke="white"
            strokeWidth="2"
          />
        )}
      </svg>
      <div className="absolute right-2 top-2 flex gap-1">
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => zoom(1.3)}
          className="rounded bg-surface p-2 text-text"
        >
          <Plus size={16} />
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => zoom(1 / 1.3)}
          className="rounded bg-surface p-2 text-text"
        >
          <Minus size={16} />
        </button>
        <button
          type="button"
          aria-label="Reset view"
          onClick={() => setView({ x: 0, y: 0, zoom: 1 })}
          className="rounded bg-surface p-2 text-text"
        >
          <RotateCcw size={16} />
        </button>
      </div>
      <figcaption className="p-2 text-center text-xs text-text-3">
        Drawn privately — no map service used
      </figcaption>
    </figure>
  );
}
