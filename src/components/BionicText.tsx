import React from 'react';

interface BionicTextProps {
  text: string;
}

export const BionicText: React.FC<BionicTextProps> = ({ text }) => {
  // Divide el texto en palabras conservando espacios y signos de puntuación.
  // Usamos una expresión regular que coincida con letras incluyendo acentos y eñes.
  const parts = text.split(/([a-zA-ZáéíóúñÁÉÍÓÚÑ]+)/g);

  return (
    <>
      {parts.map((part, index) => {
        if (/^[a-zA-ZáéíóúñÁÉÍÓÚÑ]+$/.test(part)) {
          // Si es una palabra, aplicar lectura biónica
          const len = part.length;
          let boldLength = 1;

          if (len === 1) boldLength = 1;
          else if (len <= 3) boldLength = 1;
          else if (len === 4) boldLength = 2;
          else boldLength = Math.ceil(len * 0.4); // 40% para palabras largas

          const boldPart = part.substring(0, boldLength);
          const normalPart = part.substring(boldLength);

          return (
            <span key={index}>
              <strong className="font-bold">{boldPart}</strong>
              <span className="opacity-90">{normalPart}</span>
            </span>
          );
        }
        // Si es espacio o puntuación, renderizar tal cual
        return <span key={index}>{part}</span>;
      })}
    </>
  );
};
