import { useNavigate } from 'react-router-dom';

interface List {
  id: number;
  title: string;
  description: string;
  created_at: string;
}

interface ListCardProps {
  list: List;
  onDelete: (id:  number) => void;
}

export default function ListCard({ list, onDelete }: ListCardProps) {
  const navigate = useNavigate();

  return (
    <div 
      className="w-full max-w-sm relative bg-gradient-to-br from-[#14141f]/90 to-[#1a1a2e]/90 backdrop-blur-sm border border-purple-500/30 rounded-3xl p-6 hover:border-purple-400/60 transition-all cursor-pointer group hover:shadow-2xl hover:shadow-purple-500/30 hover:-translate-y-2"
      onClick={() => navigate(`/list/${list.id}`)}
    >
      <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all"></div>
      
      <div className="relative">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500/30 to-purple-700/30 border border-purple-500/50 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:border-purple-400 transition-all">
            <span className="text-2xl">📋</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition line-clamp-2 mb-1">{list.title}</h3>
            {list.description && (
              <p className="text-gray-400 text-sm line-clamp-2">{list.description}</p>
            )}
          </div>
        </div>
        
        <div className="flex justify-between items-center pt-4 border-t border-purple-500/20">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{new Date(list.created_at).toLocaleDateString('de-DE')}</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(list.id);
            }}
            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-all"
            title="Liste löschen"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}