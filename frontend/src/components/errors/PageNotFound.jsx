import React, { useEffect } from "react";
import '../../styles/PageNotFound.css';

const PageNotFound = () => {
    useEffect(() => {
      document.title = 'Page Not Found';
    }, []);

    return (
        <div className="error-page">
            <div className="back-to-main">
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.href = '/';
                }}
              >
                На главную
              </button>
            </div>
            <div className="error-content">
              <h2 className="error-title">
                  Ошибка 404
              </h2>
              <p className="error-description">
                  Кажется, такой страницы не существует.
              </p>
            </div>
        </div>
    );
};

export default PageNotFound;