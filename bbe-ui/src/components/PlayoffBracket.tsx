import React, { useMemo, useRef, useEffect, useState } from 'react';

// --- Type Definitions ---
interface Prediction {
    match_key: string;
    team_keys: { red: string[]; blue:string[] };
    predicted_winner: "red" | "blue";
    status: "played" | "upcoming";
    actual_winner?: "red" | "blue" | "tie";
    predicted_scores: { red: number; blue: number };
    actual_scores?: { red: number; blue: number };
}

// --- Componente para dibujar las líneas SVG ---
const LineDrawer: React.FC<{
    connections: { from: string | string[], to: string }[];
    matchRefs: React.MutableRefObject<Map<string, HTMLDivElement | null>>;
    gridRef: React.RefObject<HTMLDivElement | null>;
}> = ({ connections, matchRefs, gridRef }) => {
    const [paths, setPaths] = useState<string[]>([]);

    useEffect(() => {
        const gridEl = gridRef.current;
        if (!gridEl) return;

        const observer = new ResizeObserver(() => {
            const newPaths: string[] = [];
            const gridRect = gridEl.getBoundingClientRect();
    
            connections.forEach(conn => {
                const toEl = matchRefs.current.get(conn.to);
                const toRect = toEl?.getBoundingClientRect();
    
                if (!toRect) return;
    
                const sources = Array.isArray(conn.from) ? conn.from : [conn.from];
                
                sources.forEach(fromKey => {
                    let fromRect;
                    // Handle special keys for loser connections
                    const realKey = fromKey.replace('Loser ', '');
                    const fromEl = matchRefs.current.get(realKey);
                    fromRect = fromEl?.getBoundingClientRect();
    
                    if (!fromRect) return;
    
                    const x1 = fromRect.right - gridRect.left;
                    const y1 = fromRect.top - gridRect.top + fromRect.height / 2;
                    const x2 = toRect.left - gridRect.left;
                    const y2 = toRect.top - gridRect.top + toRect.height / 2;
                    const midX = x1 + (x2 - x1) / 2;
    
                    const pathData = `M ${x1},${y1} H ${midX} V ${y2} H ${x2}`;
                    newPaths.push(pathData);
                });
            });
    
            setPaths(newPaths);
        });

        observer.observe(gridEl);
        return () => observer.disconnect();

    }, [connections, matchRefs, gridRef]);

    return (
        <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0, zIndex: 0 }}>
            <g stroke="#4b5563" strokeWidth="2" fill="none">
                {paths.map((d, i) => <path key={i} d={d} />)}
            </g>
        </svg>
    );
};


// --- Sub-componentes (MatchCard, FinalsCard) ---
// (No es necesario copiar estos de nuevo si ya los tienes, no han cambiado)
const MatchCard: React.FC<{
    prediction: Prediction | null;
    title: string;
    placeholderText: string;
    cardRef: (el: HTMLDivElement | null) => void;
}> = ({ prediction, title, placeholderText, cardRef }) => {
    if (!prediction) {
        return (
            <div ref={cardRef} className="bg-card/50 border border-dashed border-border/50 rounded-lg p-3 w-64 min-h-[100px] flex flex-col items-center justify-center text-center relative z-10">
                <p className="text-text-muted font-bold text-sm">{title}</p>
                <p className="text-text-muted/70 text-xs italic">{placeholderText}</p>
            </div>
        );
    }
    const isPredictionCorrect = prediction.status === 'played' && prediction.predicted_winner === prediction.actual_winner;
    const getTeamClasses = (alliance: 'red' | 'blue') => {
        let classes = 'p-2 rounded-md transition-all border-2 flex justify-between items-center ';
        const isWinner = prediction.actual_winner === alliance;
        const isPredictedWinner = prediction.predicted_winner === alliance;
        if (prediction.status === 'played') {
            classes += isWinner ? 'border-green-500 bg-green-500/10' : 'border-transparent opacity-60';
        } else {
            classes += isPredictedWinner ? 'border-accent/70 bg-accent/10' : 'border-transparent';
        }
        return classes;
    };
    return (
        <div ref={cardRef} className="bg-card border border-border rounded-lg p-3 w-64 shadow-lg shadow-black/30 relative z-10">
            <div className="flex justify-between items-center mb-2">
                 <h4 className="text-sm font-bold text-text-muted">{title}</h4>
                 {prediction.status === 'played' && (
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${isPredictionCorrect ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-400'}`}>
                        {isPredictionCorrect ? 'CORRECT' : 'INCORRECT'}
                    </span>
                 )}
            </div>
            <div className="flex flex-col gap-1 text-sm">
                <div className={getTeamClasses('red')}>
                    <div className="flex items-center gap-2"><span className="font-bold text-red-300">RED</span><div className="font-mono text-red-300">{prediction.team_keys.red.map(t => t.replace('frc', '')).join(' ')}</div></div>
                    <span className="font-bold text-red-300 w-8 text-right">{prediction.actual_scores?.red ?? prediction.predicted_scores.red}</span>
                </div>
                <div className={getTeamClasses('blue')}>
                    <div className="flex items-center gap-2"><span className="font-bold text-blue-300">BLUE</span><div className="font-mono text-blue-300">{prediction.team_keys.blue.map(t => t.replace('frc', '')).join(' ')}</div></div>
                    <span className="font-bold text-blue-300 w-8 text-right">{prediction.actual_scores?.blue ?? prediction.predicted_scores.blue}</span>
                </div>
            </div>
        </div>
    );
};

const FinalsCard: React.FC<{ 
    finalMatch1: Prediction | null;
    finalMatch2: Prediction | null;
    finalMatch3: Prediction | null;
    cardRef: (el: HTMLDivElement | null) => void;
}> = ({ finalMatch1, finalMatch2, finalMatch3, cardRef }) => {
    const calculateWinner = () => {
        let redWins = 0;
        let blueWins = 0;

        if (finalMatch1?.actual_winner === 'red') redWins++;
        if (finalMatch1?.actual_winner === 'blue') blueWins++;

        if (finalMatch2?.actual_winner === 'red') redWins++;
        if (finalMatch2?.actual_winner === 'blue') blueWins++;

        if (finalMatch3?.actual_winner === 'red') redWins++;
        if (finalMatch3?.actual_winner === 'blue') blueWins++;

        if (redWins >= 2) return 'red';
        if (blueWins >= 2) return 'blue';
        return null; // No winner yet
    };

    const winner = calculateWinner();

    return (
        <div ref={cardRef} className="bg-card border-2 border-accent/50 rounded-lg p-4 w-64 shadow-xl shadow-black/40 flex items-center gap-4 relative z-10">
            <div className="flex-grow">
                <h4 className="text-base font-bold text-accent text-center mb-2">FINALS</h4>
                <div className="flex flex-col gap-1">
                     <div className={`p-2 rounded-md text-sm font-bold ${winner === 'red' ? 'bg-red-500/20 text-red-300' : 'text-text-muted/50'}`}>
                        {finalMatch1 ? `Red: ${finalMatch1.team_keys.red.map(t => t.replace('frc','')).join(' ')}` : 'Winner of M12'}
                    </div>
                    <div className={`p-2 rounded-md text-sm font-bold ${winner === 'blue' ? 'bg-blue-500/20 text-blue-300' : 'text-text-muted/50'}`}>
                       {finalMatch1 ? `Blue: ${finalMatch1.team_keys.blue.map(t => t.replace('frc','')).join(' ')}` : 'Winner of M13'}
                    </div>
                </div>
                <p className="text-xs text-center text-text-muted mt-2">Best 2 out of 3</p>
            </div>
            <div className="text-5xl">🏆</div>
        </div>
    );
}

// --- Componente Principal del Bracket ---
export const PlayoffBracket: React.FC<{ predictions: Prediction[] }> = ({ predictions }) => {
    
    const playoffMatchesByKey = useMemo(() => {
        const matchMap = new Map<string, Prediction>();
        predictions
            .filter(p => p.match_key.includes('_sf') || p.match_key.includes('_f'))
            .forEach(p => matchMap.set(p.match_key, p));
        return matchMap;
    }, [predictions]);

    const eventKey = predictions[0]?.match_key.split('_')[0] || '';
    const findMatch = (key: string) => playoffMatchesByKey.get(key) || null;
    
    const matchRefs = useRef(new Map<string, HTMLDivElement | null>());
    const gridRef = useRef<HTMLDivElement>(null);
    const setMatchRef = (key: string) => (el: HTMLDivElement | null) => {
        matchRefs.current.set(key, el);
    };

    const bracketConnections = [
        { from: ['M1', 'M2'], to: 'M7' }, { from: ['M3', 'M4'], to: 'M8' },
        { from: 'M7', to: 'M11' }, { from: 'M8', to: 'M11' }, // Upper bracket lines
        // { from: ['M1', 'M2'], to: 'M5' }, { from: ['M3', 'M4'], to: 'M6' }, // Loser drops
        // { from: ['M7', 'M5'], to: 'M9' }, { from: ['M8', 'M6'], to: 'M10' },
        { from: 'M5', to: 'M10' }, { from: 'M6', to: 'M9' }, // Upper bracket lines
        { from: ['M9', 'M10'], to: 'M12' }, { from: 'M12', to: 'M13' },
        { from: ['M11', 'M13'], to: 'FINALS' }
    ];
    
    if (playoffMatchesByKey.size === 0) {
        return ( <div className="bg-card border border-border rounded-xl p-8 text-center text-text-muted"><h3 className="text-lg font-bold text-white">No Playoff Data Available</h3><p>Playoff bracket will be shown here once matches are generated.</p></div> );
    }
    
    return (
        <div className="flex justify-center items-start overflow-x-auto p-4 lg:p-6 bg-card border border-border rounded-xl">
            <div style={{ transform: 'scale(0.9)', transformOrigin: 'top center', width: '111%', height: '111%' }}>
                <div ref={gridRef} className="grid gap-x-8 gap-y-2 relative" style={{ gridTemplateColumns: '30px repeat(6, 256px)', gridTemplateRows: '30px repeat(14, auto)', minWidth: '1650px'}}>
                    <LineDrawer connections={bracketConnections} matchRefs={matchRefs} gridRef={gridRef} />
                    <div className="text-accent font-bold text-sm tracking-widest flex items-center justify-center [writing-mode:vertical-rl]" style={{gridRow: '2 / span 7'}}>UPPER BRACKET</div>
                    <div className="text-accent font-bold text-sm tracking-widest flex items-center justify-center [writing-mode:vertical-rl]" style={{gridRow: '9 / span 6'}}>LOWER BRACKET</div>
                    <h3 className="text-text-muted font-bold text-center" style={{gridColumn: 2}}>ROUND 1</h3>
                    <h3 className="text-text-muted font-bold text-center" style={{gridColumn: 3}}>ROUND 2</h3>
                    <h3 className="text-text-muted font-bold text-center" style={{gridColumn: 4}}>ROUND 3</h3>
                    <h3 className="text-text-muted font-bold text-center" style={{gridColumn: 5}}>ROUND 4</h3>
                    <h3 className="text-text-muted font-bold text-center" style={{gridColumn: 6}}>ROUND 5</h3>
                    <h3 className="text-text-muted font-bold text-center" style={{gridColumn: 7}}>FINALS</h3>
                    
                    {/* --- Colocación de Matches con las llaves CORRECTAS --- */}
                    
                    {/* Round 1 (Upper) */}
                    <div style={{gridArea: '2 / 2 / span 2 / span 1'}} className="flex items-center"><MatchCard title="Match 1" cardRef={setMatchRef('M1')} placeholderText="Alliance 1 vs Alliance 8" prediction={findMatch(`${eventKey}_sf1m1`)} /></div>
                    <div style={{gridArea: '4 / 2 / span 2 / span 1'}} className="flex items-center"><MatchCard title="Match 2" cardRef={setMatchRef('M2')} placeholderText="Alliance 4 vs Alliance 5" prediction={findMatch(`${eventKey}_sf2m1`)} /></div>
                    <div style={{gridArea: '6 / 2 / span 2 / span 1'}} className="flex items-center"><MatchCard title="Match 3" cardRef={setMatchRef('M3')} placeholderText="Alliance 3 vs Alliance 6" prediction={findMatch(`${eventKey}_sf3m1`)} /></div>
                    <div style={{gridArea: '8 / 2 / span 2 / span 1'}} className="flex items-center"><MatchCard title="Match 4" cardRef={setMatchRef('M4')} placeholderText="Alliance 2 vs Alliance 7" prediction={findMatch(`${eventKey}_sf4m1`)} /></div>

                    {/* Round 2 (Upper & Lower) */}
                    <div style={{gridArea: '3 / 3 / span 2 / span 1'}} className="flex items-center"><MatchCard title="Match 7" cardRef={setMatchRef('M7')} placeholderText="Winner M1 vs Winner M2" prediction={findMatch(`${eventKey}_sf7m1`)} /></div>
                    <div style={{gridArea: '7 / 3 / span 2 / span 1'}} className="flex items-center"><MatchCard title="Match 8" cardRef={setMatchRef('M8')} placeholderText="Winner M3 vs Winner M4" prediction={findMatch(`${eventKey}_sf8m1`)} /></div>
                    <div style={{gridArea: '10 / 3 / span 2 / span 1'}} className="flex items-center"><MatchCard title="Match 5" cardRef={setMatchRef('M5')} placeholderText="Loser M1 vs Loser M2" prediction={findMatch(`${eventKey}_sf5m1`)} /></div>
                    <div style={{gridArea: '12 / 3 / span 2 / span 1'}} className="flex items-center"><MatchCard title="Match 6" cardRef={setMatchRef('M6')} placeholderText="Loser M3 vs Loser M4" prediction={findMatch(`${eventKey}_sf6m1`)} /></div>

                    {/* Round 3 (Lower) */}
                    <div style={{gridArea: '9 / 4 / span 2 / span 1'}} className="flex items-center"><MatchCard title="Match 9" cardRef={setMatchRef('M9')} placeholderText="Loser M7 vs Winner M6" prediction={findMatch(`${eventKey}_sf9m1`)} /></div>
                    <div style={{gridArea: '11 / 4 / span 2 / span 1'}} className="flex items-center"><MatchCard title="Match 10" cardRef={setMatchRef('M10')} placeholderText="Loser M8 vs Winner M5" prediction={findMatch(`${eventKey}_sf10m1`)} /></div>
                    
                    {/* Round 4 (Upper Final & Lower) */}
                    <div style={{gridArea: '5 / 5 / span 2 / span 1'}} className="flex items-center"><MatchCard title="Match 11" cardRef={setMatchRef('M11')} placeholderText="Winner M9 vs Winner M10" prediction={findMatch(`${eventKey}_sf11m1`)} /></div>
                    <div style={{gridArea: '10 / 5 / span 2 / span 1'}} className="flex items-center"><MatchCard title="Match 12" cardRef={setMatchRef('M12')} placeholderText="Winner M7 vs Winner M8" prediction={findMatch(`${eventKey}_sf12m1`)} /></div>

                    {/* Round 5 (Lower Final) */}
                    <div style={{gridArea: '8 / 6 / span 2 / span 1'}} className="flex items-center"><MatchCard title="Match 13" cardRef={setMatchRef('M13')} placeholderText="Loser M12 vs Winner M11" prediction={findMatch(`${eventKey}_sf13m1`)} /></div>
                    
                    {/* Finals */}
                    <div style={{gridArea: '6 / 7 / span 2 / span 1'}} className="flex items-center">
                        <FinalsCard cardRef={setMatchRef('FINALS')} 
                                    finalMatch1={findMatch(`${eventKey}_f1m1`)} 
                                    finalMatch2={findMatch(`${eventKey}_f1m2`)}
                                    finalMatch3={findMatch(`${eventKey}_f1m3`)} />
                    </div>
                </div>
            </div>
        </div>
    );
};
export default PlayoffBracket;