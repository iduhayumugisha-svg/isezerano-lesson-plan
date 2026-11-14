/**
 * SchoolDirectoryAdminModal.tsx
 * Modal allowing administrators to add, edit, and manage school directory records.
 * Synchronizes with Cloud Firestore and local storage.
 */
import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  School, 
  Trash2, 
  Edit2, 
  Save, 
  Search, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { SchoolDirectoryEntry } from '../data/rwandaEducationData';
import { saveSchoolEntry, deleteSchoolEntry } from '../services/schoolDirectoryService';
import { SchoolLocationSelector } from './SchoolLocationSelector';

interface SchoolDirectoryAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  schools: SchoolDirectoryEntry[];
  onSchoolsUpdated: () => void;
  adminUid?: string;
}

export const SchoolDirectoryAdminModal: React.FC<SchoolDirectoryAdminModalProps> = ({
  isOpen,
  onClose,
  schools,
  onSchoolsUpdated,
  adminUid
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
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

  if (!isOpen) return null;

  const filteredSchools = schools.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.sector.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStartNew = () => {
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
        id: formData.id,
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
        onSchoolsUpdated();
        setTimeout(() => {
          setIsEditing(false);
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
      onSchoolsUpdated();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <School className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span>School Directory Management</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 font-extrabold border border-purple-500/30">
                  Admin Only
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Ongeramo cyangwa uvugurure amakuru y'amashuri aboneka mu buryo bwa auto-fill.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          
          {feedback && (
            <div className={`p-3 rounded-xl border flex items-center space-x-2 ${
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

          {!isEditing ? (
            /* Directory List View */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Shakisha ikigo, akarere, cyangwa umurenge..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs bg-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleStartNew}
                  className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold transition-all inline-flex items-center space-x-1.5 shrink-0 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ongeramo Ikigo Gishya</span>
                </button>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 max-h-[50vh] overflow-y-auto">
                {filteredSchools.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    Nta kigo kigaragaye gihwanye n'ibyo ushakishije.
                  </div>
                ) : (
                  filteredSchools.map((school) => (
                    <div key={school.id} className="p-3.5 hover:bg-slate-50 flex items-center justify-between gap-3 transition-colors">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900 truncate">{school.name}</span>
                          <span className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                            school.category === 'Private' 
                              ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                              : 'bg-teal-50 text-teal-700 border border-teal-200'
                          }`}>
                            {school.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {school.province} &gt; {school.district} &gt; {school.sector} 
                          {school.cell ? ` > ${school.cell}` : ''}
                          {school.village ? ` > ${school.village}` : ''}
                        </p>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(school)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-teal-700 hover:bg-teal-50 transition-colors"
                          title="Hindura"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {!school.isOfficialPreset && (
                          <button
                            type="button"
                            onClick={() => handleDelete(school)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Siba"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* Add / Edit Form */
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Icyiciro (Category):</label>
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
                  <label className="block font-bold text-slate-700 mb-1">Telefoni (Tel):</label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Urugero: +250 788 000 000"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Umuyobozi (Head Teacher Name):</label>
                  <input
                    type="text"
                    value={formData.headTeacherName || ''}
                    onChange={(e) => setFormData({ ...formData, headTeacherName: e.target.value })}
                    placeholder="Amazina y'umuyobozi w'ikigo"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs"
                  />
                </div>
              </div>

              {/* Location Dependent Selector */}
              <div className="space-y-1">
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

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200">
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
                  className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold transition-all shadow-md inline-flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSubmitting ? 'Birimo kubikwa...' : 'Bika Ikigo (Save)'}</span>
                </button>
              </div>
            </form>
          )}

        </div>

      </div>
    </div>
  );
};
