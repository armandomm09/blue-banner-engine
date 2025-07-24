import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

// --- Type Definitions ---
interface TBAEvent {
    key: string;
    name: string;
    event_type: number;
    city: string;
    state_prov: string;
    start_date: string;
}

const EVENT_TYPE_MAP: { [key: number]: { name: string; color: string } } = {
    0: { name: 'Regional', color: 'bg-blue-500/20 text-blue-300' },
    1: { name: 'District', color: 'bg-green-500/20 text-green-300' },
    2: { name: 'District CMP', color: 'bg-yellow-500/20 text-yellow-300' },
    3: { name: 'CMP Division', color: 'bg-purple-500/20 text-purple-300' },
    4: { name: 'CMP Finals', color: 'bg-red-500/20 text-red-300' },
    5: { name: 'District CMP Division', color: 'bg-yellow-500/20 text-yellow-300' },
    6: { name: 'FOC', color: 'bg-pink-500/20 text-pink-300' },
    99: { name: 'Offseason', color: 'bg-gray-500/20 text-gray-300' },
    100: { name: 'Preseason', color: 'bg-gray-500/20 text-gray-300' },
    [-1]: { name: 'Unlabeled', color: 'bg-gray-600/20 text-gray-400' }
};

// Componente reutilizable para mostrar un ícono de carga
const LoadingSpinner: React.FC = () => (
    <svg
      className="animate-spin -ml-1 mr-3 h-5 w-5 text-background"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );

export const EventSearch: React.FC = () => {
    const navigate = useNavigate();
    const [allEvents, setAllEvents] = useState<TBAEvent[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchEvents = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // Hacemos fetch para el año actual o el que desees por defecto
                const year = new Date().getFullYear();
                const response = await fetch(`/api/v1/events/${year}`);
                if (!response.ok) throw new Error('Failed to fetch events');
                const data: TBAEvent[] = await response.json();
                
                // Ordenamos los eventos por fecha de inicio
                data.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
                setAllEvents(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setIsLoading(false);
            }
        };
        fetchEvents();
    }, []);

    const filteredEvents = useMemo(() => {
        if (!searchQuery) return allEvents;
        const lowerCaseQuery = searchQuery.toLowerCase();
        return allEvents.filter(event =>
            event.name.toLowerCase().includes(lowerCaseQuery) ||
            event.key.toLowerCase().includes(lowerCaseQuery) ||
            event.city.toLowerCase().includes(lowerCaseQuery) ||
            event.state_prov.toLowerCase().includes(lowerCaseQuery)
        );
    }, [searchQuery, allEvents]);

    const handleEventClick = (eventKey: string) => {
        navigate(`/matchpoint/event/${eventKey}`);
    };

    return (
        <div className="w-full">
            <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search events by name, key, or location..."
                className="w-full bg-card border border-border rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:ring-2 focus:ring-accent transition-all mb-8"
            />

            {isLoading && <p className="text-text-muted">Loading events...</p>}
            {error && <p className="text-red-400">{error}</p>}
            
            {!isLoading && !error && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredEvents.map(event => (
                        <div
                            key={event.key}
                            onClick={() => handleEventClick(event.key)}
                            className="bg-card border border-border rounded-lg p-4 cursor-pointer hover:border-accent hover:scale-105 transition-all duration-200"
                        >
                            <div className="flex justify-between items-start">
                                <h3 className="font-bold text-white mb-1 pr-2">{event.name}</h3>
                                <span className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${EVENT_TYPE_MAP[event.event_type]?.color || EVENT_TYPE_MAP[-1].color}`}>
                                    {EVENT_TYPE_MAP[event.event_type]?.name || EVENT_TYPE_MAP[-1].name}
                                </span>
                            </div>
                            <p className="text-sm text-text-muted">{event.city}, {event.state_prov}</p>
                            <p className="text-sm text-text-muted font-mono mt-2">{event.key}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};