import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom property marker icon
const createPropertyIcon = (status) => {
  const color = status === 'للبيع' ? '#FF5A5F' : '#087E8B';
  return L.divIcon({
    className: 'custom-property-marker',
    html: `
      <div style="
        background: ${color};
        width: 36px;
        height: 36px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 3px 10px rgba(0,0,0,0.3);
        border: 3px solid white;
      ">
        <svg style="transform: rotate(45deg); width: 18px; height: 18px;" viewBox="0 0 24 24" fill="white">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
        </svg>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
};

// Component to handle map click events for search
const MapClickHandler = ({ onLocationSelect }) => {
  useMapEvents({
    click: (e) => {
      if (onLocationSelect) {
        onLocationSelect(e.latlng);
      }
    },
  });
  return null;
};

// Component to update map view
const ChangeView = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
};

// Property Popup Component
const PropertyPopup = ({ property }) => (
  <div className="map-property-popup">
    <div className="popup-image">
      <img src={property.image} alt={property.title} />
      <span className="popup-status">{property.status}</span>
    </div>
    <div className="popup-content">
      <h4 className="popup-title">{property.title}</h4>
      <p className="popup-price">{property.price} ريال</p>
      <p className="popup-location">{property.location}</p>
      <div className="popup-details">
        {property.area && <span>{property.area} م²</span>}
        {property.bedrooms && <span>{property.bedrooms} غرف</span>}
      </div>
    </div>
  </div>
);

// Main Map Component
export const PropertyMap = ({ 
  properties = [], 
  center = [24.7136, 46.6753], // Riyadh default
  zoom = 10,
  height = '500px',
  onLocationSelect,
  showSearch = false,
  selectedLocation = null,
  onPropertyClick
}) => {
  const [mapCenter, setMapCenter] = useState(center);
  const [searchRadius, setSearchRadius] = useState(null);

  // Saudi Arabia 13 Administrative Regions with coordinates
  const saudiRegions = {
    'منطقة الرياض': [24.7136, 46.6753],
    'منطقة مكة المكرمة': [21.4225, 39.8262],
    'منطقة المدينة المنورة': [24.5247, 39.5692],
    'منطقة القصيم': [26.3267, 43.9750],
    'المنطقة الشرقية': [26.4207, 50.0888],
    'منطقة عسير': [18.2164, 42.5053],
    'منطقة تبوك': [28.3838, 36.5550],
    'منطقة حائل': [27.5219, 41.6907],
    'منطقة الحدود الشمالية': [30.9843, 41.1183],
    'منطقة جازان': [16.8892, 42.5611],
    'منطقة نجران': [17.4933, 44.1277],
    'منطقة الباحة': [20.0129, 41.4677],
    'منطقة الجوف': [29.8117, 40.0818],
  };

  const handleRegionSelect = (region) => {
    if (saudiRegions[region]) {
      setMapCenter(saudiRegions[region]);
    }
  };

  return (
    <div className="map-wrapper" style={{ height }}>
      {showSearch && (
        <div className="map-search-controls">
          <select 
            onChange={(e) => handleRegionSelect(e.target.value)}
            className="map-city-select"
          >
            <option value="">اختر المنطقة</option>
            {Object.keys(saudiRegions).map(region => (
              <option key={region} value={region}>{region}</option>
            ))}
          </select>
          {selectedLocation && (
            <div className="selected-location-info">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
              </svg>
              <span>الموقع المحدد: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}</span>
            </div>
          )}
        </div>
      )}
      
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        style={{ height: '100%', width: '100%', borderRadius: '16px' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <ChangeView center={mapCenter} zoom={zoom} />
        
        {showSearch && <MapClickHandler onLocationSelect={onLocationSelect} />}
        
        {/* Property Markers */}
        {properties.map((property) => (
          property.coordinates && (
            <Marker
              key={property.id}
              position={property.coordinates}
              icon={createPropertyIcon(property.status)}
              eventHandlers={{
                click: () => onPropertyClick && onPropertyClick(property),
              }}
            >
              <Popup>
                <PropertyPopup property={property} />
              </Popup>
            </Marker>
          )
        ))}
        
        {/* Selected Location Marker */}
        {selectedLocation && (
          <Marker position={[selectedLocation.lat, selectedLocation.lng]}>
            <Popup>
              <div className="search-location-popup">
                <p>موقع البحث المحدد</p>
                <small>اضغط للبحث عن عقارات قريبة</small>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};

// Mini Map for Property Cards
export const PropertyMiniMap = ({ coordinates, title }) => {
  if (!coordinates) return null;
  
  return (
    <div className="mini-map-wrapper">
      <MapContainer
        center={coordinates}
        zoom={14}
        style={{ height: '100%', width: '100%', borderRadius: '8px' }}
        scrollWheelZoom={false}
        dragging={false}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={coordinates} icon={createPropertyIcon('للبيع')}>
          <Popup>{title}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

// Full Page Map Component
export const FullPageMap = ({ properties, onPropertySelect, onClose }) => {
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [filteredProperties, setFilteredProperties] = useState(properties);
  const [searchLocation, setSearchLocation] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    let filtered = properties;
    if (filterStatus !== 'all') {
      filtered = properties.filter(p => p.status === filterStatus);
    }
    setFilteredProperties(filtered);
  }, [properties, filterStatus]);

  const handlePropertyClick = (property) => {
    setSelectedProperty(property);
    if (onPropertySelect) {
      onPropertySelect(property);
    }
  };

  return (
    <div className="full-page-map-container">
      <div className="map-header">
        <h2>خريطة العقارات</h2>
        <div className="map-filters">
          <button 
            className={`map-filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
            onClick={() => setFilterStatus('all')}
          >
            الكل ({properties.length})
          </button>
          <button 
            className={`map-filter-btn ${filterStatus === 'للبيع' ? 'active' : ''}`}
            onClick={() => setFilterStatus('للبيع')}
          >
            للبيع
          </button>
          <button 
            className={`map-filter-btn ${filterStatus === 'للإيجار' ? 'active' : ''}`}
            onClick={() => setFilterStatus('للإيجار')}
          >
            للإيجار
          </button>
        </div>
        {onClose && (
          <button className="map-close-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        )}
      </div>
      
      <div className="map-content-wrapper">
        <div className="map-main">
          <PropertyMap
            properties={filteredProperties}
            height="100%"
            showSearch={true}
            onLocationSelect={setSearchLocation}
            selectedLocation={searchLocation}
            onPropertyClick={handlePropertyClick}
          />
        </div>
        
        {selectedProperty && (
          <div className="map-property-sidebar">
            <div className="sidebar-header">
              <h3>تفاصيل العقار</h3>
              <button onClick={() => setSelectedProperty(null)}>×</button>
            </div>
            <div className="sidebar-content">
              <img src={selectedProperty.image} alt={selectedProperty.title} className="sidebar-image" />
              <h4>{selectedProperty.title}</h4>
              <p className="sidebar-price">{selectedProperty.price} ريال</p>
              <p className="sidebar-location">{selectedProperty.location}</p>
              <div className="sidebar-details">
                {selectedProperty.area && <span>{selectedProperty.area} م²</span>}
                {selectedProperty.bedrooms && <span>{selectedProperty.bedrooms} غرف</span>}
                {selectedProperty.bathrooms && <span>{selectedProperty.bathrooms} حمام</span>}
              </div>
              <button className="sidebar-contact-btn">تواصل مع الوكيل</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyMap;
