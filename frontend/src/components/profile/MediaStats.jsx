import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../../styles/MediaStats.css';

const MediaStats = ({ username }) => {

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/users/${username}`);
        setStats(response.data.stats);
        setError(null);
      } catch (err) {
        setError('Не удалось загрузить статистику');
        console.error('Ошибка:', err.response?.data || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [username]);

  const getProgressStyles = (completed, planned) => {
    const total = completed + planned;
    return {
      completedWidth: total > 0 ? (completed / total) * 100 : 50,
      plannedWidth: total > 0 ? (planned / total) * 100 : 50
    };
  };

  if (loading) {
    return (
      <div className="media-stats loading">
        <h2>Загрузка статистики...</h2>
        {[1, 2, 3].map((i) => (
          <div key={i} className="stat-skeleton"></div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="media-stats error">
        <h2>Ошибка</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="media-stats">
      <h2>Моя активность</h2>

      {['movies', 'anime', 'books'].map((type) => {
        const { completed, planned } = stats[type];
        const { completedWidth, plannedWidth } = getProgressStyles(completed, planned);

        return (
          <div key={type} className="stat-block">
            <div className="stat-header">
              <span className="stat-title">
                {{
                  movies: 'Фильмы',
                  anime: 'Аниме',
                  books: 'Книги'
                }[type]}
              </span>
              <span className="stat-total">{completed + planned}</span>
            </div>

            <div className="progress-bar">
              <div
                className="progress-segment completed"
                style={{
                  width: `${completedWidth}%`,
                  backgroundColor: typeColors[type].completed
                }}
              ></div>
              <div
                className="progress-segment planned"
                style={{
                  width: `${plannedWidth}%`,
                  backgroundColor: typeColors[type].planned
                }}
              ></div>
            </div>

            <div className="stat-labels">
              <span>{completed} просмотрено</span>
              <span>{planned} запланировано</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const typeColors = {
  movies: { completed: '#2196F3', planned: '#BBDEFB' },
  anime: { completed: '#9C27B0', planned: '#E1BEE7' },
  books: { completed: '#4CAF50', planned: '#C8E6C9' }
};

export default MediaStats;