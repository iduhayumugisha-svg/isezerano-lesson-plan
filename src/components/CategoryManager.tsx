import React, { useState, useEffect } from 'react';
import { 
  FolderPlus, 
  Trash2, 
  Edit3, 
  ArrowUp, 
  ArrowDown, 
  Check, 
  X, 
  AlertTriangle, 
  Save, 
  RefreshCw, 
  RotateCcw,
  Layers,
  Sparkles,
  Eye,
  EyeOff
} from 'lucide-react';
import { NewsCategory, DEFAULT_NEWS_CATEGORIES } from '../types/category';
import { 
  getNewsCategories, 
  saveNewsCategories, 
  subscribeToNewsCategories 
} from '../services/categoryService';
import { useAuth } from '../context/AuthContext';

export const CategoryManager: React.FC = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form states for creating a new category
  const [newName, setNewName] = useState('');
  const [newNameEn, setNewNameEn] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newDesc, setNewDesc] = useState('');

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<NewsCategory>>({});

  // Confirmation modal state for deletion
  const [categoryToDelete, setCategoryToDelete] = useState<NewsCategory | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToNewsCategories((cats) => {
      setCategories(cats);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSlugAutoFill = (inputName: string) => {
    setNewName(inputName);
    if (!newSlug || newSlug === slugify(newName)) {
      setNewSlug(slugify(inputName));
    }
  };

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[’']/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const slug = (newSlug.trim() || slugify(newName)).trim();
    if (!slug) return;

    // Check slug collision
    if (categories.some((c) => c.slug === slug)) {
      setSaveStatus({ type: 'error', message: `A category with slug "${slug}" already exists.` });
      setTimeout(() => setSaveStatus(null), 3500);
      return;
    }

    const newCat: NewsCategory = {
      id: `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: newName.trim(),
      nameEn: newNameEn.trim() || undefined,
      slug,
      description: newDesc.trim() || undefined,
      order: categories.length,
      enabled: true
    };

    const updated = [...categories, newCat];
    setCategories(updated);
    setNewName('');
    setNewNameEn('');
    setNewSlug('');
    setNewDesc('');

    await persistCategories(updated, `Added category "${newCat.name}"`);
  };

  const persistCategories = async (cats: NewsCategory[], successMsg: string) => {
    setIsSaving(true);
    setSaveStatus(null);
    try {
      await saveNewsCategories(cats, user?.email || user?.uid || 'admin');
      setSaveStatus({ type: 'success', message: `${successMsg} and synchronized across all devices!` });
    } catch (err: unknown) {
      console.error(err);
      setSaveStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to save categories to Firestore'
      });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus(null), 4000);
    }
  };

  const handleToggleEnabled = async (id: string) => {
    const updated = categories.map((c) =>
      c.id === id ? { ...c, enabled: !c.enabled } : c
    );
    setCategories(updated);
    const target = updated.find((c) => c.id === id);
    await persistCategories(
      updated,
      `Category "${target?.name}" ${target?.enabled ? 'enabled' : 'hidden'}`
    );
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const updated = [...categories];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);

    const reordered = updated.map((c, i) => ({ ...c, order: i }));
    setCategories(reordered);
    await persistCategories(reordered, 'Categories reordered');
  };

  const startEdit = (cat: NewsCategory) => {
    setEditingId(cat.id);
    setEditForm({
      name: cat.name,
      nameEn: cat.nameEn || '',
      slug: cat.slug,
      description: cat.description || ''
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async (id: string) => {
    if (!editForm.name?.trim()) return;

    const slug = (editForm.slug?.trim() || slugify(editForm.name)).trim();

    // Check collision with other categories
    if (categories.some((c) => c.id !== id && c.slug === slug)) {
      setSaveStatus({ type: 'error', message: `Another category is already using slug "${slug}".` });
      setTimeout(() => setSaveStatus(null), 3500);
      return;
    }

    const updated = categories.map((c) => {
      if (c.id === id) {
        return {
          ...c,
          name: editForm.name!.trim(),
          nameEn: editForm.nameEn?.trim() || undefined,
          slug,
          description: editForm.description?.trim() || undefined
        };
      }
      return c;
    });

    setCategories(updated);
    setEditingId(null);
    setEditForm({});
    await persistCategories(updated, 'Category updated');
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;
    const catName = categoryToDelete.name;
    const updated = categories
      .filter((c) => c.id !== categoryToDelete.id)
      .map((c, i) => ({ ...c, order: i }));

    setCategoryToDelete(null);
    setCategories(updated);
    await persistCategories(updated, `Deleted category "${catName}"`);
  };

  const handleResetToDefaults = async () => {
    if (window.confirm('Reset all news categories to Rwanda CBC standard default categories? Any custom categories will be replaced.')) {
      setCategories(DEFAULT_NEWS_CATEGORIES);
      await persistCategories(DEFAULT_NEWS_CATEGORIES, 'Categories reset to defaults');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Description */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-bold mb-2 border border-teal-200">
            <Layers className="w-3.5 h-3.5 text-teal-600" />
            <span>Digital Newsroom Architecture</span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
            News Categories & Navigation Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
            Manage the dynamic category bar displayed across the ISEZERANO ONLINE header and homepage. 
            Articles filter in real-time when readers select these categories.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={handleResetToDefaults}
            disabled={isSaving}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
            title="Reset to default categories"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={() => persistCategories(categories, 'Categories synchronized')}
            disabled={isSaving || categories.length === 0}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-600 shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{isSaving ? 'Syncing...' : 'Save to Cloud'}</span>
          </button>
        </div>
      </div>

      {/* Save Notification */}
      {saveStatus && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all shadow-sm ${
            saveStatus.type === 'success'
              ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
              : 'bg-red-50 border border-red-300 text-red-800'
          }`}
        >
          {saveStatus.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{saveStatus.message}</span>
        </div>
      )}

      {/* Grid: Create New Category + Category List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Create Category Form */}
        <div className="lg:col-span-1 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <FolderPlus className="w-4 h-4 text-teal-700" />
            <h3 className="text-sm font-bold text-slate-900">Add New Category</h3>
          </div>

          <form onSubmit={handleAddCategory} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Category Name (Kinyarwanda / Primary) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => handleSlugAutoFill(e.target.value)}
                placeholder="urugero: Uburezi, Amakuru Mashya"
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                English Name (Optional)
              </label>
              <input
                type="text"
                value={newNameEn}
                onChange={(e) => setNewNameEn(e.target.value)}
                placeholder="e.g. Education & CBC, Latest News"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                URL Slug <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={newSlug}
                onChange={(e) => setNewSlug(slugify(e.target.value))}
                placeholder="urugero: uburezi, amakuru-mashya"
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 font-mono text-slate-700 focus:bg-white focus:ring-2 focus:ring-teal-500"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Used for URL filtering and database index</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Description (Optional)
              </label>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Ubusobanuro bw'iki cyiciro n'ibyo gikubiyemo..."
                rows={2}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 font-medium text-slate-900"
              />
            </div>

            <button
              type="submit"
              disabled={!newName.trim() || isSaving}
              className="w-full inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <FolderPlus className="w-4 h-4 text-teal-400" />
              <span>Create Category</span>
            </button>
          </form>
        </div>

        {/* Right Column: Categories List & Reordering */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-slate-900">
                Active Categories ({categories.filter((c) => c.enabled).length} / {categories.length})
              </span>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Use ↑ ↓ buttons to reorder in the header
            </span>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center space-x-2">
              <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />
              <span>Loading categories from Firestore...</span>
            </div>
          ) : categories.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
              <p className="text-xs text-slate-500">No categories found. Click "Reset Defaults" or add your first category.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {categories.map((cat, index) => {
                const isEditing = editingId === cat.id;

                return (
                  <div
                    key={cat.id}
                    className={`rounded-xl border transition-all p-3 sm:p-4 ${
                      cat.enabled
                        ? 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                        : 'bg-slate-50/80 border-slate-200 opacity-60'
                    }`}
                  >
                    {isEditing ? (
                      /* Inline Edit Form */
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                              Name (Kinyarwanda)
                            </label>
                            <input
                              type="text"
                              value={editForm.name || ''}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-semibold text-slate-900"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                              English Name (Optional)
                            </label>
                            <input
                              type="text"
                              value={editForm.nameEn || ''}
                              onChange={(e) => setEditForm({ ...editForm, nameEn: e.target.value })}
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-medium text-slate-800"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                              Slug
                            </label>
                            <input
                              type="text"
                              value={editForm.slug || ''}
                              onChange={(e) => setEditForm({ ...editForm, slug: slugify(e.target.value) })}
                              className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-300 bg-white text-slate-700"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                              Description
                            </label>
                            <input
                              type="text"
                              value={editForm.description || ''}
                              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-medium text-slate-800"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => saveEdit(cat.id)}
                            className="inline-flex items-center space-x-1 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-teal-700 hover:bg-teal-600 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Save Changes</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Display Row */
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start sm:items-center space-x-3 min-w-0">
                          <div className="flex flex-col space-y-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleMove(index, 'up')}
                              disabled={index === 0}
                              className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-800 disabled:opacity-20 cursor-pointer"
                              title="Move up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMove(index, 'down')}
                              disabled={index === categories.length - 1}
                              className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-800 disabled:opacity-20 cursor-pointer"
                              title="Move down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center space-x-2 flex-wrap">
                              <span className="text-xs font-bold text-slate-900">
                                {cat.name}
                              </span>
                              {cat.nameEn && (
                                <span className="text-[11px] font-medium text-slate-500">
                                  ({cat.nameEn})
                                </span>
                              )}
                              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                #{cat.slug}
                              </span>
                              {!cat.enabled && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800">
                                  Hidden
                                </span>
                              )}
                            </div>
                            {cat.description && (
                              <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-md">
                                {cat.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Row Actions */}
                        <div className="flex items-center space-x-1.5 self-end sm:self-center shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleEnabled(cat.id)}
                            className={`p-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                              cat.enabled
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                            }`}
                            title={cat.enabled ? 'Click to hide category from header' : 'Click to display category in header'}
                          >
                            {cat.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => startEdit(cat)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                            title="Edit category"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setCategoryToDelete(cat)}
                            className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer"
                            title="Delete category"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Confirmation Modal for Deletion */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Category</h3>
                <p className="text-xs text-slate-500">Are you sure you want to proceed?</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              You are about to delete <strong className="text-slate-900 font-bold">"{categoryToDelete.name}"</strong> (slug: <code className="text-rose-600 font-mono">#{categoryToDelete.slug}</code>).
              Existing articles under this category will not be deleted, but this category tab will no longer appear in the website header.
            </p>

            <div className="flex items-center justify-end space-x-2.5 pt-2">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
