import React from 'react';
import { EventSearch } from '../components/EventSearch'; // Importa el nuevo componente

const MatchpointPage: React.FC = () => {
    return (
        <main className="min-h-screen w-full pt-32 pb-16 px-4 md:px-8 font-['Poppins']">
            <div className="container mx-auto max-w-7xl text-center">
                <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-4">
                    Matchpoint <span className="text-accent">Event Explorer</span>
                </h1>
                <p className="max-w-4xl mx-auto mb-10 text-lg md:text-xl text-text-muted font-light">
                    Find an FRC event to analyze its match predictions and official results.
                </p>

                <EventSearch />
            </div>
        </main>
    );
};

export default MatchpointPage;