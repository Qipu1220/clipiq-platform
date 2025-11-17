import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';

interface SearchBarProps {
  onSearch: (query: string, mode: 'nor' | 'em', ocr?: string, asr?: string) => void;
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const [mode, setMode] = useState<'nor' | 'em'>('nor');
  const [query, setQuery] = useState('');
  const [ocr, setOcr] = useState('');
  const [asr, setAsr] = useState('');

  const handleSearch = () => {
    if (mode === 'nor') {
      onSearch(query, 'nor');
    } else {
      onSearch(query, 'em', ocr, asr);
    }
  };

  return (
    <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
      <div className="flex items-center gap-4 mb-4">
        <div className="flex gap-2">
          <Button
            variant={mode === 'nor' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('nor')}
            className={mode === 'nor' ? 'bg-red-600 hover:bg-red-700 text-white' : 'border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800'}
          >
            Nor
          </Button>
          <Button
            variant={mode === 'em' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('em')}
            className={mode === 'em' ? 'bg-red-600 hover:bg-red-700 text-white' : 'border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800'}
          >
            Em
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder={mode === 'nor' ? 'Search by title or channel...' : 'General query...'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="bg-zinc-800 border-zinc-700 text-white flex-1"
          />
          <Button onClick={handleSearch} className="bg-red-600 hover:bg-red-700">
            <Search className="w-4 h-4" />
          </Button>
        </div>

        {mode === 'em' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-zinc-400 text-xs mb-1">OCR Query</Label>
              <Input
                type="text"
                placeholder="Search text in video..."
                value={ocr}
                onChange={(e) => setOcr(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="bg-zinc-800 border-zinc-700 text-white text-sm"
              />
            </div>
            <div>
              <Label className="text-zinc-400 text-xs mb-1">ASR Query</Label>
              <Input
                type="text"
                placeholder="Search audio/speech..."
                value={asr}
                onChange={(e) => setAsr(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="bg-zinc-800 border-zinc-700 text-white text-sm"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}