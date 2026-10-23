import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-glow-cyan">
        <Compass className="w-8 h-8 animate-spin" />
      </div>
      <h2 className="text-2xl font-bold text-white tracking-wide">404 — Route Not Found</h2>
      <p className="text-xs text-obsidian-400 max-w-md">
        The requested navigation endpoint does not exist in the Finora DA3 banking shell.
      </p>
      <Link to="/">
        <Button variant="primary" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
          Return to Dashboard
        </Button>
      </Link>
    </div>
  );
};
