/**
 * AdminSchoolDirectoryPanel.tsx
 * Admin Dashboard view for managing Rwanda schools in the directory.
 */
import React, { useState, useEffect } from 'react';
import { 
  School, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  MapPin,
  RefreshCw,
  Phone,
  User
} from 'lucide-react';
import { SchoolDirectoryEntry } from '../data/rwandaSchoolsData';
import { 
  getAllSchools, 
  saveSchoolEntry, 
  deleteSchoolEntry, 
  syncSchoolDirectoryFromCloud 
} from '../services/schoolDirectoryService';
import { SchoolLocationSelector } from './SchoolLocationSelector';

interface AdminSchoolDirectoryPanelProps {
  adminUid?: string;
}

export const AdminSchoolDirectoryPanel: React.FC<AdminSchoolDirectoryPanelProps> = ({ adminUid }) => {
  const [schools, setSchools] = useState<SchoolDirectoryEntry[]>(() => getAllSchools());
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<SchoolDirectoryEntry>>({
    name: '',
    province: 'Northern Province',
    district: 'Rulindo',
    sector: 'Buyoga',
    cell: 'Gitumba',
    village: 'Nyarubande',
    phone: '',
    headTeacherName: '',
    category: 'Public'
  });
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    handleRefresh();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const updated = await syncSchoolDirectoryFromCloud();
    setSchools(updated);
    setIsRefreshing(false);
  };

  const filteredSchools = schools.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.sector.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.province && s.province.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleStartNew = () => {
    setEditingId(null);
    setFormData({
      name: '',
      province: 'Northern Province',
      district: 'Rulindo',
      sector: 'Buyoga',
      cell: 'Gitumba',
      village: 'Nyarubande',
      phone: '',
      headTeacherName: '',
      category: 'Public'
    });
    setIsEditing(true);
    setFeedback(null);
  };

  const handleStartEdit = (school: SchoolDirectoryEntry) => {
    setEditingId(school.id);
    setFormData({ ...school });
    setIsEditing(true);
    setFeedback(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      setFeedback({ type: 'error', message: 'Shyiramo izina ry ikigo (School Name is required)' });
      return;
    }
    if (!formData.district?.trim() || !formData.sector?.trim()) {
      setFeedback({ type: 'error', message: 'Hitamo akarere n umurenge (District and Sector are required)' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await saveSchoolEntry({
        id: editingId || undefined,
        name: formData.name.trim(),
        province: formData.province || 'Northern Province',
        district: formData.district.trim(),
        sector: formData.sector.trim(),
        cell: formData.cell?.trim() || '',
        village: formData.village?.trim() || '',
        phone: formData.phone?.trim() || '',
        headTeacherName: formData.headTeacherName?.trim() || '',
        category: formData.category || 'Public',
        isOfficialPreset: formData.isOfficialPreset ?? false
      }, adminUid);

      if (res.success) {
        setFeedback({ type: 'success', message: 'Ikigo cyabitswe neza muri directory!' });
        await handleRefresh();
        setTimeout(() => {
          setIsEditing(false);
          setEditingId(null);
          setFeedback(null);
        }, 1000);
      } else {
        setFeedback({ type: 'error', message: res.error || 'Habaye ikibazo mu kubika.' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Habaye ikibazo.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (school: SchoolDirectoryEntry) => {
    if (confirm(`Uremeye gusiba ikigo "${school.name}" muri Directory?`)) {
      await deleteSchoolEntry(school.id);
      await handleRefresh();
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700">
            <School className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <span>Rwanda School Directory Management</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-teal-100 text-teal-800 font-extrabold">
                {schools.length} Amashuri
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Genzura urutonde rw'amashuri aboneka mu buryo bwa auto-fill ku mwarimu wese uri gukora Report Cards.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            title="Refresh schools"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-teal-600' : ''}`} />
          </button>
          <button
            type="button"
            onClick={handleStartNew}
            className="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs transition-all shadow-md inline-flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Ongeramo Ikigo Gishya</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl border flex items-center space-x-2.5 text-xs ${
          feedback.type === 'success' ? 'bg-teal-50 text-teal-800 border-teal-200' : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {isEditing ? (
        /* Edit or Add School Form */
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h4 className="font-bold text-sm text-slate-900">
              {editingId ? "Vugurura Amakuru y'Ikigo (Edit School)" : "Ongeramo Ikigo Gishya (Add School)"}
            </h4>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
            >
              Reka (Cancel)
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">
                  Izina ry'Ikigo (School Name): *
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Urugero: GS GITUMBA"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Icyiciro cy'Ikigo (Category):</label>
                <select
                  value={formData.category || 'Public'}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs bg-white"
                >
                  <option value="Public">Public (Leta)</option>
                  <option value="Government-Aided">Government-Aided (Ifatanyije na Leta)</option>
                  <option value="Private">Private (Icyigenga)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Telefoni y'Ikigo (Phone):</label>
                <input
                  type="text"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Urugero: +250 788 000 000"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Umuyobozi w'Ikigo (Head Teacher):</label>
                <input
                  type="text"
                  value={formData.headTeacherName || ''}
                  onChange={(e) => setFormData({ ...formData, headTeacherName: e.target.value })}
                  placeholder="Amazina y'umuyobozi w'ikigo"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs"
                />
              </div>
            </div>

            {/* Location selector with dependent dropdowns */}
            <div className="space-y-1 pt-2">
              <label className="block font-bold text-slate-700 mb-1">Aho Ikigo Giherereye (Location):</label>
              <SchoolLocationSelector
                province={formData.province || 'Northern Province'}
                district={formData.district || ''}
                sector={formData.sector || ''}
                cell={formData.cell || ''}
                village={formData.village || ''}
                onChange={(loc) => {
                  setFormData({
                    ...formData,
                    province: loc.province,
                    district: loc.district,
                    sector: loc.sector,
                    cell: loc.cell,
                    village: loc.village
                  });
                }}
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold transition-colors cursor-pointer"
              >
                Reka (Cancel)
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold transition-all shadow-md inline-flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSubmitting ? 'Birimo kubikwa...' : 'Bika Ikigo (Save School)'}</span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Schools List */
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Shakisha ikigo mu mazina, akarere, umurenge cyangwa intara..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs bg-white"
            />
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
            {filteredSchools.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Nta kigo kibonetse gihwanye n'ibyo ushakishije.
              </div>
            ) : (
              filteredSchools.map((school) => (
                <div key={school.id} className="p-4 hover:bg-slate-50 flex items-center justify-between gap-4 transition-colors">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center space-x-2.5">
                      <span className="font-bold text-slate-900 text-sm truncate">{school.name}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        school.category === 'Private'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-teal-50 text-teal-700 border border-teal-200'
                      }`}>
                        {school.category}
                      </span>
                      {school.isOfficialPreset && (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                          Official Preset
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span className="flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span>
                          {school.province} &gt; {school.district} &gt; {school.sector}
                          {school.cell ? ` > ${school.cell}` : ''}
                          {school.village ? ` > ${school.village}` : ''}
                        </span>
                      </span>
                      {school.headTeacherName && (
                        <span className="flex items-center space-x-1 text-slate-600">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{school.headTeacherName}</span>
                        </span>
                      )}
                      {school.phone && (
                        <span className="flex items-center space-x-1 text-slate-600">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{school.phone}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(school)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-teal-700 hover:bg-teal-50 text-xs font-semibold transition-colors flex items-center space-x-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Hindura</span>
                    </button>
                    {!school.isOfficialPreset && (
                      <button
                        type="button"
                        onClick={() => handleDelete(school)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Siba"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
};
