import { useState } from 'react';
import { Match, Player, Goal } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import {
  Plus,
  Calendar,
  MapPin,
  Users,
  ArrowRight,
  CheckCircle,
  XCircle,
  Trash2,
  Trophy,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export function MatchesScreen() {
  const { isAdmin } = useAuth();
  const { matches, addMatch, deleteMatch } = useData();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  const upcomingMatches = matches.filter((m) => m.status === 'scheduled');
  const completedMatches = matches.filter((m) => m.status === 'completed');

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this match?')) return;
    try {
      await deleteMatch(id);
      toast.success('Match deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Matches</h1>
          <p className="text-gray-600">View and manage football matches</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Schedule Match
          </button>
        )}
      </div>

      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Upcoming Matches</h2>
          {upcomingMatches.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-8 text-center">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No upcoming matches scheduled</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {upcomingMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  onClick={() => setSelectedMatch(match)}
                  isAdmin={isAdmin}
                  onDelete={() => handleDelete(match.id)}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Completed Matches</h2>
          {completedMatches.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-8 text-center">
              <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No completed matches yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {completedMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  onClick={() => setSelectedMatch(match)}
                  isAdmin={isAdmin}
                  onDelete={() => handleDelete(match.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreateMatchModal
          onClose={() => setShowCreateModal(false)}
          onSave={async (data) => {
            try {
              await addMatch(data);
              setShowCreateModal(false);
              toast.success('Match scheduled');
            } catch (err) {
              console.error(err);
              toast.error('Failed to schedule');
            }
          }}
        />
      )}

      {selectedMatch && (
        <MatchDetailsModal
          match={selectedMatch}
          onClose={() => setSelectedMatch(null)}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}

interface MatchCardProps {
  match: Match;
  onClick: () => void;
  isAdmin: boolean;
  onDelete: () => void;
}

function MatchCard({ match, onClick, isAdmin, onDelete }: MatchCardProps) {
  const isCompleted = match.status === 'completed';

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition cursor-pointer"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${
              isCompleted ? 'bg-green-100' : 'bg-blue-100'
            }`}
          >
            {isCompleted ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <Calendar className="w-5 h-5 text-blue-600" />
            )}
          </div>
          <div>
            <p className="font-bold text-gray-900">{format(match.date, 'EEEE, MMMM dd, yyyy')}</p>
            <p className="text-sm text-gray-500">{match.time}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              isCompleted
                ? 'bg-green-100 text-green-700'
                : 'bg-blue-100 text-blue-700'
            }`}
          >
            {match.status}
          </span>
          {isAdmin && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-4 h-4 text-gray-400" />
        <span className="text-gray-700">{match.location}</span>
      </div>

      <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
        <div className="text-center flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">Team A</p>
          {isCompleted && (
            <p className="text-3xl font-bold text-gray-900">{match.teamA.score}</p>
          )}
          <div className="flex items-center justify-center gap-1 mt-2">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">{match.teamA.playerIds.length} players</span>
          </div>
        </div>

        <div className="px-4">
          {isCompleted ? (
            <div className="text-2xl font-bold text-gray-400">-</div>
          ) : (
            <ArrowRight className="w-6 h-6 text-gray-400" />
          )}
        </div>

        <div className="text-center flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">Team B</p>
          {isCompleted && (
            <p className="text-3xl font-bold text-gray-900">{match.teamB.score}</p>
          )}
          <div className="flex items-center justify-center gap-1 mt-2">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">{match.teamB.playerIds.length} players</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface CreateMatchModalProps {
  onClose: () => void;
  onSave: (data: Omit<Match, 'id' | 'createdAt'>) => Promise<void> | void;
}

function CreateMatchModal({ onClose, onSave }: CreateMatchModalProps) {
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    location: '',
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      date: new Date(formData.date),
      time: formData.time,
      location: formData.location,
      notes: formData.notes,
      status: 'scheduled',
      teamA: { name: 'Team A', playerIds: [] },
      teamB: { name: 'Team B', playerIds: [] },
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Schedule New Match</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Time *</label>
            <input
              type="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location *</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
              required
              placeholder="e.g., Central Park Field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-none"
              rows={3}
              placeholder="Any additional information..."
            />
          </div>

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
              Schedule Match
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface MatchDetailsModalProps {
  match: Match;
  onClose: () => void;
  isAdmin: boolean;
}

function MatchDetailsModal({ match, onClose, isAdmin }: MatchDetailsModalProps) {
  const { players } = useData();
  const [view, setView] = useState<'details' | 'teams' | 'result'>('details');

  const teamAPlayers = players.filter((p) => match.teamA.playerIds.includes(p.id));
  const teamBPlayers = players.filter((p) => match.teamB.playerIds.includes(p.id));

  if (view === 'teams') {
    return (
      <TeamAssignmentModal
        match={match}
        onClose={onClose}
        onBack={() => setView('details')}
      />
    );
  }

  if (view === 'result') {
    return (
      <RecordResultModal
        match={match}
        onClose={onClose}
        onBack={() => setView('details')}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Match Details</h2>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Date</p>
              <p className="font-medium text-gray-900">
                {format(match.date, 'EEEE, MMMM dd, yyyy')}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Time</p>
              <p className="font-medium text-gray-900">{match.time}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Location</p>
              <p className="font-medium text-gray-900">{match.location}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Status</p>
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  match.status === 'completed'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {match.status}
              </span>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Teams</h3>
              {isAdmin && match.status === 'scheduled' && (
                <button
                  onClick={() => setView('teams')}
                  className="text-sm text-green-600 hover:text-green-700 font-medium"
                >
                  Edit Teams
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Team A</h4>
                {match.status === 'completed' && (
                  <p className="text-3xl font-bold text-gray-900 mb-3">{match.teamA.score}</p>
                )}
                <div className="space-y-2">
                  {teamAPlayers.map((player) => (
                    <div key={player.id} className="text-sm text-gray-700">
                      {player.name}
                    </div>
                  ))}
                  {teamAPlayers.length === 0 && (
                    <p className="text-sm text-gray-500 italic">No players assigned</p>
                  )}
                </div>
              </div>

              <div className="bg-red-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Team B</h4>
                {match.status === 'completed' && (
                  <p className="text-3xl font-bold text-gray-900 mb-3">{match.teamB.score}</p>
                )}
                <div className="space-y-2">
                  {teamBPlayers.map((player) => (
                    <div key={player.id} className="text-sm text-gray-700">
                      {player.name}
                    </div>
                  ))}
                  {teamBPlayers.length === 0 && (
                    <p className="text-sm text-gray-500 italic">No players assigned</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {match.notes && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="font-bold text-gray-900 mb-2">Notes</h3>
              <p className="text-gray-700">{match.notes}</p>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
          >
            Close
          </button>
          {isAdmin && match.status === 'scheduled' && (
            <>
              <button
                onClick={() => setView('teams')}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
              >
                Manage Teams
              </button>
              <button
                onClick={() => setView('result')}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
              >
                Record Result
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface TeamAssignmentModalProps {
  match: Match;
  onClose: () => void;
  onBack: () => void;
}

function TeamAssignmentModal({ match, onClose, onBack }: TeamAssignmentModalProps) {
  const { players, updateMatch } = useData();
  const [teamA, setTeamA] = useState<string[]>(match.teamA.playerIds);
  const [teamB, setTeamB] = useState<string[]>(match.teamB.playerIds);

  const assignedPlayers = [...teamA, ...teamB];
  const availablePlayers = players.filter(
    (p) => p.status === 'active' && !assignedPlayers.includes(p.id)
  );

  const moveToTeamA = (playerId: string) => {
    setTeamB(teamB.filter((id) => id !== playerId));
    setTeamA([...teamA, playerId]);
  };

  const moveToTeamB = (playerId: string) => {
    setTeamA(teamA.filter((id) => id !== playerId));
    setTeamB([...teamB, playerId]);
  };

  const removeFromTeam = (playerId: string) => {
    setTeamA(teamA.filter((id) => id !== playerId));
    setTeamB(teamB.filter((id) => id !== playerId));
  };

  const handleSave = async () => {
    try {
      await updateMatch(match.id, {
        teamA: { ...match.teamA, playerIds: teamA },
        teamB: { ...match.teamB, playerIds: teamB },
      });
      toast.success('Teams updated');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update teams');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Team Assignment</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-bold text-gray-900 mb-3">Team A ({teamA.length})</h3>
            <div className="space-y-2">
              {teamA.map((playerId) => {
                const player = players.find((p) => p.id === playerId);
                return (
                  <div
                    key={playerId}
                    className="bg-white rounded-lg p-3 flex items-center justify-between"
                  >
                    <span className="text-sm font-medium">{player?.name ?? '?'}</span>
                    <button
                      onClick={() => removeFromTeam(playerId)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
              {teamA.length === 0 && <p className="text-sm text-gray-500 italic">No players</p>}
            </div>
          </div>

          <div>
            <h3 className="font-bold text-gray-900 mb-3">
              Available ({availablePlayers.length})
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {availablePlayers.map((player) => (
                <div
                  key={player.id}
                  className="bg-gray-50 rounded-lg p-3 flex items-center justify-between gap-2"
                >
                  <span className="text-sm font-medium flex-1">{player.name}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => moveToTeamA(player.id)}
                      className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                    >
                      A
                    </button>
                    <button
                      onClick={() => moveToTeamB(player.id)}
                      className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                    >
                      B
                    </button>
                  </div>
                </div>
              ))}
              {availablePlayers.length === 0 && (
                <p className="text-sm text-gray-500 italic">All players assigned</p>
              )}
            </div>
          </div>

          <div className="bg-red-50 rounded-lg p-4">
            <h3 className="font-bold text-gray-900 mb-3">Team B ({teamB.length})</h3>
            <div className="space-y-2">
              {teamB.map((playerId) => {
                const player = players.find((p) => p.id === playerId);
                return (
                  <div
                    key={playerId}
                    className="bg-white rounded-lg p-3 flex items-center justify-between"
                  >
                    <span className="text-sm font-medium">{player?.name ?? '?'}</span>
                    <button
                      onClick={() => removeFromTeam(playerId)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
              {teamB.length === 0 && <p className="text-sm text-gray-500 italic">No players</p>}
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-6 border-t border-gray-200">
          <button
            onClick={onBack}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
          >
            Back
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
          >
            Save Teams
          </button>
        </div>
      </div>
    </div>
  );
}

interface RecordResultModalProps {
  match: Match;
  onClose: () => void;
  onBack: () => void;
}

type GoalDraft = Omit<Goal, 'id' | 'matchId' | 'createdAt'>;

function RecordResultModal({ match, onClose, onBack }: RecordResultModalProps) {
  const { players, recordResult } = useData();
  const [teamAScore, setTeamAScore] = useState<number>(0);
  const [teamBScore, setTeamBScore] = useState<number>(0);
  const [goals, setGoals] = useState<GoalDraft[]>([]);
  const [saving, setSaving] = useState(false);

  const teamAPlayers = players.filter((p) => match.teamA.playerIds.includes(p.id));
  const teamBPlayers = players.filter((p) => match.teamB.playerIds.includes(p.id));

  const addGoalRow = (team: 'A' | 'B') => {
    setGoals([...goals, { scorerId: '', assistId: undefined, team, minute: undefined }]);
  };

  const updateGoal = (index: number, patch: Partial<GoalDraft>) => {
    setGoals(goals.map((g, i) => (i === index ? { ...g, ...patch } : g)));
  };

  const removeGoal = (index: number) => {
    setGoals(goals.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (goals.some((g) => !g.scorerId)) {
      toast.error('All goals need a scorer');
      return;
    }
    setSaving(true);
    try {
      await recordResult(match.id, teamAScore, teamBScore, goals);
      toast.success('Result recorded');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to record result');
    } finally {
      setSaving(false);
    }
  };

  const renderGoalRow = (g: GoalDraft, idx: number) => {
    const scorerPool = g.team === 'A' ? teamAPlayers : teamBPlayers;
    return (
      <div key={idx} className="flex flex-wrap gap-2 items-center bg-gray-50 rounded-lg p-3">
        <span className={`px-2 py-1 rounded text-xs font-medium ${g.team === 'A' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
          Team {g.team}
        </span>
        <select
          value={g.scorerId}
          onChange={(e) => updateGoal(idx, { scorerId: e.target.value })}
          className="px-2 py-1 border rounded text-sm flex-1 min-w-[140px]"
        >
          <option value="">Scorer...</option>
          {scorerPool.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          value={g.assistId ?? ''}
          onChange={(e) => updateGoal(idx, { assistId: e.target.value || undefined })}
          className="px-2 py-1 border rounded text-sm flex-1 min-w-[140px]"
        >
          <option value="">Assist (optional)...</option>
          {scorerPool.filter((p) => p.id !== g.scorerId).map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <input
          type="number"
          min={0}
          placeholder="Min"
          value={g.minute ?? ''}
          onChange={(e) => updateGoal(idx, { minute: e.target.value ? parseInt(e.target.value, 10) : undefined })}
          className="w-16 px-2 py-1 border rounded text-sm"
        />
        <button onClick={() => removeGoal(idx)} className="text-red-600">
          <XCircle className="w-5 h-5" />
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Record Result</h2>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <p className="text-sm font-medium text-gray-700 mb-2">Team A Score</p>
            <input
              type="number"
              min={0}
              value={teamAScore}
              onChange={(e) => setTeamAScore(parseInt(e.target.value || '0', 10))}
              className="w-24 text-3xl font-bold text-center border border-gray-300 rounded-lg py-2"
            />
          </div>
          <div className="bg-red-50 rounded-lg p-4 text-center">
            <p className="text-sm font-medium text-gray-700 mb-2">Team B Score</p>
            <input
              type="number"
              min={0}
              value={teamBScore}
              onChange={(e) => setTeamBScore(parseInt(e.target.value || '0', 10))}
              className="w-24 text-3xl font-bold text-center border border-gray-300 rounded-lg py-2"
            />
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">Goals</h3>
            <div className="flex gap-2">
              <button
                onClick={() => addGoalRow('A')}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                + Team A Goal
              </button>
              <button
                onClick={() => addGoalRow('B')}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                + Team B Goal
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {goals.map(renderGoalRow)}
            {goals.length === 0 && (
              <p className="text-sm text-gray-500 italic text-center py-4">
                No goals added — scoreless result will be recorded
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-6 border-t border-gray-200">
          <button
            onClick={onBack}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
          >
            Back
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Result'}
          </button>
        </div>
      </div>
    </div>
  );
}
