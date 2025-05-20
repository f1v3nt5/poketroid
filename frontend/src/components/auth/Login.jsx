import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
  useEffect(() => {
    document.title = 'Login - Poketroid';
  }, []);

  const [formData, setFormData] = useState({ username: '', password: '' });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        username: formData.username,
        password: formData.password
      });

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify({
        id: response.data.user_id,
        username: response.data.username,
        avatar_url: response.data.avatar_url
      }));

      navigate('/');
    } catch (error) {
      alert(error.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="login-page">
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

    <div className="auth-container">
      <h2>Вход</h2>
      <form onSubmit={handleSubmit}>
      <div className="form-group">
          <input
            type="text"
            placeholder="Имя пользователя"
            value={formData.username}
            onChange={(e) => setFormData({...formData, username: e.target.value})}
          />
      </div>
      <div className="form-group">
          <input
            type="password"
            placeholder="Пароль"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
          />

      </div>
      <button type="submit" className="submit-btn">Войти</button>
      </form>

      <div className="auth-link">
        Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
      </div>
    </div>
    </div>
  );
};

export default Login;