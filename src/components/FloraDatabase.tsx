'use client';

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

interface Plant {
  SPECIE: string;
  FAMIGLIA: string;
  Pignatti?: string;
  Località?: string;
  Note?: string;
}

export const FloraDatabase = () => {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [loading, setLoading] = useState(true);
  const [newLocation, setNewLocation] = useState('');
  const [coordinates, setCoordinates] = useState('');
  const [newNote, setNewNote] = useState('');
  const [gpsStatus, setGpsStatus] = useState('');
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/database.xlsx');
        const arrayBuffer = await response.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        setPlants(jsonData as Plant[]);
        setLoading(false);
      } catch (error) {
        console.error('Errore nel caricamento dei dati:', error);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const acquireGPS = () => {
  setGpsStatus('Acquisizione della posizione in corso...');
  
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(8).replace('.', ',');
        const lon = position.coords.longitude.toFixed(8).replace('.', ',');
        setCoordinates(`${lat} ${lon}`);
        setGpsStatus('Posizione acquisita con successo');
        
        const accuracy = Math.round(position.coords.accuracy);
        if (accuracy > 100) {
          setGpsStatus(`Posizione acquisita (precisione: ${accuracy}m - Precisione bassa, tipica del Mac)`);
        } else {
          setGpsStatus(`Posizione acquisita (precisione: ${accuracy}m)`);
        }
      },
      (_error) => { // Aggiunto underscore per indicare che è intenzionalmente non usato
        setGpsStatus('Posizione non disponibile - Prova a utilizzare un dispositivo mobile per una migliore precisione');
      },
      {
        enableHighAccuracy: false,
        timeout: 30000,
        maximumAge: 300000
      }
    );
  } else {
    setGpsStatus('Il tuo dispositivo non supporta la geolocalizzazione');
  }
};

  const showOnMap = (coords: string) => {
    if (!coords) return;
    
    setShowMap(true);
    const [lat, lon] = coords.split(' ').map(coord => 
      parseFloat(coord.replace(',', '.'))
    );
    
    const mapContainer = document.getElementById('map-container');
    if (mapContainer) {
      mapContainer.innerHTML = `
        <iframe
          width="100%"
          height="300"
          frameborder="0"
          scrolling="no"
          marginheight="0"
          marginwidth="0"
          src="https://www.openstreetmap.org/export/embed.html?bbox=${lon-0.01},${lat-0.01},${lon+0.01},${lat+0.01}&layer=mapnik&marker=${lat},${lon}"
          style="border: 1px solid #ccc; border-radius: 4px;"
        ></iframe>
      `;
    }
  };

  const saveNewFinding = async () => {
    if (!selectedPlant || !newLocation || !coordinates) {
      alert('Inserisci almeno la località e le coordinate');
      return;
    }

    if (!confirm('Sei sicuro di voler salvare questo nuovo ritrovamento?')) {
      return;
    }

    const newFinding = {
      ...selectedPlant,
      Località: selectedPlant.Località 
        ? `${selectedPlant.Località}; ${newLocation} (${coordinates})` 
        : `${newLocation} (${coordinates})`,
      Note: selectedPlant.Note 
        ? `${selectedPlant.Note}; ${newNote || 'Nuovo ritrovamento'} (${new Date().toLocaleDateString()})` 
        : `${newNote || 'Nuovo ritrovamento'} (${new Date().toLocaleDateString()})`
    };

    const updatedPlants = plants.map(plant => 
      plant.SPECIE === selectedPlant.SPECIE ? newFinding : plant
    );

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(updatedPlants);
    XLSX.utils.book_append_sheet(wb, ws, "Flora");
    XLSX.writeFile(wb, 'database_aggiornato.xlsx');

    setPlants(updatedPlants);
    setSelectedPlant(newFinding);
    setNewLocation('');
    setCoordinates('');
    setNewNote('');
    setGpsStatus('');
    setShowMap(false);

    alert('Ritrovamento salvato con successo!');
  };

  const filteredPlants = plants.filter((plant) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      plant.SPECIE?.toLowerCase().includes(query) ||
      plant.FAMIGLIA?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
            Database Flora
          </h1>
          
          <input
            type="text"
            placeholder="Cerca specie o famiglia..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="border rounded-lg h-[600px] overflow-y-auto">
                {loading ? (
                  <div className="p-4 text-center text-gray-500">Caricamento...</div>
                ) : (
                  filteredPlants.map((plant, index) => (
                    <div
                      key={index}
                      onClick={() => {
                        setSelectedPlant(plant);
                        setShowMap(false);
                      }}
                      className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedPlant === plant ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="font-medium text-gray-900">{plant.SPECIE}</div>
                      <div className="text-sm text-gray-600">{plant.FAMIGLIA}</div>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-2 text-sm text-gray-500 text-center">
                Risultati: {filteredPlants.length} di {plants.length}
              </div>
            </div>

            <div>
              {selectedPlant ? (
                <div className="border rounded-lg p-4">
                  <h2 className="text-xl font-bold mb-4 text-gray-800">
                    {selectedPlant.SPECIE}
                  </h2>
                  <div className="space-y-3">
                    <p className="text-gray-700">
                      <span className="font-medium">Famiglia: </span>
                      {selectedPlant.FAMIGLIA}
                    </p>
                    {selectedPlant.Pignatti && (
                      <p className="text-gray-700">
                        <span className="font-medium">Pignatti: </span>
                        {selectedPlant.Pignatti}
                      </p>
                    )}
                    {selectedPlant.Località && (
                      <p className="text-gray-700">
                        <span className="font-medium">Località: </span>
                        {selectedPlant.Località}
                      </p>
                    )}

                    <div className="mt-4 pt-4 border-t">
                      <h3 className="font-medium mb-2">Aggiungi nuovo ritrovamento:</h3>
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={newLocation}
                          onChange={(e) => setNewLocation(e.target.value)}
                          placeholder="Nuova località"
                          className="w-full px-3 py-2 border rounded"
                        />
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={coordinates}
                            onChange={(e) => setCoordinates(e.target.value)}
                            placeholder="Coordinate (es: 45,43306076 11,11554812)"
                            className="w-full px-3 py-2 border rounded"
                          />
                          <div className="flex space-x-2">
                            <button
                              onClick={acquireGPS}
                              className="px-4 py-2 bg-blue-50 text-blue-600 rounded flex-1 hover:bg-blue-100"
                            >
                              Acquisisci GPS
                            </button>
                            {coordinates && (
                              <button
                                onClick={() => showOnMap(coordinates)}
                                className="px-4 py-2 bg-blue-50 text-blue-600 rounded flex-1 hover:bg-blue-100"
                              >
                                Visualizza sulla mappa
                              </button>
                            )}
                          </div>
                          {showMap && (
                            <div id="map-container" className="mt-2 h-[300px] rounded-lg overflow-hidden"></div>
                          )}
                          {gpsStatus && (
                            <div className={`text-sm ${gpsStatus.includes('successo') ? 'text-green-600' : 'text-orange-500'}`}>
                              {gpsStatus}
                            </div>
                          )}
                        </div>
                        <textarea
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          placeholder="Note sul ritrovamento..."
                          className="w-full px-3 py-2 border rounded h-24"
                        />
                        <button
                          className="px-4 py-2 bg-green-600 text-white rounded w-full hover:bg-green-700"
                          onClick={saveNewFinding}
                        >
                          Salva ritrovamento
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border rounded-lg p-4 text-center text-gray-500">
                  Seleziona una pianta per vedere i dettagli
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};