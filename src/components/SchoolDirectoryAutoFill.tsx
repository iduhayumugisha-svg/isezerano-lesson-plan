/**
 * SchoolDirectoryAutoFill.tsx
 * Allows teachers and users to select their school from the verified Rwanda School Directory
 * to automatically fill its name, province, district, sector, cell, village, and head teacher details.
 */
import React, { useState, useEffect } from 'react';
import { 
  School, 
  Search, 
  Sparkles, 
  Settings, 
  Check, 
  ChevronDown,
  Building2
} from 'lucide-react';
import { SchoolDirectoryEntry } from '../data/rwandaEducationData';
import { getAllSchools, syncSchoolDirectoryFromCloud } from '../services/schoolDirectoryService';
import { SchoolDirectoryAdminModal } from './SchoolDirectoryAdminModal';

interface SchoolDirectoryAutoFillProps {
  onSelectSchool: (school: SchoolDirectoryEntry) => void;
  isAdmin?: boolean;
  adminUid?: string;
  disabled?: boolean;
}

export const SchoolDirectoryAutoFill: React.FC<SchoolDirectoryAutoFillProps> = ({
  onSelectSchool,
  isAdmin = false,
  adminUid,
  disabled = false
}) => {
  const [schools, setSchools] = useState<SchoolDirectoryEntry[]>(() => getAllSchools());
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [isOpenDropdown, setIsOpenDropdown] = useState<boolean>(false);

  const reloadSchools = () => {
    setSchools(getAllSchools());
  };

  useEffect(() => {
    syncSchoolDirectoryFromCloud().then((updated) => {
      setSchools(updated);
    });
  }, []);

  const filtered = schools.filter(s => 
    s.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    s.district.toLowerCase().includes(searchFilter.toLowerCase()) ||
    s.sector.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const handleChoose = (school: SchoolDirectoryEntry) => {
    setSelectedSchoolId(school.id);
    setIsOpenDropdown(false);
    onSelectSchool(school);
  };

  return (
    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-teal-50/70 via-slate-50 to-teal-50/70 border border-teal-200/80 space-y-2.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-bold text-xs text-slate-900 block leading-tight">
              Hitamo Ikigo Cyawe (School Auto-Fill):
            </span>
            <span className="text-[11px] text-slate-500">
              Guhitamo ikigo byuzuza ako kanya akarere, umurenge, akagari n'umudugudu.
            </span>
          </div>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setIsAdminModalOpen(true)}
            className="text-[11px] font-bold text-teal-800 hover:text-teal-950 bg-white hover:bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 transition-colors inline-flex items-center space-x-1 shrink-0 cursor-pointer shadow-2xs self-start sm:self-auto"
            title="Manage School Directory (Admin)"
          >
            <Settings className="w-3.5 h-3.5 text-teal-700" />
            <span>Genzura Urutonde rw'Amashuri (Admin)</span>
          </button>
        )}
      </div>

      {/* Select Box / Searchable Dropdown */}
      <div className="relative">
        <div 
          onClick={() => !disabled && setIsOpenDropdown(!isOpenDropdown)}
          className={`w-full px-3.5 py-2.5 rounded-xl border bg-white flex items-center justify-between cursor-pointer text-xs font-semibold shadow-2xs transition-all ${
            isOpenDropdown ? 'border-teal-500 ring-2 ring-teal-500/20' : 'border-slate-300 hover:border-slate-400'
          } ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-100' : ''}`}
        >
          <div className="flex items-center space-x-2 truncate">
            <Building2 className="w-4 h-4 text-teal-700 shrink-0" />
            <span className={selectedSchoolId ? 'text-slate-900' : 'text-slate-500'}>
              {selectedSchoolId 
                ? schools.find(s => s.id === selectedSchoolId)?.name + ' (' + schools.find(s => s.id === selectedSchoolId)?.district + ')'
                : '— Kanda hano uhitemo ikigo cyawe muri Directory —'}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        </div>

        {isOpenDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1.5 z-40 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden p-2 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Andika izina ry'ikigo cyangwa akarere..."
                autoFocus
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 bg-slate-50"
              />
            </div>

            <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  Nta kigo kibonetse. Ushobora kucyandika hasi mu buryo busanzwe.
                </div>
              ) : (
                filtered.map(school => (
                  <button
                    key={school.id}
                    type="button"
                    onClick={() => handleChoose(school)}
                    className="w-full p-2.5 text-left hover:bg-teal-50/80 rounded-xl transition-colors flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="font-bold text-slate-900 text-xs group-hover:text-teal-900">
                        {school.name}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {school.province} &gt; {school.district} &gt; {school.sector}
                        {school.cell ? ` > ${school.cell}` : ''}
                      </div>
                    </div>
                    {selectedSchoolId === school.id && (
                      <Check className="w-4 h-4 text-teal-600 shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {isAdminModalOpen && (
        <SchoolDirectoryAdminModal
          isOpen={isAdminModalOpen}
          onClose={() => setIsAdminModalOpen(false)}
          schools={schools}
          onSchoolsUpdated={reloadSchools}
          adminUid={adminUid}
        />
      )}
    </div>
  );
};
