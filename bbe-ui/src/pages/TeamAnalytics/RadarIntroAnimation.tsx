import React, { useState, useEffect } from 'react';

// Constantes para controlar la animación
const PING_COUNT = 3;         // Número de ondas a emitir
const PING_INTERVAL_MS = 1200; // Tiempo entre cada onda (1.2 segundos)
const ANIMATION_DURATION_MS = 1500; // Duración de la expansión de una onda (1.5 segundos)

export const RadarIntroAnimation: React.FC = () => {
  // Estado para controlar si el componente es visible. Inicia visible.
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Calculamos la duración total de la animación
    const totalDuration = (PING_COUNT - 1) * PING_INTERVAL_MS + ANIMATION_DURATION_MS;

    // Creamos un temporizador para que, cuando la última onda termine,
    // el componente se desmonte a sí mismo del DOM.
    const cleanupTimer = setTimeout(() => {
      setIsVisible(false);
    }, totalDuration);

    // Función de limpieza de React: si el componente se desmonta antes,
    // limpiamos el temporizador para evitar fugas de memoria.
    return () => clearTimeout(cleanupTimer);
  }, []); // El array vacío asegura que este efecto se ejecute solo una vez, al montar.

  // Si no es visible, no renderizamos nada (se elimina del DOM).
  if (!isVisible) {
    return null;
  }

  return (
    <>
      {/* Definimos la animación @keyframes directamente aquí para que sea autocontenido */}
      <style>
        {`
          @keyframes radar-ping-fullscreen {
            0% {
              transform: scale(0.1);
              opacity: 0.75;
            }
            100% {
              /* La escala debe ser grande para cubrir la pantalla */
              transform: scale(2.5);
              opacity: 0;
            }
          }
        `}
      </style>

      {/* Este div se posiciona sobre TODA la página */}
      <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
        {/* Generamos las 3 ondas. `Array.from` crea un array de la longitud de PING_COUNT */}
        {Array.from({ length: PING_COUNT }).map((_, index) => (
          <div
            key={index}
            className="absolute rounded-full border-2 border-accent"
            style={{
              // Asignamos la animación y un retraso escalonado a cada onda
              width: '10rem', // Tamaño inicial
              height: '10rem',
              animationName: 'radar-ping-fullscreen',
              animationDuration: `${ANIMATION_DURATION_MS}ms`,
              animationIterationCount: 1, // Se ejecuta solo una vez
              animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
              animationDelay: `${index * PING_INTERVAL_MS}ms`,
            }}
          />
        ))}
      </div>
    </>
  );
};