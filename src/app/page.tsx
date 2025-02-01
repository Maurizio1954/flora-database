'use client';

import { FloraDatabase } from '../components/FloraDatabase';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <FloraDatabase />
      </div>
    </div>
  );
}