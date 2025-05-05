import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar, faClock, faCheckCircle, faHourglassHalf } from '@fortawesome/free-regular-svg-icons';
import axios from 'axios';
import Navbar from '../Navbar';
import MediaModal from '../MediaModal';
import '../../styles/UserMediaList.css';

const UserMediaList = () => {
  const { username, mediaType } = useParams();
  const [media, setMedia] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('planned');
  const [selectedMedia, setSelectedMedia] = useState(null);
  const abortControllerRef = useRef(null);
  const cancelTokenRef = useRef(null);

  const getTitle = () => {
    const types = {
      movie: 'Фильмы',
      anime: 'Аниме',
      book: 'Книги'
    };
    return types[mediaType];
  };

  const handleTabChange = (tab) => {
    setSelectedTab(tab);
    setMedia([]);
    setIsLoading(true);
  };

  const fetchMedia = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');

      const headers = token ? {
        Authorization: `Bearer ${token}`,
        'Cache-Control': 'no-cache'
      } : {};

      const res = await axios.get(`http://localhost:5000/api/users/${username}`, {
        params: {
          media_type: mediaType,
          list_type: selectedTab
        },
        headers,
        cancelToken: new axios.CancelToken(c => cancelTokenRef.current = c),
        signal: abortController.signal
      });

      setMedia(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [username, mediaType, selectedTab]);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.exp * 1000 < Date.now()) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        } catch (e) {
          localStorage.clear();
        }
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    fetchMedia()
  }, [fetchMedia]);

  const handleListChange = useCallback(async (mediaId, listType) => {
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user'));

      if (!token || !user) {
        alert('Для выполнения действия необходимо войти в систему');
        window.location.href = '/login';
        return;
      }

      const response = await axios.post(
        'http://localhost:5000/api/media/list',
        {
          media_id: mediaId,
          list_type: listType,
          operation: 'toggle'
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setMedia(prev => prev.map(item =>
        item.id === mediaId ? {
          ...item,
          is_planned: response.data.is_planned,
          is_completed: response.data.is_completed,
          is_favorite: response.data.is_favorite
        } : item
      ));
    } catch (error) {
      console.error('Ошибка обновления списка:', error);
      alert(error.response?.data?.error || 'Ошибка обновления');
      setMedia(prev => prev.map(item =>
        item.id === mediaId ? {
          ...item,
          [listType === 'planned' ? 'is_planned' :
           listType === 'completed' ? 'is_completed' :
           'is_favorite']: !item[listType]
        } : item
      ));
    }
  }, []);

  const MediaCard = ({ item, onListChange }) => {
    const [localStatus, setLocalStatus] = useState({
      planned: item.is_planned,
      completed: item.is_completed,
      favorite: item.is_favorite
    });

    const user = JSON.parse(localStorage.getItem('user'));

    useEffect(() => {
      setLocalStatus({
        planned: item.is_planned,
        completed: item.is_completed,
        favorite: item.is_favorite
      });
    }, [item]);

    const handleToggle = async (listType, e) => {
      e.stopPropagation();
      try {
        setLocalStatus(prev => ({
          ...prev,
          [listType]: !prev[listType],
          ...(listType === 'planned' && { completed: false }),
          ...(listType === 'completed' && { planned: false })
        }));
        await onListChange(item.id, listType);
      } catch (error) {
        setLocalStatus({
          planned: item.is_planned,
          completed: item.is_completed,
          favorite: item.is_favorite
        });
      }
    };

    return (
      <div className="media-card" onClick={() => setSelectedMedia(item.id)}>

        {user ? (
          <>
            <div className="favorite-icon" onClick={(e) => handleToggle('favorite', e)}>
              <FontAwesomeIcon
                icon={faStar}
                className={localStatus.favorite ? 'active favorite' : ''}
              />
            </div>
          </>
        ) : (
          <>
          </>
        )}

        <img
          src={item.cover_url || '/placeholder.jpg'}
          alt={item.title}
          loading="lazy"
        />

        <div className="media-info">
          <h3>{item.title}</h3>
          <div className='author'>
            <span> {item.author || ''}</span>
          </div>
          <div className="rating">
            <span>★ {item.rating?.toFixed(1) || 'N/A'}</span>
            <span>{item.year}</span>
          </div>
        </div>

        <div className="status-bar">

          {user ? (
            <>
              <div className="planned" onClick={(e) => handleToggle('planned', e)}>
                <FontAwesomeIcon
                  icon={faClock}
                  className={localStatus.planned ? 'active planned' : ''}
                />
              </div>
              <div className="completed" onClick={(e) => handleToggle('completed', e)}>
                <FontAwesomeIcon
                  icon={faCheckCircle}
                  className={localStatus.completed ? 'active completed' : ''}
                />
              </div>
            </>
          ) : (
            <>
            </>
          )}
        </div>
      </div>
    );
  };

  const mediaToShow = media;

  return (
    <div className="user-media-list-page">

      <Navbar />

      {selectedMedia && (
        <MediaModal
          mediaId={selectedMedia}
          onClose={() => {
            setSelectedMedia(null);
            fetchMedia();
          }
          }
        />
      )}

      <div className="user-media-list-container">

        <div className="user-media-list-header">
          <h1>{getTitle()} @{username}</h1>
        </div>

        <div className="tabs">
          <button
            className={selectedTab === 'planned' ? 'active' : ''}
            onClick={() => setSelectedTab('planned')}
          >
            Запланировано
          </button>
          <button
            className={selectedTab === 'completed' ? 'active' : ''}
            onClick={() => setSelectedTab('completed')}
          >
            Просмотрено
          </button>
        </div>

        <div className="media-grid">
          {isLoading ? (
            <div className="loading-overlay">
              <FontAwesomeIcon
                icon={faHourglassHalf}
                spin
                className="loading-spinner"
                size="2x"
              />
            </div>
          ) : (
            mediaToShow.map(item => (
              <MediaCard
                key={item.id}
                item={item}
                onListChange={handleListChange}
              />
            ))
          )}
        </div>

        {mediaToShow.length === 0 && !isLoading && (
          <div className="no-results">Ничего не найдено</div>
        )}

      </div>
    </div>
  );
};

export default UserMediaList;