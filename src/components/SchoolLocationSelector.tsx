/**
 * SchoolLocationSelector.tsx
 * Dependent dropdowns for Rwanda Administrative Divisions:
 * Province -> District -> Sector -> Cell -> Village
 * Uses 100% offline local Rwanda dataset with manual entry fallbacks.
 */
import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  ChevronDown, 
  Edit3, 
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { 
  getProvinces, 
  getDistrictsByProvince, 
  getSectorsByDistrict, 
  getCellsBySector, 
  getVillagesByCell,
  findProvinceByDistrict,
  RWANDA_ADMINISTRATIVE_DATA
} from '../data/rwandaAdministrativeData';

interface SchoolLocationSelectorProps {
  province?: string;
  district: string;
  sector: string;
  cell: string;
  village: string;
  onChange: (location: {
    province: string;
    district: string;
    sector: string;
    cell: string;
    village: string;
  }) => void;
  disabled?: boolean;
}

export const SchoolLocationSelector: React.FC<SchoolLocationSelectorProps> = ({
  province = '',
  district = '',
  sector = '',
  cell = '',
  village = '',
  onChange,
  disabled = false
}) => {
  // If province is empty but district is provided, auto-detect province
  const detectedProvince = province || (district ? findProvinceByDistrict(district) || '' : '');

  // Manual entry toggle states
  const [manualMode, setManualMode] = useState<boolean>(() => {
    // If user already has custom values that don't match dataset, default to manual
    if (district && !findProvinceByDistrict(district)) return true;
    return false;
  });

  const provinces = getProvinces();
  const districts = detectedProvince ? getDistrictsByProvince(detectedProvince) : [];
  const sectors = (detectedProvince && district) ? getSectorsByDistrict(detectedProvince, district) : [];
  const cells = (detectedProvince && district && sector) ? getCellsBySector(detectedProvince, district, sector) : [];
  const villages = (detectedProvince && district && sector && cell) ? getVillagesByCell(detectedProvince, district, sector, cell) : [];

  const handleProvinceChange = (newProv: string) => {
    onChange({
      province: newProv,
      district: '',
      sector: '',
      cell: '',
      village: ''
    });
  };

  const handleDistrictChange = (newDist: string) => {
    const parentProv = detectedProvince || findProvinceByDistrict(newDist) || province;
    onChange({
      province: parentProv,
      district: newDist,
      sector: '',
      cell: '',
      village: ''
    });
  };

  const handleSectorChange = (newSec: string) => {
    onChange({
      province: detectedProvince,
      district,
      sector: newSec,
      cell: '',
      village: ''
    });
  };

  const handleCellChange = (newCell: string) => {
    onChange({
      province: detectedProvince,
      district,
      sector,
      cell: newCell,
      village: ''
    });
  };

  const handleVillageChange = (newVill: string) => {
    onChange({
      province: detectedProvince,
      district,
      sector,
      cell,
      village: newVill
    });
  };

  return (
    <div className="space-y-3 p-4 rounded-2xl border border-slate-200 bg-slate-50/70">
      
      {/* Header & Toggle */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
        <div className="flex items-center space-x-2">
          <MapPin className="w-4 h-4 text-teal-700" />
          <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">
            Aho Ikigo Giherereye mu Rwanda (School Location)
          </span>
        </div>

        <button
          type="button"
          onClick={() => setManualMode(!manualMode)}
          className="text-[11px] font-semibold text-teal-700 hover:text-teal-900 flex items-center space-x-1 cursor-pointer"
          title="Toggle between official dependent dropdowns and free-text manual entry"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>{manualMode ? 'Koresha Urutonde (Use Dropdowns)' : 'Kwandika N intoki (Manual Entry)'}</span>
        </button>
      </div>

      {manualMode ? (
        /* Manual entry mode */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Intara (Province):</label>
            <input
              type="text"
              value={province}
              onChange={(e) => onChange({ province: e.target.value, district, sector, cell, village })}
              placeholder="Urugero: Northern Province"
              disabled={disabled}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs bg-white"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Akarere (District):</label>
            <input
              type="text"
              value={district}
              onChange={(e) => onChange({ province, district: e.target.value, sector, cell, village })}
              placeholder="Urugero: Rulindo"
              disabled={disabled}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs bg-white"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Umurenge (Sector):</label>
            <input
              type="text"
              value={sector}
              onChange={(e) => onChange({ province, district, sector: e.target.value, cell, village })}
              placeholder="Urugero: Buyoga"
              disabled={disabled}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs bg-white"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Akagari (Cell):</label>
            <input
              type="text"
              value={cell}
              onChange={(e) => onChange({ province, district, sector, cell: e.target.value, village })}
              placeholder="Urugero: Gitumba"
              disabled={disabled}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs bg-white"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Umudugudu (Village):</label>
            <input
              type="text"
              value={village}
              onChange={(e) => onChange({ province, district, sector, cell, village: e.target.value })}
              placeholder="Urugero: Nyarubande"
              disabled={disabled}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs bg-white"
            />
          </div>
        </div>
      ) : (
        /* Dependent dropdowns */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          
          {/* Level 1: Province */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              1. Intara (Province):
            </label>
            <div className="relative">
              <select
                value={detectedProvince}
                onChange={(e) => handleProvinceChange(e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs bg-white appearance-none pr-8 font-medium"
              >
                <option value="">— Hitamo Intara —</option>
                {provinces.map(prov => (
                  <option key={prov} value={prov}>
                    {prov} ({RWANDA_ADMINISTRATIVE_DATA[prov]?.kinyarwandaName || prov})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Level 2: District */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              2. Akarere (District):
            </label>
            <div className="relative">
              <select
                value={district}
                onChange={(e) => handleDistrictChange(e.target.value)}
                disabled={disabled || !detectedProvince}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs bg-white appearance-none pr-8 font-medium disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">
                  {!detectedProvince ? '— Hitamo Intara mbere —' : '— Hitamo Akarere —'}
                </option>
                {districts.map(dist => (
                  <option key={dist} value={dist}>{dist}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Level 3: Sector */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              3. Umurenge (Sector):
            </label>
            <div className="relative">
              <select
                value={sector}
                onChange={(e) => handleSectorChange(e.target.value)}
                disabled={disabled || !district}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs bg-white appearance-none pr-8 font-medium disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">
                  {!district ? '— Hitamo Akarere mbere —' : '— Hitamo Umurenge —'}
                </option>
                {sectors.map(sec => (
                  <option key={sec} value={sec}>{sec}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Level 4: Cell */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              4. Akagari (Cell):
            </label>
            {cells.length > 0 ? (
              <div className="relative">
                <select
                  value={cell}
                  onChange={(e) => handleCellChange(e.target.value)}
                  disabled={disabled || !sector}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs bg-white appearance-none pr-8 font-medium disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">
                    {!sector ? '— Hitamo Umurenge mbere —' : '— Hitamo Akagari —'}
                  </option>
                  {cells.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            ) : (
              <input
                type="text"
                value={cell}
                onChange={(e) => handleCellChange(e.target.value)}
                disabled={disabled || !sector}
                placeholder={!sector ? 'Hitamo umurenge' : 'Andika akagari'}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs bg-white disabled:bg-slate-100 disabled:text-slate-400"
              />
            )}
          </div>

          {/* Level 5: Village */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              5. Umudugudu (Village):
            </label>
            {villages.length > 0 ? (
              <div className="relative">
                <select
                  value={village}
                  onChange={(e) => handleVillageChange(e.target.value)}
                  disabled={disabled || !cell}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs bg-white appearance-none pr-8 font-medium disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">
                    {!cell ? '— Hitamo Akagari mbere —' : '— Hitamo Umudugudu —'}
                  </option>
                  {villages.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            ) : (
              <input
                type="text"
                value={village}
                onChange={(e) => handleVillageChange(e.target.value)}
                disabled={disabled || !cell}
                placeholder={!cell ? 'Hitamo akagari' : 'Andika umudugudu'}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs bg-white disabled:bg-slate-100 disabled:text-slate-400"
              />
            )}
          </div>

        </div>
      )}

      {/* Selected location confirmation badge */}
      {district && sector && (
        <div className="flex items-center space-x-1.5 text-[11px] text-teal-800 bg-teal-50/80 px-2.5 py-1 rounded-lg border border-teal-200/60 font-medium">
          <CheckCircle className="w-3.5 h-3.5 text-teal-600 shrink-0" />
          <span>
            {detectedProvince ? `${detectedProvince} > ` : ''}
            <strong>{district}</strong> &gt; <strong>{sector}</strong>
            {cell ? <> &gt; {cell}</> : ''}
            {village ? <> &gt; {village}</> : ''}
          </span>
        </div>
      )}

    </div>
  );
};
