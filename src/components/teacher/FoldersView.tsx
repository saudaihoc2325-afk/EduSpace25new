import React, { useState } from 'react';
import {
  FolderTree,
  FolderPlus,
  Folder as FolderIcon,
  Edit2,
  Trash2,
  Plus,
  ArrowLeft,
  LayoutGrid,
  Send,
  Play,
  Layers,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { Activity, Folder } from '../../types';
import { FOLDER_COLORS } from '../../constants/gameTypes';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { EmptyState } from '../ui/EmptyState';
import { Badge } from '../ui/Badge';
import { useToast } from '../../context/ToastContext';

interface FoldersViewProps {
  folders: Folder[];
  activities: Activity[];
  onCreateFolder: (data: { name: string; color?: string; description?: string }) => Promise<void>;
  onRenameFolder: (data: { id: string; name: string; color?: string; description?: string }) => Promise<void>;
  onDeleteFolder: (folderId: string) => Promise<void>;
  onMoveActivity: (activityId: string, folderId: string | null) => Promise<void>;
  onPlayActivity: (activity: Activity) => void;
  onAssignActivity: (activity: Activity) => void;
  onCreateActivityInFolder: (folderId: string) => void;
}

export const FoldersView: React.FC<FoldersViewProps> = ({
  folders,
  activities,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveActivity,
  onPlayActivity,
  onAssignActivity,
  onCreateActivityInFolder,
}) => {
  const { showSuccess, showError } = useToast();

  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  // Create / Edit Folder Modal
  const [folderModalMode, setFolderModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [folderName, setFolderName] = useState('');
  const [folderDescription, setFolderDescription] = useState('');
  const [folderColor, setFolderColor] = useState(FOLDER_COLORS[0]);
  const [isSavingFolder, setIsSavingFolder] = useState(false);

  // Delete Confirm Modal
  const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null);
  const [isDeletingFolder, setIsDeletingFolder] = useState(false);

  // Move Activity Modal
  const [movingActivity, setMovingActivity] = useState<Activity | null>(null);
  const [isMoving, setIsMoving] = useState(false);

  const activeFolder = folders.find((f) => f.id === activeFolderId) || null;
  const folderActivities = activities.filter((a) => a.folderId === activeFolderId);

  const handleOpenCreateModal = () => {
    setFolderModalMode('create');
    setEditingFolderId(null);
    setFolderName('');
    setFolderDescription('');
    setFolderColor(FOLDER_COLORS[Math.floor(Math.random() * FOLDER_COLORS.length)]);
  };

  const handleOpenEditModal = (folder: Folder, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFolderModalMode('edit');
    setEditingFolderId(folder.id);
    setFolderName(folder.name);
    setFolderDescription(folder.description || '');
    setFolderColor(folder.color || FOLDER_COLORS[0]);
  };

  const handleSaveFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) {
      showError('Please provide a folder name.');
      return;
    }

    setIsSavingFolder(true);
    try {
      if (folderModalMode === 'create') {
        await onCreateFolder({
          name: folderName.trim(),
          color: folderColor,
          description: folderDescription.trim(),
        });
        showSuccess(`Folder "${folderName.trim()}" created in Firestore.`);
      } else if (folderModalMode === 'edit' && editingFolderId) {
        await onRenameFolder({
          id: editingFolderId,
          name: folderName.trim(),
          color: folderColor,
          description: folderDescription.trim(),
        });
        showSuccess(`Folder "${folderName.trim()}" updated.`);
      }
      setFolderModalMode(null);
    } catch (err) {
      console.error('Error saving folder:', err);
      showError('Failed to save folder to Firestore.');
    } finally {
      setIsSavingFolder(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteFolderId) return;
    setIsDeletingFolder(true);
    try {
      await onDeleteFolder(deleteFolderId);
      showSuccess('Folder deleted. Its activities have been safely moved to Root library.');
      if (activeFolderId === deleteFolderId) {
        setActiveFolderId(null);
      }
      setDeleteFolderId(null);
    } catch (err) {
      console.error('Error deleting folder:', err);
      showError('Failed to delete folder.');
    } finally {
      setIsDeletingFolder(false);
    }
  };

  const handleExecuteMove = async (targetFolderId: string | null) => {
    if (!movingActivity) return;
    setIsMoving(true);
    try {
      await onMoveActivity(movingActivity.id, targetFolderId);
      showSuccess(`Activity moved successfully.`);
      setMovingActivity(null);
    } catch (err) {
      console.error('Error moving activity:', err);
      showError('Failed to move activity.');
    } finally {
      setIsMoving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {activeFolder && (
              <button
                onClick={() => setActiveFolderId(null)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                title="Back to all folders"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-display">
              {activeFolder ? activeFolder.name : 'Curriculum Folder System'}
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            {activeFolder
              ? activeFolder.description || 'Viewing activities inside this folder'
              : 'Categorize exercises by Grade 10, Grade 11, Grade 12, Unit topics, or Exam Preparation.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeFolder ? (
            <Button
              id="btn-folder-add-activity"
              variant="primary"
              size="md"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => onCreateActivityInFolder(activeFolder.id)}
            >
              Create in Folder
            </Button>
          ) : (
            <Button
              id="btn-open-create-folder-modal"
              variant="primary"
              size="md"
              icon={<FolderPlus className="w-4 h-4" />}
              onClick={handleOpenCreateModal}
            >
              New Folder
            </Button>
          )}
        </div>
      </div>

      {/* Main Content: Folder Grid or Folder Contents */}
      {!activeFolder ? (
        // ALL FOLDERS VIEW
        folders.length === 0 ? (
          <EmptyState
            title="No folders created yet"
            description="Organize your English curriculum into structured folders for Grade 10, Grade 11, Grade 12, Vocabulary, and Grammar."
            icon={<FolderTree className="w-8 h-8 text-slate-400" />}
            action={
              <Button
                variant="primary"
                size="sm"
                icon={<FolderPlus className="w-4 h-4" />}
                onClick={handleOpenCreateModal}
              >
                Create First Folder
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {folders.map((folder) => {
              const count = activities.filter((a) => a.folderId === folder.id).length;

              return (
                <Card
                  key={folder.id}
                  variant="default"
                  padding="md"
                  className="hover:border-indigo-300 transition-all cursor-pointer group flex flex-col justify-between"
                  onClick={() => setActiveFolderId(folder.id)}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-xs"
                        style={{ backgroundColor: folder.color || '#4f46e5' }}
                      >
                        <FolderIcon className="w-5 h-5 fill-current" />
                      </div>

                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleOpenEditModal(folder, e)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Rename Folder"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteFolderId(folder.id);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Folder"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                      {folder.name}
                    </h3>
                    {folder.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                        {folder.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">
                      {count} {count === 1 ? 'Activity' : 'Activities'}
                    </span>
                    <span className="text-indigo-600 font-medium group-hover:underline">
                      Open Folder →
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        )
      ) : (
        // INSIDE SINGLE FOLDER VIEW
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-white"
                style={{ backgroundColor: activeFolder.color || '#4f46e5' }}
              >
                <FolderIcon className="w-5 h-5 fill-current" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">{activeFolder.name}</h2>
                <p className="text-xs text-slate-500">
                  {folderActivities.length} activities stored in this folder
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={<Edit2 className="w-3.5 h-3.5" />}
                onClick={() => handleOpenEditModal(activeFolder)}
              >
                Edit Folder
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={() => setDeleteFolderId(activeFolder.id)}
              >
                Delete
              </Button>
            </div>
          </div>

          {folderActivities.length === 0 ? (
            <EmptyState
              title="This folder is empty"
              description={`Add interactive activities to "${activeFolder.name}" or move existing exercises here.`}
              icon={<Layers className="w-8 h-8 text-slate-400" />}
              action={
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={() => onCreateActivityInFolder(activeFolder.id)}
                >
                  Create Activity in Folder
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {folderActivities.map((act) => (
                <Card
                  key={act.id}
                  variant="default"
                  padding="md"
                  className="hover:border-indigo-200 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="primary" size="sm">
                        {act.gameType.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-slate-400">
                        {act.questionSet?.questions.length || act.itemCount || 0} Questions
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 font-display truncate mb-1">
                      {act.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {act.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2 mt-4">
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        icon={<Play className="w-3.5 h-3.5 text-emerald-600" />}
                        onClick={() => onPlayActivity(act)}
                      >
                        Play
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        icon={<Send className="w-3.5 h-3.5" />}
                        onClick={() => onAssignActivity(act)}
                      >
                        Assign
                      </Button>
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setMovingActivity(act)}
                      title="Move to another folder"
                    >
                      Move
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT FOLDER MODAL */}
      <Modal
        isOpen={folderModalMode !== null}
        onClose={() => setFolderModalMode(null)}
        title={folderModalMode === 'create' ? 'Create New Folder' : 'Rename Folder'}
        size="md"
      >
        <form onSubmit={handleSaveFolder} className="space-y-4">
          <div>
            <Input
              id="input-folder-name"
              label="Folder Name *"
              placeholder="e.g. Grade 12 - Exam Preparation"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div>
            <Input
              id="input-folder-desc"
              label="Description (Optional)"
              placeholder="e.g. National High School Exam Practice Sets"
              value={folderDescription}
              onChange={(e) => setFolderDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2">Folder Color</label>
            <div className="flex flex-wrap items-center gap-2">
              {FOLDER_COLORS.map((color) => (
                <button
                  type="button"
                  key={color}
                  onClick={() => setFolderColor(color)}
                  className={`w-8 h-8 rounded-xl transition-all cursor-pointer ${
                    folderColor === color ? 'ring-2 ring-indigo-600 ring-offset-2 scale-110' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setFolderModalMode(null)}
              disabled={isSavingFolder}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSavingFolder}
              icon={isSavingFolder ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
            >
              {isSavingFolder ? 'Saving to Firestore...' : folderModalMode === 'create' ? 'Create Folder' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      {deleteFolderId && (
        <Modal
          isOpen={!!deleteFolderId}
          onClose={() => setDeleteFolderId(null)}
          title="Delete Folder"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to delete this folder from Firestore?
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
              <strong>Safe deletion:</strong> Activities inside this folder will NOT be deleted; they will be moved to the Root Library.
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="md"
                onClick={() => setDeleteFolderId(null)}
                disabled={isDeletingFolder}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={handleDeleteConfirmed}
                disabled={isDeletingFolder}
                icon={isDeletingFolder ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              >
                {isDeletingFolder ? 'Deleting...' : 'Delete Folder'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MOVE ACTIVITY MODAL */}
      {movingActivity && (
        <Modal
          isOpen={!!movingActivity}
          onClose={() => setMovingActivity(null)}
          title={`Move "${movingActivity.title}"`}
          size="sm"
        >
          <div className="space-y-3">
            <p className="text-xs text-slate-500 mb-2">Select target destination folder:</p>

            <button
              onClick={() => handleExecuteMove(null)}
              disabled={isMoving}
              className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 flex items-center justify-between text-xs font-semibold text-slate-700 transition-colors"
            >
              <span>Root Library (No Folder)</span>
              {!movingActivity.folderId && <Badge variant="primary" size="sm">Current</Badge>}
            </button>

            {folders.map((f) => (
              <button
                key={f.id}
                onClick={() => handleExecuteMove(f.id)}
                disabled={isMoving}
                className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 flex items-center justify-between text-xs font-semibold text-slate-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: f.color || '#4f46e5' }}
                  />
                  <span>{f.name}</span>
                </div>
                {movingActivity.folderId === f.id && <Badge variant="primary" size="sm">Current</Badge>}
              </button>
            ))}

            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                fullWidth
                onClick={() => setMovingActivity(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
