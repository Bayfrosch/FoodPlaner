import { useRouter } from 'next/navigation';

interface List {
  id: number;
  title: string;
  description: string;
  createdAt: string;
}

interface ListCardProps {
  list: List;
  onDelete: (id:  number) => void;
}

export default function ListCard({ list, onDelete }: ListCardProps) {
  const router = useRouter();

  return (
    <div 
      className="w-full relative bg-gradient-to-br from-[#14141f]/90 to-[#1a1a2e]/90 backdrop-blur-sm border border-purple-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-6 hover:border-purple-400/60 transition-all cursor-pointer group hover:shadow-2xl hover:shadow-purple-500/30 hover:-translate-y-1 sm:hover:-translate-y-2"
      onClick={() => router.push(`/list/${list.id}`)}
    >
      <div className="absolute top-0 right-0 w-32 sm:w-40 h-32 sm:h-40 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all"></div>
      
      <div className="relative">
        <div className="flex items-start gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-purple-300 transition line-clamp-2 mb-1">{list.title}</h3>
            {list.description && (
              <p className="text-gray-400 text-xs sm:text-sm line-clamp-2">{list.description}</p>
            )}
          </div>
        </div>
        
        <div className="flex justify-between items-center pt-3 sm:pt-4 border-t border-purple-500/20">
          <div className="flex items-center gap-1 sm:gap-2 text-xs text-gray-500">
            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs">{new Date(list.createdAt).toLocaleDateString('de-DE')}</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(list.id);
            }}
            className="p-1.5 sm:p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-all flex-shrink-0"
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