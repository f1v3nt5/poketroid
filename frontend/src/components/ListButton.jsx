import React from 'react';
import '../styles/ListButton.css';

const BUTTON_TEXTS = {
  planned: 'Plan to Watch',
  completed: 'Completed',
  favorite: 'Favorite'
};

const ListButton = ({ type, isActive, onClick }) => {
  return (
    <button
      className={`list-button ${type} ${isActive ? 'active' : ''}`}
      onClick={onClick}
    >
      {BUTTON_TEXTS[type]}
      {isActive && <span className="checkmark">✓</span>}
    </button>
  );
};

export default ListButton;