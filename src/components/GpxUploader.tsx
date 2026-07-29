import { useRef, type ChangeEvent } from 'react';
import { GpxParseError, parseGpx, type GpxParseResult } from '../utils/gpxParser';

export interface GpxUploaderProps {
  onParsed: (result: GpxParseResult) => void;
  onError: (message: string) => void;
}

export function GpxUploader({ onParsed, onError }: GpxUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.gpx')) {
      onError("Le fichier sélectionné n'est pas un fichier .gpx.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        const result = parseGpx(text);
        onParsed(result);
      } catch (err) {
        onError(err instanceof GpxParseError ? err.message : 'Erreur inattendue lors de la lecture du fichier GPX.');
      }
    };
    reader.onerror = () => {
      onError('Impossible de lire le fichier sélectionné.');
    };
    reader.readAsText(file);
  };

  return (
    <div className="gpx-uploader">
      <button type="button" className="button button-primary" onClick={() => inputRef.current?.click()}>
        Choisir un fichier GPX
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".gpx"
        onChange={handleChange}
        style={{ display: 'none' }}
      />
    </div>
  );
}
