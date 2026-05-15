import React from 'react';

interface AdminCardProps {
  title: string;
  value: number;
  change: string;
  icon: string;
  color: string;
}

const AdminCard: React.FC<AdminCardProps> = ({ 
  title, 
  value, 
  change, 
  icon,
  color
}) => (
  <div className="bg-white rounded-xl shadow overflow-hidden">
    <div className="p-5">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-gray-500 text-sm">{title}</p>
          <h3 className="text-2xl font-bold text-gray-800 mt-1">{value}</h3>
        </div>
        <div className={`${color} w-12 h-12 rounded-full flex items-center justify-center`}>
          <span className="text-white text-xl">{icon}</span>
        </div>
      </div>
      <div className="mt-4">
        <span className={`${change.startsWith('+') ? 'text-green-600' : 'text-red-600'} flex items-center text-sm`}>
          {change.startsWith('+') ? '↑' : '↓'} {change}
          <span className="ml-1 text-gray-500">from last month</span>
        </span>
      </div>
    </div>
    <div className="bg-gray-50 px-5 py-3">
      <a href="#" className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center">
        View details
        <span className="ml-1">→</span>
      </a>
    </div>
  </div>
);

export default AdminCard;