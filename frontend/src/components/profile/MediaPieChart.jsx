import React from 'react';
import '../../styles/MediaPieChart.css';

const MediaPieChart = ({ stats }) => {
  const total = stats.books + stats.movies + stats.anime;

  if (total === 0) {
    return (
      <div className="pie-chart-container">
        <div className="pie-chart empty">
          <div className="center">
            <div className="total-count">0 часов</div>
            <div className="total-label">пока пусто</div>
          </div>
        </div>
      </div>
    );
  }

  const calculateAngles = () => {
    const booksAngle = (stats.books / total) * 360;
    const moviesAngle = (stats.movies / total) * 360;
    const animeAngle = (stats.anime / total) * 360;

    return {
      books: booksAngle,
      movies: moviesAngle,
      anime: animeAngle,
    };
  };

  const angles = calculateAngles();

  return (
    <div className="pie-chart-container">
      <h3 style={{color: 'var(--primary-color)'}}>Статистика времени</h3>
      <div className="pie-chart">
        <div
          className="pie"
          style={{
            background: `conic-gradient(
              #9C27B0 0deg ${angles.anime}deg,
              #2196F3 ${angles.anime}deg ${angles.anime + angles.movies}deg,
              #4CAF50 ${angles.anime + angles.movies}deg 360deg
            )`
          }}
        >
          <div className="center">
            <div className="total-count">{total} ч.</div>
            <div className="total-label">всего</div>
          </div>
        </div>
      </div>

      <div className="legend">
        <div className="legend-item">
          <span className="color-box books"></span>
          <span>Книги ({stats.books} ч.)</span>
        </div>
        <div className="legend-item">
          <span className="color-box movies"></span>
          <span>Фильмы ({stats.movies} ч.)</span>
        </div>
        <div className="legend-item">
          <span className="color-box anime"></span>
          <span>Аниме ({stats.anime} ч.)</span>
        </div>
      </div>
    </div>
  );
};

export default MediaPieChart;