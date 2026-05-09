import React from 'react';
import KanbanBoard from '../components/Board/KanbanBoard';

const Boards = () => {
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <KanbanBoard />
      </div>
    </div>
  );
};

export default Boards;
