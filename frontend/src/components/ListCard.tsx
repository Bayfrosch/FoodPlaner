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
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition cursor-pointer"
      onClick={() => navigate(`/list/${list.id}`)}
    >
      <h3 className="text-xl font-bold text-gray-800 mb-2">{list.title}</h3>
      {list.description && (
        <p className="text-gray-600 text-sm mb-4">{list.description}</p>
      )}
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>{new Date(list.created_at).toLocaleDateString('de-DE')}</span>
        <button
          onClick={(e) => {
            e. stopPropagation();
            onDelete(list.id);
          }}
          className="text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1 rounded"
        >
          🗑️ Löschen
        </button>
      </div>
    </div>
  );
}