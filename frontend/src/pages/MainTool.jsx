import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Sprout, CloudRain, Activity, MapPin, Droplets, Thermometer, ChevronRight, CheckCircle, Calendar, Globe } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../App.css';
import { getSlopeFromDistrict, calculateErosionRisk, generateAIAdvice, fetchWeatherForecast } from '../utils/agriLogic';
import { translations } from '../utils/translations';
import heroImage from '../assets/hero_new.jpg';

// Fix Leaflet marker icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const API_URL = 'http://localhost:5000';

function LocationMarker({ setLocation }) {
    const [position, setPosition] = useState(null);
    const map = useMapEvents({
        click(e) {
            setPosition(e.latlng);
            setLocation(e.latlng.lat, e.latlng.lng);
            map.flyTo(e.latlng, map.getZoom());
        },
        locationfound(e) {
            setPosition(e.latlng);
            setLocation(e.latlng.lat, e.latlng.lng);
            map.flyTo(e.latlng, map.getZoom());
        },
    });

    return position === null ? null : (
        <Marker position={position}></Marker>
    );
}

function MainTool({ language, setLanguage }) {
    const navigate = useNavigate();
    const t = translations[language] || translations['en'];

    const [info, setInfo] = useState({ districts: [], seasons: [], crops: [] });
    const [fetchError, setFetchError] = useState(null);
    const [formData, setFormData] = useState({
        district: '',
        season: '',
        crop: '',
        area: '',
        rainfall: '',
        budget: 'Medium',
        slope: 'Gentle', // Default
        sowing_date: '',
        lat: 25.4670, // Default to Shillong
        lon: 91.3662,
        soil_type: 'Loamy' // New field
    });
    const [loading, setLoading] = useState(false);

    const fetchInfo = () => {
        setFetchError(null);
        axios.get(`${API_URL}/info`)
            .then(res => {
                console.log("Info fetched:", res.data);
                setInfo(res.data);
                if (res.data.districts.length > 0) setFormData(prev => ({ ...prev, district: res.data.districts[0] }));
                if (res.data.seasons.length > 0) setFormData(prev => ({ ...prev, season: res.data.seasons[0] }));
                if (res.data.crops.length > 0) setFormData(prev => ({ ...prev, crop: res.data.crops[0] }));
            })
            .catch(err => {
                console.error("Error fetching info:", err);
                setFetchError("Failed to connect to backend. Is it running?");
            });
    };

    useEffect(() => {
        fetchInfo();
    }, []);

    // Auto-update slope based on district
    useEffect(() => {
        if (formData.district) {
            const estimatedSlope = getSlopeFromDistrict(formData.district);
            setFormData(prev => ({ ...prev, slope: estimatedSlope }));
        }
    }, [formData.district]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const setLocation = (lat, lon) => {
        setFormData(prev => ({ ...prev, lat, lon }));
    };

    const handlePredict = async () => {
        if (!formData.area || isNaN(formData.area) || Number(formData.area) <= 0) {
            alert("Please enter a valid area (in acres).");
            return;
        }
        if (!formData.crop) {
            alert("Please select a crop.");
            return;
        }

        setLoading(true);
        try {
            // 1. Fetch Weather (Real + Mock 30 days)
            const weatherData = await fetchWeatherForecast(formData.lat, formData.lon);

            // 2. Calculate Erosion Risk
            const avgRainfall = weatherData.reduce((sum, day) => sum + day.rain, 0); // Total rain in 30 days
            const risk = calculateErosionRisk(formData.slope, avgRainfall);

            // 3. Generate AI Advice
            const advice = generateAIAdvice(formData.crop, formData.district, formData.sowing_date);

            // 4. Existing Backend Calls
            const forecastRes = await axios.post(`${API_URL}/forecast`, { district: formData.district });

            let rainfallVal = formData.rainfall;
            if (!rainfallVal && forecastRes.data.forecast.length > 0) {
                rainfallVal = forecastRes.data.forecast[0].rainfall;
            }

            // Convert Acres to Hectares for Backend
            // 1 Acre = 0.404686 Hectares
            const areaInHectares = Number(formData.area) * 0.404686;

            // 5. Get ML Recommendation
            const recommendRes = await axios.post(`${API_URL}/recommend`, {
                ...formData,
                area: areaInHectares,
                rainfall: Number(rainfallVal || 0)
            });

            const predictRes = await axios.post(`${API_URL}/predict`, {
                ...formData,
                area: areaInHectares, // Send Hectares to model
                rainfall: Number(rainfallVal || 0)
            });

            // Navigate to Results Page with all data
            setTimeout(() => {
                navigate('/results', {
                    state: {
                        prediction: predictRes.data,
                        erosionRisk: risk,
                        longForecast: weatherData,
                        aiAdvice: advice,
                        recommendation: recommendRes.data, // Pass recommendation
                        formData: formData,
                        inputAreaAcres: formData.area // Pass original input for display
                    }
                });
            }, 1500); // 1.5s delay to show "Analyzing..." state

        } catch (err) {
            console.error("Error predicting:", err);
            if (err.response && err.response.data && err.response.data.error) {
                alert(`Prediction Failed: ${err.response.data.error}`);
            } else {
                alert("Failed to get prediction. Please check your inputs.");
            }
            setLoading(false);
        }
        setLoading(false);
    }


    return (
        <div className="app-container editorial-theme">
            {/* Header */}
            <header className="app-header editorial-header">
                <div className="brand" onClick={() => navigate('/')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Sprout size={32} color="#1A3C34" />
                    <h1 style={{ color: '#1A3C34', margin: 0, fontSize: '1.5rem' }}>{t.brand}</h1>
                </div>
                <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div className="lang-selector" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Globe size={18} color="#1A3C34" />
                        <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            style={{ border: 'none', background: 'transparent', fontSize: '0.9rem', color: '#1A3C34', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            <option value="en">English</option>
                            <option value="hi">हिंदी</option>
                            <option value="kha">Khasi</option>
                        </select>
                    </div>
                    <span className="date-display">06:04:02 | Meghalaya</span>
                </div>
            </header>

            <main className="main-content-dashboard relative-z">
                <div className="dashboard-title">
                    <h2>{t.dashboard}</h2>
                    <p>{t.enter_details}</p>
                </div>

                <div className="dashboard-grid">
                    {/* Left: Inputs */}
                    <div className="input-card editorial-card">
                        <div className="form-group">
                            <label>{t.location}</label>
                            <div className="input-wrapper">
                                <MapPin size={18} className="input-icon" />
                                <select name="district" value={formData.district} onChange={handleInputChange}>
                                    {info.districts.length > 0 ? (
                                        info.districts.map(d => <option key={d} value={d}>{d}</option>)
                                    ) : (
                                        <option>Loading...</option>
                                    )}
                                </select>
                            </div>
                            {fetchError && (
                                <div style={{ color: 'red', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                                    {fetchError} <button onClick={fetchInfo} style={{ textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', color: 'red' }}>Retry</button>
                                </div>
                            )}
                        </div>

                        {/* Map Integration */}
                        <div className="form-group" style={{ height: '200px', marginBottom: '1.5rem', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd' }}>
                            <label style={{ marginBottom: '0.5rem', display: 'block', fontSize: '0.9rem', color: '#1A3C34' }}>{t.pin_location}</label>
                            <MapContainer center={[formData.lat, formData.lon]} zoom={10} style={{ height: '100%', width: '100%' }}>
                                <TileLayer
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution='&copy; OpenStreetMap contributors'
                                />
                                <LocationMarker setLocation={setLocation} />
                            </MapContainer>
                        </div>

                        <div className="form-group">
                            <label>{t.soil_type}</label>
                            <div className="input-wrapper">
                                <Sprout size={18} className="input-icon" />
                                <select name="soil_type" value={formData.soil_type} onChange={handleInputChange}>
                                    <option value="Loamy">Loamy (Recommended for Rice)</option>
                                    <option value="Sandy">Sandy</option>
                                    <option value="Clay">Clay</option>
                                    <option value="Red">Red Soil</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>{t.budget}</label>
                            <div className="input-wrapper">
                                <span className="input-icon">₹</span>
                                <input type="number" name="budget" value={formData.budget === 'Medium' ? '' : formData.budget} onChange={handleInputChange} placeholder="e.g., 50000" />
                            </div>
                        </div>

                        {/* Hidden/Auto fields but kept for logic */}
                        <div style={{ display: 'none' }}>
                            <input name="area" value={formData.area} onChange={handleInputChange} />
                            <select name="crop" value={formData.crop} onChange={handleInputChange} />
                        </div>

                        {/* Added Area and Crop visible for functionality */}
                        <div className="form-group">
                            <label>{t.area}</label>
                            <div className="input-wrapper">
                                <Activity size={18} className="input-icon" />
                                <input type="number" name="area" value={formData.area} onChange={handleInputChange} placeholder="e.g. 5" />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>{t.crop_selection}</label>
                            <div className="input-wrapper">
                                <Sprout size={18} className="input-icon" />
                                <select name="crop" value={formData.crop} onChange={handleInputChange}>
                                    <option value="">-- Select Crop --</option>
                                    {info.crops.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>

                        <button className="analyze-btn editorial-btn" onClick={handlePredict} disabled={loading}>
                            {loading ? t.analyzing : t.analyze} <ChevronRight size={18} />
                        </button>
                    </div>

                    {/* Right: Image Replacement for Sentinel Card */}
                    <div className="sentinel-card editorial-card" style={{ padding: 0, overflow: 'hidden', border: 'none', background: 'transparent' }}>
                        <img
                            src={heroImage}
                            alt="Farm Analysis"
                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }}
                        />
                    </div>
                </div>
            </main>
        </div>
    );
}

export default MainTool;
