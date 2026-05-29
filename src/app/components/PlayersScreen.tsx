import { useRef, useState } from 'react';
import { Player } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { uploadToImageKit } from '../../lib/imagekit';
import { getPlayerAwardCounts } from '../../lib/matchAwards';
import { Plus, Edit, Trash2, User, Trophy, Target, TrendingUp, Upload, X, Award, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface PlayersScreenProps {
  onSelectPlayer?: (id: string) => void;
}

export function PlayersScreen({ onSelectPlayer }: PlayersScreenProps) {
  const { isAdmin } = useAuth();
  const { players, matches, addPlayer, updatePlayer, deletePlayer } = useData();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  const handleDeletePlayer = async (id: string) => {
    if (!confirm('Are you sure you want to delete this player?')) return;
    try {
      await deletePlayer(id);
      toast.success('Player deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete player');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Players</h1>
          <p className="text-gray-600">Manage your team members</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Player
          </button>
        )}
      </div>

      {players.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No players yet. {isAdmin ? 'Add some or wait for users to sign in with Google.' : ''}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {players.map((player) => {
            const awardCounts = getPlayerAwardCounts(matches, player.id);
            const totalAwards =
              awardCounts.scorer + awardCounts.assist + awardCounts.goalkeeper + awardCounts.mvp;

            return (
              <div
                key={player.id}
                className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition cursor-pointer"
                onClick={() => onSelectPlayer?.(player.id)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center overflow-hidden">
                      {player.avatar ? (
                        <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-6 h-6 text-green-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{player.name}</h3>
                      {player.nickname && (
                        <p className="text-sm text-gray-500">"{player.nickname}"</p>
                      )}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setEditingPlayer(player)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePlayer(player.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Position</span>
                    <span className="font-medium text-gray-900">{player.position || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Status</span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        player.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {player.status}
                    </span>
                  </div>
                  {totalAwards > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Weekly awards</span>
                      <span className="font-medium text-amber-600">{totalAwards}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <Trophy className="w-4 h-4 text-yellow-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{player.totalGoals}</p>
                    <p className="text-xs text-gray-500">Goals</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <Target className="w-4 h-4 text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{player.totalAssists}</p>
                    <p className="text-xs text-gray-500">Assists</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{player.matchesPlayed}</p>
                    <p className="text-xs text-gray-500">Matches</p>
                  </div>
                </div>

                {player.matchesPlayed > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Win Rate</span>
                      <span className="font-medium text-green-600">
                        {((player.wins / player.matchesPlayed) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                )}

                {totalAwards > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-2 text-xs">
                    <AwardChip icon={Trophy} label="Baller" value={awardCounts.scorer} tone="text-yellow-700 bg-yellow-50" />
                    <AwardChip icon={Target} label="Wizard" value={awardCounts.assist} tone="text-blue-700 bg-blue-50" />
                    <AwardChip icon={Shield} label="Brick Wall" value={awardCounts.goalkeeper} tone="text-cyan-700 bg-cyan-50" />
                    <AwardChip icon={Award} label="Menace" value={awardCounts.mvp} tone="text-emerald-700 bg-emerald-50" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showAddModal && (
        <PlayerModal
          onClose={() => setShowAddModal(false)}
          onSave={async (data) => {
            try {
              await addPlayer({
                ...data,
                totalGoals: 0,
                totalAssists: 0,
                totalSaves: 0,
                matchesPlayed: 0,
                wins: 0,
                losses: 0,
                draws: 0,
              });
              setShowAddModal(false);
              toast.success('Player added');
            } catch (err) {
              console.error(err);
              toast.error('Failed to add player');
            }
          }}
        />
      )}

      {editingPlayer && (
        <PlayerModal
          player={editingPlayer}
          onClose={() => setEditingPlayer(null)}
          onSave={async (data) => {
            try {
              await updatePlayer(editingPlayer.id, data);
              setEditingPlayer(null);
              toast.success('Player updated');
            } catch (err) {
              console.error(err);
              toast.error('Failed to update player');
            }
          }}
        />
      )}
    </div>
  );
}

function AwardChip({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className={`rounded-lg px-3 py-2 ${tone}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 font-medium">
          <Icon className="w-3.5 h-3.5" />
          {label}
        </span>
        <span className="font-bold">{value}</span>
      </div>
    </div>
  );
}

interface PlayerFormData {
  name: string;
  email: string;
  nickname: string;
  position: string;
  status: 'active' | 'inactive';
  avatar: string;
}

interface PlayerModalProps {
  player?: Player;
  onClose: () => void;
  onSave: (data: PlayerFormData) => void | Promise<void>;
}

function PlayerModal({ player, onClose, onSave }: PlayerModalProps) {
  const [formData, setFormData] = useState<PlayerFormData>({
    name: player?.name ?? '',
    email: player?.email ?? '',
    nickname: player?.nickname ?? '',
    position: player?.position ?? '',
    status: player?.status ?? 'active',
    avatar: player?.avatar ?? '',
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    setUploading(true);
    try {
      const url = await uploadToImageKit(file, 'avatars');
      setFormData((prev) => ({ ...prev, avatar: url }));
      toast.success('Image uploaded');
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          {player ? 'Edit Player' : 'Add New Player'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Photo</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-green-100 overflow-hidden flex items-center justify-center shrink-0">
                {formData.avatar ? (
                  <img src={formData.avatar} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-green-600" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleAvatarChange(file);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition disabled:opacity-60"
                >
                  <Upload className="w-4 h-4" />
                  {uploading ? 'Uploading…' : formData.avatar ? 'Replace' : 'Upload'}
                </button>
                {formData.avatar && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, avatar: '' })}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <X className="w-4 h-4" />
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nickname</label>
            <input
              type="text"
              value={formData.nickname}
              onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
            <select
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
            >
              <option value="">Select position</option>
              <option value="Goalkeeper">Goalkeeper</option>
              <option value="Defender">Defender</option>
              <option value="Midfielder">Midfielder</option>
              <option value="Forward">Forward</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {player && (
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Stats are now derived from completed matches, goals, and saves. Edit match results to change player totals.
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
            >
              {player ? 'Update' : 'Add'} Player
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
