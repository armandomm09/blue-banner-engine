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


export const EventSearch: React.FC = () => {
    const navigate = useNavigate();
    const [allEvents, setAllEvents] = useState<TBAEvent[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [eventTypeFilter, setEventTypeFilter] = useState<number | 'all'>('all');
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
        let events = allEvents;
        if (eventTypeFilter !== 'all') {
            events = events.filter(event => event.event_type === eventTypeFilter);
        }
        if (!searchQuery) return events;
        const lowerCaseQuery = searchQuery.toLowerCase();
        return events.filter(event =>
            event.name.toLowerCase().includes(lowerCaseQuery) ||
            event.key.toLowerCase().includes(lowerCaseQuery) ||
            event.city.toLowerCase().includes(lowerCaseQuery) ||
            event.state_prov.toLowerCase().includes(lowerCaseQuery)
        );
    }, [searchQuery, allEvents, eventTypeFilter]);

    const handleEventClick = (eventKey: string) => {
        navigate(`/matchpoint/event/${eventKey}`);
    };

    return (
        <div className="w-full">
            <div className="flex flex-col md:flex-row gap-4 mb-8">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search events by name, key, or location..."
                    className="w-full bg-card border border-border rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                />
                <select
                    value={eventTypeFilter}
                    onChange={e => setEventTypeFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    className="w-full md:w-60 bg-card border border-border rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                >
                    <option value="all">All Types</option>
                    {Object.entries(EVENT_TYPE_MAP).filter(([k]) => k !== '-1').map(([type, { name }]) => (
                        <option key={type} value={type}>{name}</option>
                    ))}
                </select>
            </div>

            {isLoading && <p className="text-text-muted">Loading events...</p>}
            {error && <p className="text-red-400">{error}</p>}
           
            {!isLoading && !error && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    
                    {filteredEvents.map(event => (
                        <div
                            key={event.key}
                            onClick={() => handleEventClick(event.key)}
                            className="cursor-target bg-card border border-border rounded-lg p-4 cursor-pointer hover:border-accent hover:scale-105 transition-all duration-200"
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