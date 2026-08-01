import { useEffect, useRef, useState } from 'react'
import { hasBusinessPin } from '../lib/businessRules'
import { liceoMapCenter } from '../lib/appConfig.js'

export function RealLocationPicker({ location = {}, onPick, mapUrl }) {
  const mapNodeRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const onPickRef = useRef(onPick)
  const [mapReady, setMapReady] = useState(false)
  const selectedLat = hasBusinessPin(location) ? Number(location.locationLat ?? location.location_lat) : null
  const selectedLng = hasBusinessPin(location) ? Number(location.locationLng ?? location.location_lng) : null
  const initialMapStateRef = useRef({
    center: selectedLat !== null && selectedLng !== null
      ? { lat: selectedLat, lng: selectedLng }
      : liceoMapCenter,
    zoom: selectedLat !== null && selectedLng !== null ? 17 : 15,
  })

  useEffect(() => {
    onPickRef.current = onPick
  }, [onPick])

  useEffect(() => {
    if (!mapNodeRef.current || mapRef.current) return undefined
    let cancelled = false

    const initializeMap = async () => {
      const { default: L } = await import('leaflet')
      if (cancelled || !mapNodeRef.current || mapRef.current) return
      const initialCenter = initialMapStateRef.current.center
      const map = L.map(mapNodeRef.current, {
        attributionControl: false,
        zoomControl: true,
        scrollWheelZoom: false,
        tap: true,
      }).setView([initialCenter.lat, initialCenter.lng], initialMapStateRef.current.zoom)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        crossOrigin: true,
      }).addTo(map)

      map.on('click', (event) => {
        const lat = Number(event.latlng.lat.toFixed(6))
        const lng = Number(event.latlng.lng.toFixed(6))
        onPickRef.current?.({ lat, lng })
      })

      mapRef.current = map
      setMapReady(true)
      window.setTimeout(() => map.invalidateSize(), 160)
    }

    initializeMap().catch(() => setMapReady(false))

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (selectedLat === null || selectedLng === null) {
      if (markerRef.current) {
        markerRef.current.remove()
        markerRef.current = null
      }
      return
    }

    const latLng = [selectedLat, selectedLng]
    if (!markerRef.current) {
      markerRef.current = L.marker(latLng, {
        icon: L.divIcon({
          className: 'cerca-leaflet-pin',
          html: '<span></span>',
          iconSize: [34, 42],
          iconAnchor: [17, 40],
        }),
      }).addTo(map)
    } else {
      markerRef.current.setLatLng(latLng)
    }
    map.setView(latLng, Math.max(map.getZoom(), 17), { animate: true })
  }, [mapReady, selectedLat, selectedLng])

  return (
    <div className="real-map-picker">
      <div ref={mapNodeRef} className="real-map-canvas" aria-label="Mapa real para tocar la ubicacion del local" />
      <div className="map-link-row">
        <a className="map-link-button" href={mapUrl} target="_blank" rel="noreferrer">
          Abrir Google Maps
        </a>
        <span>{selectedLat !== null && selectedLng !== null ? `${selectedLat}, ${selectedLng}` : 'Toca el mapa para poner el pin real del local.'}</span>
      </div>
    </div>
  )
}
