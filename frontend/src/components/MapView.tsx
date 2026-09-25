import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Map, { Marker, type MapRef } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import { getMapboxAccessToken } from '../config/env'
import type { Event } from '../types/event'
import { formatEventDate, formatEventTime } from '../utils/dates'
import { MAP_BOUNDS, parseLatLong } from '../utils/geo'
import { formatEventSource } from '../utils/source'

/** Downtown San Francisco (lng, lat) — viewport is always anchored here unless the user picks another pin */
const SF_CENTER: [number, number] = [-122.4194, 37.7749]
const ZOOM_EMPTY = 12
/** Slightly wider when there are markers (Bay Area) while keeping SF in the middle of the frame */
const ZOOM_WITH_PINS = 10.75

export interface MapPin {
  id: number
  lng: number
  lat: number
  title: string
  label: string
  venue: string
  when: string
  sourceLabel: string
}

function formatPinWhen(datetime?: string): string {
  if (!datetime) return 'Date TBA'
  const date = formatEventDate(datetime)
  const time = formatEventTime(datetime)
  return time ? `${date} · ${time}` : date
}

export interface MapViewProps {
  events: Event[]
  selectedEventId: number | null
  onSelectEvent: (id: number) => void
  listExpanded: boolean
}

export function MapView({ events, selectedEventId, onSelectEvent, listExpanded }: MapViewProps) {
  const mapRef = useRef<MapRef>(null)
  const [ready, setReady] = useState(false)
  const [hoveredPinId, setHoveredPinId] = useState<number | null>(null)
  const token = getMapboxAccessToken()
  /** Skip flying on first hydrated selection; only fly when the user picks another event */
  const prevSelectedRef = useRef<number | null | undefined>(undefined)

  const pins = useMemo(() => {
    const list: MapPin[] = []
    let n = 0
    for (const e of events) {
      const coords = parseLatLong(e.latlong)
      if (!coords) continue
      n += 1
      list.push({
        id: e.id,
        lng: coords[0],
        lat: coords[1],
        title: e.title,
        label: String(n).padStart(2, '0'),
        venue: e.venue || e.location || '',
        when: formatPinWhen(e.datetime),
        sourceLabel: formatEventSource(e.source) ?? '',
      })
    }
    return list
  }, [events])

  const frameSanFrancisco = useCallback(() => {
    const map = mapRef.current?.getMap()
    if (!map) return
    const zoom = pins.length === 0 ? ZOOM_EMPTY : ZOOM_WITH_PINS
    map.jumpTo({ center: SF_CENTER, zoom })
  }, [pins.length])

  const flyToPin = useCallback((id: number) => {
    const map = mapRef.current?.getMap()
    const pin = pins.find((p) => p.id === id)
    if (!map || !pin) return
    map.flyTo({
      center: [pin.lng, pin.lat],
      zoom: Math.max(map.getZoom(), 13),
      duration: 500,
    })
  }, [pins])

  const onMapLoad = useCallback(() => {
    const map = mapRef.current?.getMap()
    map?.resize()
    setReady(true)
    requestAnimationFrame(() => {
      mapRef.current?.getMap()?.resize()
      frameSanFrancisco()
    })
  }, [frameSanFrancisco])

  useEffect(() => {
    if (!ready) return
    frameSanFrancisco()
  }, [ready, frameSanFrancisco])

  useEffect(() => {
    if (!ready) return
    const id = selectedEventId ?? null
    if (prevSelectedRef.current === undefined) {
      prevSelectedRef.current = id
      return
    }
    if (prevSelectedRef.current === id) return
    prevSelectedRef.current = id
    if (id != null) flyToPin(id)
  }, [ready, selectedEventId, flyToPin])

  useEffect(() => {
    if (!ready) return
    const map = mapRef.current?.getMap()
    if (!map) return
    const t = window.setTimeout(() => map.resize(), 380)
    return () => clearTimeout(t)
  }, [ready, listExpanded])

  useEffect(() => {
    if (!ready) return
    const map = mapRef.current?.getMap()
    if (!map) return
    const onWinResize = () => map.resize()
    window.addEventListener('resize', onWinResize)
    return () => window.removeEventListener('resize', onWinResize)
  }, [ready])

  if (!token) {
    return (
      <div className="map-container is-fallback">
        <p>
          Set <code>VITE_MAPBOX_ACCESS_TOKEN</code> in <code>frontend/.env</code> (same value as
          <code> MAPBOX_API_KEY</code> in <code>backend/.env</code>), then restart Vite.
        </p>
      </div>
    )
  }

  return (
    <div className="map-container">
      <Map
        ref={mapRef}
        mapboxAccessToken={token}
        initialViewState={{
          longitude: SF_CENTER[0],
          latitude: SF_CENTER[1],
          zoom: ZOOM_EMPTY,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        maxBounds={MAP_BOUNDS}
        minZoom={9}
        onLoad={onMapLoad}
      >
        {pins.map((p) => {
          const isSel = selectedEventId === p.id
          const isHovered = hoveredPinId === p.id
          const markerProps = {
            onMouseEnter: () => setHoveredPinId(p.id),
            onMouseLeave: () => setHoveredPinId((id) => (id === p.id ? null : id)),
            onFocus: () => setHoveredPinId(p.id),
            onBlur: () => setHoveredPinId((id) => (id === p.id ? null : id)),
          }
          const tooltip = isHovered ? (
            <div className="map-marker-tooltip" role="tooltip">
              <strong className="map-marker-tooltip__title">{p.title}</strong>
              <span className="map-marker-tooltip__meta">{p.when}</span>
              {p.venue ? <span className="map-marker-tooltip__meta">{p.venue}</span> : null}
              {p.sourceLabel ? (
                <span className="map-marker-tooltip__source">{p.sourceLabel}</span>
              ) : null}
            </div>
          ) : null

          return (
            <Marker
              key={p.id}
              longitude={p.lng}
              latitude={p.lat}
              anchor="bottom"
              style={{ zIndex: isHovered || isSel ? 10 : 1 }}
            >
              {isSel ? (
                <button
                  type="button"
                  className="map-marker-wrap"
                  aria-label={p.title}
                  onClick={() => onSelectEvent(p.id)}
                  {...markerProps}
                >
                  {tooltip}
                  <span className="map-marker-pill">{p.label}</span>
                  <span className="map-marker-dot" />
                </button>
              ) : (
                <button
                  type="button"
                  className="map-marker map-marker--hoverable"
                  aria-label={p.title}
                  onClick={() => onSelectEvent(p.id)}
                  {...markerProps}
                >
                  {tooltip}
                </button>
              )}
            </Marker>
          )
        })}
      </Map>
      {pins.length === 0 && (
        <div className="map-toast">No events with locations to plot — geocode more venues in the API.</div>
      )}
    </div>
  )
}
