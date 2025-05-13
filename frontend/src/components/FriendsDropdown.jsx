import React, { useState, useEffect, useRef } from 'react';
import { CSSTransition } from 'react-transition-group';
import axios from 'axios';
import FriendsList from './profile/FriendsList';
import FriendRequests from './friends/FriendRequests';
import FriendSearch from './friends/FriendSearch';
import '../styles/FriendsDropdown.css';

const FriendsDropdown = ({ isOpen, onClose, labelChange }) => {
  const nodeRef = useRef(null);
  const [activeTab, setActiveTab] = useState('friends');
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
  const [loading, setLoading] = useState(false);

  const username = JSON.parse(localStorage.getItem('user')).username;

  const fetchFriends = async () => {
    try {
      const token = localStorage.getItem('token');

      const headers = token ? {
        Authorization: `Bearer ${token}`
      } : {};

      const res = await axios.get('http://localhost:5000/api/friends', {
          headers
        });
      setFriends(res.data);
    } catch (err) {
      console.error('Ошибка загрузки друзей:', err);
    }
  };

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem('token');

      const headers = token ? {
        Authorization: `Bearer ${token}`
      } : {};

      const res = await axios.get('http://localhost:5000/api/friends/requests', {
        headers
      });
      setRequests(res.data);
    } catch (err) {
      console.error('Ошибка загрузки запросов:', err);
    }
  };

  const handleSendRequest = async (userId) => {
    try {
      const token = localStorage.getItem('token');

      const headers = token ? {
        Authorization: `Bearer ${token}`
      } : {};

      await axios.post(`http://localhost:5000/api/friends/${userId}/request`,
      { data: 'data' },
      {
        headers
      });
      await fetchRequests();
    } catch (err) {
      console.error('Ошибка отправки запроса:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      Promise.all([fetchFriends(), fetchRequests()])
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  return (
    <CSSTransition
      nodeRef={nodeRef}
      in={isOpen}
      timeout={300}
      classNames="friends-dropdown"
      unmountOnExit
    >
      <div className="friends-dropdown" ref={nodeRef}>
        <div className="dropdown-header">
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="tabs-dropdown">
          <button
            className={`tab-dropdown ${activeTab === 'friends' ? 'active' : ''}`}
            onClick={() => setActiveTab('friends')}
          >
            Друзья ({friends.length})
          </button>
          <button
            className={`tab-dropdown ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            Запросы ({requests.incoming.length + requests.outgoing.length})
          </button>
          <button
            className={`tab-dropdown ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            Поиск
          </button>
        </div>

        <div className="content">
          {loading ? (
            <div className="loading">Загрузка...</div>
          ) : (
            <>
              {activeTab === 'friends' && (
                <div className="friend-dropdown">
                  <FriendsList username={username} />
                </div>
              )}
              {activeTab === 'requests' && (
                <FriendRequests
                  incoming={requests.incoming}
                  outgoing={requests.outgoing}
                  onUpdate={() => {
                    fetchFriends();
                    fetchRequests();
                    labelChange();
                  }}
                />
              )}
              {activeTab === 'search' && (
                <FriendSearch onSendRequest={handleSendRequest} />
              )}
            </>
          )}
        </div>
      </div>
    </CSSTransition>
  );
};

export default FriendsDropdown;