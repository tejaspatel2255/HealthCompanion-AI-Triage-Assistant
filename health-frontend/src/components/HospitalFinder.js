import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix standard marker icon issues in Leaflet + Create React App
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const HospitalFinder = ({ API_URL, language, translations }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hospitals, setHospitals] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersGroupRef = useRef(null);

  const t = translations[language] || translations['en'];

  // Clean up leaflet map instance on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const fetchHospitals = async (lat, lon) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/nearby-hospitals?lat=${lat}&lon=${lon}`);
      if (!res.ok) {
        throw new Error("Failed to search nearby facilities.");
      }
      const data = await res.json();
      setHospitals(data.hospitals || []);
      
      // Update leaflet map markers
      if (mapInstanceRef.current) {
        // Clear old markers
        if (markersGroupRef.current) {
          markersGroupRef.current.clearLayers();
        } else {
          markersGroupRef.current = L.layerGroup().addTo(mapInstanceRef.current);
        }

        // Add user marker
        L.marker([lat, lon], {
          icon: L.divIcon({
            className: 'custom-user-marker',
            html: `<div class='w-3 h-3 bg-health-primary rounded-full border-2 border-white ring-4 ring-health-primary/30 animate-pulse'></div>`,
            iconSize: [12, 12]
          })
        }).bindPopup("<b>Your Location</b>").addTo(markersGroupRef.current);

        // Add hospital markers
        const bounds = [[lat, lon]];
        (data.hospitals || []).forEach(h => {
          if (h.lat && h.lon) {
            L.marker([h.lat, h.lon])
              .bindPopup(`<b>${h.name}</b><br/>${h.address}<br/><span class="text-xs text-health-primary font-bold">${h.type}</span>`)
              .addTo(markersGroupRef.current);
            bounds.push([h.lat, h.lon]);
          }
        });

        // Fit map bounds
        if (bounds.length > 1) {
          mapInstanceRef.current.fitBounds(bounds, { padding: [30, 30] });
        } else {
          mapInstanceRef.current.setView([lat, lon], 14);
        }
      }
    } catch (e) {
      console.error(e);
      setError(t.hospitalSearchError || 'Could not fetch nearby facilities. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      setError(t.geolocationUnsupported || 'Geolocation is not supported by your browser.');
      return;
    }

    setLoading(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const coords = { lat: latitude, lon: longitude };
        setUserLocation(coords);
        
        // Initialize map
        setTimeout(() => {
          if (mapContainerRef.current && !mapInstanceRef.current) {
            mapInstanceRef.current = L.map(mapContainerRef.current).setView([latitude, longitude], 14);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '&copy; OpenStreetMap contributors'
            }).addTo(mapInstanceRef.current);
            markersGroupRef.current = L.layerGroup().addTo(mapInstanceRef.current);
          }
          fetchHospitals(latitude, longitude);
        }, 100);
      },
      (err) => {
        console.error(err);
        setLoading(false);
        if (err.code === 1) {
          setError(t.geolocationDenied || 'Location access was denied. Please enable location permissions in your browser.');
        } else {
          setError(t.geolocationError || 'Unable to retrieve location. Please check your system settings.');
        }
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-5 h-5 text-health-caution animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          {t.hospitalFinderTitle || "Local Medical Facilities Finder"}
        </h4>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
        {t.hospitalFinderDesc || "Need immediate care? We can check publicly available OpenStreetMap data for nearby hospitals and clinics based on your device location."}
      </p>

      {/* Locate CTA Button */}
      {!userLocation && (
        <button
          onClick={handleLocateUser}
          disabled={loading}
          className="w-full py-2.5 px-4 bg-health-primary hover:bg-health-primary/90 disabled:bg-slate-400 text-white font-bold text-xs rounded-xl shadow-sm transition duration-200 font-serif"
        >
          {loading ? (t.locating || "Locating...") : (t.findFacilities || "Find Nearby Hospitals & Clinics")}
        </button>
      )}

      {/* Error Presentation */}
      {error && (
        <div className="mt-3 p-3 bg-health-emergency/10 text-health-emergency text-xs rounded-xl border border-health-emergency/30">
          {error}
        </div>
      )}

      {/* Map display & List results */}
      {userLocation && (
        <div className="space-y-3 mt-3">
          {/* Map canvas */}
          <div 
            ref={mapContainerRef} 
            className="w-full h-[180px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner"
            style={{ zIndex: 1 }}
          />

          {/* Hospital list */}
          {loading ? (
            <div className="text-center py-4 text-xs text-slate-500 dark:text-slate-400">
              {t.searchingFacilities || "Searching Overpass registry..."}
            </div>
          ) : hospitals.length === 0 ? (
            <div className="text-center py-4 text-xs text-slate-500 dark:text-slate-400">
              {t.noFacilitiesFound || "No clinics or hospitals found within 5km of your location."}
            </div>
          ) : (
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {hospitals.map((h, i) => (
                <div 
                  key={i} 
                  className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700/60 shadow-sm flex items-start justify-between gap-2 text-xs"
                >
                  <div className="flex-1 min-w-0">
                    <h5 className="font-semibold text-slate-800 dark:text-slate-200 truncate">{h.name}</h5>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5 truncate">{h.address}</p>
                    <span className="text-[10px] text-health-primary dark:text-health-secondary font-bold mt-1 inline-block uppercase tracking-wider">
                      {h.type}
                    </span>
                  </div>
                  {h.lat && h.lon && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${h.lat},${h.lon}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 bg-health-primary/10 hover:bg-health-primary/20 text-health-primary dark:bg-slate-700/50 dark:hover:bg-slate-700 dark:text-health-secondary font-bold rounded-xl transition flex-shrink-0"
                    >
                      {t.navigate || "Directions"}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Safety Notice Disclaimer */}
      <div className="mt-3.5 pt-2.5 border-t border-slate-200 dark:border-slate-800/80 text-[10px] text-slate-400 dark:text-slate-500 italic leading-relaxed">
        ⚠️ <b>{t.safetyNoticeTitle || "Emergency Disclaimer:"}</b> {t.safetyNoticeDesc || "This tool uses crowd-sourced Map data and is not an active emergency registry. If you are experiencing a life-threatening crisis, please CALL your emergency services (e.g. 911 / 112) directly instead of looking for directions."}
      </div>
    </div>
  );
};

export default HospitalFinder;
